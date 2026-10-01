import { useEffect, useState } from 'react';
import { useStore, formatCurrency, generateId, Order } from '@/store/useStore';
import {
  useProduction, Stage, StageCategory, STAGE_CATEGORIES, stageMs, stageMinutes,
  formatClock, formatMinutes, learnedMinutes,
} from '@/store/useProduction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Check, RotateCcw, Trash2, Plus } from 'lucide-react';

type Tab = 'timers' | 'insights' | 'library';

export const useNow = (active = true) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
};

// Money you keep per hour of your own time, once ingredients are paid for.
export const orderEarnings = (order: Order, stages: Stage[], meta: { ingredientCost: number; deliveryFee: number } | undefined, now: number) => {
  const revenue = order.price + (meta?.deliveryFee ?? 0);
  const afterIngredients = revenue - (meta?.ingredientCost ?? 0);
  const minutes = stages.reduce((sum, s) => sum + stageMinutes(s, now), 0);
  const hours = minutes / 60;
  return { revenue, afterIngredients, hours, hourly: hours > 0 ? afterIngredients / hours : null };
};

export default function ProductionPage() {
  const { orders, addOrder } = useStore();
  const { stages, orderMeta, loadStages } = useProduction();
  const [tab, setTab] = useState<Tab>('timers');
  const [orderId, setOrderId] = useState<string>('');
  const anyRunning = stages.some((s) => s.status === 'running');
  const now = useNow(anyRunning || tab === 'insights');

  const selected = orders.find((o) => o.id === orderId) ?? orders[0];
  const hasSamples = orders.some((o) => o.id.startsWith('sample-'));

  const loadSamples = () => {
    const mk = (id: string, o: Partial<Order>): Order => ({
      id, clientName: 'Sample', contact: '', cakeName: '', tiers: 1, servings: 10, price: 0, flavor: '', finish: '',
      dietaryRestrictions: '', designNotes: '', deliveryDate: new Date().toISOString().slice(0, 10), status: 'Delivered',
      categories: [], referencePhotos: [], depositAmount: 0, depositPaid: true, balancePaid: true,
      createdAt: new Date().toISOString(), ...o,
    });
    addOrder(mk('sample-1', { cakeName: '6" lemon raspberry, mahjong tiles', tiers: 1, servings: 12, price: 85, flavor: 'Lemon, cream + raspberry filling', finish: 'Vanilla buttercream, handmade fondant tiles', categories: ['Custom'] }));
    addOrder(mk('sample-2', { cakeName: '8" chocolate, piped cherries & bows', tiers: 1, servings: 20, price: 125, flavor: 'Chocolate', finish: 'Vanilla buttercream, piped cherries', categories: ['Custom'] }));
    addOrder(mk('sample-3', { cakeName: '2 dozen cupcakes (coconut lime + chocolate)', servings: 24, price: 84, flavor: 'Coconut lime, chocolate', categories: ['Custom'] }));
    const st = (orderId: string, name: string, category: StageCategory, minutes: number, newTechnique = false): Stage => ({
      id: generateId(), orderId, name, category, estimatedMinutes: minutes, status: 'done',
      elapsedMs: minutes * 60000, source: 'recalled', newTechnique,
    });
    loadStages(
      [
        st('sample-1', 'Make & bake cake layers', 'Bake', 45),
        st('sample-1', 'Make filling', 'Filling', 30),
        st('sample-1', 'Make buttercream', 'Frosting', 10),
        st('sample-1', 'Fondant tiles + piping & writing', 'Decorate', 120, true),
        st('sample-2', 'Make & bake cake layers', 'Bake', 45),
        st('sample-2', 'Make buttercream', 'Frosting', 10),
        st('sample-2', 'Hand-piped cherries & bows', 'Decorate', 60),
        st('sample-3', 'Cupcakes: make, bake & frost (24)', 'Bake', 105),
        st('sample-3', 'Decorate, package & photos', 'Package', 60),
      ],
      {
        'sample-1': { ingredientCost: 11, deliveryFee: 0 },
        'sample-2': { ingredientCost: 12, deliveryFee: 0 },
        'sample-3': { ingredientCost: 20, deliveryFee: 0 },
      },
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-display">Production</h2>
        {!hasSamples && (
          <Button size="sm" variant="outline" onClick={loadSamples}>Load my 3 sample orders</Button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {([['timers', 'Timers'], ['insights', 'Insights'], ['library', 'Stage Library']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'timers' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-card rounded-lg border-0.5 p-6 text-sm text-muted-foreground">
              Add an order on the Orders page first, or load the 3 sample orders above.
            </div>
          ) : (
            <>
              <div className="max-w-md">
                <Label>Order</Label>
                <Select value={selected?.id} onValueChange={setOrderId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.cakeName || 'Untitled'} · {o.clientName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selected && <OrderTimers order={selected} now={now} />}
            </>
          )}
        </div>
      )}
      {tab === 'insights' && <Insights now={now} />}
      {tab === 'library' && <Library />}
    </div>
  );
}

function OrderTimers({ order, now }: { order: Order; now: number }) {
  const { stages, templates, orderMeta, addStage, setMeta } = useProduction();
  const mine = stages.filter((s) => s.orderId === order.id);
  const meta = orderMeta[order.id] ?? { ingredientCost: 0, deliveryFee: 0 };
  const e = orderEarnings(order, mine, meta, now);
  const [customName, setCustomName] = useState('');

  const addFromTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    const learned = learnedMinutes(stages, t.name);
    addStage({ orderId: order.id, name: t.name, category: t.category, estimatedMinutes: learned?.minutes ?? t.estimatedMinutes });
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    addStage({ orderId: order.id, name: customName.trim(), category: 'Other', estimatedMinutes: 30 });
    setCustomName('');
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        {mine.length === 0 && (
          <div className="bg-card rounded-lg border-0.5 p-6 text-sm text-muted-foreground">
            No stages yet. Add the steps for this order below, then tap Start before each one.
          </div>
        )}
        {mine.map((s) => <StageRow key={s.id} stage={s} now={now} />)}

        <div className="bg-card rounded-lg border-0.5 p-4 space-y-3">
          <h3 className="font-display text-base">Add a stage</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select onValueChange={addFromTemplate} value="">
              <SelectTrigger className="sm:w-72"><SelectValue placeholder="From your stage library…" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => {
                  const l = learnedMinutes(stages, t.name);
                  return <SelectItem key={t.id} value={t.id}>{t.name} · {l ? `${l.minutes} min (learned)` : `${t.estimatedMinutes} min`}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <div className="flex gap-2 flex-1">
              <Input placeholder="Or a one-off, e.g. Fondant roses" value={customName} onChange={(ev) => setCustomName(ev.target.value)} onKeyDown={(ev) => ev.key === 'Enter' && addCustom()} />
              <Button variant="outline" onClick={addCustom} className="gap-1"><Plus className="w-4 h-4" /> Add</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border-0.5 p-4 space-y-3 h-fit">
        <h3 className="font-display text-base">What this order really paid</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Ingredients $</Label>
            <Input type="number" min={0} step="0.5" value={meta.ingredientCost} onChange={(ev) => setMeta(order.id, { ingredientCost: +ev.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Delivery fee $</Label>
            <Input type="number" min={0} step="1" value={meta.deliveryFee} onChange={(ev) => setMeta(order.id, { deliveryFee: +ev.target.value })} />
            <button className="text-[11px] text-primary mt-1" onClick={() => setMeta(order.id, { deliveryFee: 25 })}>Delivered? add $25</button>
          </div>
        </div>
        <dl className="text-sm space-y-1.5 border-t-0.5 pt-3">
          <Row k="Price charged" v={formatCurrency(order.price)} />
          {meta.deliveryFee > 0 && <Row k="Delivery fee" v={formatCurrency(meta.deliveryFee)} />}
          <Row k="Ingredients" v={`− ${formatCurrency(meta.ingredientCost)}`} />
          <Row k="You kept" v={formatCurrency(e.afterIngredients)} bold />
          <Row k="Your time" v={formatMinutes(e.hours * 60)} />
        </dl>
        <div className="rounded-lg bg-muted p-3 text-center">
          <div className="text-xs text-muted-foreground">Your real hourly pay</div>
          <div className="text-2xl font-display">{e.hourly === null ? '—' : `${formatCurrency(Math.round(e.hourly * 100) / 100)}/hr`}</div>
          {e.hourly !== null && <div className="text-[11px] text-muted-foreground mt-1">Before shopping, cleanup, messages & delivery time unless you time those too.</div>}
        </div>
      </div>
    </div>
  );
}

const Row = ({ k, v, bold }: { k: string; v: string; bold?: boolean }) => (
  <div className={`flex justify-between ${bold ? 'font-medium' : 'text-muted-foreground'}`}><dt>{k}</dt><dd>{v}</dd></div>
);

function StageRow({ stage, now }: { stage: Stage; now: number }) {
  const { startStage, pauseStage, finishStage, resetStage, deleteStage } = useProduction();
  const ms = stageMs(stage, now);
  const est = stage.estimatedMinutes;
  const actualMin = ms / 60000;
  const over = est > 0 ? (actualMin - est) / est : 0;
  const running = stage.status === 'running';
  const done = stage.status === 'done';

  return (
    <div className={`bg-card rounded-lg border-0.5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${running ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{stage.name}</span>
          <Badge variant="secondary" className="text-[10px]">{stage.category}</Badge>
          {stage.newTechnique && <Badge className="text-[10px] bg-lavender/15 text-lavender">first time</Badge>}
          {stage.source === 'recalled' && <Badge className="text-[10px] bg-muted text-muted-foreground">remembered, not timed</Badge>}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Estimate {formatMinutes(est)}
          {stage.plannedDate && !done && <span> · planned {stage.plannedDate.slice(5).replace('-', '/')}</span>}
          {(done || actualMin > 0.5) && (
            <span className={over > 0.1 ? 'text-destructive' : over < -0.1 ? 'text-sage' : ''}>
              {' · '}actual {formatMinutes(actualMin)} ({over >= 0 ? '+' : ''}{Math.round(over * 100)}%)
            </span>
          )}
        </div>
      </div>

      <div className={`font-mono text-2xl tabular-nums ${running ? 'text-primary' : 'text-foreground'}`}>{formatClock(ms)}</div>

      <div className="flex gap-2">
        {!done && !running && (
          <Button onClick={() => startStage(stage.id)} className="gap-1 min-w-24"><Play className="w-4 h-4" /> {stage.status === 'paused' ? 'Resume' : 'Start'}</Button>
        )}
        {running && <Button variant="outline" onClick={() => pauseStage(stage.id)} className="gap-1 min-w-24"><Pause className="w-4 h-4" /> Pause</Button>}
        {!done && (stage.status === 'running' || stage.status === 'paused') && (
          <Button variant="secondary" onClick={() => finishStage(stage.id)} className="gap-1"><Check className="w-4 h-4" /> Done</Button>
        )}
        {done && stage.source === 'timed' && <span className="text-sm text-sage flex items-center gap-1"><Check className="w-4 h-4" /> Timed</span>}
        {(done || stage.status === 'paused') && (
          <Button variant="ghost" size="icon" onClick={() => resetStage(stage.id)} title="Reset timer"><RotateCcw className="w-4 h-4" /></Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => deleteStage(stage.id)} title="Delete stage"><Trash2 className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

function Insights({ now }: { now: number }) {
  const { orders } = useStore();
  const { stages, orderMeta } = useProduction();

  const rows = orders
    .map((o) => ({ order: o, mine: stages.filter((s) => s.orderId === o.id && (s.status === 'done' || s.status === 'running')) }))
    .filter((r) => r.mine.length > 0)
    .map((r) => ({ ...r, e: orderEarnings(r.order, r.mine, orderMeta[r.order.id], now), recalled: r.mine.some((s) => s.source === 'recalled') }));

  const timedDone = stages.filter((s) => s.status === 'done' && s.source === 'timed');
  const byName = new Map<string, Stage[]>();
  timedDone.forEach((s) => byName.set(s.name, [...(byName.get(s.name) ?? []), s]));

  const totalEst = timedDone.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const totalAct = timedDone.reduce((sum, s) => sum + s.elapsedMs / 60000, 0);

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border-0.5 p-4">
        <h3 className="font-display text-base mb-3">Real hourly pay by order</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Finish a timed stage on an order, or load the sample orders, to see this.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4">Order</th><th className="pr-4">Price</th><th className="pr-4">Kept</th><th className="pr-4">Time</th><th>$/hr</th>
              </tr></thead>
              <tbody>
                {rows.map(({ order, e, recalled }) => (
                  <tr key={order.id} className="border-t-0.5">
                    <td className="py-2 pr-4">{order.cakeName || 'Untitled'}{recalled && <span className="ml-2 text-[10px] text-muted-foreground">(remembered)</span>}</td>
                    <td className="pr-4">{formatCurrency(order.price)}</td>
                    <td className="pr-4">{formatCurrency(e.afterIngredients)}</td>
                    <td className="pr-4">{formatMinutes(e.hours * 60)}</td>
                    <td className={`font-medium ${e.hourly !== null && e.hourly < 20 ? 'text-destructive' : ''}`}>{e.hourly === null ? '—' : formatCurrency(Math.round(e.hourly * 100) / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg border-0.5 p-4">
        <h3 className="font-display text-base mb-1">How accurate are your estimates?</h3>
        {timedDone.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timed stages yet. This fills in as you finish stages with the timer. Remembered times are not used here, only measured ones.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              Across {timedDone.length} timed stages you estimated {formatMinutes(totalEst)} and took {formatMinutes(totalAct)}
              {totalEst > 0 && <> ({totalAct >= totalEst ? '+' : ''}{Math.round(((totalAct - totalEst) / totalEst) * 100)}%)</>}.
            </p>
            <div className="space-y-2">
              {[...byName.entries()].map(([name, list]) => {
                const l = learnedMinutes(stages, name)!;
                const avgEst = list.reduce((x, s) => x + s.estimatedMinutes, 0) / list.length;
                return (
                  <div key={name} className="flex justify-between text-sm border-t-0.5 pt-2">
                    <span>{name} <span className="text-xs text-muted-foreground">({l.samples}×)</span></span>
                    <span>estimated {formatMinutes(avgEst)} → learned <strong>{formatMinutes(l.minutes)}</strong></span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Library() {
  const { templates, stages, addTemplate, updateTemplate, deleteTemplate } = useProduction();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<StageCategory>('Decorate');
  const [minutes, setMinutes] = useState(30);

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-muted-foreground">Your baking process library. Starting times are guesses; once you've timed a stage, the app uses what you actually took.</p>
      <div className="bg-card rounded-lg border-0.5 divide-y-0.5">
        {templates.map((t) => {
          const l = learnedMinutes(stages, t.name);
          return (
            <div key={t.id} className="flex items-center gap-3 p-3 text-sm">
              <div className="flex-1">{t.name} <Badge variant="secondary" className="ml-1 text-[10px]">{t.category}</Badge></div>
              {l && <span className="text-xs text-sage">learned {l.minutes} min ({l.samples}×)</span>}
              <Input type="number" min={1} className="w-20 h-8" value={t.estimatedMinutes} onChange={(ev) => updateTemplate({ ...t, estimatedMinutes: +ev.target.value })} />
              <span className="text-xs text-muted-foreground">min</span>
              <Button variant="ghost" size="icon" onClick={() => deleteTemplate(t.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          );
        })}
      </div>
      <div className="bg-card rounded-lg border-0.5 p-4 flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1"><Label className="text-xs">New stage</Label><Input value={name} onChange={(ev) => setName(ev.target.value)} placeholder="e.g. Fondant roses" /></div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as StageCategory)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{STAGE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Min</Label><Input type="number" min={1} className="w-20" value={minutes} onChange={(ev) => setMinutes(+ev.target.value)} /></div>
        <Button onClick={() => { if (name.trim()) { addTemplate({ name: name.trim(), category, estimatedMinutes: minutes }); setName(''); } }}>Add</Button>
      </div>
    </div>
  );
}
