<script setup lang="ts">
import { computed, ref } from "vue";
import { useBusStore, todayStr } from "../store";
import type { AttendanceRecord, CheckpointKey, HandoverType, Student, TripType } from "../types";
import { tripMeta } from "../types";

const store = useBusStore();

interface Draft {
  studentId: string;
  checkpoint: CheckpointKey;
  type: HandoverType;
  receiver: string;
  reason: string;
}

const draft = ref<Draft | null>(null);
const localError = ref("");

const today = todayStr();
const trips: TripType[] = ["morning", "evening"];

const selectedRoute = computed(() =>
  store.selectedRouteId ? store.routeById(store.selectedRouteId) : undefined
);

const expectedStudents = computed<Student[]>(() => {
  if (!selectedRoute.value) return [];
  return store.expectedStudentIds(
    store.selectedDate,
    selectedRoute.value.id,
    store.selectedTrip
  )
    .map((id) => store.studentById(id))
    .filter((student): student is Student => Boolean(student));
});

const progress = computed(() => {
  if (!selectedRoute.value) return { total: 0, done: 0 };
  return store.tripProgress(store.selectedDate, selectedRoute.value.id, store.selectedTrip);
});

const isPast = computed(() => store.selectedDate < today);

function recordOf(student: Student): AttendanceRecord | undefined {
  if (!selectedRoute.value) return undefined;
  return store.getRecord(store.selectedDate, selectedRoute.value.id, store.selectedTrip, student.id);
}

function statusOf(student: Student, checkpoint: CheckpointKey) {
  return recordOf(student)?.[checkpoint] ?? "pending";
}

/** 依次核对：当前环节必须是待核对，且前序环节已正常完成 */
function canMark(student: Student, checkpoint: CheckpointKey) {
  const record = recordOf(student);
  if (checkpoint === "arrive") {
    return record?.board === "ok" && record.arrive === "pending";
  }
  return !record || record.board === "pending";
}

function isComplete(student: Student) {
  const record = recordOf(student);
  return record ? store.recordComplete(record) : false;
}

function hasUnconfirmed(student: Student) {
  const record = recordOf(student);
  if (!record) return false;
  return store.handoversOfRecord(record.id).some((handover) => !handover.confirmed);
}

function checkpointLabel(checkpoint: CheckpointKey) {
  return checkpoint === "board" ? tripMeta(store.selectedTrip).boardLabel : tripMeta(store.selectedTrip).arriveLabel;
}

function startDraft(student: Student, checkpoint: CheckpointKey, type: HandoverType) {
  localError.value = "";
  draft.value = {
    studentId: student.id,
    checkpoint,
    type,
    receiver: student.parentName,
    reason: ""
  };
}

function cancelDraft() {
  draft.value = null;
}

function saveDraft() {
  if (!draft.value || !selectedRoute.value) return;
  const draftValue = draft.value;
  if (!draftValue.receiver.trim()) {
    localError.value = "请写清学生交给了哪位家长";
    return;
  }
  if (!draftValue.reason.trim()) {
    localError.value = "请填写缺席或错站原因";
    return;
  }
  const error = store.markCheckpoint(
    store.selectedDate,
    selectedRoute.value.id,
    store.selectedTrip,
    draftValue.studentId,
    draftValue.checkpoint,
    draftValue.type
  );
  if (error) {
    localError.value = error;
    return;
  }
  store.addHandover({
    date: store.selectedDate,
    routeId: selectedRoute.value.id,
    trip: store.selectedTrip,
    studentId: draftValue.studentId,
    checkpoint: draftValue.checkpoint,
    type: draftValue.type,
    receiver: draftValue.receiver.trim(),
    reason: draftValue.reason.trim()
  });
  draft.value = null;
}

function markOk(student: Student, checkpoint: CheckpointKey) {
  if (!selectedRoute.value) return;
  const error = store.markCheckpoint(
    store.selectedDate,
    selectedRoute.value.id,
    store.selectedTrip,
    student.id,
    checkpoint,
    "ok"
  );
  if (error) localError.value = error;
}

function resetStudent(student: Student) {
  if (!selectedRoute.value) return;
  if (!confirm(`重置 ${student.name} 本趟次的点名与交接记录？`)) return;
  store.resetRecord(store.selectedDate, selectedRoute.value.id, store.selectedTrip, student.id);
}

const statusClass: Record<string, string> = {
  pending: "chip chip-pending",
  ok: "chip chip-ok",
  absent: "chip chip-danger",
  wrong_stop: "chip chip-warn",
  skipped: "chip chip-skip"
};

const statusText: Record<string, string> = {
  pending: "待核对",
  ok: "正常",
  absent: "缺席",
  wrong_stop: "错站",
  skipped: "免核对"
};
</script>

