<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "./store";
import DispatchView from "./views/DispatchView.vue";
import StudentsView from "./views/StudentsView.vue";
import AttendanceView from "./views/AttendanceView.vue";
import HandoverView from "./views/HandoverView.vue";

const store = useStore();

const tabs = [
  { key: "dispatch", label: "线路调度" },
  { key: "students", label: "学生名册" },
  { key: "attendance", label: "跟车点名" },
  { key: "handover", label: "交接与待办" },
] as const;

const metrics = computed(() => [
  { label: "今日线路", value: store.metrics.todayRoutes },
  { label: "未完成点名", value: store.metrics.unfinished },
  { label: "待定学生", value: store.metrics.pendingStudents },
  { label: "待确认交接", value: store.metrics.pendingHandovers },
]);

const todoBadge = computed(() => store.metrics.unfinished + store.metrics.pendingHandovers);
</script>

<template>
  <main class="app">
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">校园校车 · 早晚接送</p>
          <h1>校车接送点名台</h1>
          <p class="subtitle">
            调度员按线路排校车、司机和到离校时刻；跟车员依次核对上车、到校、返程上车、到家，
            缺席或错站登记交接，未完成事项跨天保留。
          </p>
        </div>
      </header>

      <section class="metrics">
        <article v-for="m in metrics" :key="m.label" class="metric">
          <span>{{ m.label }}</span>
          <strong>{{ m.value }}</strong>
        </article>
      </section>

      <nav class="tabs">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          class="tab"
          :class="{ active: store.ui.activeTab === t.key }"
          @click="store.ui.activeTab = t.key"
        >
          {{ t.label }}
          <span v-if="t.key === 'handover' && todoBadge" class="badge">{{ todoBadge }}</span>
        </button>
      </nav>

      <DispatchView v-if="store.ui.activeTab === 'dispatch'" />
      <StudentsView v-else-if="store.ui.activeTab === 'students'" />
      <AttendanceView v-else-if="store.ui.activeTab === 'attendance'" />
      <HandoverView v-else />
    </div>
  </main>
</template>
