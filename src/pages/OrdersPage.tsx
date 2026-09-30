import { useState } from 'react';
import { useStore, Order, OrderStatus, OrderCategory, generateId, formatCurrency, getDaysUntil } from '@/store/useStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus } from 'lucide-react';

const STATUSES: OrderStatus[] = ['Inquiry', 'Confirmed', 'In Production', 'Ready', 'Delivered'];
const CATEGORIES: OrderCategory[] = ['Wedding', 'Birthday', 'Custom', 'Shower', 'Corporate'];

const STATUS_BORDER: Record<OrderStatus, string> = {
  Inquiry: 'border-l-lavender',
  Confirmed: 'border-l-gold',
  'In Production': 'border-l-dusty-rose',
  Ready: 'border-l-sage',
  Delivered: 'border-l-muted-foreground',
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  Inquiry: 'bg-lavender/15 text-lavender',
  Confirmed: 'bg-gold/15 text-gold',
  'In Production': 'bg-dusty-rose/15 text-dusty-rose',
  Ready: 'bg-sage/15 text-sage',
  Delivered: 'bg-muted text-muted-foreground',
};

const emptyOrder = (): Partial<Order> => ({
  clientName: '', contact: '', cakeName: '', tiers: 1, servings: 10, price: 0, flavor: '',
  finish: '', dietaryRestrictions: '', designNotes: '', deliveryDate: '', consultationDate: '',
  status: 'Inquiry', categories: [], referencePhotos: [], depositAmount: 0, depositPaid: false, balancePaid: false,
});

