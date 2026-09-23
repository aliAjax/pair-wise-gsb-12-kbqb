<script setup lang="ts">
import { computed } from "vue";
import { useBusStore } from "./store";
import DispatchPanel from "./components/DispatchPanel.vue";
import StudentsPanel from "./components/StudentsPanel.vue";
import AttendancePanel from "./components/AttendancePanel.vue";
import FollowupPanel from "./components/FollowupPanel.vue";

const store = useBusStore();

const tabs = [
  { key: "dispatch", label: "调度排班" },
  { key: "students", label: "学生名册" },
  { key: "attendance", label: "点名台" },
  { key: "followup", label: "交接与待办" }
] as const;

const metrics = computed(() => [
  { label: "线路总数", value: store.routes.length },
  { label: "今日应点名（人次）", value: store.todayProgress.total },
  { label: "今日已完成", value: store.todayProgress.done },
  { label: "未完成事项", value: store.unfinishedItems.length }
]);
</script>

<template>
  <main class="app">
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">校车早晚接送 · 点名交接闭环</p>
          <h1>校车接送点名台</h1>
          <p class="subtitle">
            调度员按线路排校车、司机和到离校时刻；跟车员依次核对上车、到校、返程上车和到家，
            缺席或错站登记家长交接，未确认交接的学生不算完成。
          </p>
        </div>
        <div class="stack">
          <span class="tag">Vue3</span>
          <span class="tag">TypeScript</span>
          <span class="tag">Pinia</span>
          <span class="tag">localStorage</span>
        </div>
      </header>

      <section class="metrics">
        <article v-for="metric in metrics" :key="metric.label" class="metric">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </article>
      </section>

      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          :class="['tab', store.activeTab === tab.key ? 'tab-active' : '']"
          @click="store.activeTab = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.key === 'followup' && store.unfinishedItems.length" class="tab-badge">
            {{ store.unfinishedItems.length }}
          </span>
        </button>
      </nav>

      <DispatchPanel v-if="store.activeTab === 'dispatch'" />
      <StudentsPanel v-else-if="store.activeTab === 'students'" />
      <AttendancePanel v-else-if="store.activeTab === 'attendance'" />
      <FollowupPanel v-else />
    </div>
  </main>
</template>
