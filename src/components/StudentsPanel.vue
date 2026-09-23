<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useBusStore } from "../store";
import type { Student } from "../types";

const store = useBusStore();

const form = reactive({
  name: "",
  grade: "",
  stop: "",
  parentName: "",
  parentPhone: "",
  routeId: ""
});
const notice = ref("");
const noticeType = ref<"ok" | "warn">("ok");

const routesById = computed(() => store.routes);

function routeLoadLabel(routeId: string) {
  const route = store.routeById(routeId);
  if (!route) return "";
  return `${store.studentsOfRoute(routeId).length}/${route.capacity}`;
}

function submit() {
  notice.value = "";
  if (!form.name.trim()) {
    notice.value = "请填写学生姓名";
    noticeType.value = "warn";
    return;
  }
  const result = store.addStudent({
    name: form.name.trim(),
    grade: form.grade.trim(),
    stop: form.stop.trim(),
    parentName: form.parentName.trim(),
    parentPhone: form.parentPhone.trim(),
    routeId: form.routeId || null
  });
  notice.value = result ?? `学生 ${form.name.trim()} 已登记`;
  noticeType.value = result ? "warn" : "ok";
  form.name = "";
  form.grade = "";
  form.stop = "";
  form.parentName = "";
  form.parentPhone = "";
  form.routeId = "";
}

function onAssignChange(student: Student, event: Event) {
  const target = event.target as HTMLSelectElement;
  const routeId = target.value || null;
  const result = store.assignRoute(student.id, routeId);
  if (result) {
    notice.value = result;
    noticeType.value = "warn";
    target.value = student.routeId ?? "";
  }
}

function remove(student: Student) {
  if (!confirm(`确定删除学生 ${student.name}？其点名与交接记录也会一并清除。`)) return;
  store.removeStudent(student.id);
  notice.value = `学生 ${student.name} 已删除`;
  noticeType.value = "ok";
}
</script>

<template>
  <div class="split-layout">
    <form class="panel" @submit.prevent="submit">
      <h2>登记学生</h2>
      <div class="form-grid">
        <label>
          姓名
          <input v-model="form.name" placeholder="学生姓名" required />
        </label>
        <label>
          班级
          <input v-model="form.grade" placeholder="如：三年级2班" />
        </label>
        <label>
          上下车站点
          <input v-model="form.stop" placeholder="如：晨光小区" />
        </label>
        <label>
          家长姓名（称谓）
          <input v-model="form.parentName" placeholder="如：陈建国（父亲）" />
        </label>
        <label>
          家长电话
          <input v-model="form.parentPhone" placeholder="联系电话" />
        </label>
        <label>
          排入线路
          <select v-model="form.routeId">
            <option value="">待定（不排入线路）</option>
            <option v-for="route in routesById" :key="route.id" :value="route.id">
              {{ route.name }}（{{ routeLoadLabel(route.id) }}）
            </option>
          </select>
        </label>
      </div>
      <p v-if="notice" :class="['alert', noticeType === 'warn' ? 'alert-error' : 'alert-ok']">{{ notice }}</p>
      <div class="form-actions">
        <button type="submit">登记学生</button>
      </div>
    </form>

    <section class="list-panel">
      <div class="toolbar">
        <h2>学生名册（{{ store.students.length }}）</h2>
      </div>

      <section v-if="store.pendingStudents.length" class="pending-box">
        <h3>待定名单（{{ store.pendingStudents.length }}）</h3>
        <p class="pending-hint">以下学生未排入线路（多为准载不足），请调度员尽快安排或加开线路。</p>
        <div v-for="student in store.pendingStudents" :key="student.id" class="pending-row">
          <div class="pending-info">
            <strong>{{ student.name }}</strong>
            <span>{{ student.grade || "未填班级" }}</span>
            <span>站点：{{ student.stop || "未填" }}</span>
          </div>
          <select :value="student.routeId ?? ''" @change="onAssignChange(student, $event)">
            <option value="">待定</option>
            <option v-for="route in routesById" :key="route.id" :value="route.id">
              {{ route.name }}（{{ routeLoadLabel(route.id) }}）
            </option>
          </select>
          <button type="button" class="danger btn-sm" @click="remove(student)">删除</button>
        </div>
      </section>

      <div class="record-grid route-student-grid">
        <article v-for="route in store.routes" :key="route.id" class="record">
          <div class="record-head">
            <p class="record-title">{{ route.name }}</p>
            <span
              :class="['badge', store.studentsOfRoute(route.id).length >= route.capacity ? 'badge-warn' : 'badge-ok']"
            >
              已排 {{ store.studentsOfRoute(route.id).length }} / 准载 {{ route.capacity }}
            </span>
          </div>

          <p v-if="store.studentsOfRoute(route.id).length === 0" class="empty-sm">该线路还没有学生</p>

          <div
            v-for="student in store.studentsOfRoute(route.id)"
            :key="student.id"
            class="student-row"
          >
            <div class="pending-info">
              <strong>{{ student.name }}</strong>
              <span>{{ student.grade || "未填班级" }}</span>
              <span>{{ student.stop || "未填站点" }}</span>
              <span v-if="student.parentName">家长：{{ student.parentName }} {{ student.parentPhone }}</span>
            </div>
            <select :value="student.routeId ?? ''" @change="onAssignChange(student, $event)">
              <option value="">转为待定</option>
              <option v-for="other in routesById" :key="other.id" :value="other.id">
                {{ other.name }}
              </option>
            </select>
            <button type="button" class="danger btn-sm" @click="remove(student)">删除</button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