<template>
  <section class="panel attendance-panel">
    <div class="toolbar attend-toolbar">
      <div class="attend-controls">
        <label class="inline-field">
          日期
          <input v-model="store.selectedDate" type="date" :max="today" />
        </label>
        <label class="inline-field">
          线路
          <select v-model="store.selectedRouteId">
            <option v-for="route in store.routes" :key="route.id" :value="route.id">{{ route.name }}</option>
          </select>
        </label>
        <div class="trip-switch">
          <button
            v-for="trip in trips"
            :key="trip"
            type="button"
            :class="store.selectedTrip === trip ? '' : 'secondary'"
            @click="store.selectedTrip = trip"
          >
            {{ tripMeta(trip).label }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="store.routes.length === 0" class="empty">
      还没有线路，请先到「调度排班」安排校车、司机和到离校时刻。
    </div>

    <template v-else-if="selectedRoute">
      <div class="attend-meta">
        <div>
          <strong>{{ selectedRoute.name }}</strong>
          <span v-if="isPast" class="badge badge-warn">补录 {{ store.selectedDate }}</span>
        </div>
        <span>校车 {{ selectedRoute.busPlate }}</span>
        <span>司机 {{ selectedRoute.driver }}</span>
        <span>跟车员 {{ selectedRoute.attendant || "未安排" }}</span>
        <span>
          {{ store.selectedTrip === "morning"
            ? `${selectedRoute.morningStart} 发车 · ${selectedRoute.morningArrive} 到校`
            : `${selectedRoute.eveningStart} 离校 · ${selectedRoute.eveningArrive} 到家` }}
        </span>
        <span class="attend-progress">完成 {{ progress.done }}/{{ progress.total }}</span>
      </div>
      <div class="progress-track">
        <div
          class="progress-fill"
          :style="{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }"
        />
      </div>

      <p v-if="localError" class="alert alert-error">{{ localError }}</p>

      <div v-if="expectedStudents.length === 0" class="empty">
        该线路还没有乘车学生，请到「学生名册」安排学生。
      </div>

      <div class="roster">
        <article v-for="student in expectedStudents" :key="student.id" class="student-card">
          <header class="student-card-head">
            <div class="student-id">
              <strong>{{ student.name }}</strong>
              <span>{{ student.grade }}</span>
              <span>{{ student.stop }}</span>
            </div>
            <span v-if="isComplete(student)" class="badge badge-ok">已完成</span>
            <span v-else-if="hasUnconfirmed(student)" class="badge badge-warn">待确认交接</span>
            <span v-else class="badge badge-muted">点名中</span>
          </header>

          <div class="checkpoint-flow">
            <div class="checkpoint-cell">
              <p class="checkpoint-name">1. {{ checkpointLabel("board") }}</p>
              <span :class="statusClass[statusOf(student, 'board')]">
                {{ statusText[statusOf(student, "board")] }}
              </span>
              <div v-if="canMark(student, 'board') && !(draft && draft.studentId === student.id && draft.checkpoint === 'board')" class="check-actions">
                <button type="button" class="btn-sm" @click="markOk(student, 'board')">正常</button>
                <button type="button" class="btn-sm btn-warn" @click="startDraft(student, 'board', 'absent')">缺席</button>
                <button type="button" class="btn-sm btn-warn" @click="startDraft(student, 'board', 'wrong_stop')">错站</button>
              </div>
            </div>

            <span class="flow-arrow">→</span>

            <div class="checkpoint-cell">
              <p class="checkpoint-name">2. {{ checkpointLabel("arrive") }}</p>
              <span :class="statusClass[statusOf(student, 'arrive')]">
                {{ statusText[statusOf(student, "arrive")] }}
              </span>
              <div v-if="canMark(student, 'arrive') && !(draft && draft.studentId === student.id && draft.checkpoint === 'arrive')" class="check-actions">
                <button type="button" class="btn-sm" @click="markOk(student, 'arrive')">正常</button>
                <button type="button" class="btn-sm btn-warn" @click="startDraft(student, 'arrive', 'absent')">缺席</button>
                <button type="button" class="btn-sm btn-warn" @click="startDraft(student, 'arrive', 'wrong_stop')">错站</button>
              </div>
            </div>
          </div>

          <form
            v-if="draft && draft.studentId === student.id"
            class="handover-form"
            @submit.prevent="saveDraft"
          >
            <p class="handover-title">
              {{ draft.type === "absent" ? "缺席交接" : "错站交接" }} · {{ checkpointLabel(draft.checkpoint) }}
            </p>
            <label>
              交给了哪位家长
              <input v-model="draft.receiver" placeholder="如：王莉（母亲）" required />
            </label>
            <label>
              原因
              <textarea v-model="draft.reason" placeholder="写清缺席或错站的原因，便于家长和学校核对" required />
            </label>
            <div class="form-actions">
              <button type="submit" class="btn-sm">保存交接</button>
              <button type="button" class="secondary btn-sm" @click="cancelDraft">取消</button>
            </div>
          </form>

          <ul v-if="recordOf(student)" class="handover-list">
            <li v-for="handover in store.handoversOfRecord(recordOf(student)!.id)" :key="handover.id">
              <span :class="['badge', handover.confirmed ? 'badge-ok' : 'badge-warn']">
                {{ handover.type === "absent" ? "缺席" : "错站" }} ·
                {{ handover.checkpoint === "board" ? tripMeta(handover.trip).boardLabel : tripMeta(handover.trip).arriveLabel }}
              </span>
              <span>家长：{{ handover.receiver }}</span>
              <span>原因：{{ handover.reason }}</span>
              <button
                v-if="!handover.confirmed"
                type="button"
                class="btn-sm"
                @click="store.confirmHandover(handover.id)"
              >
                确认交接
              </button>
              <span v-else class="confirmed-text">✓ 已确认</span>
            </li>
          </ul>

          <div class="row-actions">
            <button type="button" class="secondary btn-sm" @click="resetStudent(student)">重置本趟</button>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>
