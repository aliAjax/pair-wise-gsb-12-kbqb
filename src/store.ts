import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type {
  AttendanceRecord,
  CheckpointKey,
  CheckStatus,
  Handover,
  HandoverType,
  RouteItem,
  Student,
  TripType
} from "./types";
import { tripMeta } from "./types";

/** 线路、学生、点名、交接分开保存 */
const KEYS = {
  routes: "dfwlfront-3-routes",
  students: "dfwlfront-3-students",
  attendance: "dfwlfront-3-attendance",
  handovers: "dfwlfront-3-handovers"
} as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateStr(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function load<T>(key: string, fallback: () => T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback();
  } catch {
    return fallback();
  }
}

export interface Conflict {
  resource: string;
  detail: string;
}

interface TripWindow {
  trip: TripType;
  start: string;
  end: string;
}

function windowsOf(route: RouteItem): TripWindow[] {
  return [
    { trip: "morning", start: route.morningStart, end: route.morningArrive },
    { trip: "evening", start: route.eveningStart, end: route.eveningArrive }
  ];
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

/** 同一校车或司机在重叠时段只能跑一趟 */
export function findConflicts(candidate: RouteItem, all: RouteItem[]): Conflict[] {
  const conflicts: Conflict[] = [];
  for (const other of all) {
    if (other.id === candidate.id) continue;
    const shared: string[] = [];
    if (other.busPlate === candidate.busPlate) shared.push(`校车 ${candidate.busPlate}`);
    if (other.driver === candidate.driver) shared.push(`司机 ${candidate.driver}`);
    if (!shared.length) continue;
    for (const wa of windowsOf(candidate)) {
      for (const wb of windowsOf(other)) {
        if (overlaps(wa.start, wa.end, wb.start, wb.end)) {
          conflicts.push({
            resource: shared.join("、"),
            detail: `${shared.join("、")} ${wa.start}–${wa.end} 与「${other.name}」${wb.start}–${wb.end} 时段重叠`
          });
        }
      }
    }
  }
  return conflicts;
}

function seedRoutes(): RouteItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: "route-1",
      name: "1号线·城东方向",
      busPlate: "沪A·S8216",
      driver: "董飞",
      attendant: "林芳",
      capacity: 3,
      morningStart: "07:10",
      morningArrive: "07:55",
      eveningStart: "17:00",
      eveningArrive: "17:50",
      stops: ["晨光小区", "新华书店", "体育馆"],
      createdAt: now
    },
    {
      id: "route-2",
      name: "2号线·城北方向",
      busPlate: "沪B·S7309",
      driver: "周航",
      attendant: "赵敏",
      capacity: 2,
      morningStart: "07:20",
      morningArrive: "08:05",
      eveningStart: "17:10",
      eveningArrive: "18:00",
      stops: ["翠竹苑", "地铁北站"],
      createdAt: now
    }
  ];
}

function seedStudents(): Student[] {
  const now = new Date().toISOString();
  const base = { createdAt: now };
  return [
    { id: "stu-1", name: "陈小雨", grade: "三年级2班", stop: "晨光小区", parentName: "陈建国（父亲）", parentPhone: "13800000001", routeId: "route-1", ...base },
    { id: "stu-2", name: "刘一帆", grade: "四年级1班", stop: "新华书店", parentName: "王莉（母亲）", parentPhone: "13800000002", routeId: "route-1", ...base },
    { id: "stu-3", name: "孙可欣", grade: "三年级2班", stop: "体育馆", parentName: "李娟（母亲）", parentPhone: "13800000003", routeId: "route-1", ...base },
    { id: "stu-4", name: "周子墨", grade: "二年级1班", stop: "翠竹苑", parentName: "周强（父亲）", parentPhone: "13800000004", routeId: "route-2", ...base },
    { id: "stu-5", name: "吴思远", grade: "五年级3班", stop: "地铁北站", parentName: "张燕（母亲）", parentPhone: "13800000005", routeId: "route-2", ...base },
    { id: "stu-6", name: "郑好", grade: "一年级1班", stop: "翠竹苑", parentName: "郑军（父亲）", parentPhone: "13800000006", routeId: null, ...base }
  ];
}

