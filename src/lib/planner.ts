import type { Stage, StageCategory } from '@/store/useProduction';

export interface PlannableOrder {
  id: string;
  deliveryDate: string; // yyyy-MM-dd
  status: string;
}

// Days before the due date that each kind of work should be finished by.
// Layers are baked first and frozen, fillings and frosting come next, decorating is the day before.
const DAYS_BEFORE: Record<StageCategory, number> = { Bake: 3, Filling: 2, Frosting: 2, Decorate: 1, Package: 0, Other: 3 };
// Work that must happen later in the chain than another kind of work.
const RANK: Record<StageCategory, number> = { Bake: 0, Other: 0, Filling: 1, Frosting: 1, Decorate: 2, Package: 3 };

export const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (s: string, n: number) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};

const dayOfWeek = (s: string) => parseDate(s).getDay();

// capacityHours is indexed Sunday(0)..Saturday(6).
export const capacityMinutes = (capacityHours: number[], date: string) => capacityHours[dayOfWeek(date)] * 60;

/**
 * Backward scheduling: start from each order's due date, place the last step first,
 * and slide each step to the latest earlier day that still has room.
 * Returns a date for every unfinished stage of an upcoming order, plus the stages that
 * could not fit without going over the day's limit.
 */
export function planStages(stages: Stage[], orders: PlannableOrder[], capacityHours: number[], today: string) {
  const placements: Record<string, string> = {};
  const overloaded = new Set<string>();
  const used: Record<string, number> = {};

  const upcoming = orders
    .filter((o) => o.deliveryDate && o.deliveryDate >= today && o.status !== 'Delivered')
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));

  // Work that is already finished or in progress counts against the day it was planned for.
  stages.forEach((s) => {
    if ((s.status === 'done' || s.status === 'running') && s.plannedDate) {
      used[s.plannedDate] = (used[s.plannedDate] ?? 0) + s.estimatedMinutes;
    }
  });

  for (const order of upcoming) {
    const todo = stages
      .filter((s) => s.orderId === order.id && (s.status === 'todo' || s.status === 'paused'))
      .map((s, i) => ({ s, i }))
      .sort((a, b) => RANK[b.s.category] - RANK[a.s.category] || b.i - a.i);

    let ceiling = order.deliveryDate;
    let ceilingRank = Infinity;
    for (const { s } of todo) {
      let latest = addDays(order.deliveryDate, -DAYS_BEFORE[s.category]);
      // A step can't happen after a later step in the same order that was placed earlier than its due day.
      if (RANK[s.category] < ceilingRank && latest > ceiling) latest = ceiling;
      if (latest < today) latest = today;

      let day = latest;
      let placed = false;
      while (day >= today) {
        const cap = capacityMinutes(capacityHours, day);
        const load = used[day] ?? 0;
        // A single long step is allowed on an otherwise empty day.
        if (cap > 0 && (load + s.estimatedMinutes <= cap || (load === 0 && s.estimatedMinutes > cap))) {
          placed = true;
          break;
        }
        day = addDays(day, -1);
      }
      if (!placed) {
        day = latest;
        overloaded.add(s.id);
      }
      used[day] = (used[day] ?? 0) + s.estimatedMinutes;
      placements[s.id] = day;
      ceiling = day;
      ceilingRank = RANK[s.category];
    }
  }
  return { placements, overloaded };
}

/** Hours still free between today and a due date, counting each day's limit minus planned work. */
export function freeMinutes(stages: Stage[], capacityHours: number[], today: string, due: string) {
  const used: Record<string, number> = {};
  stages.forEach((s) => {
    if (s.plannedDate && s.status !== 'done') used[s.plannedDate] = (used[s.plannedDate] ?? 0) + s.estimatedMinutes;
  });
  let free = 0;
  for (let d = today; d <= due; d = addDays(d, 1)) {
    free += Math.max(0, capacityMinutes(capacityHours, d) - (used[d] ?? 0));
  }
  return free;
}
