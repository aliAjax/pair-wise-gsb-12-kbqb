import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import {
  CHECKPOINTS,
  type Attendance,
  type CheckState,
  type CheckpointKey,
  type Handover,
  type RouteItem,
  type Student,
} from "./types";
import { seedAttendance, seedHandovers, seedRoutes, seedStudents } from "./seed";
import { toMinutes, todayStr } from "./utils";

/** 线路、学生、点名、交接分开保存 */
export const STORAGE_KEYS = {
  routes: "schoolbus-routes",
  students: "schoolbus-students",
  attendance: "schoolbus-attendance",
  handovers: "schoolbus-handovers",
} as const;

function load<T>(key: string, seed: () => T[]): T[] {
  const raw = localStorage.getItem(key);
  if (raw === null) return seed();
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function blankChecks(): Record<CheckpointKey, CheckState> {
  return Object.fromEntries(
    CHECKPOINTS.map((c) => [c.key, { status: "pending", at: null }])
  ) as Record<CheckpointKey, CheckState>;
}

/** 一条线路占用的两个时段窗口：早接、晚送 */
function windowsOf(r: Pick<RouteItem, "morningStart" | "arriveSchool" | "departSchool" | "eveningEnd">) {
  return [
    [toMinutes(r.morningStart), toMinutes(r.arriveSchool)],
    [toMinutes(r.departSchool), toMinutes(r.eveningEnd)],
  ] as [number, number][];
}

function overlaps(a: [number, number], b: [number, number]) {
  return a[0] < b[1] && b[0] < a[1];
}

export type RouteInput = Omit<RouteItem, "id" | "createdAt">;
export type AddRouteResult =
  | { ok: true }
  | { ok: false; error: string; conflicts?: RouteItem[] };

export const useStore = defineStore("schoolbus", () => {
  const routes = ref<RouteItem[]>(load(STORAGE_KEYS.routes, seedRoutes));
  const students = ref<Student[]>(load(STORAGE_KEYS.students, seedStudents));
  const attendance = ref<Attendance[]>(load(STORAGE_KEYS.attendance, seedAttendance));
  const handovers = ref<Handover[]>(load(STORAGE_KEYS.handovers, seedHandovers));

  watch(routes, (v) => save(STORAGE_KEYS.routes, v), { deep: true });
  watch(students, (v) => save(STORAGE_KEYS.students, v), { deep: true });
  watch(attendance, (v) => save(STORAGE_KEYS.attendance, v), { deep: true });
  watch(handovers, (v) => save(STORAGE_KEYS.handovers, v), { deep: true });

  /** 界面状态：当前页签 + 点名页聚焦的线路（待办跳转用） */
  const ui = ref({
    activeTab: "dispatch" as "dispatch" | "students" | "attendance" | "handover",
    focusRouteId: null as string | null,
  });

  // ---------- 线路调度 ----------

  const sortedRoutes = computed(() =>
    [...routes.value].sort((a, b) => b.date.localeCompare(a.date) || a.morningStart.localeCompare(b.morningStart))
  );

  /** 同一校车或司机，在同一天时段重叠即冲突 */
  function findConflicts(candidate: RouteInput): RouteItem[] {
    const wins = windowsOf(candidate);
    return routes.value.filter(
      (r) =>
        r.date === candidate.date &&
        (r.bus === candidate.bus || r.driver === candidate.driver) &&
        windowsOf(r).some((w) => wins.some((c) => overlaps(w, c)))
    );
  }

  function addRoute(input: RouteInput): AddRouteResult {
    if (!(toMinutes(input.morningStart) < toMinutes(input.arriveSchool))) {
      return { ok: false, error: "到校时刻必须晚于早接发车时间" };
    }
    if (!(toMinutes(input.arriveSchool) <= toMinutes(input.departSchool))) {
      return { ok: false, error: "离校时刻不能早于到校时刻" };
    }
    if (!(toMinutes(input.departSchool) < toMinutes(input.eveningEnd))) {
      return { ok: false, error: "预计送完必须晚于离校时刻" };
    }
    if (input.capacity < 1) {
      return { ok: false, error: "准载人数至少为 1" };
    }
    const conflicts = findConflicts(input);
    if (conflicts.length > 0) {
      return { ok: false, error: "同一校车或司机在重叠时段只能跑一趟", conflicts };
    }
    routes.value.push({ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    return { ok: true };
  }

  function removeRoute(id: string) {
    routes.value = routes.value.filter((r) => r.id !== id);
    for (const s of students.value) {
      if (s.routeId === id) {
        s.routeId = null;
        s.status = "assigned";
      }
    }
    attendance.value = attendance.value.filter((a) => a.routeId !== id);
    handovers.value = handovers.value.filter((h) => h.routeId !== id);
  }

  // ---------- 学生与准载 ----------

  const assignedOf = (routeId: string) =>
    students.value.filter((s) => s.routeId === routeId && s.status === "assigned");
  const pendingOf = (routeId: string) =>
    students.value.filter((s) => s.routeId === routeId && s.status === "pending");

  function hasSeat(routeId: string): boolean {
    const route = routes.value.find((r) => r.id === routeId);
    if (!route) return false;
    return assignedOf(routeId).length < route.capacity;
  }

  /** 加入/改派线路：准载够则在册，不够则进待定名单 */
  function assignToRoute(studentId: string, routeId: string | null) {
    const s = students.value.find((x) => x.id === studentId);
    if (!s) return;
    s.routeId = routeId;
    s.status = routeId === null || hasSeat(routeId) ? "assigned" : "pending";
    if (routeId) ensureAttendance(routeId);
  }

  function addStudent(input: Omit<Student, "id" | "createdAt" | "status">) {
    const status: Student["status"] =
      input.routeId === null || hasSeat(input.routeId) ? "assigned" : "pending";
    students.value.push({ ...input, status, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    if (input.routeId) ensureAttendance(input.routeId);
    return status;
  }

  function removeStudent(id: string) {
    students.value = students.value.filter((s) => s.id !== id);
    attendance.value = attendance.value.filter((a) => a.studentId !== id);
    handovers.value = handovers.value.filter((h) => h.studentId !== id);
  }

  /** 有空位时把待定学生补进正式名单（按登记先后） */
  function promotePending(routeId: string) {
    if (!hasSeat(routeId)) return;
    const first = pendingOf(routeId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    if (!first) return;
    first.status = "assigned";
    ensureAttendance(routeId);
  }

  // ---------- 点名 ----------

  function ensureAttendance(routeId: string) {
    const route = routes.value.find((r) => r.id === routeId);
    if (!route) return;
    for (const s of assignedOf(routeId)) {
      const exists = attendance.value.some(
        (a) => a.routeId === routeId && a.studentId === s.id && a.date === route.date
      );
      if (!exists) {
        attendance.value.push({
          id: crypto.randomUUID(),
          routeId,
          studentId: s.id,
          date: route.date,
          checks: blankChecks(),
        });
      }
    }
  }

  function attendanceOf(routeId: string): Attendance[] {
    const route = routes.value.find((r) => r.id === routeId);
    if (!route) return [];
    return assignedOf(routeId)
      .map((s) =>
        attendance.value.find(
          (a) => a.routeId === routeId && a.studentId === s.id && a.date === route.date
        )
      )
      .filter((a): a is Attendance => Boolean(a));
  }

  /** 依次核对：前一环节全部“已核”才能核下一环节；出现异常即终止后续环节 */
  function isActionable(att: Attendance, key: CheckpointKey): boolean {
    if (att.checks[key].status !== "pending") return false;
    const idx = CHECKPOINTS.findIndex((c) => c.key === key);
    return CHECKPOINTS.slice(0, idx).every((c) => att.checks[c.key].status === "done");
  }

  function currentKey(att: Attendance): CheckpointKey | null {
    const hit = CHECKPOINTS.find((c) => isActionable(att, c.key));
    return hit ? hit.key : null;
  }

  function markDone(att: Attendance, key: CheckpointKey) {
    if (!isActionable(att, key)) return;
    att.checks[key] = { status: "done", at: new Date().toISOString() };
  }

  /** 缺席/错站：必须登记交给哪位家长及原因 */
  function markException(
    att: Attendance,
    key: CheckpointKey,
    type: Handover["type"],
    parentName: string,
    reason: string
  ) {
    if (!isActionable(att, key)) return;
    att.checks[key] = { status: type, at: new Date().toISOString() };
    handovers.value.push({
      id: crypto.randomUUID(),
      studentId: att.studentId,
      routeId: att.routeId,
      date: att.date,
      stage: key,
      type,
      parentName,
      reason,
      confirmed: false,
      confirmedAt: null,
      createdAt: new Date().toISOString(),
    });
  }

  function handoversOf(studentId: string, date: string) {
    return handovers.value.filter((h) => h.studentId === studentId && h.date === date);
  }

  function hasException(att: Attendance): boolean {
    return CHECKPOINTS.some((c) => {
      const s = att.checks[c.key].status;
      return s === "absent" || s === "wrongStop";
    });
  }

  /** 完成判定：四环全核完；或出现异常且交接已全部确认 —— 没确认交接不算完成 */
  function isComplete(att: Attendance): boolean {
    const states = CHECKPOINTS.map((c) => att.checks[c.key].status);
    if (states.every((s) => s === "done")) return true;
    if (!states.some((s) => s === "absent" || s === "wrongStop")) return false;
    const related = handoversOf(att.studentId, att.date);
    return related.length > 0 && related.every((h) => h.confirmed);
  }

  // ---------- 交接与待办 ----------

  function confirmHandover(id: string) {
    const h = handovers.value.find((x) => x.id === id);
    if (!h) return;
    h.confirmed = true;
    h.confirmedAt = new Date().toISOString();
  }

  const pendingHandovers = computed(() =>
    handovers.value
      .filter((h) => !h.confirmed)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );

  const confirmedHandovers = computed(() =>
    handovers.value
      .filter((h) => h.confirmed)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );

  /** 跨天未完成事项：第二天打开还能接着处理 */
  const unfinished = computed(() =>
    attendance.value
      .filter((a) => !isComplete(a))
      .map((att) => ({
        att,
        student: students.value.find((s) => s.id === att.studentId),
        route: routes.value.find((r) => r.id === att.routeId),
      }))
      .filter((x): x is { att: Attendance; student: Student; route: RouteItem } =>
        Boolean(x.student && x.route)
      )
      .sort((a, b) => b.att.date.localeCompare(a.att.date))
  );

  const studentById = (id: string) => students.value.find((s) => s.id === id);
  const routeById = (id: string) => routes.value.find((r) => r.id === id);

  const metrics = computed(() => ({
    todayRoutes: routes.value.filter((r) => r.date === todayStr()).length,
    unfinished: unfinished.value.length,
    pendingStudents: students.value.filter((s) => s.status === "pending").length,
    pendingHandovers: pendingHandovers.value.length,
  }));

  return {
    routes,
    students,
    attendance,
    handovers,
    ui,
    sortedRoutes,
    findConflicts,
    addRoute,
    removeRoute,
    assignedOf,
    pendingOf,
    hasSeat,
    assignToRoute,
    addStudent,
    removeStudent,
    promotePending,
    ensureAttendance,
    attendanceOf,
    isActionable,
    currentKey,
    markDone,
    markException,
    handoversOf,
    hasException,
    isComplete,
    confirmHandover,
    pendingHandovers,
    confirmedHandovers,
    unfinished,
    studentById,
    routeById,
    metrics,
  };
});
