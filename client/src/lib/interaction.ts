export function getCircularIndex(current: number, delta: number, length: number) {
  if (!Number.isInteger(length) || length <= 0) return 0;
  return ((current + delta) % length + length) % length;
}
