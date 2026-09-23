export const CHECKPOINTS = [
  { key: "board", label: "上车" },
  { key: "arriveSchool", label: "到校" },
  { key: "returnBoard", label: "返程上车" },
  { key: "arriveHome", label: "到家" },
] as const;

export type CheckpointKey = (typeof CHECKPOINTS)[number]["key"];

export type CheckStatus = "pending" | "done" | "absent" | "wrongStop";

export interface CheckState {
  status: CheckStatus;
  at: string | null;
}

/** 线路排班：一条线路一天一条，含早晚两个时段窗口 */
export interface RouteItem {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD 排班日期
  bus: string; // 校车车牌
  driver: string;
  attendant: string; // 跟车员
  capacity: number; // 准载人数
  morningStart: string; // 早接发车 HH:mm
  arriveSchool: string; // 到校时刻
  departSchool: string; // 离校时刻
  eveningEnd: string; // 预计送完
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  className: string;
  stop: string; // 上下车站点
  routeId: string | null; // null = 未排线
  status: "assigned" | "pending"; // pending = 准载不足，待定
  parentName: string;
  parentPhone: string;
  createdAt: string;
}

/** 点名：一名学生一天一条，四个环节依次核对 */
export interface Attendance {
  id: string;
  routeId: string;
  studentId: string;
  date: string;
  checks: Record<CheckpointKey, CheckState>;
}

/** 交接：缺席或错站时必须登记交给哪位家长及原因，确认后学生才算完成 */
export interface Handover {
  id: string;
  studentId: string;
  routeId: string;
  date: string;
  stage: CheckpointKey; // 发生在哪个环节
  type: "absent" | "wrongStop";
  parentName: string; // 交给了哪位家长
  reason: string;
  confirmed: boolean; // 交接是否已确认
  confirmedAt: string | null;
  createdAt: string;
}

export const CHECK_STATUS_LABEL: Record<CheckStatus, string> = {
  pending: "待核",
  done: "已核",
  absent: "缺席",
  wrongStop: "错站",
};

export const HANDOVER_TYPE_LABEL: Record<Handover["type"], string> = {
  absent: "缺席",
  wrongStop: "错站",
};
