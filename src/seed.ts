import type { Attendance, Handover, RouteItem, Student } from "./types";
import { fmtDate } from "./utils";

const today = fmtDate(new Date());
const yesterday = fmtDate(new Date(Date.now() - 86400000));

export function seedRoutes(): RouteItem[] {
  return [
    {
      id: "r1",
      name: "阳光1号线",
      date: today,
      bus: "沪A·S1234",
      driver: "董建军",
      attendant: "林老师",
      capacity: 3,
      morningStart: "07:00",
      arriveSchool: "07:50",
      departSchool: "17:00",
      eveningEnd: "18:00",
      createdAt: new Date().toISOString(),
    },
    {
      id: "r2",
      name: "阳光2号线",
      date: today,
      bus: "沪B·S2046",
      driver: "周航",
      attendant: "赵老师",
      capacity: 20,
      morningStart: "07:10",
      arriveSchool: "08:00",
      departSchool: "17:10",
      eveningEnd: "18:10",
      createdAt: new Date().toISOString(),
    },
    {
      id: "r3",
      name: "阳光1号线(昨日班)",
      date: yesterday,
      bus: "沪A·S1234",
      driver: "董建军",
      attendant: "林老师",
      capacity: 20,
      morningStart: "07:00",
      arriveSchool: "07:50",
      departSchool: "17:00",
      eveningEnd: "18:00",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}

export function seedStudents(): Student[] {
  const now = new Date().toISOString();
  const base = { createdAt: now };
  return [
    { ...base, id: "s1", name: "陈一诺", className: "二(1)班", stop: "锦绣东门", routeId: "r1", status: "assigned", parentName: "陈建国", parentPhone: "13800000001" },
    { ...base, id: "s2", name: "李沐阳", className: "二(1)班", stop: "翠微路口", routeId: "r1", status: "assigned", parentName: "李秀兰", parentPhone: "13800000002" },
    { ...base, id: "s3", name: "王可欣", className: "三(2)班", stop: "百合家园", routeId: "r1", status: "assigned", parentName: "王强", parentPhone: "13800000003" },
    { ...base, id: "s4", name: "赵子墨", className: "三(2)班", stop: "百合家园", routeId: "r1", status: "pending", parentName: "赵敏", parentPhone: "13800000004" },
    { ...base, id: "s5", name: "刘思远", className: "一(3)班", stop: "体育馆北门", routeId: "r2", status: "assigned", parentName: "刘洋", parentPhone: "13800000005" },
    { ...base, id: "s6", name: "孙若曦", className: "一(3)班", stop: "文化中心", routeId: "r2", status: "assigned", parentName: "孙丽", parentPhone: "13800000006" },
    { ...base, id: "s7", name: "周雨桐", className: "二(1)班", stop: "锦绣东门", routeId: null, status: "assigned", parentName: "周斌", parentPhone: "13800000007" },
    { ...base, id: "s8", name: "吴星宇", className: "四(1)班", stop: "锦绣东门", routeId: "r3", status: "assigned", parentName: "吴刚", parentPhone: "13800000008" },
    { ...base, id: "s9", name: "林朵朵", className: "四(1)班", stop: "翠微路口", routeId: "r3", status: "assigned", parentName: "林女士", parentPhone: "13800000009" },
  ];
}

/** 昨日班已点过名：吴星宇全程完成，林朵朵到家时错站，交接未确认 */
export function seedAttendance(): Attendance[] {
  const at = (h: number, m: number) => {
    const d = new Date(Date.now() - 86400000);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  return [
    {
      id: "a1",
      routeId: "r3",
      studentId: "s8",
      date: yesterday,
      checks: {
        board: { status: "done", at: at(7, 5) },
        arriveSchool: { status: "done", at: at(7, 48) },
        returnBoard: { status: "done", at: at(17, 6) },
        arriveHome: { status: "done", at: at(17, 40) },
      },
    },
    {
      id: "a2",
      routeId: "r3",
      studentId: "s9",
      date: yesterday,
      checks: {
        board: { status: "done", at: at(7, 8) },
        arriveSchool: { status: "done", at: at(7, 48) },
        returnBoard: { status: "done", at: at(17, 6) },
        arriveHome: { status: "wrongStop", at: at(17, 35) },
      },
    },
  ];
}

export function seedHandovers(): Handover[] {
  return [
    {
      id: "h1",
      studentId: "s9",
      routeId: "r3",
      date: yesterday,
      stage: "arriveHome",
      type: "wrongStop",
      parentName: "林女士",
      reason: "学生在锦绣东门提前下车，已电话联系家长到站点接回",
      confirmed: false,
      confirmedAt: null,
      createdAt: new Date(Date.now() - 86400000 + 17 * 3600000).toISOString(),
    },
  ];
}
