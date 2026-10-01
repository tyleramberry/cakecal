import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useProduction, formatMinutes } from '@/store/useProduction';
import { planStages, freeMinutes, addDays, toDateStr, parseDate, capacityMinutes } from '@/lib/planner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HORIZON_DAYS = 14;

export default function PlanPage() {
  const { orders } = useStore();
  const { stages, capacityHours, setCapacity, setPlanned } = useProduction();
  const today = toDateStr(new Date());
  const [overloaded, setOverloaded] = useState<Set<string>>(new Set());
  const [checkDate, setCheckDate] = useState(addDays(today, 7));
  const [checkHours, setCheckHours] = useState(4);

  const orderName = (id: string) => orders.find((o) => o.id === id)?.cakeName || 'Order';

  const autoPlan = () => {
    const { placements, overloaded: over } = planStages(stages, orders, capacityHours, today);
    setPlanned(placements);
    setOverloaded(over);
  };

  const days = useMemo(() => Array.from({ length: HORIZON_DAYS }, (_, i) => addDays(today, i)), [today]);
  const open = stages.filter((s) => s.status !== 'done');
  const unscheduled = open.filter((s) => !s.plannedDate && orders.some((o) => o.id === s.orderId && o.deliveryDate && o.status !== 'Delivered'));

  const free = freeMinutes(stages, capacityHours, today, checkDate);
  const need = checkHours * 60;
  const fits = free >= need;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display">Plan</h2>
          <p className="text-sm text-muted-foreground">Works backward from each due date and fits your stages into the hours you actually have.</p>
        </div>
        <Button onClick={autoPlan}>Auto-plan my stages</Button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="bg-card rounded-lg border-0.5 p-4 space-y-3 lg:col-span-2">
          <h3 className="font-display text-base">Hours I can work</h3>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_NAMES.map((d, i) => (
              <div key={d} className="text-center">
                <Label className="text-[11px] text-muted-foreground">{d}</Label>
                <Input type="number" min={0} max={16} step={0.5} className="px-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" value={capacityHours[i]} onChange={(ev) => setCapacity(i, +ev.target.value)} />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">Set these around school and life. Week total: {capacityHours.reduce((a, b) => a + b, 0)} h.</p>
        </div>

        <div className="bg-card rounded-lg border-0.5 p-4 space-y-3 lg:col-span-3">
          <h3 className="font-display text-base">Can I take another order?</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div><Label className="text-xs">Due date</Label><Input type="date" min={today} value={checkDate} onChange={(ev) => setCheckDate(ev.target.value)} /></div>
            <div><Label className="text-xs">Hours it will take</Label><Input type="number" min={0.5} step={0.5} className="w-28" value={checkHours} onChange={(ev) => setCheckHours(+ev.target.value)} /></div>
            <div className={`flex items-center gap-2 text-sm font-medium ${fits ? 'text-sage' : 'text-destructive'}`}>
              {fits ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {fits
                ? `Yes. You have about ${formatMinutes(free)} free before then.`
                : `Tight. You only have about ${formatMinutes(free)} free before then.`}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Based on planned stages. Run Auto-plan first so every order is counted.</p>
        </div>
      </div>

      {unscheduled.length > 0 && (
        <div className="rounded-lg bg-gold/10 border-0.5 p-3 text-sm">
          {unscheduled.length} stage{unscheduled.length > 1 ? 's' : ''} have no day yet. Press <strong>Auto-plan</strong> to place them.
        </div>
      )}
      {orders.length > 0 && open.length === 0 && (
        <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Nothing to plan yet. Add stages to an order on the Production page, and make sure the order has a delivery date.</div>
      )}

      <div className="space-y-2">
        {days.map((day) => {
          const todays = open.filter((s) => s.plannedDate === day);
          const used = todays.reduce((sum, s) => sum + s.estimatedMinutes, 0);
          const cap = capacityMinutes(capacityHours, day);
          const isOver = used > cap;
          const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : used > 0 ? 100 : 0;
          const d = parseDate(day);
          const due = orders.filter((o) => o.deliveryDate === day && o.status !== 'Delivered');
          return (
            <div key={day} className={`bg-card rounded-lg border-0.5 p-3 ${isOver ? 'ring-1 ring-destructive' : ''}`}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="w-24 font-medium">{DAY_NAMES[d.getDay()]} {d.getMonth() + 1}/{d.getDate()}{day === today && <span className="ml-1 text-[10px] text-primary">today</span>}</div>
                <div className="flex-1 min-w-32">
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full ${isOver ? 'bg-destructive' : 'bg-sage'}`} style={{ width: `${pct}%` }} /></div>
                </div>
                <div className={`text-xs ${isOver ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {formatMinutes(used)} of {cap / 60} h{isOver && ` · over by ${formatMinutes(used - cap)}`}
                </div>
              </div>
              {due.length > 0 && <div className="mt-2 text-xs text-primary">Due: {due.map((o) => o.cakeName || o.clientName).join(', ')}</div>}
              {todays.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {todays.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1">{s.name} <span className="text-muted-foreground text-xs">· {orderName(s.orderId)} · {formatMinutes(s.estimatedMinutes)}</span>{overloaded.has(s.id) && <span className="ml-2 text-xs text-destructive">couldn't fit</span>}</span>
                      <Input type="date" className="h-7 w-36 text-xs" value={s.plannedDate} onChange={(ev) => ev.target.value && setPlanned({ [s.id]: ev.target.value })} aria-label="Move to another day" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