export default function OrdersPage() {
  const { orders, addOrder, updateOrder, deleteOrder, addEvent, events, deleteEvent } = useStore();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<OrderCategory | 'All'>('All');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState<Partial<Order>>(emptyOrder());

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'All' && o.status !== statusFilter) return false;
    if (categoryFilter !== 'All' && !o.categories.includes(categoryFilter)) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!o.clientName.toLowerCase().includes(s) && !o.cakeName.toLowerCase().includes(s) &&
        !o.flavor.toLowerCase().includes(s) && !o.designNotes.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const openAdd = () => { setFormData(emptyOrder()); setSelectedOrder(null); setShowForm(true); };
  const openEdit = (o: Order) => { setFormData({ ...o }); setSelectedOrder(o); setShowDetail(false); setShowForm(true); };

  const handleSave = () => {
    const orderId = selectedOrder?.id || generateId();
    const order: Order = {
      ...formData as Order,
      id: orderId,
      createdAt: selectedOrder?.createdAt || new Date().toISOString(),
    };
    if (selectedOrder) updateOrder(order); else addOrder(order);

    // Sync delivery event to calendar
    const linkedEventId = `order-delivery-${orderId}`;
    const existingEvent = events.find((e) => e.id === linkedEventId);
    if (existingEvent) deleteEvent(linkedEventId);
    if (order.deliveryDate) {
      addEvent({
        id: linkedEventId,
        type: 'delivery',
        clientName: order.clientName,
        cakeName: order.cakeName,
        date: order.deliveryDate,
        notes: `Auto-created from order. ${order.designNotes || ''}`.trim(),
      });
    }

    setShowForm(false);
  };

  const toggleCategory = (cat: OrderCategory) => {
    const cats = formData.categories || [];
    setFormData({ ...formData, categories: cats.includes(cat) ? cats.filter((c) => c !== cat) : [...cats, cat] });
  };

  const getStatusCount = (s: OrderStatus | 'All') => s === 'All' ? orders.length : orders.filter((o) => o.status === s).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-display">Orders</h2>
        <Button size="sm" onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" /> New Order</Button>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['All', ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
          >
            {s} <span className="ml-1 opacity-70">{getStatusCount(s)}</span>
          </button>
        ))}
      </div>

      {/* Category filters & search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex flex-wrap gap-1.5">
          {(['All', ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c === 'All' ? 'All' : c)}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${categoryFilter === c ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >
              {c === 'All' ? 'All types' : c}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..." className="pl-8 h-8" />
        </div>
      </div>

      {/* Order cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((o) => {
          const daysUntil = getDaysUntil(o.deliveryDate);
          return (
            <div
              key={o.id}
              onClick={() => { setSelectedOrder(o); setShowDetail(true); }}
              className={`bg-card rounded-lg border-0.5 p-4 cursor-pointer hover:bg-muted/20 transition-colors border-l-[3px] ${STATUS_BORDER[o.status]}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-sm">{o.clientName}</p>
                  <p className="text-xs text-muted-foreground">{o.cakeName}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[o.status]}`}>{o.status}</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>{o.tiers} tier{o.tiers > 1 ? 's' : ''} · {o.servings} servings · {o.flavor}</p>
                <p className="font-medium text-foreground">{formatCurrency(o.price)}</p>
                <p className={daysUntil <= 3 && daysUntil >= 0 ? 'text-destructive font-medium' : ''}>
                  Delivery: {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : 'TBD'}
                  {daysUntil >= 0 && daysUntil <= 3 && ` (${daysUntil}d)`}
                </p>
              </div>
              {o.categories.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {o.categories.map((c) => <Badge key={c} variant="outline" className="text-[10px] py-0">{c}</Badge>)}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-12">No orders found</p>}
      </div>

      {/* Detail modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Order Details</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <div><p className="font-medium text-base">{selectedOrder.clientName}</p><p className="text-muted-foreground">{selectedOrder.cakeName}</p></div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium h-fit ${STATUS_BADGE[selectedOrder.status]}`}>{selectedOrder.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p><span className="text-muted-foreground">Contact:</span> {selectedOrder.contact}</p>
                <p><span className="text-muted-foreground">Tiers:</span> {selectedOrder.tiers}</p>
                <p><span className="text-muted-foreground">Servings:</span> {selectedOrder.servings}</p>
                <p><span className="text-muted-foreground">Flavor:</span> {selectedOrder.flavor}</p>
                <p><span className="text-muted-foreground">Finish:</span> {selectedOrder.finish}</p>
                <p><span className="text-muted-foreground">Price:</span> {formatCurrency(selectedOrder.price)}</p>
              </div>
              {selectedOrder.dietaryRestrictions && (
                <p className="text-xs text-destructive font-medium">⚠ {selectedOrder.dietaryRestrictions}</p>
              )}
              {selectedOrder.designNotes && <p className="text-xs"><span className="text-muted-foreground">Notes:</span> {selectedOrder.designNotes}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => openEdit(selectedOrder)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => { deleteOrder(selectedOrder.id); setShowDetail(false); }}>Delete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{selectedOrder ? 'Edit Order' : 'New Order'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Client Name</Label><Input value={formData.clientName} onChange={(e) => setFormData({ ...formData, clientName: e.target.value })} /></div>
              <div><Label>Contact</Label><Input value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} placeholder="Phone or email" /></div>
            </div>
            <div><Label>Cake Name</Label><Input value={formData.cakeName} onChange={(e) => setFormData({ ...formData, cakeName: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Tiers</Label><Input type="number" min={1} value={formData.tiers} onChange={(e) => setFormData({ ...formData, tiers: +e.target.value })} /></div>
              <div><Label>Servings</Label><Input type="number" min={1} value={formData.servings} onChange={(e) => setFormData({ ...formData, servings: +e.target.value })} /></div>
              <div><Label>Price ($)</Label><Input type="number" min={0} value={formData.price} onChange={(e) => setFormData({ ...formData, price: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Flavor</Label><Input value={formData.flavor} onChange={(e) => setFormData({ ...formData, flavor: e.target.value })} /></div>
              <div><Label>Finish/Style</Label><Input value={formData.finish} onChange={(e) => setFormData({ ...formData, finish: e.target.value })} /></div>
            </div>
            <div><Label>Dietary Restrictions / Allergens</Label><Input value={formData.dietaryRestrictions} onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })} className="border-destructive/30" /></div>
            <div><Label>Design Notes</Label><Textarea value={formData.designNotes} onChange={(e) => setFormData({ ...formData, designNotes: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Delivery Date</Label><Input type="date" value={formData.deliveryDate} onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })} /></div>
              <div><Label>Consultation Date</Label><Input type="date" value={formData.consultationDate} onChange={(e) => setFormData({ ...formData, consultationDate: e.target.value })} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <div className="flex gap-1 mt-1">
                {STATUSES.map((s, i) => (
                  <button key={s} onClick={() => setFormData({ ...formData, status: s })} className={`flex-1 py-1.5 text-[10px] font-medium rounded-md transition-colors ${formData.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Categories</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => toggleCategory(c)} className={`px-3 py-1 rounded-full text-xs transition-colors ${formData.categories?.includes(c) ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Deposit Amount ($)</Label><Input type="number" min={0} value={formData.depositAmount} onChange={(e) => setFormData({ ...formData, depositAmount: +e.target.value })} /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={!formData.clientName || !formData.cakeName}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
