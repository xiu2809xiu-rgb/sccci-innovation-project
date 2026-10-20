import { eachDay, isWeekend } from './dates.js';
import { PUBLIC_HOLIDAYS } from './reference-data.js';
import type { EntityCode } from './types.js';

/** True for Monday to Friday, excluding the entity's public holidays. */
export function isWorkingDay(entity: EntityCode, date: string): boolean {
  return !isWeekend(date) && !PUBLIC_HOLIDAYS[entity].includes(date);
}

/** True when the date is one of the entity's public holidays. */
export function isPublicHoliday(entity: EntityCode, date: string): boolean {
  return PUBLIC_HOLIDAYS[entity].includes(date);
}

/** Working days from `from` to `to`, inclusive. */
export function workingDaysBetween(entity: EntityCode, from: string, to: string): string[] {
  return eachDay(from, to).filter((day) => isWorkingDay(entity, day));
}
