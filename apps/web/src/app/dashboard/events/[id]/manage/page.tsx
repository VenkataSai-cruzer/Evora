'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  quantity: number;
  reservedQty: number;
  soldQty: number;
  saleStart: string | null;
  saleEnd: string | null;
  minPerBooking: number;
  maxPerBooking: number;
  bookingMode: string;
  visibility: string;
  status: string;
}

interface ManageEventContentProps {
  params: { id: string };
}

interface FormErrors {
  [key: string]: string;
}

export default function ManageEventContent({ params }: ManageEventContentProps) {
  const [activeTab, setActiveTab] = useState<'tickets' | 'schedule' | 'performers' | 'faqs' | 'updates'>('tickets');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventStatus, setEventStatus] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Ticket types
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [ticketForm, setTicketForm] = useState({
    name: '', description: '', price: '0', quantity: '50',
    bookingMode: 'FLEXIBLE', minPerBooking: '1', maxPerBooking: '10',
    saleStart: '', saleEnd: '', status: 'DRAFT',
  });

  // Schedule
  const [scheduleItems, setScheduleItems] = useState<any[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ title: '', description: '', startTime: '', endTime: '' });

  // Performers
  const [performers, setPerformers] = useState<any[]>([]);
  const [showPerformerForm, setShowPerformerForm] = useState(false);
  const [editingPerformer, setEditingPerformer] = useState<any | null>(null);
  const [performerForm, setPerformerForm] = useState({ name: '', bio: '', instrument: '', role: 'PERFORMER' });

  // FAQs
  const [faqs, setFaqs] = useState<any[]>([]);
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any | null>(null);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' });

  // Updates
  const [updates, setUpdates] = useState<any[]>([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<any | null>(null);
  const [updateForm, setUpdateForm] = useState({ message: '', updateType: 'INSTRUCTION', visibility: 'PUBLIC', isPinned: false });

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/events/${params.id}`);
      if (!res.ok) throw new Error('Failed to load event');
      const data = await res.json();
      setEventTitle(data.event?.title || '');
      setEventStatus(data.event?.status || '');
    } catch (err) {
      setError('Failed to load event');
    }
  }, [params.id]);

  const fetchTicketTypes = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/events/${params.id}/ticket-types`);
      if (!res.ok) throw new Error('Failed to load ticket types');
      const data = await res.json();
      setTicketTypes(data.ticketTypes || []);
    } catch { /* ignore */ }
  }, [params.id]);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/events/${params.id}/schedule`);
      if (!res.ok) throw new Error('Failed to load schedule');
      const data = await res.json();
      setScheduleItems(data.items || []);
    } catch { /* ignore */ }
  }, [params.id]);

  const fetchPerformers = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/events/${params.id}/performers`);
      if (!res.ok) throw new Error('Failed to load performers');
      const data = await res.json();
      setPerformers(data.performers || []);
    } catch { /* ignore */ }
  }, [params.id]);

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/events/${params.id}/faqs`);
      if (!res.ok) throw new Error('Failed to load FAQs');
      const data = await res.json();
      setFaqs(data.faqs || []);
    } catch { /* ignore */ }
  }, [params.id]);

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/events/${params.id}/updates`);
      if (!res.ok) throw new Error('Failed to load updates');
      const data = await res.json();
      setUpdates(data.updates || []);
    } catch { /* ignore */ }
  }, [params.id]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchEvent(),
      fetchTicketTypes(),
      fetchSchedule(),
      fetchPerformers(),
      fetchFaqs(),
      fetchUpdates(),
    ]).finally(() => setIsLoading(false));
  }, [fetchEvent, fetchTicketTypes, fetchSchedule, fetchPerformers, fetchFaqs, fetchUpdates]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const payload = {
      name: ticketForm.name,
      description: ticketForm.description || null,
      price: parseFloat(ticketForm.price) || 0, // API converts to cents
      quantity: parseInt(ticketForm.quantity) || 0,
      bookingMode: ticketForm.bookingMode,
      minPerBooking: parseInt(ticketForm.minPerBooking) || 1,
      maxPerBooking: parseInt(ticketForm.maxPerBooking) || 10,
      saleStart: ticketForm.saleStart || null,
      saleEnd: ticketForm.saleEnd || null,
      status: ticketForm.status || 'DRAFT',
    };
    const res = await fetch(`/api/dashboard/events/${params.id}/ticket-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowTicketForm(false);
      setTicketForm({ name: '', description: '', price: '0', quantity: '50', bookingMode: 'FLEXIBLE', minPerBooking: '1', maxPerBooking: '10', saleStart: '', saleEnd: '', status: 'DRAFT' });
      fetchTicketTypes();
    } else {
      const data = await res.json();
      if (data.fieldErrors) {
        const errors: FormErrors = {};
        for (const [key, msgs] of Object.entries(data.fieldErrors)) {
          errors[key] = Array.isArray(msgs) ? msgs[0] : String(msgs);
        }
        setFormErrors(errors);
      }
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (!editingTicket) return;
    const payload: Record<string, unknown> = {};
    if (ticketForm.name) payload.name = ticketForm.name;
    if (ticketForm.price) payload.price = parseFloat(ticketForm.price); // API converts to cents
    if (ticketForm.quantity) payload.quantity = parseInt(ticketForm.quantity);
    if (ticketForm.minPerBooking) payload.minPerBooking = parseInt(ticketForm.minPerBooking);
    if (ticketForm.maxPerBooking) payload.maxPerBooking = parseInt(ticketForm.maxPerBooking);
    if (ticketForm.bookingMode) payload.bookingMode = ticketForm.bookingMode;
    payload.status = ticketForm.status;
    if (ticketForm.saleStart) payload.saleStart = ticketForm.saleStart;
    if (ticketForm.saleEnd) payload.saleEnd = ticketForm.saleEnd;
    payload.description = ticketForm.description || null;

    const res = await fetch(`/api/dashboard/events/${params.id}/ticket-types/${editingTicket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setEditingTicket(null);
      setShowTicketForm(false);
      fetchTicketTypes();
    }
  };

  const handleDeleteTicket = async (tt: TicketType) => {
    if (!confirm(`Delete "${tt.name}"? This cannot be undone if no orders exist.`)) return;
    const res = await fetch(`/api/dashboard/events/${params.id}/ticket-types/${tt.id}`, {
      method: 'DELETE',
    });
    if (res.ok) fetchTicketTypes();
  };

  const submitSchedule = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    const url = isEdit
      ? `/api/dashboard/events/${params.id}/schedule/${editingSchedule.id}`
      : `/api/dashboard/events/${params.id}/schedule`;
    const method = isEdit ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scheduleForm) });
    if (res.ok) { setShowScheduleForm(false); setEditingSchedule(null); setScheduleForm({ title: '', description: '', startTime: '', endTime: '' }); fetchSchedule(); }
  };

  const deleteSchedule = async (item: any) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    await fetch(`/api/dashboard/events/${params.id}/schedule/${item.id}`, { method: 'DELETE' });
    fetchSchedule();
  };

  const submitPerformer = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    const url = isEdit
      ? `/api/dashboard/events/${params.id}/performers/${editingPerformer.id}`
      : `/api/dashboard/events/${params.id}/performers`;
    const method = isEdit ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(performerForm) });
    if (res.ok) { setShowPerformerForm(false); setEditingPerformer(null); setPerformerForm({ name: '', bio: '', instrument: '', role: 'PERFORMER' }); fetchPerformers(); }
  };

  const deletePerformer = async (p: any) => {
    if (!confirm(`Remove "${p.name}"?`)) return;
    await fetch(`/api/dashboard/events/${params.id}/performers/${p.id}`, { method: 'DELETE' });
    fetchPerformers();
  };

  const submitFaq = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    const url = isEdit
      ? `/api/dashboard/events/${params.id}/faqs/${editingFaq.id}`
      : `/api/dashboard/events/${params.id}/faqs`;
    const method = isEdit ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(faqForm) });
    if (res.ok) { setShowFaqForm(false); setEditingFaq(null); setFaqForm({ question: '', answer: '' }); fetchFaqs(); }
  };

  const deleteFaq = async (faq: any) => {
    if (!confirm(`Delete this FAQ?`)) return;
    await fetch(`/api/dashboard/events/${params.id}/faqs/${faq.id}`, { method: 'DELETE' });
    fetchFaqs();
  };

  const submitUpdate = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    const url = isEdit
      ? `/api/dashboard/events/${params.id}/updates/${editingUpdate.id}`
      : `/api/dashboard/events/${params.id}/updates`;
    const method = isEdit ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateForm) });
    if (res.ok) { setShowUpdateForm(false); setEditingUpdate(null); setUpdateForm({ message: '', updateType: 'INSTRUCTION', visibility: 'PUBLIC', isPinned: false }); fetchUpdates(); }
  };

  const deleteUpdate = async (u: any) => {
    if (!confirm('Delete this update?')) return;
    await fetch(`/api/dashboard/events/${params.id}/updates/${u.id}`, { method: 'DELETE' });
    fetchUpdates();
  };

  const tabs = [
    { id: 'tickets', label: '🎫 Tickets' },
    { id: 'schedule', label: '📋 Schedule' },
    { id: 'performers', label: '🎤 Performers' },
    { id: 'faqs', label: '❓ FAQs' },        { id: 'updates', label: '📢 Live Updates' },
  ] as const;

  // Add attendees tab if event is active or has tickets

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="text" className="h-8 w-64" />
        <Skeleton variant="card" className="h-40" />
      </div>
    );
  }

  if (error) {
    return <EmptyState icon="⚠️" title="Error" description={error} action={{ label: 'Try Again', onClick: () => window.location.reload() }} />;
  }

  const TicketTypeForm = ({ onSubmit, isEditing }: { onSubmit: (_e: React.FormEvent) => Promise<void>; isEditing: boolean }) => (              <form onSubmit={(event) => { event.preventDefault(); onSubmit(event); }} className="space-y-4">
      <h2 className="text-xl font-bold text-white">{isEditing ? 'Edit Ticket Type' : 'Create Ticket Type'}</h2>
      {formErrors.name && <p className="text-xs text-red-400">{formErrors.name}</p>}
      <Input label="Name" value={ticketForm.name} onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })} required placeholder="General Admission" />
      <Input label="Description (optional)" value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} placeholder="Early bird discount" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Price ($)" type="number" min="0" step="0.01" value={ticketForm.price} onChange={(e) => setTicketForm({ ...ticketForm, price: e.target.value })} required />
        <Input label="Quantity" type="number" min="0" value={ticketForm.quantity} onChange={(e) => setTicketForm({ ...ticketForm, quantity: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Min per Booking" type="number" min="1" value={ticketForm.minPerBooking} onChange={(e) => setTicketForm({ ...ticketForm, minPerBooking: e.target.value })} />
        <Input label="Max per Booking" type="number" min="1" value={ticketForm.maxPerBooking} onChange={(e) => setTicketForm({ ...ticketForm, maxPerBooking: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Booking Mode</label>
          <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" value={ticketForm.bookingMode} onChange={(e) => setTicketForm({ ...ticketForm, bookingMode: e.target.value })}>
            <option value="SOLO">Solo</option>
            <option value="DUO">Duo</option>
            <option value="TRIO">Trio</option>
            <option value="GROUP">Group</option>
            <option value="FLEXIBLE">Flexible</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
          <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" value={ticketForm.status} onChange={(e) => setTicketForm({ ...ticketForm, status: e.target.value })}>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="SOLD_OUT">Sold Out</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Sale Start (optional)" type="date" value={ticketForm.saleStart} onChange={(e) => setTicketForm({ ...ticketForm, saleStart: e.target.value })} />
        <Input label="Sale End (optional)" type="date" value={ticketForm.saleEnd} onChange={(e) => setTicketForm({ ...ticketForm, saleEnd: e.target.value })} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={() => { setShowTicketForm(false); setEditingTicket(null); }}>Cancel</Button>
        <Button variant="primary" type="submit">{isEditing ? 'Update' : 'Create'}</Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/dashboard/events/${params.id}`} className="text-sm text-indigo-400 hover:text-indigo-300 mb-1 inline-block">
            ← Back to Event
          </Link>
          <h1 className="text-2xl font-bold text-white">{eventTitle}</h1>
          <p className="text-gray-400 text-sm mt-1">Manage tickets, schedule, performers, and more</p>
        </div>
        <Badge variant={eventStatus === 'PUBLISHED' || eventStatus === 'SALES_OPEN' ? 'success' : eventStatus === 'DRAFT' ? 'warning' : 'default'}>{eventStatus}</Badge>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600/20 text-indigo-300 border-b-2 border-indigo-500'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tickets Tab */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Ticket Types</h2>
            <Button variant="primary" size="sm" onClick={() => { setEditingTicket(null); setShowTicketForm(true); }}>
              + Add Ticket Type
            </Button>
          </div>
          {ticketTypes.length === 0 ? (
            <Card variant="default" padding="xl" className="text-center">
              <p className="text-gray-400">No ticket types configured yet.</p>
              <p className="text-gray-500 text-sm mt-1">Add ticket types to allow attendees to register for this event.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {ticketTypes.map((tt) => (
                <Card key={tt.id} variant="default" padding="md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{tt.name}</h3>
                        <Badge variant={tt.status === 'ACTIVE' ? 'success' : tt.status === 'PAUSED' ? 'warning' : 'default'} size="sm">{tt.status}</Badge>
                        <Badge variant="primary" size="sm">{tt.bookingMode}</Badge>
                      </div>
                      {tt.description && <p className="text-gray-400 text-sm mt-1">{tt.description}</p>}
                      <div className="flex gap-4 mt-2 text-sm text-gray-400">
                        <span>💰 ${(tt.priceAmount / 100).toFixed(2)}</span>
                        <span>📦 {tt.quantity} total</span>
                        <span>✅ {tt.soldQty} sold</span>
                        <span>⏳ {tt.reservedQty} reserved</span>
                        <span>📅 {tt.saleStart ? new Date(tt.saleStart).toLocaleDateString() : 'No start'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button variant="secondary" size="sm" onClick={() => {
                        setEditingTicket(tt);
                        setTicketForm({
                          name: tt.name, description: tt.description || '',
                          price: (tt.priceAmount / 100).toString(), quantity: tt.quantity.toString(),
                          bookingMode: tt.bookingMode, minPerBooking: tt.minPerBooking.toString(),
                          maxPerBooking: tt.maxPerBooking.toString(),
                          saleStart: tt.saleStart ? tt.saleStart.split('T')[0] : '',
                          saleEnd: tt.saleEnd ? tt.saleEnd.split('T')[0] : '',
                          status: tt.status,
                        });
                        setShowTicketForm(true);
                      }}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteTicket(tt)}>Delete</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Ticket Form Overlay */}
          {showTicketForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
                {editingTicket ? (
                  <TicketTypeForm onSubmit={handleUpdateTicket} isEditing={true} />
                ) : (
                  <TicketTypeForm onSubmit={handleCreateTicket} isEditing={false} />
                )}
              </div>
            </div>
          )}
        </div>
      )}          {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Event Schedule</h2>
            <Button variant="primary" size="sm" onClick={() => { setEditingSchedule(null); setShowScheduleForm(true); }}>+ Add Item</Button>
          </div>
          {scheduleItems.length === 0 ? (
            <Card variant="default" padding="xl" className="text-center">
              <p className="text-gray-400">No schedule items yet.</p>
              <p className="text-gray-500 text-sm mt-1">Add a timeline so attendees know what to expect.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {scheduleItems.map((item, i) => (
                <Card key={item.id} variant="default" padding="sm" className="flex items-center gap-4">
                  <span className="text-gray-500 text-sm w-8">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{item.title}</span>
                      {!item.isPublished && <Badge variant="warning" size="sm">Draft</Badge>}
                    </div>
                    {item.description && <p className="text-gray-400 text-xs mt-0.5">{item.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <div className="text-sm text-indigo-400 font-medium">{item.startTime}</div>
                      {item.endTime && <div className="text-xs text-gray-500">{item.endTime}</div>}
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => { setEditingSchedule(item); setScheduleForm({ title: item.title, description: item.description || '', startTime: item.startTime, endTime: item.endTime || '' }); setShowScheduleForm(true); }}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => deleteSchedule(item)}>Del</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {showScheduleForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
                <form onSubmit={(e) => submitSchedule(e, !!editingSchedule)} className="space-y-4">
                  <h2 className="text-xl font-bold text-white">{editingSchedule ? 'Edit Schedule Item' : 'Add Schedule Item'}</h2>
                  <Input label="Title" value={scheduleForm.title} onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })} required placeholder="Doors Open" />
                  <Input label="Description (optional)" value={scheduleForm.description} onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })} placeholder="Main entrance opens" />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Start Time" type="time" value={scheduleForm.startTime} onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })} required />
                    <Input label="End Time (optional)" type="time" value={scheduleForm.endTime} onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })} />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={() => { setShowScheduleForm(false); setEditingSchedule(null); }}>Cancel</Button>
                    <Button variant="primary" type="submit">{editingSchedule ? 'Update' : 'Add'}</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performers Tab */}
      {activeTab === 'performers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Performers</h2>
            <Button variant="primary" size="sm" onClick={() => { setEditingPerformer(null); setShowPerformerForm(true); }}>+ Add Performer</Button>
          </div>
          {performers.length === 0 ? (
            <Card variant="default" padding="xl" className="text-center">
              <p className="text-gray-400">No performers added yet.</p>
              <p className="text-gray-500 text-sm mt-1">Add performers so attendees know who&apos;s playing.</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {performers.map((p) => (
                <Card key={p.id} variant="default" padding="sm" className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold">
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.instrument || p.role}</div>
                  </div>
                  <Badge variant="primary" size="sm">{p.role}</Badge>
                  <div className="flex gap-1">
                    <Button variant="secondary" size="sm" onClick={() => { setEditingPerformer(p); setPerformerForm({ name: p.name, bio: p.bio || '', instrument: p.instrument || '', role: p.role }); setShowPerformerForm(true); }}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => deletePerformer(p)}>Del</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {showPerformerForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
                <form onSubmit={(e) => submitPerformer(e, !!editingPerformer)} className="space-y-4">
                  <h2 className="text-xl font-bold text-white">{editingPerformer ? 'Edit Performer' : 'Add Performer'}</h2>
                  <Input label="Name" value={performerForm.name} onChange={(e) => setPerformerForm({ ...performerForm, name: e.target.value })} required placeholder="Artist name" />
                  <Input label="Bio (optional)" value={performerForm.bio} onChange={(e) => setPerformerForm({ ...performerForm, bio: e.target.value })} placeholder="About the performer..." />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Instrument (optional)" value={performerForm.instrument} onChange={(e) => setPerformerForm({ ...performerForm, instrument: e.target.value })} placeholder="Guitar, Vocals..." />
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" value={performerForm.role} onChange={(e) => setPerformerForm({ ...performerForm, role: e.target.value })}>
                        <option value="PERFORMER">Performer</option>
                        <option value="HOST">Host</option>
                        <option value="MC">MC</option>
                        <option value="SPECIAL_GUEST">Special Guest</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={() => { setShowPerformerForm(false); setEditingPerformer(null); }}>Cancel</Button>
                    <Button variant="primary" type="submit">{editingPerformer ? 'Update' : 'Add'}</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAQs Tab */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">FAQs</h2>
            <Button variant="primary" size="sm" onClick={() => { setEditingFaq(null); setShowFaqForm(true); }}>+ Add FAQ</Button>
          </div>
          {faqs.length === 0 ? (
            <Card variant="default" padding="xl" className="text-center">
              <p className="text-gray-400">No FAQs yet.</p>
              <p className="text-gray-500 text-sm mt-1">Add frequently asked questions for attendees.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {faqs.map((faq) => (
                <Card key={faq.id} variant="default" padding="md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{faq.question}</h3>
                      <p className="text-gray-400 text-sm mt-1">{faq.answer}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!faq.isPublished && <Badge variant="warning" size="sm">Draft</Badge>}
                      <Button variant="secondary" size="sm" onClick={() => { setEditingFaq(faq); setFaqForm({ question: faq.question, answer: faq.answer }); setShowFaqForm(true); }}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => deleteFaq(faq)}>Del</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {showFaqForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
                <form onSubmit={(e) => submitFaq(e, !!editingFaq)} className="space-y-4">
                  <h2 className="text-xl font-bold text-white">{editingFaq ? 'Edit FAQ' : 'Add FAQ'}</h2>
                  <Input label="Question" value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} required placeholder="What should I bring?" />
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Answer</label>
                    <textarea className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm min-h-[100px]" value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} required placeholder="Bring your instrument and..." />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={() => { setShowFaqForm(false); setEditingFaq(null); }}>Cancel</Button>
                    <Button variant="primary" type="submit">{editingFaq ? 'Update' : 'Add'}</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Updates Tab */}
      {activeTab === 'updates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Live Updates</h2>
            <Button variant="primary" size="sm" onClick={() => { setEditingUpdate(null); setShowUpdateForm(true); }}>+ Publish Update</Button>
          </div>
          {updates.length === 0 ? (
            <Card variant="default" padding="xl" className="text-center">
              <p className="text-gray-400">No live updates published yet.</p>
              <p className="text-gray-500 text-sm mt-1">During the event, publish updates to keep attendees informed.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {updates.map((u) => (
                <Card key={u.id} variant="default" padding="sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={u.updateType === 'EMERGENCY' ? 'error' : 'primary'} size="sm">
                          {u.updateType.replace(/_/g, ' ')}
                        </Badge>
                        {u.isPinned && <Badge variant="warning" size="sm">📌 Pinned</Badge>}
                      </div>
                      <p className="text-white text-sm mt-1">{u.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{u.author?.displayName}</span>
                        <span>•</span>
                        <span>{new Date(u.publishedAt).toLocaleString()}</span>
                        {u.visibility === 'ATTENDEES_ONLY' && <Badge variant="warning" size="sm">Attendees only</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-4">
                      <Button variant="secondary" size="sm" onClick={() => { setEditingUpdate(u); setUpdateForm({ message: u.message, updateType: u.updateType, visibility: u.visibility, isPinned: u.isPinned }); setShowUpdateForm(true); }}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => deleteUpdate(u)}>Del</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {showUpdateForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
                <form onSubmit={(e) => submitUpdate(e, !!editingUpdate)} className="space-y-4">
                  <h2 className="text-xl font-bold text-white">{editingUpdate ? 'Edit Update' : 'Publish Live Update'}</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Update Type</label>
                    <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" value={updateForm.updateType} onChange={(e) => setUpdateForm({ ...updateForm, updateType: e.target.value })}>
                      <option value="INSTRUCTION">Instruction</option>
                      <option value="EVENT_STARTED">Event Started</option>
                      <option value="ENTRY_OPENED">Entry Opened</option>
                      <option value="PERFORMANCE_NOW">Performance Now</option>
                      <option value="BREAK">Break</option>
                      <option value="TIMING_CHANGE">Timing Change</option>
                      <option value="VENUE_CHANGE">Venue Change</option>
                      <option value="EMERGENCY">Emergency</option>
                      <option value="CANCELLATION">Cancellation</option>
                      <option value="EVENT_COMPLETED">Event Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Message</label>
                    <textarea className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm min-h-[80px]" value={updateForm.message} onChange={(e) => setUpdateForm({ ...updateForm, message: e.target.value })} required placeholder="What&apos;s happening?" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Visibility</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" value={updateForm.visibility} onChange={(e) => setUpdateForm({ ...updateForm, visibility: e.target.value })}>
                        <option value="PUBLIC">Public</option>
                        <option value="ATTENDEES_ONLY">Attendees Only</option>
                      </select>
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={updateForm.isPinned} onChange={(e) => setUpdateForm({ ...updateForm, isPinned: e.target.checked })} className="rounded bg-gray-800 border-gray-700" />
                        <span className="text-sm text-gray-300">Pin to top</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={() => { setShowUpdateForm(false); setEditingUpdate(null); }}>Cancel</Button>
                    <Button variant="primary" type="submit">{editingUpdate ? 'Update' : 'Publish'}</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