function seedAttendance(): AttendanceRecord[] {
  const yesterday = dateStr(-1);
  const now = new Date().toISOString();
  return [
    { id: "att-1", date: yesterday, routeId: "route-1", trip: "morning", studentId: "stu-1", board: "ok", arrive: "ok", updatedAt: now },
    { id: "att-2", date: yesterday, routeId: "route-1", trip: "morning", studentId: "stu-2", board: "absent", arrive: "skipped", updatedAt: now },
    { id: "att-3", date: yesterday, routeId: "route-1", trip: "morning", studentId: "stu-3", board: "ok", arrive: "pending", updatedAt: now }
  ];
}

function seedHandovers(): Handover[] {
  return [
    {
      id: "ho-1",
      attendanceId: "att-2",
      date: dateStr(-1),
      routeId: "route-1",
      trip: "morning",
      studentId: "stu-2",
      checkpoint: "board",
      type: "absent",
      receiver: "王莉（母亲）",
      reason: "孩子凌晨发烧，家长电话请假，留在家中休息",
      confirmed: false,
      createdAt: new Date().toISOString()
    }
  ];
}

export interface UnfinishedItem {
  date: string;
  routeId: string;
  routeName: string;
  trip: TripType;
  total: number;
  done: number;
  unconfirmed: number;
}

