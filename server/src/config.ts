// 共享配置模块 — 集中管理常量和 Magic Numbers

// ---- JWT ----
export const JWT_SECRET = process.env.JWT_SECRET || 'pdc-calculator-secret-key-change-in-production';
export const JWT_EXPIRES = '7d';

// ---- 服务器 ----
export const PORT = parseInt(process.env.PORT || '3001', 10);

// ---- 电气工程常量 ----
/** 载流量安全系数 (GB/T 16895) */
export const LOAD_SAFETY_FACTOR = 1.25;
/** 天花板/桥架高度偏移 (m)，电缆垂直段计算用 */
export const CEILING_HEIGHT_OFFSET = 2.5;
/** 铜导体电导率 (m/Ω·mm²) @ 70°C */
export const COPPER_CONDUCTIVITY = 56;
/** 电缆连接预留长度 (m) */
export const CABLE_EXTRA_LENGTH = 2;
/** 拖链直线段余量 (m) */
export const DRAG_CHAIN_STRAIGHT_MARGIN = 1.5;
/** 电缆最小弯曲半径安全系数 */
export const BEND_RADIUS_SAFETY_FACTOR = 1.5;

// ---- 密码策略 ----
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d)/;

// ---- 速率限制 ----
export const LOGIN_RATE_WINDOW_MS = 60_000; // 1 分钟窗口
export const LOGIN_RATE_MAX = 10;             // 最多 10 次

// ---- 文件上传 ----
export const UPLOAD_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
