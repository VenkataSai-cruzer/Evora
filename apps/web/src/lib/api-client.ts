/**
 * API client for communicating with the backend (Render) API.
 *
 * Uses NEXT_PUBLIC_API_BASE_URL for the backend URL.
 * Includes credentials: 'include' for cross-origin cookie auth.
 *
 * This is the ONLY way frontend code should communicate with the database.
 * Do NOT import Prisma from apps/web.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:10000/api/v1';

export interface ApiError {
  statusCode: number;
  error: string;
  message?: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  constructor(
    _statusCode: number,
    message: string,
    _details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// ── CSRF Token handling ─────────────────────────────────
// The session cookie is HttpOnly (not readable from JS), so we fetch
// a CSRF token from the backend via GET /auth/csrf.

let csrfToken: string | null = null;
let csrfPromise: Promise<string | null> | null = null;

async function fetchCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  if (csrfPromise) return csrfPromise;

  csrfPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/csrf`, {
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      csrfToken = data.csrfToken;
      return csrfToken;
    } catch {
      return null;
    }
  })();

  return csrfPromise;
}

/** Clear cached CSRF token (e.g., after logout). */
export function clearCsrfToken(): void {
  csrfToken = null;
  csrfPromise = null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Attach CSRF token for mutation requests
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(options.method || 'GET')) {
    const token = await fetchCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let errorBody: ApiError;
    try {
      errorBody = await res.json();
    } catch {
      errorBody = {
        statusCode: res.status,
        error: res.statusText,
      };
    }
    throw new ApiClientError(
      errorBody.statusCode || res.status,
      errorBody.message || errorBody.error || 'Request failed',
      errorBody.details,
    );
  }

  const contentLength = res.headers.get('content-length');
  if (res.status === 204 || contentLength === '0') {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  del: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'DELETE' }),
} as const;

// ── Auth ────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface SessionResponse {
  user: SessionUser;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const data = await api.get<SessionResponse>('/auth/session');
    return data.user;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<{ user: SessionUser; csrfToken: string }> {
  return api.post('/auth/login', { email, password });
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: SessionUser; csrfToken: string }> {
  return api.post('/auth/register', data);
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
  clearCsrfToken();
}

// ── Events (Public) ─────────────────────────────────────

export interface PublicEventListItem {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  posterObjectKey: string | null;
  status: string;
  startAt: string;
  endAt: string | null;
  venueName: string;
  venueAddress: string | null;
  totalCapacity: number;
  ticketTypes: { id: string; name: string; price: number; currency: string; capacity: number; soldCount: number }[];
  _count: { tickets: number };
}

export interface EventDetailResponse {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  posterObjectKey: string | null;
  status: string;
  startAt: string;
  endAt: string | null;
  venueName: string;
  venueAddress: string | null;
  mapUrl: string | null;
  timezone: string | null;
  totalCapacity: number;
  salesPaused: boolean;
  bookingClosed: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  terms: string | null;
  ticketNumberPrefix: string;
  organizerId: string;
  organizer: { id: string; name: string } | null;
  ticketTypes: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    capacity: number;
    soldCount: number;
    maxPerOrder: number;
    active: boolean;
    saleStartAt: string | null;
    saleEndAt: string | null;
  }[];
  branding: Record<string, unknown> | null;
  partners: Record<string, unknown>[];
  templates: Record<string, unknown>[];
  faqs: { id: string; question: string; answer: string; sortOrder: number; isPublished: boolean }[];
  performers: { id: string; name: string; instrument: string | null; bio: string | null; sortOrder: number; isPublished: boolean }[];
  _count: { tickets: number };
  createdAt: string;
  updatedAt: string;
}

export interface EventsListResponse {
  events: PublicEventListItem[];
  total: number;
}

export async function listPublicEvents(params?: {
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
  upcoming?: boolean;
}): Promise<EventsListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.sort) searchParams.set('sort', params.sort);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.upcoming !== undefined) searchParams.set('upcoming', String(params.upcoming));
  const qs = searchParams.toString();
  return api.get(`/events${qs ? `?${qs}` : ''}`);
}

export async function getEventBySlug(slug: string): Promise<EventDetailResponse> {
  const data = await api.get<{ event: EventDetailResponse }>(`/events/${slug}`);
  return data.event;
}

// ── Admin Events ────────────────────────────────────────

export interface AdminEventListItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  startAt: string;
  venueName: string;
  totalCapacity: number;
  ticketTypes: { id: string; name: string; capacity: number; soldCount: number }[];
  _count: { orders: number; tickets: number; checkIns: number };
  createdAt: string;
  updatedAt: string;
}

export interface AdminEventsListResponse {
  events: AdminEventListItem[];
  total: number;
  page: number;
  limit: number;
}

export async function listAdminEvents(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminEventsListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return api.get(`/admin/events${qs ? `?${qs}` : ''}`);
}