export const useBusStore = defineStore("school-bus", () => {
  const routes = ref<RouteItem[]>(load(KEYS.routes, seedRoutes));
  const students = ref<Student[]>(load(KEYS.students, seedStudents));
  const attendance = ref<AttendanceRecord[]>(load(KEYS.attendance, seedAttendance));
  const handovers = ref<Handover[]>(load(KEYS.handovers, seedHandovers));

  // 界面状态（不持久化，每次打开默认回到今天）
  const activeTab = ref<"dispatch" | "students" | "attendance" | "followup">("attendance");
  const selectedDate = ref(todayStr());
  const selectedRouteId = ref(routes.value[0]?.id ?? "");
  const selectedTrip = ref<TripType>("morning");

  const persistRoutes = () => localStorage.setItem(KEYS.routes, JSON.stringify(routes.value));
  const persistStudents = () => localStorage.setItem(KEYS.students, JSON.stringify(students.value));
  const persistAttendance = () => localStorage.setItem(KEYS.attendance, JSON.stringify(attendance.value));
  const persistHandovers = () => localStorage.setItem(KEYS.handovers, JSON.stringify(handovers.value));

  // ---------- 查询 ----------

  const routeById = (id: string) => routes.value.find((route) => route.id === id);
  const studentById = (id: string) => students.value.find((student) => student.id === id);

  const studentsOfRoute = (routeId: string) =>
    students.value
      .filter((student) => student.routeId === routeId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const pendingStudents = computed(() => students.value.filter((student) => student.routeId === null));

  const conflictsByRoute = computed(() => {
    const map = new Map<string, Conflict[]>();
    for (const route of routes.value) map.set(route.id, findConflicts(route, routes.value));
    return map;
  });

  // ---------- 线路 ----------

  function saveRoute(payload: Omit<RouteItem, "id" | "createdAt"> & { id?: string }): string | null {
    const existing = payload.id ? routeById(payload.id) : undefined;
    const candidate: RouteItem = {
      ...payload,
      id: payload.id ?? crypto.randomUUID(),
      createdAt: existing?.createdAt ?? new Date().toISOString()
    };
    const conflicts = findConflicts(candidate, routes.value);
    if (conflicts.length) {
      return `时段冲突：${conflicts.map((item) => item.detail).join("；")}`;
    }
    if (existing) {
      routes.value = routes.value.map((route) => (route.id === candidate.id ? candidate : route));
    } else {
      routes.value = [...routes.value, candidate];
    }
    // 准载调小时，把多排的学生退回待定名单
    const assigned = studentsOfRoute(candidate.id);
    if (assigned.length > candidate.capacity) {
      for (const student of assigned.slice(candidate.capacity)) student.routeId = null;
      persistStudents();
    }
    persistRoutes();
    return null;
  }

  function removeRoute(id: string) {
    routes.value = routes.value.filter((route) => route.id !== id);
    for (const student of students.value) {
      if (student.routeId === id) student.routeId = null;
    }
    if (selectedRouteId.value === id) selectedRouteId.value = routes.value[0]?.id ?? "";
    persistRoutes();
    persistStudents();
  }

  // ---------- 学生 ----------

  function addStudent(payload: Omit<Student, "id" | "createdAt">): string | null {
    let routeId = payload.routeId;
    let notice: string | null = null;
    if (routeId) {
      const route = routeById(routeId);
      if (!route) return "所选线路不存在";
      if (studentsOfRoute(routeId).length >= route.capacity) {
        routeId = null;
        notice = `「${route.name}」准载 ${route.capacity} 人已满，${payload.name} 已列入待定名单`;
      }
    }
    students.value = [
      ...students.value,
      { ...payload, routeId, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    ];
    persistStudents();
    return notice;
  }

  function assignRoute(studentId: string, routeId: string | null): string | null {
    const student = studentById(studentId);
    if (!student) return "学生不存在";
    if (routeId) {
      const route = routeById(routeId);
      if (!route) return "线路不存在";
      const load = studentsOfRoute(routeId).length;
      if (load >= route.capacity) {
        return `「${route.name}」准载 ${route.capacity} 人，已排 ${load} 人，无法再排入`;
      }
    }
    student.routeId = routeId;
    persistStudents();
    return null;
  }

  function removeStudent(id: string) {
    students.value = students.value.filter((student) => student.id !== id);
    attendance.value = attendance.value.filter((record) => record.studentId !== id);
    handovers.value = handovers.value.filter((handover) => handover.studentId !== id);
    persistStudents();
    persistAttendance();
    persistHandovers();
  }

  // ---------- 点名 ----------

  const getRecord = (date: string, routeId: string, trip: TripType, studentId: string) =>
    attendance.value.find(
      (record) =>
        record.date === date && record.routeId === routeId && record.trip === trip && record.studentId === studentId
    );

  function ensureRecord(date: string, routeId: string, trip: TripType, studentId: string): AttendanceRecord {
    const existing = getRecord(date, routeId, trip, studentId);
    if (existing) return existing;
    const record: AttendanceRecord = {
      id: crypto.randomUUID(),
      date,
      routeId,
      trip,
      studentId,
      board: "pending",
      arrive: "pending",
      updatedAt: new Date().toISOString()
    };
    attendance.value = [...attendance.value, record];
    persistAttendance();
    return record;
  }

  /** 依次核对：前一环节未处理时不能核对后一环节；异常后后续环节免核对 */
  function markCheckpoint(
    date: string,
    routeId: string,
    trip: TripType,
    studentId: string,
    checkpoint: CheckpointKey,
    status: CheckStatus
  ): string | null {
    const record = ensureRecord(date, routeId, trip, studentId);
    if (checkpoint === "arrive" && record.board === "pending") {
      return `请先核对「${tripMeta(trip).boardLabel}」环节`;
    }
    record[checkpoint] = status;
    if (status !== "ok" && checkpoint === "board") {
      record.arrive = "skipped";
    }
    record.updatedAt = new Date().toISOString();
    persistAttendance();
    return null;
  }

  /** 重置某学生该趟次的点名，连同交接记录一起清除 */
  function resetRecord(date: string, routeId: string, trip: TripType, studentId: string) {
    const record = getRecord(date, routeId, trip, studentId);
    if (!record) return;
    attendance.value = attendance.value.filter((item) => item.id !== record.id);
    handovers.value = handovers.value.filter((item) => item.attendanceId !== record.id);
    persistAttendance();
    persistHandovers();
  }

  // ---------- 交接 ----------

  function addHandover(input: {
    date: string;
    routeId: string;
    trip: TripType;
    studentId: string;
    checkpoint: CheckpointKey;
    type: HandoverType;
    receiver: string;
    reason: string;
  }) {
    const record = ensureRecord(input.date, input.routeId, input.trip, input.studentId);
    // 同一环节重新登记交接时，替换掉未确认的旧记录
    handovers.value = handovers.value.filter(
      (item) =>
        !(item.attendanceId === record.id && item.checkpoint === input.checkpoint && !item.confirmed)
    );
    handovers.value = [
      ...handovers.value,
      {
        ...input,
        id: crypto.randomUUID(),
        attendanceId: record.id,
        confirmed: false,
        createdAt: new Date().toISOString()
      }
    ];
    persistHandovers();
  }

  function confirmHandover(id: string) {
    const handover = handovers.value.find((item) => item.id === id);
    if (!handover) return;
    handover.confirmed = true;
    persistHandovers();
  }

  const handoversOfRecord = (recordId: string) =>
    handovers.value.filter((handover) => handover.attendanceId === recordId);

  // ---------- 完成判定 ----------

  /** 环节完成 = 正常 / 免核对 / 异常但交接已确认；没有确认交接不算完成 */
  function checkpointResolved(record: AttendanceRecord, checkpoint: CheckpointKey): boolean {
    const status = record[checkpoint];
    if (status === "ok" || status === "skipped") return true;
    if (status === "pending") return false;
    return handovers.value.some(
      (handover) => handover.attendanceId === record.id && handover.checkpoint === checkpoint && handover.confirmed
    );
  }

  const recordComplete = (record: AttendanceRecord) =>
    checkpointResolved(record, "board") && checkpointResolved(record, "arrive");

  /** 该趟次应点名的学生：今天按当前名册，历史日期按已有记录（可接着处理） */
  function expectedStudentIds(date: string, routeId: string, trip: TripType): string[] {
    const ids = new Set<string>();
    if (date === todayStr()) {
      for (const student of studentsOfRoute(routeId)) ids.add(student.id);
    }
    for (const record of attendance.value) {
      if (record.date === date && record.routeId === routeId && record.trip === trip) ids.add(record.studentId);
    }
    return [...ids];
  }

  function tripProgress(date: string, routeId: string, trip: TripType) {
    const ids = expectedStudentIds(date, routeId, trip);
    const done = ids.filter((id) => {
      const record = getRecord(date, routeId, trip, id);
      return record ? recordComplete(record) : false;
    }).length;
    return { total: ids.length, done };
  }

  /** 未完成事项：今天及以前、有活动痕迹但还没点完或交接未确认的趟次 */
  function computeUnfinished(): UnfinishedItem[] {
    const today = todayStr();
    const dates = new Set<string>([today]);
    for (const record of attendance.value) if (record.date <= today) dates.add(record.date);
    for (const handover of handovers.value) if (handover.date <= today) dates.add(handover.date);

    const items: UnfinishedItem[] = [];
    for (const date of dates) {
      for (const route of routes.value) {
        const hasActivity =
          date === today ||
          attendance.value.some((record) => record.date === date && record.routeId === route.id) ||
          handovers.value.some((handover) => handover.date === date && handover.routeId === route.id);
        if (!hasActivity) continue;
        for (const trip of ["morning", "evening"] as TripType[]) {
          const { total, done } = tripProgress(date, route.id, trip);
          if (!total) continue;
          const unconfirmed = handovers.value.filter(
            (handover) =>
              handover.date === date && handover.routeId === route.id && handover.trip === trip && !handover.confirmed
          ).length;
          if (done < total || unconfirmed > 0) {
            items.push({ date, routeId: route.id, routeName: route.name, trip, total, done, unconfirmed });
          }
        }
      }
    }
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }

  const unfinishedItems = computed(computeUnfinished);
  const overdueCount = computed(() => computeUnfinished().filter((item) => item.date < todayStr()).length);

  const todayProgress = computed(() => {
    let total = 0;
    let done = 0;
    for (const route of routes.value) {
      for (const trip of ["morning", "evening"] as TripType[]) {
        const progress = tripProgress(todayStr(), route.id, trip);
        total += progress.total;
        done += progress.done;
      }
    }
    return { total, done };
  });

  // 有昨天及以前的未完成事项时，默认先打开待办页
  if (overdueCount.value > 0) activeTab.value = "followup";

  function openAttendance(date: string, routeId: string, trip: TripType) {
    selectedDate.value = date;
    selectedRouteId.value = routeId;
    selectedTrip.value = trip;
    activeTab.value = "attendance";
  }

  return {
    routes,
    students,
    attendance,
    handovers,
    activeTab,
    selectedDate,
    selectedRouteId,
    selectedTrip,
    routeById,
    studentById,
    studentsOfRoute,
    pendingStudents,
    conflictsByRoute,
    saveRoute,
    removeRoute,
    addStudent,
    assignRoute,
    removeStudent,
    getRecord,
    markCheckpoint,
    resetRecord,
    addHandover,
    confirmHandover,
    handoversOfRecord,
    checkpointResolved,
    recordComplete,
    expectedStudentIds,
    tripProgress,
    unfinishedItems,
    overdueCount,
    todayProgress,
    openAttendance
  };
});
