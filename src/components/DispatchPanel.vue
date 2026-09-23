<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useBusStore } from "../store";
import type { RouteItem } from "../types";

const store = useBusStore();

interface RouteForm {
  name: string;
  busPlate: string;
  driver: string;
  attendant: string;
  capacity: number;
  morningStart: string;
  morningArrive: string;
  eveningStart: string;
  eveningArrive: string;
  stopsText: string;
}

function blankForm(): RouteForm {
  return {
    name: "",
    busPlate: "",
    driver: "",
    attendant: "",
    capacity: 30,
    morningStart: "07:00",
    morningArrive: "07:50",
    eveningStart: "17:00",
    eveningArrive: "17:50",
    stopsText: ""
  };
}

const form = reactive<RouteForm>(blankForm());
const editingId = ref<string | null>(null);
const error = ref("");
const notice = ref("");

const editingRoute = computed(() => (editingId.value ? store.routeById(editingId.value) : undefined));

function fillForm(route: RouteItem) {
  editingId.value = route.id;
  Object.assign(form, {
    name: route.name,
    busPlate: route.busPlate,
    driver: route.driver,
    attendant: route.attendant,
    capacity: route.capacity,
    morningStart: route.morningStart,
    morningArrive: route.morningArrive,
    eveningStart: route.eveningStart,
    eveningArrive: route.eveningArrive,
    stopsText: route.stops.join("、")
  });
  error.value = "";
  notice.value = "";
}

function cancelEdit() {
  editingId.value = null;
  Object.assign(form, blankForm());
  error.value = "";
}

function submit() {
  error.value = "";
  notice.value = "";
  const payload = {
    id: editingId.value ?? undefined,
    name: form.name.trim(),
    busPlate: form.busPlate.trim(),
    driver: form.driver.trim(),
    attendant: form.attendant.trim(),
    capacity: Number(form.capacity),
    morningStart: form.morningStart,
    morningArrive: form.morningArrive,
    eveningStart: form.eveningStart,
    eveningArrive: form.eveningArrive,
    stops: form.stopsText
      .split(/[、,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  };
  if (!payload.name || !payload.busPlate || !payload.driver) {
    error.value = "线路名称、校车车牌和司机为必填项";
    return;
  }
  if (payload.capacity <= 0) {
    error.value = "准载人数必须大于 0";
    return;
  }
  if (payload.morningStart >= payload.morningArrive) {
    error.value = "早接发车时刻必须早于到校时刻";
    return;
  }
  if (payload.eveningStart >= payload.eveningArrive) {
    error.value = "离校时刻必须早于预计到家时刻";
    return;
  }
  const result = store.saveRoute(payload);
  if (result) {
    error.value = result;
    return;
  }
  notice.value = editingId.value ? "线路已更新" : "线路已排入，可到学生名册安排乘车学生";
  if (!store.selectedRouteId) store.selectedRouteId = payload.id ?? "";
  cancelEdit();
}

function remove(route: RouteItem) {
  if (!confirm(`确定删除「${route.name}」？该线路上的学生将转为待定。`)) return;
  store.removeRoute(route.id);
  if (editingId.value === route.id) cancelEdit();
  notice.value = "线路已删除，学生已转入待定名单";
}
</script>

<template>
  <div class="split-layout">
    <form class="panel" @submit.prevent="submit">
      <h2>{{ editingRoute ? `编辑线路：${editingRoute.name}` : "新增线路排班" }}</h2>
      <div class="form-grid">
        <label>
          线路名称
          <input v-model="form.name" placeholder="如：1号线·城东方向" required />
        </label>
        <label>
          校车车牌
          <input v-model="form.busPlate" placeholder="如：沪A·S8216" required />
        </label>
        <label>
          司机
          <input v-model="form.driver" placeholder="司机姓名" required />
        </label>
        <label>
          跟车员
          <input v-model="form.attendant" placeholder="跟车员姓名" />
        </label>
        <label>
          准载人数
          <input v-model.number="form.capacity" type="number" min="1" required />
        </label>
      </div>

      <h3 class="form-section">早接时段</h3>
      <div class="form-grid form-row">
        <label>
          发车（上车开始）
          <input v-model="form.morningStart" type="time" required />
        </label>
        <label>
          到校
          <input v-model="form.morningArrive" type="time" required />
        </label>
      </div>

      <h3 class="form-section">晚送时段</h3>
      <div class="form-grid form-row">
        <label>
          离校
          <input v-model="form.eveningStart" type="time" required />
        </label>
        <label>
          预计到家
          <input v-model="form.eveningArrive" type="time" required />
        </label>
      </div>

      <div class="form-grid">
        <label>
          途经站点（顿号或逗号分隔）
          <textarea v-model="form.stopsText" placeholder="晨光小区、新华书店、体育馆" />
        </label>
      </div>

      <p v-if="error" class="alert alert-error">{{ error }}</p>
      <p v-if="notice" class="alert alert-ok">{{ notice }}</p>

      <div class="form-actions">
        <button type="submit">{{ editingRoute ? "保存修改" : "排入线路" }}</button>
        <button v-if="editingRoute" type="button" class="secondary" @click="cancelEdit">取消编辑</button>
      </div>
    </form>

    <section class="list-panel">
      <div class="toolbar">
        <h2>线路列表（{{ store.routes.length }}）</h2>
      </div>

      <div v-if="store.routes.length === 0" class="empty">还没有线路，请先排班</div>

      <div class="record-grid">
        <article v-for="route in store.routes" :key="route.id" class="record">
          <div class="record-head">
            <p class="record-title">{{ route.name }}</p>
            <span v-if="store.conflictsByRoute.get(route.id)?.length" class="badge badge-danger">
              时段冲突 {{ store.conflictsByRoute.get(route.id)!.length }}
            </span>
            <span v-else class="badge badge-ok">排班正常</span>
          </div>

          <div class="details">
            <span>校车：{{ route.busPlate }}</span>
            <span>司机：{{ route.driver }}</span>
            <span>跟车员：{{ route.attendant || "未安排" }}</span>
            <span>
              准载：<strong>{{ store.studentsOfRoute(route.id).length }} / {{ route.capacity }}</strong> 人
            </span>
            <span>早接：{{ route.morningStart }}–{{ route.morningArrive }}</span>
            <span>晚送：{{ route.eveningStart }}–{{ route.eveningArrive }}</span>
          </div>

          <p v-if="route.stops.length" class="note">站点：{{ route.stops.join(" → ") }}</p>

          <ul v-if="store.conflictsByRoute.get(route.id)?.length" class="conflict-list">
            <li v-for="(conflict, index) in store.conflictsByRoute.get(route.id)" :key="index" class="alert-text">
              {{ conflict.detail }}
            </li>
          </ul>

          <div class="actions">
            <button type="button" class="secondary" @click="fillForm(route)">编辑</button>
            <button type="button" class="danger" @click="remove(route)">删除</button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