export async function getAdminEvent(id: string): Promise<EventDetailResponse> {
  const data = await api.get<{ event: EventDetailResponse }>(`/admin/events/${id}`);
  return data.event;
}

export async function createEvent(data: {
  title: string;
  slug: string;
  startAt: string;
  venueName: string;
  venueAddress?: string;
  description?: string;
  totalCapacity: number;
}): Promise<EventDetailResponse> {
  const result = await api.post<{ event: EventDetailResponse }>('/admin/events', data);
  return result.event;
}

export async function updateEvent(id: string, data: Record<string, unknown>): Promise<EventDetailResponse> {
  const result = await api.patch<{ event: EventDetailResponse }>(`/admin/events/${id}`, data);
  return result.event;
}

export async function duplicateEvent(id: string): Promise<EventDetailResponse> {
  const result = await api.post<{ event: EventDetailResponse }>(`/admin/events/${id}/duplicate`);
  return result.event;
}

export async function publishEvent(id: string): Promise<void> {
  await api.post(`/admin/events/${id}/publish`);
}

export async function pauseSales(id: string): Promise<void> {
  await api.post(`/admin/events/${id}/pause-sales`);
}

export async function resumeSales(id: string): Promise<void> {
  await api.post(`/admin/events/${id}/resume-sales`);
}

export async function closeSales(id: string): Promise<void> {
  await api.post(`/admin/events/${id}/close-sales`);
}

// ── Orders ──────────────────────────────────────────────

export interface OrderResponse {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
  };
}

export async function createOrder(data: {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  attendees: { name: string; email?: string }[];
  utrNumber?: string;
}): Promise<OrderResponse> {
  return api.post('/orders', data);
}

// ── Tickets ─────────────────────────────────────────────

export interface TicketListItem {
  id: string;
  ticketNumber: string;
  status: string;
  userId: string;
  eventId: string;
  orderId: string | null;
  ticketTypeId: string;
  createdAt: string;
  event: {
    id: string;
    title: string;
    slug: string;
    startAt: string;
    venueName: string;
    venueAddress: string | null;
    posterObjectKey: string | null;
  };
  ticketType: { name: string; price: number } | null;
  checkIn: { checkedInAt: string; result: string } | null;
  order: { orderNumber: string; status: string } | null;
  attendee: { attendeeName: string } | null;
}

export interface TicketDetailResponse {
  id: string;
  ticketNumber: string;
  status: string;
  userId: string;
  eventId: string;
  orderId: string | null;
  ticketTypeId: string;
  checkedInAt: string | null;
  createdAt: string;
  event: {
    id: string;
    title: string;
    slug: string;
    posterObjectKey: string | null;
    startAt: string;
    endAt: string | null;
    venueName: string;
    venueAddress: string | null;
    mapUrl: string | null;
    status: string;
    organizerId: string;
    organizer: { id: string; name: string } | null;
  };
  ticketType: { id: string; name: string; price: number; currency: string } | null;
  order: { id: string; orderNumber: string; status: string; total: number } | null;
  attendee: { id: string; attendeeName: string; attendeeEmail: string } | null;
  checkIn: { checkedInAt: string; result: string } | null;
  user: { id: string; name: string; email: string };
}

export async function listMyTickets(): Promise<TicketListItem[]> {
  const data = await api.get<{ tickets: TicketListItem[] }>('/tickets');
  return data.tickets;
}

export async function getTicket(ticketNumber: string): Promise<TicketDetailResponse> {
  const data = await api.get<{ ticket: TicketDetailResponse }>(`/tickets/${ticketNumber}`);
  return data.ticket;
}

// ── Dashboard / Admin Helpers ───────────────────────────

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ContactRequestsResponse {
  messages: ContactMessage[];
  total: number;
  unread: number;
}

export interface DashboardStats {
  totalEvents: number;
  draftEvents: number;
  activeEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  recentEvents: AdminEventListItem[];
  totalOrders: number;
  contactMessages: number;
}

/**
 * Build dashboard stats from multiple API calls.
 * The backend doesn't have a single /admin/stats endpoint (yet),
 * so we compose from available endpoints.
 */
export async function getDashboardStats(_organizerId: string): Promise<DashboardStats> {
  const { events: allEvents, total } = await listAdminEvents();

  const recentEvents = allEvents.slice(0, 5);

  const totalEvents = total;
  const draftEvents = allEvents.filter((e) => e.status === 'DRAFT').length;
  const activeEvents = allEvents.filter((e) => e.status === 'PUBLISHED' || e.status === 'SALES_OPEN').length;
  const completedEvents = allEvents.filter((e) => e.status === 'COMPLETED').length;
  const cancelledEvents = allEvents.filter((e) => e.status === 'CANCELLED').length;
  const totalOrders = allEvents.reduce((sum, e) => sum + e._count.orders, 0);
  const contactMessages = 0; // Contact messages API not yet implemented on backend

  return {
    totalEvents,
    draftEvents,
    activeEvents,
    completedEvents,
    cancelledEvents,
    recentEvents,
    totalOrders,
    contactMessages,
  };
}

