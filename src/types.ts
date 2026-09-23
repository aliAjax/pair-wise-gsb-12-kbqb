export type TripType = "morning" | "evening";
export type CheckpointKey = "board" | "arrive";
export type CheckStatus = "pending" | "ok" | "absent" | "wrong_stop" | "skipped";
export type HandoverType = "absent" | "wrong_stop";

/** 线路：一辆校车 + 一名司机 + 一名跟车员，按早晚两个时段跑 */
export interface RouteItem {
  id: string;
  name: string;
  busPlate: string;
  driver: string;
  attendant: string;
  capacity: number;
  morningStart: string; // 早接发车时刻 HH:MM
  morningArrive: string; // 到校时刻
  eveningStart: string; // 离校时刻
  eveningArrive: string; // 预计到家时刻
  stops: string[];
  createdAt: string;
}

/** 学生：routeId 为 null 表示待定（准载不够等原因未排入线路） */
export interface Student {
  id: string;
  name: string;
  grade: string;
  stop: string;
  parentName: string;
  parentPhone: string;
  routeId: string | null;
  createdAt: string;
}

/** 点名记录：某天某线路某趟次某学生，两个环节依次核对 */
export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  routeId: string;
  trip: TripType;
  studentId: string;
  board: CheckStatus; // 早接=上车，晚送=返程上车
  arrive: CheckStatus; // 早接=到校，晚送=到家
  updatedAt: string;
}

/** 交接记录：缺席或错站时，写清交给了哪位家长及原因，确认后才算完成 */
export interface Handover {
  id: string;
  attendanceId: string;
  date: string;
  routeId: string;
  trip: TripType;
  studentId: string;
  checkpoint: CheckpointKey;
  type: HandoverType;
  receiver: string; // 交给了哪位家长
  reason: string; // 原因
  confirmed: boolean; // 家长/跟车员双方确认交接
  createdAt: string;
}

export const TRIPS: ReadonlyArray<{
  key: TripType;
  label: string;
  shortLabel: string;
  boardLabel: string;
  arriveLabel: string;
}> = [
  { key: "morning", label: "早接（上学）", shortLabel: "早接", boardLabel: "上车", arriveLabel: "到校" },
  { key: "evening", label: "晚送（回家）", shortLabel: "晚送", boardLabel: "返程上车", arriveLabel: "到家" }
];

export const CHECKPOINT_ORDER: CheckpointKey[] = ["board", "arrive"];

export const STATUS_TEXT: Record<CheckStatus, string> = {
  pending: "待核对",
  ok: "正常",
  absent: "缺席",
  wrong_stop: "错站",
  skipped: "免核对"
};

export function tripMeta(trip: TripType) {
  return TRIPS.find((item) => item.key === trip) ?? TRIPS[0];
}
