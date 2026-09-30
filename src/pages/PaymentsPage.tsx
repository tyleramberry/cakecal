import { useState } from 'react';
import { useStore, formatCurrency, getDaysUntil } from '@/store/useStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Plus } from 'lucide-react';

type PayFilter = 'All' | 'Unpaid' | 'Deposit Only' | 'Fully Paid' | 'Needs Attention';

export default function PaymentsPage() {
  const { orders, updateOrder } = useStore();
  const [filter, setFilter] = useState<PayFilter>('All');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const getPayStatus = (o: typeof orders[0]) => {
    if (o.balancePaid && o.depositPaid) return 'Fully Paid';
    if (o.depositPaid) return 'Deposit Only';
    const daysUntil = getDaysUntil(o.deliveryDate);
    if (daysUntil < 0) return 'Overdue';
    return 'Unpaid';
  };

  const needsAttention = (o: typeof orders[0]) => {
    const daysUntil = getDaysUntil(o.deliveryDate);
    return daysUntil <= 3 && daysUntil >= 0 && !o.balancePaid;
  };

  const filtered = orders.filter((o) => {
    if (filter === 'All') return true;
    if (filter === 'Needs Attention') return needsAttention(o);
    return getPayStatus(o) === filter;
  });

  const totalCollected = orders.reduce((s, o) => s + (o.depositPaid ? o.depositAmount : 0) + (o.balancePaid ? o.price - o.depositAmount : 0), 0);
  const outstanding = orders.reduce((s, o) => s + o.price, 0) - totalCollected;
  const fullyPaidCount = orders.filter((o) => o.balancePaid && o.depositPaid).length;
  const attentionCount = orders.filter(needsAttention).length;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      'Fully Paid': 'bg-sage/15 text-sage',
      'Deposit Only': 'bg-gold/15 text-gold',
      'Unpaid': 'bg-destructive/15 text-destructive',
      'Overdue': 'bg-destructive text-destructive-foreground',
    };
    return map[status] || '';
  };

  const handleDepositToggle = (orderId: string, checked: boolean) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    if (!checked) {
      updateOrder({ ...order, depositPaid: false, balancePaid: false });
    } else {
      updateOrder({ ...order, depositPaid: true });
    }
  };

  const handleBalanceToggle = (orderId: string, checked: boolean) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    if (checked) {
      updateOrder({ ...order, depositPaid: true, balancePaid: true });
    } else {
      updateOrder({ ...order, balancePaid: false });
    }
  };

  const summaryCards = [
    { label: 'Total Collected', value: formatCurrency(totalCollected), color: 'text-sage' },
    { label: 'Outstanding', value: formatCurrency(outstanding), color: 'text-destructive' },
    { label: 'Total Orders', value: orders.length, color: 'text-foreground' },
    { label: 'Fully Paid', value: fullyPaidCount, color: 'text-sage' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-display mb-6">Payment Tracker</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {summaryCards.map((c) => (
          <div key={c.label} className="bg-card rounded-lg border-0.5 p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-xl font-display ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Warning banner */}
      {attentionCount > 0 && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-gold/10 border-0.5 border-gold/30 text-sm">
          <AlertTriangle className="w-4 h-4 text-gold shrink-0" />
          {attentionCount} order{attentionCount > 1 ? 's' : ''} need{attentionCount === 1 ? 's' : ''} payment attention
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['All', 'Unpaid', 'Deposit Only', 'Fully Paid', 'Needs Attention'] as PayFilter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Payment list */}
      <div className="space-y-2">
        {filtered.map((o) => {
          const status = getPayStatus(o);
          const daysUntil = getDaysUntil(o.deliveryDate);
          const attention = needsAttention(o);
          return (
            <div key={o.id} className={`bg-card rounded-lg border-0.5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${attention ? 'border-l-[3px] border-l-gold' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{o.clientName} — {o.cakeName}</p>
                <p className="text-xs text-muted-foreground">
                  Delivery: {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : 'TBD'}
                  {daysUntil >= 0 && daysUntil <= 3 && <span className="text-destructive font-medium ml-1">({daysUntil}d)</span>}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(o.price)}</p>
                  <p className="text-muted-foreground">Dep: {formatCurrency(o.depositAmount)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <Checkbox checked={o.depositPaid} onCheckedChange={(c) => handleDepositToggle(o.id, !!c)} />
                    <span>Dep</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <Checkbox checked={o.balancePaid} onCheckedChange={(c) => handleBalanceToggle(o.id, !!c)} />
                    <span>Bal</span>
                  </label>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge(status)}`}>{status}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No payment records</p>}
      </div>
    </div>
  );
}
