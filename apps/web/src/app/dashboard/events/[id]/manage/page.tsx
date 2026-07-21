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
  price: number;
  currency: string;
  capacity: number;
  soldCount: number;
  saleStartAt: string | null;
  saleEndAt: string | null;
  maxPerOrder: number;
  active: boolean;
}

interface ManageEventContentProps {
  params: { id: string };
}

interface FormErrors {
  [key: string]: string;
}

const TICKET_FORM_DEFAULTS = {
  name: '', description: '', price: '0', capacity: '50',
  maxPerOrder: '10',
  saleStartAt: '', saleEndAt: '', active: 'true',
};

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
  const [ticketForm, setTicketForm] = useState({ ...TICKET_FORM_DEFAULTS });

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
      price: parseFloat(ticketForm.price) || 0,
      capacity: parseInt(ticketForm.capacity) || 0,
      maxPerOrder: parseInt(ticketForm.maxPerOrder) || 10,
      saleStartAt: ticketForm.saleStartAt || null,
      saleEndAt: ticketForm.saleEndAt || null,
      active: ticketForm.active === 'true',
    };
    const res = await fetch(`/api/dashboard/events/${params.id}/ticket-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowTicketForm(false);
      setTicketForm({ ...TICKET_FORM_DEFAULTS });
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
    if (ticketForm.price) payload.price = parseFloat(ticketForm.price);
    if (ticketForm.capacity) payload.capacity = parseInt(ticketForm.capacity);
    if (ticketForm.maxPerOrder) payload.maxPerOrder = parseInt(ticketForm.maxPerOrder);
    payload.active = ticketForm.active === 'true';
    payload.description = ticketForm.description || null;
    if (ticketForm.saleStartAt) payload.saleStartAt = ticketForm.saleStartAt;
    if (ticketForm.saleEndAt) payload.saleEndAt = ticketForm.saleEndAt;

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
    { id: 'faqs', label: '❓ FAQs' },
    { id: 'updates', label: '📢 Live Updates' },
  ] as const;

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
                        <Badge variant={tt.active ? 'success' : 'default'} size="sm">{tt.active ? 'Active' : 'Inactive'}</Badge>
                      </div>
                      {tt.description && <p className="text-gray-400 text-sm mt-1">{tt.description}</p>}
                      <div className="flex gap-4 mt-2 text-sm text-gray-400">
                        <span>💰 {(tt.price / 100).toFixed(2)} {tt.currency}</span>
                        <span>📦 {tt.capacity} total</span>
                        <span>✅ {tt.soldCount} sold</span>
                        <span>📅 {tt.saleStartAt ? new Date(tt.saleStartAt).toLocaleDateString() : 'No start'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button variant="secondary" size="sm" onClick={() => {
                        setEditingTicket(tt);
                        setTicketForm({
                          name: tt.name, description: tt.description || '',
                          price: (tt.price / 100).toString(), capacity: tt.capacity.toString(),
                          maxPerOrder: tt.maxPerOrder.toString(),
                          saleStartAt: tt.saleStartAt ? tt.saleStartAt.split('T')[0] : '',
                          saleEndAt: tt.saleEndAt ? tt.saleEndAt.split('T')[0] : '',
                          active: tt.active ? 'true' : 'false',
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
                <form onSubmit={(e) => { e.preventDefault(); editingTicket ? handleUpdateTicket(e) : handleCreateTicket(e); }} className="space-y-4">
                  <h2 className="text-xl font-bold text-white">{editingTicket ? 'Edit Ticket Type' : 'Create Ticket Type'}</h2>
                  {formErrors.name && <p className="text-xs text-red-400">{formErrors.name}</p>}
                  <Input label="Name" value={ticketForm.name} onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })} required placeholder="General Admission" />
                  <Input label="Description (optional)" value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} placeholder="Early bird discount" />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Price ($)" type="number" min="0" step="0.01" value={ticketForm.price} onChange={(e) => setTicketForm({ ...ticketForm, price: e.target.value })} required />
                    <Input label="Capacity" type="number" min="0" value={ticketForm.capacity} onChange={(e) => setTicketForm({ ...ticketForm, capacity: e.target.value })} required />
                  </div>
                  <Input label="Max per Order" type="number" min="1" value={ticketForm.maxPerOrder} onChange={(e) => setTicketForm({ ...ticketForm, maxPerOrder: e.target.value })} />
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Active</label>
                    <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" value={ticketForm.active} onChange={(e) => setTicketForm({ ...ticketForm, active: e.target.value })}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Sale Start (optional)" type="date" value={ticketForm.saleStartAt} onChange={(e) => setTicketForm({ ...ticketForm, saleStartAt: e.target.value })} />
                    <Input label="Sale End (optional)" type="date" value={ticketForm.saleEndAt} onChange={(e) => setTicketForm({ ...ticketForm, saleEndAt: e.target.value })} />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={() => { setShowTicketForm(false); setEditingTicket(null); }}>Cancel</Button>
                    <Button variant="primary" type="submit">{editingTicket ? 'Update' : 'Create'}</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Tab */}
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
                    <Button variant="primary" type="submit">{editingSchedule ? 'Update' : 'Create'}</Button>
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
              <p className="text-gray-500 text-sm mt-1">Add the musicians and performers for this event.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {performers.map((p) => (
                <Card key={p.id} variant="default" padding="sm" className="flex items-center gap-4">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold">{p.name.charAt(0)}</div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{p.name}</span>
                      <Badge variant="primary" size="sm">{p.role}</Badge>
                      {p.instrument && <Badge variant="default" size="sm">{p.instrument}</Badge>}
                    </div>
                    {p.bio && <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{p.bio}</p>}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => { setEditingPerformer(p); setPerformerForm({ name: p.name, bio: p.bio || '', instrument: p.instrument || '', role: p.role }); setShowPerformerForm(true); }}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => deletePerformer(p)}>Del</Button>
                </Card>
              ))}
            </div>
          )}

          {showPerformerForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
                <form onSubmit={(e) => submitPerformer(e, !!editingPerformer)} className="space-y-4">
                  <h2 className="text-xl font-bold text-white">{editingPerformer ? 'Edit Performer' : 'Add Performer'}</h2>
                  <Input label="Name" value={performerForm.name} onChange={(e) => setPerformerForm({ ...performerForm, name: e.target.value })} required />
                  <Input label="Bio (optional)" value={performerForm.bio} onChange={(e) => setPerformerForm({ ...performerForm, bio: e.target.value })} />
                  <Input label="Instrument (optional)" value={performerForm.instrument} onChange={(e) => setPerformerForm({ ...performerForm, instrument: e.target.value })} />
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                    <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" value={performerForm.role} onChange={(e) => setPerformerForm({ ...performerForm, role: e.target.value })}>
                      <option value="PERFORMER">Performer</option>
                      <option value="BAND">Band</option>
                      <option value="HOST">Host</option>
                      <option value="GUEST">Guest</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={() => { setShowPerformerForm(false); setEditingPerformer(null); }}>Cancel</Button>
                    <Button variant="primary" type="submit">{editingPerformer ? 'Update' : 'Create'}</Button>
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
              <p className="text-gray-400">No FAQs added yet.</p>
              <p className="text-gray-500 text-sm mt-1">Add frequently asked questions about this event.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {faqs.map((faq) => (
                <Card key={faq.id} variant="default" padding="sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-white">{faq.question}</p>
                      <p className="text-gray-400 text-sm mt-1">{faq.answer}</p>
                    </div>
                    <div className="flex gap-2 ml-4 shrink-0">
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
                  <Input label="Question" value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} required />
                  <Input label="Answer" value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} required />
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={() => { setShowFaqForm(false); setEditingFaq(null); }}>Cancel</Button>
                    <Button variant="primary" type="submit">{editingFaq ? 'Update' : 'Create'}</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Updates Tab */}
      {activeTab === 'updates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Live Updates</h2>
            <Button variant="primary" size="sm" onClick={() => { setEditingUpdate(null); setShowUpdateForm(true); }}>+ Add Update</Button>
          </div>
          {updates.length === 0 ? (
            <Card variant="default" padding="xl" className="text-center">
              <p className="text-gray-400">No updates posted yet.</p>
              <p className="text-gray-500 text-sm mt-1">Post live updates for attendees about this event.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {updates.map((u) => (
                <Card key={u.id} variant="default" padding="sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={u.updateType === 'IMPORTANT' ? 'error' : 'default'} size="sm">{u.updateType}</Badge>
                        {u.isPinned && <Badge variant="primary" size="sm">Pinned</Badge>}
                        {u.author?.name && <span className="text-xs text-gray-500">by {u.author.name}</span>}
                      </div>
                      <p className="text-gray-300 text-sm mt-1">{u.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(u.publishedAt || u.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 ml-4 shrink-0">
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
                  <h2 className="text-xl font-bold text-white">{editingUpdate ? 'Edit Update' : 'Add Update'}</h2>
                  <Input label="Message" value={updateForm.message} onChange={(e) => setUpdateForm({ ...updateForm, message: e.target.value })} required />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Update Type</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" value={updateForm.updateType} onChange={(e) => setUpdateForm({ ...updateForm, updateType: e.target.value })}>
                        <option value="INSTRUCTION">Instruction</option>
                        <option value="IMPORTANT">Important</option>
                        <option value="REMINDER">Reminder</option>
                        <option value="CHANGE">Change</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Visibility</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" value={updateForm.visibility} onChange={(e) => setUpdateForm({ ...updateForm, visibility: e.target.value })}>
                        <option value="PUBLIC">Public</option>
                        <option value="ATTENDEES_ONLY">Attendees Only</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={updateForm.isPinned} onChange={(e) => setUpdateForm({ ...updateForm, isPinned: e.target.checked })} className="rounded border-gray-700" />
                    <span className="text-sm text-gray-300">Pin this update</span>
                  </label>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={() => { setShowUpdateForm(false); setEditingUpdate(null); }}>Cancel</Button>
                    <Button variant="primary" type="submit">{editingUpdate ? 'Update' : 'Create'}</Button>
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
