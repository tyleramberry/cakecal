import { useState, useMemo } from 'react';
import { useStore, CalendarEvent, generateId, EventType } from '@/store/useStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Download, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isWithinInterval, parseISO } from 'date-fns';

const EVENT_COLORS: Record<EventType, string> = {
  bake: 'bg-gold text-foreground',
  delivery: 'bg-sage text-foreground',
  consultation: 'bg-lavender text-foreground',
};

const EVENT_LABELS: Record<EventType, string> = {
  bake: 'Bake Window',
  delivery: 'Delivery',
  consultation: 'Consultation',
};

const formatTime12 = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
};

export default function CalendarPage() {
  const { events, orders, addEvent, updateEvent, deleteEvent } = useStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDayView, setShowDayView] = useState(false);
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const [conflictWarning, setConflictWarning] = useState('');

  const [formData, setFormData] = useState({
    type: 'bake' as EventType,
    orderId: '',
    clientName: '',
    cakeName: '',
    date: '',
    startTime: '',
    endTime: '',
    bakeDurationDays: 0,
    bakeDurationHours: 0,
    durationHours: 1,
    notes: '',
  });

  const handleOrderSelect = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      setFormData((prev) => ({
        ...prev,
        orderId,
        clientName: order.clientName,
        cakeName: order.cakeName,
      }));
    }
  };

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const getEventsForDay = (day: Date) => {
    return events.filter((e) => {
      const eventDate = parseISO(e.date);
      if (e.type === 'bake' && (e.bakeDurationDays || e.bakeDurationHours)) {
        const totalHours = (e.bakeDurationDays || 0) * 24 + (e.bakeDurationHours || 0);
        const spanDays = Math.max(0, Math.ceil(totalHours / 24) - 1);
        if (spanDays === 0) return isSameDay(eventDate, day);
        const endDate = addDays(eventDate, spanDays);
        return isWithinInterval(day, { start: eventDate, end: endDate });
      }
      return isSameDay(eventDate, day);
    });
  };

  const openAddForm = (dateStr: string) => {
    setFormData({ type: 'bake', orderId: '', clientName: '', cakeName: '', date: dateStr, startTime: '', endTime: '', bakeDurationDays: 0, bakeDurationHours: 0, durationHours: 1, notes: '' });
    setEditingEvent(null);
    setConflictWarning('');
    setShowForm(true);
  };

  const openEditForm = (event: CalendarEvent) => {
    setFormData({
      type: event.type,
      orderId: '',
      clientName: event.clientName,
      cakeName: event.cakeName,
      date: event.date,
      startTime: event.startTime || event.time || '',
      endTime: event.endTime || '',
      bakeDurationDays: event.bakeDurationDays || 0,
      bakeDurationHours: event.bakeDurationHours || 0,
      durationHours: event.durationHours || 1,
      notes: event.notes || '',
    });
    setEditingEvent(event);
    setConflictWarning('');
    setShowDetail(false);
    setShowForm(true);
  };

  const checkConflicts = () => {
    if (formData.type !== 'bake') return '';
    const start = parseISO(formData.date);
    const totalHours = (formData.bakeDurationDays || 0) * 24 + (formData.bakeDurationHours || 0);
    const end = totalHours > 0 ? addDays(start, Math.ceil(totalHours / 24)) : start;

    const conflicts = events.filter((e) => {
      if (editingEvent && e.id === editingEvent.id) return false;
      const eStart = parseISO(e.date);
      const eTotalH = (e.bakeDurationDays || 0) * 24 + (e.bakeDurationHours || 0);
      const eEnd = eTotalH > 0 ? addDays(eStart, Math.ceil(eTotalH / 24)) : eStart;
      return start <= eEnd && end >= eStart;
    });

    if (conflicts.length > 0) return `Overlaps with ${conflicts.map((c) => `${c.clientName} - ${c.cakeName}`).join(', ')}`;
    return '';
  };

  const handleSave = () => {
    const event: CalendarEvent = {
      id: editingEvent?.id || generateId(),
      type: formData.type,
      clientName: formData.clientName,
      cakeName: formData.cakeName,
      date: formData.date,
      startTime: formData.startTime || undefined,
      endTime: formData.endTime || undefined,
      bakeDurationDays: formData.bakeDurationDays || undefined,
      bakeDurationHours: formData.bakeDurationHours || undefined,
      durationHours: formData.type !== 'bake' ? formData.durationHours || undefined : undefined,
      notes: formData.notes || undefined,
    };
    if (editingEvent) updateEvent(event);
    else addEvent(event);
    setShowForm(false);
  };

  const exportICS = () => {
    const exportable = events.filter((e) => e.type === 'bake' || e.type === 'delivery');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CakeCal//EN'];
    exportable.forEach((e) => {
      const d = new Date(e.date);
      const dtStart = format(d, "yyyyMMdd'T'HHmmss");
      let dtEnd = dtStart;
      if (e.type === 'bake' && (e.bakeDurationDays || e.bakeDurationHours)) {
        const totalMs = ((e.bakeDurationDays || 0) * 24 + (e.bakeDurationHours || 0)) * 3600000;
        dtEnd = format(new Date(d.getTime() + totalMs), "yyyyMMdd'T'HHmmss");
      } else {
        dtEnd = format(new Date(d.getTime() + 3600000), "yyyyMMdd'T'HHmmss");
      }
      lines.push('BEGIN:VEVENT', `DTSTART:${dtStart}`, `DTEND:${dtEnd}`,
        `SUMMARY:${e.clientName} - ${e.cakeName}`,
        `DESCRIPTION:${e.notes || ''}`,
        'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cakecal-events.ics';
    a.click();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-display">Production Calendar</h2>
        <Button variant="outline" size="sm" onClick={exportICS} className="gap-2">
          <Download className="w-4 h-4" /> Export .ics
        </Button>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-display min-w-[160px] text-center">{format(currentMonth, 'MMMM yyyy')}</h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gold" /> Bake Window</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-sage" /> Delivery</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-lavender" /> Consultation</span>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-0.5 rounded-lg overflow-hidden bg-card">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-b-0.5 bg-muted/30">{d}</div>
        ))}
        {calendarDays.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          const inMonth = isSameMonth(day, currentMonth);
          return (
            <div
              key={i}
              onClick={() => openAddForm(format(day, 'yyyy-MM-dd'))}
              className={`min-h-[80px] md:min-h-[100px] p-1 border-0.5 cursor-pointer hover:bg-muted/30 transition-colors ${!inMonth ? 'opacity-30' : ''}`}
            >
              <span
                onClick={(ev) => { ev.stopPropagation(); setDayViewDate(day); setShowDayView(true); }}
                className={`text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full cursor-pointer hover:bg-primary/20 transition-colors ${isToday ? 'bg-primary text-primary-foreground hover:bg-primary/80' : ''}`}
              >
                {format(day, 'd')}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents
                  .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'))
                  .slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); setEditingEvent(e); setShowDetail(true); }}
                    className={`text-[10px] md:text-xs px-1.5 py-0.5 rounded-sm truncate cursor-pointer flex items-center justify-between gap-1 ${EVENT_COLORS[e.type]}`}
                  >
                    <span className="truncate">{e.clientName}</span>
                    {e.startTime && <span className="opacity-70 shrink-0">{formatTime12(e.startTime)}</span>}
                  </div>
                ))}
                {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>
          {conflictWarning && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-gold/10 text-sm border-0.5 border-gold/30">
              <AlertTriangle className="w-4 h-4 text-gold shrink-0" />
              {conflictWarning}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <Label>Event Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as EventType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bake">Bake Window</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Order</Label>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-1">No orders yet. Create an order first in the Orders module.</p>
              ) : (
                <Select value={formData.orderId} onValueChange={handleOrderSelect}>
                  <SelectTrigger><SelectValue placeholder="Select an order..." /></SelectTrigger>
                  <SelectContent>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.clientName} — {o.cakeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {formData.orderId && (
              <div className="text-sm text-muted-foreground px-1">
                <span className="font-medium text-foreground">{formData.clientName}</span> · {formData.cakeName}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
              <div><Label>Start Time</Label><Input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>End Time</Label><Input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} /></div>
              <div />
            </div>
            <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
            <div className="flex gap-2 justify-end">
              {editingEvent && <Button variant="destructive" size="sm" onClick={() => { deleteEvent(editingEvent.id); setShowForm(false); }}>Delete</Button>}
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={() => {
                const warning = checkConflicts();
                if (warning && !conflictWarning) { setConflictWarning(warning); return; }
                handleSave();
              }} disabled={!formData.orderId || !formData.date}>
                {conflictWarning ? 'Save Anyway' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day view modal */}
      <Dialog open={showDayView} onOpenChange={setShowDayView}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{dayViewDate ? format(dayViewDate, 'EEEE, MMMM d, yyyy') : ''}</DialogTitle>
          </DialogHeader>
          {dayViewDate && (() => {
            const dayEvents = getEventsForDay(dayViewDate)
              .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
            return dayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events scheduled.</p>
            ) : (
              <div className="space-y-2">
                {dayEvents.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => { setEditingEvent(e); setShowDayView(false); setShowDetail(true); }}
                    className={`p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${EVENT_COLORS[e.type]}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{e.clientName}</span>
                      <span className="text-xs opacity-70">{EVENT_LABELS[e.type]}</span>
                    </div>
                    <p className="text-xs mt-0.5 opacity-80">{e.cakeName}</p>
                    {e.startTime && (
                      <p className="text-xs mt-1 font-medium">
                        {formatTime12(e.startTime)}{e.endTime ? ` – ${formatTime12(e.endTime)}` : ''}
                      </p>
                    )}
                    {e.notes && <p className="text-xs mt-1 opacity-70">{e.notes}</p>}
                  </div>
                ))}
              </div>
            );
          })()}
          <Button size="sm" variant="outline" onClick={() => { setShowDayView(false); if (dayViewDate) openAddForm(format(dayViewDate, 'yyyy-MM-dd')); }}>
            + Add Event
          </Button>
        </DialogContent>
      </Dialog>

      {/* Detail modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Event Details</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <div className="space-y-3">
              <div className={`inline-block px-2 py-1 rounded-sm text-xs font-medium ${EVENT_COLORS[editingEvent.type]}`}>
                {EVENT_LABELS[editingEvent.type]}
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Client:</span> {editingEvent.clientName}</p>
                <p><span className="text-muted-foreground">Cake:</span> {editingEvent.cakeName}</p>
                <p><span className="text-muted-foreground">Date:</span> {format(parseISO(editingEvent.date), 'MMM d, yyyy')}</p>
                {editingEvent.startTime && <p><span className="text-muted-foreground">Time:</span> {formatTime12(editingEvent.startTime)}{editingEvent.endTime ? ` – ${formatTime12(editingEvent.endTime)}` : ''}</p>}
                {editingEvent.notes && <p><span className="text-muted-foreground">Notes:</span> {editingEvent.notes}</p>}
              </div>
              <Button size="sm" onClick={() => openEditForm(editingEvent)}>Edit</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
