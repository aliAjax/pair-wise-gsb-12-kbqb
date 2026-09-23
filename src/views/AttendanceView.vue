<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useStore } from "../store";
import { CHECKPOINTS, type Attendance, type CheckpointKey, type Handover } from "../types";
import { timeLabel } from "../utils";

const store = useStore();

const routeId = ref(store.ui.focusRouteId ?? store.sortedRoutes[0]?.id ?? "");
store.ui.focusRouteId = null;

watch(
  routeId,
  (id) => {
    if (id) store.ensureAttendance(id);
  },
  { immediate: true }
);

const route = computed(() => store.routeById(routeId.value));
const list = computed(() => (routeId.value ? store.attendanceOf(routeId.value) : []));
const doneCount = computed(() => list.value.filter((a) => store.isComplete(a)).length);

function studentOf(att: Attendance) {
  return store.studentById(att.studentId);
}

function checkText(att: Attendance, key: CheckpointKey): string {
  const c = att.checks[key];
  if (c.status === "done") return `✓ ${timeLabel(c.at)}`;
  if (c.status === "absent") return "缺席";
  if (c.status === "wrongStop") return "错站";
  return "待核";
}

function stateOf(att: Attendance): string {
  if (store.isComplete(att)) return "完成";
  if (store.hasException(att)) return "待交接确认";
  return store.currentKey(att) ? "进行中" : "待开始";
}

// 异常（缺席/错站）登记表单
const exception = ref<{
  att: Attendance;
  key: CheckpointKey;
  type: Handover["type"];
} | null>(null);
const parentName = ref("");
const reason = ref("");

function openException(att: Attendance, key: CheckpointKey, type: Handover["type"]) {
  exception.value = { att, key, type };
  parentName.value = studentOf(att)?.parentName ?? "";
  reason.value = "";
}

function submitException() {
  const target = exception.value;
  if (!target || !parentName.value.trim() || !reason.value.trim()) return;
  store.markException(target.att, target.key, target.type, parentName.value.trim(), reason.value.trim());
  exception.value = null;
}
</script>

<template>
  <section class="panel full">
    <div class="toolbar">
      <h2>跟车点名</h2>
      <select v-model="routeId">
        <option v-for="r in store.sortedRoutes" :key="r.id" :value="r.id">
          {{ r.date }} · {{ r.name }}（{{ r.bus }} / {{ r.driver }}）
        </option>
      </select>
    </div>

    <template v-if="route">
      <p class="note">
        {{ route.attendant }} 跟车 · 早接 {{ route.morningStart }} 发车 {{ route.arriveSchool }} 到校 ·
        晚送 {{ route.departSchool }} 离校 {{ route.eveningEnd }} 送完 ·
        已完成 {{ doneCount }}/{{ list.length }}
      </p>
      <p class="hint">按 上车 → 到校 → 返程上车 → 到家 依次核对；缺席或错站需登记交接给哪位家长及原因。</p>

      <div v-if="list.length === 0" class="empty">该线路暂无在册学生</div>

      <article v-for="att in list" :key="att.id" class="record rollcall">
        <div class="record-head">
          <p class="record-title">
            {{ studentOf(att)?.name }} · {{ studentOf(att)?.stop }}
          </p>
          <span class="status" :class="{ warn: stateOf(att) === '待交接确认' }">
            {{ stateOf(att) }}
          </span>
        </div>

        <div class="steps">
          <div
            v-for="cp in CHECKPOINTS"
            :key="cp.key"
            class="step"
            :class="[att.checks[cp.key].status, { current: store.currentKey(att) === cp.key }]"
          >
            <span class="step-label">{{ cp.label }}</span>
            <em>{{ checkText(att, cp.key) }}</em>
            <div v-if="store.currentKey(att) === cp.key" class="step-actions">
              <button type="button" @click="store.markDone(att, cp.key)">确认</button>
              <button class="danger" type="button" @click="openException(att, cp.key, 'absent')">缺席</button>
              <button class="secondary" type="button" @click="openException(att, cp.key, 'wrongStop')">错站</button>
            </div>
          </div>
        </div>

        <form
          v-if="exception && exception.att.id === att.id"
          class="inline-form"
          @submit.prevent="submitException"
        >
          <strong>
            {{ exception.type === "absent" ? "缺席" : "错站" }}登记 ·
            {{ CHECKPOINTS.find((c) => c.key === exception!.key)?.label }}环节
          </strong>
          <label>
            交接给哪位家长
            <input v-model="parentName" required placeholder="家长姓名" />
          </label>
          <label>
            原因说明
            <textarea v-model="reason" required placeholder="写清缺席/错站原因及现场处理" />
          </label>
          <div class="actions">
            <button type="submit">登记交接</button>
            <button class="secondary" type="button" @click="exception = null">取消</button>
          </div>
        </form>
      </article>
    </template>
    <div v-else class="empty">请先在「线路调度」排班</div>
  </section>
</template>
