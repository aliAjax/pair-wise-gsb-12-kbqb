<script setup lang="ts">
import { reactive, ref } from "vue";
import { useStore } from "../store";
import type { RouteItem } from "../types";
import { todayStr } from "../utils";

const store = useStore();

const form = reactive({
  name: "",
  date: todayStr(),
  bus: "",
  driver: "",
  attendant: "",
  capacity: 20,
  morningStart: "07:00",
  arriveSchool: "07:50",
  departSchool: "17:00",
  eveningEnd: "18:00",
});

const error = ref("");
const conflicts = ref<RouteItem[]>([]);

function submit() {
  const result = store.addRoute({ ...form, capacity: Number(form.capacity) });
  if (!result.ok) {
    error.value = result.error;
    conflicts.value = result.conflicts ?? [];
    return;
  }
  error.value = "";
  conflicts.value = [];
  form.name = "";
  form.bus = "";
  form.driver = "";
  form.attendant = "";
}

function routeStatus(route: RouteItem): string {
  const atts = store.attendanceOf(route.id);
  const total = store.assignedOf(route.id).length;
  if (total === 0) return "未排学生";
  if (atts.length > 0 && atts.every((a) => store.isComplete(a))) return "已完成";
  const started = atts.some((a) =>
    Object.values(a.checks).some((c) => c.status !== "pending")
  );
  return started ? "进行中" : "待发车";
}

function doneCount(route: RouteItem): number {
  return store.attendanceOf(route.id).filter((a) => store.isComplete(a)).length;
}

function goRollcall(route: RouteItem) {
  store.ui.focusRouteId = route.id;
  store.ui.activeTab = "attendance";
}
</script>

<template>
  <section class="workspace">
    <form class="panel" @submit.prevent="submit">
      <h2>新增线路排班</h2>
      <div class="form-grid">
        <label>
          线路名称
          <input v-model="form.name" required placeholder="如：阳光3号线" />
        </label>
        <label>
          排班日期
          <input v-model="form.date" type="date" required />
        </label>
        <label>
          校车车牌
          <input v-model="form.bus" required placeholder="如：沪A·S1234" />
        </label>
        <label>
          司机
          <input v-model="form.driver" required />
        </label>
        <label>
          跟车员
          <input v-model="form.attendant" required />
        </label>
        <label>
          准载人数
          <input v-model="form.capacity" type="number" min="1" required />
        </label>
        <div class="time-grid">
          <label>
            早接发车
            <input v-model="form.morningStart" type="time" required />
          </label>
          <label>
            到校时刻
            <input v-model="form.arriveSchool" type="time" required />
          </label>
          <label>
            离校时刻
            <input v-model="form.departSchool" type="time" required />
          </label>
          <label>
            预计送完
            <input v-model="form.eveningEnd" type="time" required />
          </label>
        </div>
        <div v-if="error" class="error-box">
          <strong>{{ error }}</strong>
          <ul v-if="conflicts.length">
            <li v-for="c in conflicts" :key="c.id">
              与「{{ c.name }}」({{ c.bus }} / {{ c.driver }})
              {{ c.morningStart }}-{{ c.arriveSchool }}、{{ c.departSchool }}-{{ c.eveningEnd }} 时段重叠
            </li>
          </ul>
        </div>
        <button type="submit">保存排班</button>
      </div>
    </form>

    <section class="list-panel">
      <div class="toolbar">
        <h2>线路列表</h2>
        <span class="hint">同一校车或司机在重叠时段只能跑一趟</span>
      </div>
      <div class="record-grid">
        <div v-if="store.sortedRoutes.length === 0" class="empty">暂无线路，请先排班</div>
        <article v-for="route in store.sortedRoutes" :key="route.id" class="record">
          <div class="record-head">
            <p class="record-title">{{ route.date }} · {{ route.name }}</p>
            <span class="status">{{ routeStatus(route) }}</span>
          </div>
          <div class="details">
            <span>校车: {{ route.bus }}</span>
            <span>司机: {{ route.driver }}</span>
            <span>跟车员: {{ route.attendant }}</span>
            <span>准载: {{ store.assignedOf(route.id).length }}/{{ route.capacity }} 人</span>
            <span>早接: {{ route.morningStart }} → {{ route.arriveSchool }} 到校</span>
            <span>晚送: {{ route.departSchool }} 离校 → {{ route.eveningEnd }}</span>
          </div>
          <p class="note">
            点名进度 {{ doneCount(route) }}/{{ store.assignedOf(route.id).length }} 完成
            <template v-if="store.pendingOf(route.id).length">
              · 待定 {{ store.pendingOf(route.id).length }} 人（准载不足）
            </template>
          </p>
          <div v-if="store.pendingOf(route.id).length" class="chips">
            <span v-for="s in store.pendingOf(route.id)" :key="s.id" class="chip warn">
              {{ s.name }}（待定）
            </span>
            <button
              v-if="store.hasSeat(route.id)"
              class="secondary"
              type="button"
              @click="store.promotePending(route.id)"
            >
              补位
            </button>
          </div>
          <div class="actions">
            <button type="button" @click="goRollcall(route)">去点名</button>
            <button
              class="secondary"
              type="button"
              @click="navigator.clipboard?.writeText(`${route.date} ${route.name} ${route.bus}/${route.driver}`)"
            >
              复制摘要
            </button>
            <button class="danger" type="button" @click="store.removeRoute(route.id)">删除线路</button>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>
