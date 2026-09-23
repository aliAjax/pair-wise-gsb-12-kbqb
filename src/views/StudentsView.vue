<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useStore } from "../store";

const store = useStore();

const form = reactive({
  name: "",
  className: "",
  stop: "",
  routeId: "" as string, // 空串 = 未排线
  parentName: "",
  parentPhone: "",
});

const notice = ref("");

function submit() {
  const status = store.addStudent({ ...form, routeId: form.routeId || null });
  notice.value =
    status === "pending"
      ? `${form.name} 已登记，但线路准载已满，列入待定名单`
      : `${form.name} 已登记`;
  form.name = "";
  form.className = "";
  form.stop = "";
  form.parentName = "";
  form.parentPhone = "";
}

const filter = ref("all");
const filtered = computed(() => {
  if (filter.value === "pending") return store.students.filter((s) => s.status === "pending");
  if (filter.value === "unrouted") return store.students.filter((s) => s.routeId === null);
  if (filter.value === "all") return store.students;
  return store.students.filter((s) => s.routeId === filter.value);
});

function routeName(routeId: string | null): string {
  if (!routeId) return "未排线";
  const r = store.routeById(routeId);
  return r ? `${r.date} ${r.name}` : "未排线";
}

function statusLabel(s: { routeId: string | null; status: string }): string {
  if (s.status === "pending") return "待定";
  return s.routeId ? "在册" : "未排线";
}

function onReassign(studentId: string, event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  store.assignToRoute(studentId, value || null);
}
</script>

<template>
  <section class="workspace">
    <form class="panel" @submit.prevent="submit">
      <h2>新增学生</h2>
      <div class="form-grid">
        <label>
          姓名
          <input v-model="form.name" required />
        </label>
        <label>
          班级
          <input v-model="form.className" required placeholder="如：二(1)班" />
        </label>
        <label>
          上下车站点
          <input v-model="form.stop" required placeholder="如：锦绣东门" />
        </label>
        <label>
          家长姓名
          <input v-model="form.parentName" required />
        </label>
        <label>
          家长电话
          <input v-model="form.parentPhone" required />
        </label>
        <label>
          安排线路
          <select v-model="form.routeId">
            <option value="">暂不排线</option>
            <option v-for="r in store.sortedRoutes" :key="r.id" :value="r.id">
              {{ r.date }} · {{ r.name }}（{{ store.assignedOf(r.id).length }}/{{ r.capacity }}）
            </option>
          </select>
        </label>
        <p v-if="notice" class="note">{{ notice }}</p>
        <button type="submit">登记学生</button>
      </div>
    </form>

    <section class="list-panel">
      <div class="toolbar">
        <h2>学生名册</h2>
        <select v-model="filter">
          <option value="all">全部学生</option>
          <option value="pending">仅看待定</option>
          <option value="unrouted">仅看未排线</option>
          <option v-for="r in store.sortedRoutes" :key="r.id" :value="r.id">
            {{ r.date }} · {{ r.name }}
          </option>
        </select>
      </div>
      <div class="record-grid">
        <div v-if="filtered.length === 0" class="empty">暂无匹配学生</div>
        <article v-for="s in filtered" :key="s.id" class="record">
          <div class="record-head">
            <p class="record-title">{{ s.name }} · {{ s.className }}</p>
            <span class="status" :class="{ warn: s.status === 'pending' }">{{ statusLabel(s) }}</span>
          </div>
          <div class="details">
            <span>站点: {{ s.stop }}</span>
            <span>线路: {{ routeName(s.routeId) }}</span>
            <span>家长: {{ s.parentName }}</span>
            <span>电话: {{ s.parentPhone }}</span>
          </div>
          <div class="actions">
            <select
              class="inline-select"
              :value="s.routeId ?? ''"
              @change="onReassign(s.id, $event)"
            >
              <option value="">改为未排线</option>
              <option v-for="r in store.sortedRoutes" :key="r.id" :value="r.id">
                改派 → {{ r.date }} {{ r.name }}
              </option>
            </select>
            <button
              v-if="s.status === 'pending' && s.routeId && store.hasSeat(s.routeId)"
              type="button"
              @click="store.promotePending(s.routeId)"
            >
              补位
            </button>
            <button class="danger" type="button" @click="store.removeStudent(s.id)">删除</button>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>
