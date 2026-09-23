<script setup lang="ts">
import { computed, ref } from "vue";
import { useBusStore, todayStr, type UnfinishedItem } from "../store";
import { tripMeta } from "../types";

const store = useBusStore();
const today = todayStr();
const filter = ref<"all" | "pending" | "confirmed">("all");

function localDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dateLabel(date: string) {
  if (date === today) return "今天";
  if (date === localDate(-1)) return "昨天";
  return date;
}

const unfinishedList = computed(() => store.unfinishedItems);

const handoverList = computed(() => {
  return [...store.handovers]
    .filter((handover) => {
      if (filter.value === "pending") return !handover.confirmed;
      if (filter.value === "confirmed") return handover.confirmed;
      return true;
    })
    .sort((a, b) => {
      if (a.confirmed !== b.confirmed) return a.confirmed ? 1 : -1;
      return b.createdAt.localeCompare(a.createdAt);
    });
});

function resume(item: Pick<UnfinishedItem, "date" | "routeId" | "trip">) {
  store.openAttendance(item.date, item.routeId, item.trip);
}
</script>

<template>
  <div class="followup-layout">
    <section class="panel">
      <div class="toolbar">
        <h2>未完成事项（{{ unfinishedList.length }}）</h2>
        <span class="muted">按日期留存，第二天打开仍可继续处理</span>
      </div>

      <div v-if="unfinishedList.length === 0" class="empty">所有应点名趟次都已完成，没有遗留事项。</div>

      <div class="todo-grid">
        <article v-for="item in unfinishedList" :key="`${item.date}-${item.routeId}-${item.trip}`" class="todo-card">
          <div class="todo-head">
            <strong>{{ dateLabel(item.date) }}</strong>
            <span v-if="item.date < today" class="badge badge-danger">遗留</span>
            <span v-else class="badge badge-warn">进行中</span>
          </div>
          <p class="todo-line">{{ item.routeName }} · {{ tripMeta(item.trip).label }}</p>
          <div class="progress-track small">
            <div class="progress-fill" :style="{ width: `${item.total ? (item.done / item.total) * 100 : 0}%` }" />
          </div>
          <p class="todo-line">
            点名完成 {{ item.done }}/{{ item.total }}
            <span v-if="item.unconfirmed" class="alert-text"> · {{ item.unconfirmed }} 条交接待确认</span>
          </p>
          <button type="button" class="btn-sm" @click="resume(item)">继续处理</button>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="toolbar">
        <h2>交接记录（{{ handoverList.length }}）</h2>
        <select v-model="filter">
          <option value="all">全部</option>
          <option value="pending">待确认</option>
          <option value="confirmed">已确认</option>
        </select>
      </div>

      <div v-if="handoverList.length === 0" class="empty">暂无缺席 / 错站交接记录。</div>

      <div class="record-grid">
        <article v-for="handover in handoverList" :key="handover.id" class="record handover-card">
          <div class="record-head">
            <p class="record-title">
              {{ store.studentById(handover.studentId)?.name ?? "学生已删除" }}
              <span class="handover-date">{{ dateLabel(handover.date) }}</span>
            </p>
            <span :class="['badge', handover.confirmed ? 'badge-ok' : 'badge-warn']">
              {{ handover.confirmed ? "已确认" : "待确认" }}
            </span>
          </div>
          <div class="details">
            <span>线路：{{ store.routeById(handover.routeId)?.name ?? "线路已删除" }}</span>
            <span>
              趟次：{{ tripMeta(handover.trip).shortLabel }} ·
              {{ handover.checkpoint === "board" ? tripMeta(handover.trip).boardLabel : tripMeta(handover.trip).arriveLabel }}
            </span>
            <span>类型：{{ handover.type === "absent" ? "缺席" : "错站" }}</span>
            <span>交给家长：{{ handover.receiver }}</span>
            <span class="detail-full">原因：{{ handover.reason }}</span>
          </div>
          <div v-if="!handover.confirmed" class="actions">
            <button type="button" @click="store.confirmHandover(handover.id)">确认交接</button>
            <button
              type="button"
              class="secondary"
              @click="resume({ date: handover.date, routeId: handover.routeId, trip: handover.trip })"
            >
              前往点名台
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
