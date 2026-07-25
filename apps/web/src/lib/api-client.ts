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

// ── Session Token handling ───────────────────────────────
// On desktop, the session is handled via HttpOnly cookies (sameSite: 'none').
// On mobile (iOS Safari / Android Chrome), third-party cookies are blocked,
// so we fall back to X-Session-Token header-based auth.
//
// On login, the backend returns a sessionToken in the response body.
// The frontend stores it here and sends it as X-Session-Token on every request.
// The backend middleware checks both cookie AND header.

let sessionToken: string | null = null;

/** Set the session token after successful login. */
export function setSessionToken(token: string | null): void {
  sessionToken = token;
}

/** Get the current session token (for auth provider). */
export function getSessionToken(): string | null {
  return sessionToken;
}

// ── CSRF Token handling ─────────────────────────────────
// The session cookie is HttpOnly (not readable from JS), so we fetch
// a CSRF token from the backend via GET /auth/csrf.
//
// IMPORTANT: The token is NOT cached permanently. If a request returns
// 403 (CSRF token required), the cache is cleared and a fresh token is
// fetched before retrying once. This prevents a stale/missing token
// from blocking all subsequent mutation requests.

let csrfToken: string | null = null;
let csrfPromise: Promise<string | null> | null = null;

async function fetchCsrfToken(forceRefresh: boolean = false): Promise<string | null> {
  // If forcing a refresh, clear cache first
  if (forceRefresh) {
    csrfToken = null;
    csrfPromise = null;
  }

  if (csrfToken) return csrfToken;
  if (csrfPromise) return csrfPromise;

  csrfPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/csrf`, {
        credentials: 'include',
        // Also send session token header in case cookies are blocked
        headers: sessionToken ? { 'X-Session-Token': sessionToken } : undefined,
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

/** Clear cached CSRF token (e.g., after logout or 403 retry). */
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

  // Attach session token for mobile browsers that block third-party cookies.
  // Desktop browsers continue using cookie-based auth.
  if (sessionToken) {
    headers['X-Session-Token'] = sessionToken;
  }

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

    // Handle CSRF token failure — clear cache and retry ONCE
    if (res.status === 403 && errorBody.error === 'CSRF token required') {
      // Only retry if we haven't already tried with a fresh token
      if (!(options as any)?._csrfRetried) {
        const freshToken = await fetchCsrfToken(true);
        if (freshToken) {
          const retryHeaders: Record<string, string> = {
            ...headers,
            'X-CSRF-Token': freshToken,
          };
          const retryRes = await fetch(url, {
            ...options,
            headers: retryHeaders,
            credentials: 'include',
            // Mark this as a retry to prevent infinite loops
            _csrfRetried: true,
          } as RequestInit & { _csrfRetried?: boolean });
          if (retryRes.ok) {
            const contentLength = retryRes.headers.get('content-length');
            if (retryRes.status === 204 || contentLength === '0') {
              return undefined as unknown as T;
            }
            return retryRes.json() as Promise<T>;
          }
          // Fall through to normal error handling if retry also fails
          try {
            errorBody = await retryRes.json();
          } catch {
            errorBody = { statusCode: retryRes.status, error: retryRes.statusText };
          }
        }
      }
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

  /**
   * Fetch a binary response (e.g. image/png, application/pdf) as a Blob.
   * Uses the same auth/cookie handling as the JSON API client.
   * Does NOT parse JSON.
   */
  fetchBinary: async (path: string, options?: RequestInit): Promise<{ blob: Blob; contentType: string; contentDisposition?: string }> => {
    const url = `${API_BASE_URL}${path}`;
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string>),
    };

    // Send session token for mobile (header-based auth fallback)
    if (sessionToken) {
      headers['X-Session-Token'] = sessionToken;
    }

    const res = await fetch(url, {
      ...options,
      method: options?.method || 'GET',
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      let errorMsg = 'Request failed';
      try {
        const errBody = await res.json();
        errorMsg = errBody.error || errBody.message || `HTTP ${res.status}`;
      } catch {
        errorMsg = `HTTP ${res.status} ${res.statusText}`;
      }
      throw new ApiClientError(res.status, errorMsg);
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = res.headers.get('content-disposition') || undefined;
    const blob = await res.blob();

    return { blob, contentType, contentDisposition };
  },
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

export async function login(email: string, password: string): Promise<{ user: SessionUser; csrfToken: string; sessionToken?: string }> {
  // Clear CSRF token before login so a fresh one is fetched based on the new session
  clearCsrfToken();
  const result = await api.post<{ user: SessionUser; csrfToken: string; sessionToken?: string }>('/auth/login', { email, password });
  // Store session token for mobile (header-based auth fallback)
  if (result.sessionToken) {
    setSessionToken(result.sessionToken);
  }
  return result;
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
  setSessionToken(null);
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

export async function markSoldOut(id: string): Promise<void> {
  await api.post(`/admin/events/${id}/mark-sold-out`);
}

export async function reopenBooking(id: string): Promise<void> {
  await api.post(`/admin/events/${id}/reopen-booking`);
}

export async function updateAdminTicketType(
  eventId: string,
  ticketTypeId: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    capacity?: number;
    maxPerOrder?: number;
    active?: boolean;
  },
): Promise<{ ticketType: any }> {
  return api.patch(`/admin/events/${eventId}/ticket-types/${ticketTypeId}`, data);
}

// ── Organizer Events ────────────────────────────────────

export async function getOrganizerEvents(params?: {
  page?: number;
  limit?: number;
}): Promise<{ events: any[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return api.get(`/organizer/events${qs ? `?${qs}` : ''}`);
}

export async function getOrganizerEvent(eventId: string): Promise<EventDetailResponse> {
  const data = await api.get<{ event: EventDetailResponse }>(`/organizer/events/${eventId}`);
  return data.event;
}

export async function organizerMarkSoldOut(eventId: string): Promise<void> {
  await api.post(`/organizer/events/${eventId}/mark-sold-out`);
}

export async function organizerReopenBooking(eventId: string): Promise<void> {
  await api.post(`/organizer/events/${eventId}/reopen-booking`);
}

export async function organizerPauseSales(eventId: string): Promise<void> {
  await api.post(`/organizer/events/${eventId}/pause-sales`);
}

export async function organizerResumeSales(eventId: string): Promise<void> {
  await api.post(`/organizer/events/${eventId}/resume-sales`);
}

export async function listOrganizerTicketTypes(eventId: string): Promise<{ ticketTypes: any[] }> {
  return api.get(`/organizer/events/${eventId}/ticket-types`);
}

export async function updateOrganizerTicketType(
  eventId: string,
  ticketTypeId: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    capacity?: number;
    maxPerOrder?: number;
    active?: boolean;
  },
): Promise<{ ticketType: any }> {
  return api.patch(`/organizer/events/${eventId}/ticket-types/${ticketTypeId}`, data);
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
  attendees: { name: string; email?: string; phone?: string }[];
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
  pendingOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
  totalTickets: number;
  contactMessages: number;
}

/**
 * Build dashboard stats from the dedicated /admin/stats endpoint.
 * Falls back to event-list aggregation if the endpoint is unavailable.
 */
export async function getDashboardStats(_organizerId: string): Promise<DashboardStats> {
  const [statsRes, eventsRes] = await Promise.allSettled([
    api.get<{
      events: { total: number; draft: number; published: number; completed: number; cancelled: number };
      orders: { total: number; pendingPayment: number; pendingVerification: number; confirmed: number; rejected: number };
      tickets: { total: number; checkedIn: number };
      messages: { unread: number };
    }>('/admin/stats'),
    listAdminEvents({ limit: 5 }),
  ]);

  const recentEvents = eventsRes.status === 'fulfilled' ? eventsRes.value.events : [];

  if (statsRes.status === 'fulfilled') {
    const s = statsRes.value;
    return {
      totalEvents: s.events.total,
      draftEvents: s.events.draft,
      activeEvents: s.events.published,
      completedEvents: s.events.completed,
      cancelledEvents: s.events.cancelled,
      recentEvents,
      totalOrders: s.orders.total,
      pendingOrders: s.orders.pendingPayment + s.orders.pendingVerification,
      approvedOrders: s.orders.confirmed,
      rejectedOrders: s.orders.rejected,
      totalTickets: s.tickets.total,
      contactMessages: s.messages.unread,
    };
  }

  // Fallback: derive from events list (note: capped at 5 — use only if /admin/stats fails)
  const allEvents = recentEvents;
  return {
    totalEvents: allEvents.length,
    draftEvents: allEvents.filter((e) => e.status === 'DRAFT').length,
    activeEvents: allEvents.filter((e) => e.status === 'PUBLISHED' || e.status === 'SALES_OPEN').length,
    completedEvents: allEvents.filter((e) => e.status === 'COMPLETED').length,
    cancelledEvents: allEvents.filter((e) => e.status === 'CANCELLED').length,
    recentEvents,
    totalOrders: allEvents.reduce((sum, e) => sum + e._count.orders, 0),
    pendingOrders: 0,
    approvedOrders: 0,
    rejectedOrders: 0,
    totalTickets: allEvents.reduce((sum, e) => sum + e._count.tickets, 0),
    contactMessages: 0,
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

// ── Check-in / Scanner (Phase 4.6) ─────────────────────

export interface ScannerEvent {
  id: string;
  title: string;
  slug: string;
  startAt: string;
  venueName: string;
  status?: string;
  gateName?: string;
}

export interface CheckInVerifyResponse {
  result: 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'INVALID_TICKET' | 'WRONG_EVENT' | 'CANCELLED' | 'EXPIRED' | 'NOT_ACTIVE';
  message: string;
  attendeeName?: string;
  attendeeEmail?: string;
  ticketType?: string;
  ticketNumber?: string;
  ticketCategory?: string;
  event?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  gateName?: string;
  originalCheckedInAt?: string;
  originalCheckedInBy?: string;
  originalGateName?: string;
  currentScanAt?: string;
  error?: string;
}

/**
 * Verify a ticket QR code at the scanner.
 * Sends the opaque QR token + eventId. Backend hashes the token,
 * looks up the ticket, and atomically checks in if valid.
 */
export async function checkInTicket(data: {
  token: string;
  eventId: string;
  gateName?: string;
  scannerDevice?: string;
}): Promise<CheckInVerifyResponse> {
  return api.post('/check-in/verify', data);
}

/**
 * Manual check-in by ticket number (fallback when QR won't scan).
 */
export async function manualCheckIn(data: {
  ticketNumber: string;
  eventId: string;
  gateName?: string;
}): Promise<CheckInVerifyResponse> {
  return api.post('/check-in/manual', data);
}

/**
 * Get events the current scanner is assigned to.
 */
export async function getScannerEvents(): Promise<{ events: ScannerEvent[] }> {
  return api.get('/check-in/scanner/events');
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

// ── Admin Tickets ────────────────────────────────────────

export interface AdminTicketListItem {
  id: string;
  ticketNumber: string;
  status: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  ticketCategory: string;
  source: string;
  visibility: string;
  createdAt: string;
  event: { id: string; title: string; slug: string; startAt: string; venueName: string };
  ticketType: { name: string; price: number } | null;
  order: { orderNumber: string; status: string } | null;
  attendee: { attendeeName: string } | null;
  checkIn: { checkedInAt: string; result: string } | null;
  issuedBy: { name: string } | null;
}

export interface AdminTicketDetailResponse {
  id: string;
  ticketNumber: string;
  status: string;
  userId: string;
  eventId: string;
  orderId: string | null;
  ticketTypeId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  ticketCategory: string;
  source: string;
  visibility: string;
  pricePaid: number;
  issuedAt: string;
  checkedInAt: string | null;
  gateName: string | null;
  createdAt: string;
  event: {
    id: string; title: string; slug: string; posterObjectKey: string | null;
    startAt: string; endAt: string | null; venueName: string; venueAddress: string | null;
    status: string; organizerId: string;
    organizer: { id: string; name: string } | null;
  };
  ticketType: { id: string; name: string; price: number; currency: string } | null;
  order: { id: string; orderNumber: string; status: string; total: number } | null;
  attendee: { id: string; attendeeName: string; attendeeEmail: string } | null;
  checkIn: { checkedInAt: string; result: string; scannerId: string; gateName: string } | null;
  user: { id: string; name: string; email: string };
  issuedBy: { name: string } | null;
}

export interface AdminTicketsListResponse {
  tickets: AdminTicketListItem[];
  total: number;
  page: number;
  limit: number;
}

export async function listAdminTickets(params?: {
  eventId?: string;
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AdminTicketsListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.eventId) searchParams.set('eventId', params.eventId);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return api.get(`/admin/tickets${qs ? `?${qs}` : ''}`);
}

export async function getAdminTicket(ticketNumber: string): Promise<AdminTicketDetailResponse> {
  const data = await api.get<{ ticket: AdminTicketDetailResponse }>(`/admin/tickets/${ticketNumber}`);
  return data.ticket;
}

// ── Duplicate UTR Check (Phase 4.3A) ────────────────────

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

// ── Organizer Tickets ────────────────────────────────────

export async function getOrganizerTicket(ticketNumber: string): Promise<AdminTicketDetailResponse> {
  const data = await api.get<{ ticket: AdminTicketDetailResponse }>(`/organizer/tickets/${encodeURIComponent(ticketNumber)}`);
  return data.ticket;
}

export async function getOrganizerOrder(id: string): Promise<{ order: any }> {
  return api.get(`/organizer/orders/by-id/${id}`);
}

export async function approveOrganizerOrder(orderNumber: string): Promise<AdminOrderActionResponse> {
  return api.post(`/organizer/orders/${orderNumber}/approve`);
}

export async function rejectOrganizerOrder(orderNumber: string, reason?: string): Promise<AdminOrderActionResponse> {
  return api.post(`/organizer/orders/${orderNumber}/reject`, { reason });
}

// ── User Dashboard (Phase 4.4) ───────────────────────────

export interface UserDashboardResponse {
  orders: any[];
  tickets: any[];
  events: any[];
  stats: {
    pendingPayments: number;
    approvedPayments: number;
    rejectedPayments: number;
    activeTickets: number;
    totalOrders: number;
  };
}

export async function getUserDashboard(): Promise<UserDashboardResponse> {
  return api.get('/users/me/dashboard');
}

export async function getUserOrders(): Promise<{ orders: any[] }> {
  return api.get('/users/me/orders');
}

export async function getUserOrder(orderNumber: string): Promise<{ order: any }> {
  return api.get(`/users/me/orders/${encodeURIComponent(orderNumber)}`);
}

export async function getUserTickets(): Promise<{ tickets: any[] }> {
  return api.get('/users/me/tickets');
}

export async function getUserPayments(): Promise<{ payments: any[]; proofPayments: any[] }> {
  return api.get('/users/me/payments');
}

// ── Test Payment ────────────────────────────────────────

export async function testPayment(orderId: string): Promise<{ status: string; message: string }> {
  return api.post('/payments/test', { orderId });
}

export default api;
