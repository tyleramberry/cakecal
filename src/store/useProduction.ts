import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '@/store/useStore';

export type StageCategory = 'Bake' | 'Filling' | 'Frosting' | 'Decorate' | 'Package' | 'Other';
export type StageStatus = 'todo' | 'running' | 'paused' | 'done';
// 'recalled' = remembered after the fact, 'timed' = measured with the in-app timer.
// Only timed stages teach the app; recalled ones are shown but never learned from.
export type StageSource = 'timed' | 'recalled';

export const STAGE_CATEGORIES: StageCategory[] = ['Bake', 'Filling', 'Frosting', 'Decorate', 'Package', 'Other'];

export interface StageTemplate {
  id: string;
  name: string;
  category: StageCategory;
  estimatedMinutes: number;
}

export interface Stage {
  id: string;
  orderId: string;
  name: string;
  category: StageCategory;
  estimatedMinutes: number;
  status: StageStatus;
  startedAt?: number; // epoch ms, set while running
  elapsedMs: number; // time accumulated before the current run
  source: StageSource;
  newTechnique?: boolean;
}

export interface OrderMeta {
  ingredientCost: number;
  deliveryFee: number; // 0 when the customer picks up
}

const DEFAULT_TEMPLATES: StageTemplate[] = [
  { id: 't1', name: 'Make & bake cake layers', category: 'Bake', estimatedMinutes: 45 },
  { id: 't2', name: 'Make filling', category: 'Filling', estimatedMinutes: 30 },
  { id: 't3', name: 'Make buttercream', category: 'Frosting', estimatedMinutes: 10 },
  { id: 't4', name: 'Level, fill & crumb coat', category: 'Frosting', estimatedMinutes: 45 },
  { id: 't5', name: 'Buttercream piping & writing', category: 'Decorate', estimatedMinutes: 45 },
  { id: 't6', name: 'Fondant details (handmade)', category: 'Decorate', estimatedMinutes: 90 },
  { id: 't7', name: 'Cupcakes: make, bake & frost (24)', category: 'Bake', estimatedMinutes: 105 },
  { id: 't8', name: 'Package & photos', category: 'Package', estimatedMinutes: 30 },
  { id: 't9', name: 'Grocery shopping', category: 'Other', estimatedMinutes: 30 },
  { id: 't10', name: 'Cleanup', category: 'Other', estimatedMinutes: 20 },
];

interface ProductionState {
  templates: StageTemplate[];
  stages: Stage[];
  orderMeta: Record<string, OrderMeta>;
  addStage: (stage: Omit<Stage, 'id' | 'status' | 'elapsedMs' | 'source'> & Partial<Stage>) => void;
  startStage: (id: string) => void;
  pauseStage: (id: string) => void;
  finishStage: (id: string) => void;
  resetStage: (id: string) => void;
  deleteStage: (id: string) => void;
  setMeta: (orderId: string, meta: Partial<OrderMeta>) => void;
  addTemplate: (t: Omit<StageTemplate, 'id'>) => void;
  updateTemplate: (t: StageTemplate) => void;
  deleteTemplate: (id: string) => void;
  loadStages: (stages: Stage[], meta: Record<string, OrderMeta>) => void;
}

const pauseRunning = (stages: Stage[], now: number, exceptId?: string): Stage[] =>
  stages.map((s) =>
    s.status === 'running' && s.id !== exceptId
      ? { ...s, status: 'paused', elapsedMs: s.elapsedMs + (now - (s.startedAt ?? now)), startedAt: undefined }
      : s,
  );

export const useProduction = create<ProductionState>()(
  persist(
    (set) => ({
      templates: DEFAULT_TEMPLATES,
      stages: [],
      orderMeta: {},
      addStage: (stage) =>
        set((s) => ({
          stages: [...s.stages, { id: generateId(), status: 'todo', elapsedMs: 0, source: 'timed', ...stage }],
        })),
      // Only one timer runs at a time: you can't be doing two things at once.
      startStage: (id) =>
        set((s) => {
          const now = Date.now();
          return {
            stages: pauseRunning(s.stages, now, id).map((st) =>
              st.id === id && st.status !== 'running' ? { ...st, status: 'running', startedAt: now } : st,
            ),
          };
        }),
      pauseStage: (id) =>
        set((s) => {
          const now = Date.now();
          return {
            stages: s.stages.map((st) =>
              st.id === id && st.status === 'running'
                ? { ...st, status: 'paused', elapsedMs: st.elapsedMs + (now - (st.startedAt ?? now)), startedAt: undefined }
                : st,
            ),
          };
        }),
      finishStage: (id) =>
        set((s) => {
          const now = Date.now();
          return {
            stages: s.stages.map((st) =>
              st.id === id
                ? {
                    ...st,
                    status: 'done',
                    elapsedMs: st.elapsedMs + (st.status === 'running' ? now - (st.startedAt ?? now) : 0),
                    startedAt: undefined,
                    source: 'timed',
                  }
                : st,
            ),
          };
        }),
      resetStage: (id) =>
        set((s) => ({
          stages: s.stages.map((st) => (st.id === id ? { ...st, status: 'todo', elapsedMs: 0, startedAt: undefined } : st)),
        })),
      deleteStage: (id) => set((s) => ({ stages: s.stages.filter((st) => st.id !== id) })),
      setMeta: (orderId, meta) =>
        set((s) => ({
          orderMeta: {
            ...s.orderMeta,
            [orderId]: { ingredientCost: 0, deliveryFee: 0, ...s.orderMeta[orderId], ...meta },
          },
        })),
      addTemplate: (t) => set((s) => ({ templates: [...s.templates, { ...t, id: generateId() }] })),
      updateTemplate: (t) => set((s) => ({ templates: s.templates.map((x) => (x.id === t.id ? t : x)) })),
      deleteTemplate: (id) => set((s) => ({ templates: s.templates.filter((x) => x.id !== id) })),
      loadStages: (stages, meta) =>
        set((s) => ({ stages: [...s.stages, ...stages], orderMeta: { ...s.orderMeta, ...meta } })),
    }),
    { name: 'cakecal-production' },
  ),
);

export const stageMs = (s: Stage, now: number) =>
  s.elapsedMs + (s.status === 'running' ? now - (s.startedAt ?? now) : 0);

export const stageMinutes = (s: Stage, now: number) => stageMs(s, now) / 60000;

export const formatClock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

export const formatMinutes = (min: number) => {
  const r = Math.round(min);
  if (r < 60) return `${r} min`;
  const h = Math.floor(r / 60);
  const m = r % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

// The learning loop: for a stage name, average the last few TIMED completions.
export const learnedMinutes = (stages: Stage[], name: string, limit = 5) => {
  const done = stages
    .filter((s) => s.name === name && s.status === 'done' && s.source === 'timed')
    .slice(-limit);
  if (done.length === 0) return null;
  const avg = done.reduce((sum, s) => sum + s.elapsedMs / 60000, 0) / done.length;
  return { minutes: Math.round(avg), samples: done.length };
};
