import { useState, useMemo } from 'react';
import { useStore, formatCurrency, OrderCategory, CalendarEvent } from '@/store/useStore';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Clock, DollarSign, TrendingUp } from 'lucide-react';
import { parseISO } from 'date-fns';
type Period = 'month' | 'quarter' | 'year' | 'all';

const CATEGORY_COLORS: Record<string, string> = {
  Wedding: '#b5603a',
  Birthday: '#d4956a',
  Custom: '#9b8ec4',
  Shower: '#7a9e8a',
  Corporate: '#c9a84c',
};

const STATUS_BADGE: Record<string, string> = {
  Inquiry: 'bg-lavender/15 text-lavender',
  Confirmed: 'bg-gold/15 text-gold',
  'In Production': 'bg-dusty-rose/15 text-dusty-rose',
  Ready: 'bg-sage/15 text-sage',
  Delivered: 'bg-muted text-muted-foreground',
};

export default function DashboardPage() {
  const { orders, events } = useStore();
  const [period, setPeriod] = useState<Period>('year');
  const [hourlyRate, setHourlyRate] = useState(25);
  const now = new Date();
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!o.deliveryDate) return false;
      const d = new Date(o.deliveryDate);
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
      }
      if (period === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [orders, period]);

  const totalRevenue = filteredOrders.reduce((s, o) => s + o.price, 0);
  const depositsCollected = filteredOrders.reduce((s, o) => s + (o.depositPaid ? o.depositAmount : 0), 0);
  const balancesCollected = filteredOrders.reduce((s, o) => s + (o.balancePaid ? o.price - o.depositAmount : 0), 0);
  const outstanding = totalRevenue - depositsCollected - balancesCollected;
  const avgOrder = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

  // Category breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach((o) => o.categories.forEach((c) => { map[c] = (map[c] || 0) + o.price; }));
    return Object.entries(map).map(([name, value]) => ({ name, value, fill: CATEGORY_COLORS[name] || '#888' })).sort((a, b) => b.value - a.value);
  }, [filteredOrders]);

  const catTotal = categoryData.reduce((s, c) => s + c.value, 0);
  const pieData = categoryData.map((c) => ({ ...c, percent: catTotal > 0 ? ((c.value / catTotal) * 100).toFixed(0) : '0' }));

  // Monthly chart
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(now.getFullYear(), i).toLocaleString('default', { month: 'short' }),
      value: 0,
      isCurrent: i === now.getMonth(),
      isPast: i < now.getMonth(),
    }));
    filteredOrders.forEach((o) => {
      const d = new Date(o.deliveryDate);
      if (d.getFullYear() === now.getFullYear()) months[d.getMonth()].value += o.price;
    });
    return months;
  }, [filteredOrders]);

  // Hours tracking from calendar events
  const hoursData = useMemo(() => {
    const filterEvent = (e: typeof events[0]) => {
      const d = parseISO(e.date);
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
      }
      if (period === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    };

    const filtered = events.filter(filterEvent);
    let bakeHours = 0;
    let deliveryHours = 0;
    let consultationHours = 0;

    const getEventHours = (e: CalendarEvent) => {
      if (e.startTime && e.endTime) {
        const [sh, sm] = e.startTime.split(':').map(Number);
        const [eh, em] = e.endTime.split(':').map(Number);
        const diff = (eh * 60 + em - sh * 60 - sm) / 60;
        return diff > 0 ? diff : 1;
      }
      // fallback to legacy duration fields
      if (e.type === 'bake') return (e.bakeDurationDays || 0) * 24 + (e.bakeDurationHours || 0);
      return e.durationHours || 1;
    };

    filtered.forEach((e) => {
      const hours = getEventHours(e);
      if (e.type === 'bake') bakeHours += hours;
      else if (e.type === 'delivery') deliveryHours += hours;
      else if (e.type === 'consultation') consultationHours += hours;
    });

    const totalHours = bakeHours + deliveryHours + consultationHours;
    return { bakeHours, deliveryHours, consultationHours, totalHours, eventCount: filtered.length };
  }, [events, period]);

  const effectiveHourlyWage = hoursData.totalHours > 0 ? totalRevenue / hoursData.totalHours : 0;

  const summaryCards = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'text-sage' },
    { label: 'Deposits Collected', value: formatCurrency(depositsCollected), color: 'text-gold' },
    { label: 'Outstanding', value: formatCurrency(outstanding), color: 'text-destructive' },
    { label: 'Avg Order Value', value: formatCurrency(avgOrder), color: 'text-foreground' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-display mb-6">Revenue Dashboard</h2>

      {/* Period tabs */}
      <div className="flex gap-2 mb-6">
        {([['month', 'This Month'], ['quarter', 'This Quarter'], ['year', 'This Year'], ['all', 'All Time']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setPeriod(key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {summaryCards.map((c) => (
          <div key={c.label} className="bg-card rounded-lg border-0.5 p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-xl font-display ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Hours Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-lg border-0.5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="font-display text-base">Hours Worked</h3>
          </div>
          <div className="text-3xl font-display text-primary mb-3">{hoursData.totalHours.toFixed(1)}h</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gold" />
                <span>Baking</span>
              </div>
              <span className="font-medium">{hoursData.bakeHours.toFixed(1)}h</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sage" />
                <span>Deliveries</span>
              </div>
              <span className="font-medium">{hoursData.deliveryHours.toFixed(1)}h</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-lavender" />
                <span>Consultations</span>
              </div>
              <span className="font-medium">{hoursData.consultationHours.toFixed(1)}h</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t-0.5 text-xs text-muted-foreground">
            {hoursData.eventCount} event{hoursData.eventCount !== 1 ? 's' : ''} tracked
          </div>
        </div>

        <div className="bg-card rounded-lg border-0.5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-sage" />
            <h3 className="font-display text-base">Hourly Earnings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Effective Hourly Wage</p>
              <p className="text-3xl font-display text-sage">{formatCurrency(Math.round(effectiveHourlyWage))}<span className="text-sm text-muted-foreground font-sans">/hr</span></p>
              <p className="text-xs text-muted-foreground mt-1">Based on {formatCurrency(totalRevenue)} revenue ÷ {hoursData.totalHours.toFixed(1)} hours</p>
            </div>
            <div className="pt-3 border-t-0.5">
              <Label className="text-xs">Target Hourly Rate</Label>
              <div className="flex items-center gap-2 mt-1">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <Input type="number" min={0} value={hourlyRate} onChange={(e) => setHourlyRate(+e.target.value)} className="w-24 h-8 text-sm" />
                <span className="text-xs text-muted-foreground">/hr</span>
              </div>
              {hoursData.totalHours > 0 && (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">At target rate: </span>
                  <span className="font-medium">{formatCurrency(Math.round(hourlyRate * hoursData.totalHours))}</span>
                  <span className={`ml-2 text-xs font-medium ${effectiveHourlyWage >= hourlyRate ? 'text-sage' : 'text-destructive'}`}>
                    {effectiveHourlyWage >= hourlyRate ? '↑ Above target' : '↓ Below target'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Category bar chart */}
        <div className="bg-card rounded-lg border-0.5 p-4">
          <h3 className="font-display text-base mb-3">Revenue by Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 60 }}>
                <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-12">No data</p>}
        </div>

        {/* Donut chart */}
        <div className="bg-card rounded-lg border-0.5 p-4">
          <h3 className="font-display text-base mb-3">Category Breakdown</h3>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                    <span>{d.name}</span>
                    <span className="text-muted-foreground">{d.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-12">No data</p>}
        </div>
      </div>

      {/* Monthly chart */}
      <div className="bg-card rounded-lg border-0.5 p-4 mb-6">
        <h3 className="font-display text-base mb-3">Monthly Revenue ({now.getFullYear()})</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {monthlyData.map((d, i) => (
                <Cell key={i} fill={d.isCurrent ? '#b5603a' : d.isPast ? '#d4956a' : '#e8d5c4'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Orders table */}
      <div className="bg-card rounded-lg border-0.5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-0.5 bg-muted/30">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Client</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Cake</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Category</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Delivery</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Total</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Deposit</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Balance</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id} className="border-b-0.5 last:border-0">
                  <td className="p-3">{o.clientName}</td>
                  <td className="p-3 text-muted-foreground">{o.cakeName}</td>
                  <td className="p-3">{o.categories.map((c) => <Badge key={c} variant="outline" className="text-[10px] mr-1">{c}</Badge>)}</td>
                  <td className="p-3 text-muted-foreground">{o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : '—'}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(o.price)}</td>
                  <td className="p-3 text-center">
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px] mx-auto">
                      <div className={`h-full rounded-full ${o.depositPaid ? 'bg-sage' : 'bg-muted'}`} style={{ width: o.depositPaid ? '100%' : '0%' }} />
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px] mx-auto">
                      <div className={`h-full rounded-full ${o.balancePaid ? 'bg-sage' : 'bg-muted'}`} style={{ width: o.balancePaid ? '100%' : '0%' }} />
                    </div>
                  </td>
                  <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[o.status] || ''}`}>{o.status}</span></td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No orders in this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