export async function listContactRequests(params?: {
  status?: string;
  q?: string;
}): Promise<ContactRequestsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.q) searchParams.set('q', params.q);
  const qs = searchParams.toString();
  // Falls back to empty response if backend doesn't have this endpoint yet
  try {
    return api.get(`/admin/contact-requests${qs ? `?${qs}` : ''}`);
  } catch {
    return { messages: [], total: 0, unread: 0 };
  }
}

// ── Check-in ────────────────────────────────────────────

export interface CheckInResult {
  result: 'VALID' | 'ALREADY_CHECKED_IN' | 'INVALID';
  message: string;
  attendeeName?: string;
  ticketType?: string;
  ticketNumber?: string;
  checkedInAt?: string;
}

export async function verifyQr(qrToken: string): Promise<CheckInResult> {
  return api.post('/check-in/verify', { qrToken });
}

// ── Payment Proof (UTR) ────────────────────────────────

export interface PaymentProofResponse {
  payment: {
    id: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    utrNumber: string;
    createdAt: string;
  };
}

export async function submitPaymentProof(data: {
  orderNumber: string;
  utrNumber: string;
}): Promise<PaymentProofResponse> {
  return api.post('/payments/proof', data);
}

// ── My Proof Status (get from /payments/my-proof/:orderNumber) ──

export interface MyProofStatusResponse {
  orderNumber: string;
  orderStatus: string;
  proof: {
    status: string;
    utrNumber: string;
    submittedAt: string;
    rejectionReason?: string;
  } | null;
}

export async function getMyProofStatus(orderNumber: string): Promise<MyProofStatusResponse> {
  return api.get(`/payments/my-proof/${orderNumber}`);
}

// ── Order by Number ────────────────────────────────────

export interface OrderDetailResponse {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    currency: string;
    subtotal: number;
    fees: number;
    resubmissionCount?: number;
    createdAt: string;
    updatedAt: string;
    event: {
      title: string;
      slug: string;
    };
    attendees: Array<{
      id: string;
      attendeeName: string;
      attendeeEmail: string | null;
      ticketTypeId: string;
    }>;
    tickets: Array<{
      id: string;
      ticketNumber: string;
      status: string;
    }>;
    payments: Array<{
      id: string;
      utrNumber: string | null;
      status: string;
      createdAt: string;
    }>;
  };
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderDetailResponse> {
  return api.get(`/orders/${orderNumber}`);
}

// ── Admin Orders ────────────────────────────────────────

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  event: { id: string; title: string; slug: string };
  attendees: Array<{ id: string; attendeeName: string }>;
  payments: Array<{ id: string; utrNumber: string | null; status: string; createdAt: string }>;
}

export interface AdminOrdersListResponse {
  orders: AdminOrderListItem[];
  total: number;
  page: number;
  limit: number;
}

export async function listAdminOrders(params?: {
  status?: string;
  eventId?: string;
  page?: number;
  limit?: number;
}): Promise<AdminOrdersListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.eventId) searchParams.set('eventId', params.eventId);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return api.get(`/admin/orders${qs ? `?${qs}` : ''}`);
}

export interface AdminOrderActionResponse {
  success: boolean;
  message: string;
  data?: {
    order: { id: string; orderNumber: string; status: string };
    ticketsCreated: number;
    paymentId: string | null;
  };
}

export async function approveOrder(id: string): Promise<AdminOrderActionResponse> {
  return api.post(`/admin/orders/${id}/approve`);
}

export async function rejectOrder(id: string, reason?: string): Promise<AdminOrderActionResponse> {
  return api.post(`/admin/orders/${id}/reject`, { reason });
}

// ── Contact ─────────────────────────────────────────────

export interface ContactSubmitResponse {
  message: string;
  id: string;
}

export async function submitContact(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<ContactSubmitResponse> {
  return api.post('/contact', data);
}

// ── Duplicate UTR Check (Phase 4.3A) ────────────────────

export interface UtrCheckResponse {
  duplicate: boolean;
  relatedOrder: {
    orderNumber: string;
    eventTitle: string;
    status: string;
  } | null;
  submissionCount: number;
}

export async function checkUtr(utr: string): Promise<UtrCheckResponse> {
  return api.get(`/payments/check-utr/${encodeURIComponent(utr)}`);
}

// ── Screenshot Proxy URL Helper (Phase 4.3A) ────────────

/**
 * Returns the authenticated screenshot URL for a payment proof.
 * The actual image is served via the backend proxy (no direct Drive URL).
 */
export function getProofImageUrl(proofId: string): string {
  return `${API_BASE_URL}/payments/proofs/${proofId}/image`;
}

// ── Test Payment ────────────────────────────────────────

export async function testPayment(orderId: string): Promise<{ status: string; message: string }> {
  return api.post('/payments/test', { orderId });
}

export default api;
