import { describe, it, expect } from 'vitest';
import { planStages, freeMinutes, addDays } from '@/lib/planner';
import type { Stage, StageCategory } from '@/store/useProduction';

// 2030-01-07 is a Monday; 2030-01-12 is the Saturday after it.
const TODAY = '2030-01-07';
const SAT = '2030-01-12';
const CAP = [3, 2, 2, 2, 2, 2, 6]; // Sun..Sat hours

let n = 0;
const stage = (orderId: string, category: StageCategory, minutes: number): Stage => ({
  id: `s${n++}`, orderId, name: category, category, estimatedMinutes: minutes, status: 'todo', elapsedMs: 0, source: 'timed',
});
const order = (id: string, deliveryDate: string) => ({ id, deliveryDate, status: 'Confirmed' });

describe('planStages', () => {
  it('works backward from the due date: bake early, decorate the day before, package on the day', () => {
    const stages = [stage('a', 'Bake', 45), stage('a', 'Filling', 30), stage('a', 'Decorate', 90), stage('a', 'Package', 30)];
    const { placements } = planStages(stages, [order('a', SAT)], CAP, TODAY);
    expect(placements[stages[0].id]).toBe('2030-01-09'); // bake: 3 days before
    expect(placements[stages[1].id]).toBe('2030-01-10'); // filling: 2 days before
    expect(placements[stages[2].id]).toBe('2030-01-11'); // decorate: day before
    expect(placements[stages[3].id]).toBe(SAT);
  });

  it('never schedules a step after a later step of the same order', () => {
    const stages = [stage('a', 'Bake', 110), stage('a', 'Frosting', 110), stage('a', 'Decorate', 110)];
    const { placements } = planStages(stages, [order('a', SAT)], CAP, TODAY);
    expect(placements[stages[0].id] <= placements[stages[1].id]).toBe(true);
    expect(placements[stages[1].id] <= placements[stages[2].id]).toBe(true);
  });

  it('moves work earlier when a day is full instead of overbooking it', () => {
    const a = [stage('a', 'Decorate', 120)];
    const b = [stage('b', 'Decorate', 120)];
    const { placements, overloaded } = planStages([...a, ...b], [order('a', SAT), order('b', SAT)], CAP, TODAY);
    expect(placements[a[0].id]).not.toBe(placements[b[0].id]); // Friday holds only 2h
    expect(overloaded.size).toBe(0);
  });

  it('flags work that cannot fit before today', () => {
    const stages = [stage('a', 'Decorate', 600)]; // 10h decorating, nothing but 2h days available
    const { overloaded } = planStages(stages, [order('a', addDays(TODAY, 1))], CAP, TODAY);
    expect(overloaded.size).toBe(0); // a single long step is allowed on an empty day
    const two = [stage('a', 'Decorate', 120), stage('b', 'Decorate', 120)];
    const r = planStages(two, [order('a', TODAY), order('b', TODAY)], CAP, TODAY);
    expect(r.overloaded.size).toBe(1);
  });

  it('ignores delivered and past orders', () => {
    const stages = [stage('a', 'Bake', 45)];
    const { placements } = planStages(stages, [{ id: 'a', deliveryDate: SAT, status: 'Delivered' }], CAP, TODAY);
    expect(Object.keys(placements)).toHaveLength(0);
  });
});

describe('freeMinutes', () => {
  it('subtracts planned work from capacity', () => {
    const s = { ...stage('a', 'Bake', 60), plannedDate: TODAY };
    // Monday..Tuesday: 2h + 2h = 240 min, minus 60
    expect(freeMinutes([s], CAP, TODAY, addDays(TODAY, 1))).toBe(180);
  });
});
