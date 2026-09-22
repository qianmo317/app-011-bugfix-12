/**
 * 解析毫米输入。
 * 规则：去空白后必须是非空整数；空格、NaN、小数、非数字一律视为无效。
 * 返回 null 表示不合规，调用方应拒绝录入，不得用 0 兜底。
 */
export function parseMmInt(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

/** 非负整数（允许 0，如偏移量、贴地点位）；无效或负数返回 null。 */
export function parseNonNegativeMm(raw: string): number | null {
  const n = parseMmInt(raw);
  if (n === null || n < 0) return null;
  return n;
}

/** 正整数（宽、高）；无效、0 或负数返回 null。 */
export function parsePositiveMm(raw: string): number | null {
  const n = parseMmInt(raw);
  if (n === null || n <= 0) return null;
  return n;
}
