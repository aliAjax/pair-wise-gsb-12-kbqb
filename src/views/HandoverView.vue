<script setup lang="ts">
import { useStore } from "../store";
import { CHECKPOINTS, HANDOVER_TYPE_LABEL, type Attendance, type CheckpointKey } from "../types";
import { timeLabel } from "../utils";

const store = useStore();

function stageLabel(key: CheckpointKey) {
  return CHECKPOINTS.find((c) => c.key === key)?.label ?? key;
}

function stuckAt(att: Attendance): string {
  if (store.hasException(att)) return "异常待交接确认";
  const key = store.currentKey(att);
  if (key) return `待核对：${stageLabel(key)}`;
  return "待开始";
}

function goRollcall(routeId: string) {
  store.ui.focusRouteId = routeId;
  store.ui.activeTab = "attendance";
}
</script>

<template>
  <section class="stack-panels">
    <section class="panel full">
      <div class="toolbar">
        <h2>待确认交接</h2>
        <span class="hint">没有确认交接的学生不算完成</span>
      </div>
      <div v-if="store.pendingHandovers.length === 0" class="empty">暂无待确认的交接</div>
      <article v-for="h in store.pendingHandovers" :key="h.id" class="record">
        <div class="record-head">
          <p class="record-title">
            {{ store.studentById(h.studentId)?.name }} ·
            {{ HANDOVER_TYPE_LABEL[h.type] }}（{{ stageLabel(h.stage) }}环节）
          </p>
          <span class="status warn">待确认</span>
        </div>
        <div class="details">
          <span>日期: {{ h.date }}</span>
          <span>线路: {{ store.routeById(h.routeId)?.name }}</span>
          <span>交接给: {{ h.parentName }}</span>
          <span>登记时间: {{ timeLabel(h.createdAt) }}</span>
        </div>
        <p class="note">原因：{{ h.reason }}</p>
        <div class="actions">
          <button type="button" @click="store.confirmHandover(h.id)">确认交接</button>
        </div>
      </article>
    </section>

    <section class="panel full">
      <div class="toolbar">
        <h2>未完成点名</h2>
        <span class="hint">跨天保留，可接着处理</span>
      </div>
      <div v-if="store.unfinished.length === 0" class="empty">全部学生均已完成接送</div>
      <article v-for="item in store.unfinished" :key="item.att.id" class="record">
        <div class="record-head">
          <p class="record-title">
            {{ item.att.date }} · {{ item.route.name }} · {{ item.student.name }}
          </p>
          <span class="status warn">{{ stuckAt(item.att) }}</span>
        </div>
        <div class="details">
          <span>站点: {{ item.student.stop }}</span>
          <span>校车: {{ item.route.bus }} / {{ item.route.driver }}</span>
          <span>家长: {{ item.student.parentName }}</span>
          <span>电话: {{ item.student.parentPhone }}</span>
        </div>
        <div class="actions">
          <button type="button" @click="goRollcall(item.route.id)">去点名</button>
        </div>
      </article>
    </section>

    <section v-if="store.confirmedHandovers.length" class="panel full">
      <h2>已确认交接</h2>
      <article v-for="h in store.confirmedHandovers" :key="h.id" class="record">
        <div class="record-head">
          <p class="record-title">
            {{ store.studentById(h.studentId)?.name }} ·
            {{ HANDOVER_TYPE_LABEL[h.type] }}（{{ stageLabel(h.stage) }}环节）
          </p>
          <span class="status">已确认</span>
        </div>
        <div class="details">
          <span>日期: {{ h.date }}</span>
          <span>交接给: {{ h.parentName }}</span>
          <span>确认时间: {{ timeLabel(h.confirmedAt) }}</span>
        </div>
        <p class="note">原因：{{ h.reason }}</p>
      </article>
    </section>
  </section>
</template>
