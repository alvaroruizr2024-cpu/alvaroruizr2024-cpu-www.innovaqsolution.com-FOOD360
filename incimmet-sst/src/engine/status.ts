import type { Direction, StatusLevel } from '../domain/model';

/** 'down': verde ≤ meta, ámbar ≤ meta×(1+banda), rojo por encima. 'up': espejo. Sin meta → neutral. */
export function statusFor(value: number | null, target: number | null, direction: Direction, warnBand: number): StatusLevel {
  if (value === null || !Number.isFinite(value)) return 'nodata';
  if (target === null || direction === 'context' || direction === 'range') return 'neutral';
  if (direction === 'down') return value <= target ? 'good' : value <= target * (1 + warnBand) ? 'warn' : 'crit';
  return value >= target ? 'good' : value >= target * (1 - warnBand) ? 'warn' : 'crit';
}
/** Fatalidades y fallas activas: 0 verde, > 0 rojo. */
export const zeroTolerance = (value: number | null): StatusLevel => (value === null ? 'nodata' : value > 0 ? 'crit' : 'good');
