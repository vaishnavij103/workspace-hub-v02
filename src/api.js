const BASE = '/api';

class APIError extends Error {
  constructor(status, message, detail = '') {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function getAuthHeaders() {
  const headers = {};
  const saved = localStorage.getItem('apexon_user');
  if (saved) {
    try {
      const u = JSON.parse(saved);
      const token = u.token || u.user_id || 'usr_admin';
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      if (u.user_id) headers['X-User-Id'] = u.user_id;
      if (u.role) headers['X-User-Role'] = u.role;
    } catch {
      headers['Authorization'] = 'Bearer usr_admin';
    }
  } else {
    headers['Authorization'] = 'Bearer usr_admin';
  }
  return headers;
}

async function request(method, path, body = null, params = null) {
  let url = `${BASE}${path}`;
  if (params) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') sp.set(k, v); });
    const qs = sp.toString();
    if (qs) url += `?${qs}`;
  }
  const opts = { 
    method, 
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    } 
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new APIError(res.status, data?.error || res.statusText, data?.detail || '');
  }
  return data;
}

// Auth
export const login = (email, password) => request('POST', '/auth/login', { email, password });
export const register = (payload) => request('POST', '/auth/register', payload);
export const resetPassword = (email, password) => request('POST', '/auth/reset', { email, password });

// Health & Combined Stats
export const healthCheck = () => request('GET', '/health').catch(() => ({ status: 'error' }));
export const getStats = (params) => request('GET', '/stats', null, params).catch(() => ({}));

// Bookings Outlook Calendar .ics
export const getBookingIcsUrl = (bookingId) => `/api/bookings/${bookingId}/ics`;

// Invoices & Expense Reporting
export const getInvoices = (params) => request('GET', '/invoices', null, params);
export const processInvoiceOcr = async (formData) => {
  const url = `${BASE}/invoices/process-ocr`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new APIError(res.status, data?.detail || data?.error || res.statusText);
  }
  return data;
};
export const uploadInvoice = async (formData) => {
  const url = `${BASE}/invoices/upload`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new APIError(res.status, data?.detail || data?.error || res.statusText);
  }
  return data;
};
export const createInvoice = (payload) => request('POST', '/invoices', payload);
export const deleteInvoice = (id) => request('DELETE', `/invoices/${id}`);

// Workstations & Workstation Bookings
export const getWorkstations = (params) => request('GET', '/workstations', null, params);
export const createWorkstation = (payload) => request('POST', '/workstations', payload);
export const updateWorkstation = (id, payload) => request('PUT', `/workstations/${id}`, payload);
export const deleteWorkstation = (id) => request('DELETE', `/workstations/${id}`);

export const getWorkstationBookings = (params) => request('GET', '/workstation-bookings', null, params);
export const createWorkstationBooking = (payload) => request('POST', '/workstation-bookings', payload);
export const cancelWorkstationBooking = (id) => request('PUT', `/workstation-bookings/${id}/cancel`);
export const checkInWorkstationBooking = (id) => request('PUT', `/workstation-bookings/${id}/checkin`);
export const checkOutWorkstationBooking = (id) => request('PUT', `/workstation-bookings/${id}/checkout`);

// Admin Helpdesk Tickets
export const getTickets = (params) => request('GET', '/tickets', null, params);
export const createTicket = (payload) => request('POST', '/tickets', payload);
export const getTicketById = (id) => request('GET', `/tickets/${id}`);
export const updateTicket = (id, payload) => request('PUT', `/tickets/${id}`, payload);
export const addTicketComment = (id, payload) => request('POST', `/tickets/${id}/comments`, payload);

// Rooms & RoomBookings
export const getRooms = (params) => request('GET', '/rooms', null, params);
export const createRoom = (payload) => request('POST', '/rooms', payload);
export const updateRoom = (id, payload) => request('PUT', `/rooms/${id}`, payload);
export const deactivateRoom = (id) => request('DELETE', `/rooms/${id}`);
export const getRoomAvailability = (id, date) => request('GET', `/rooms/${id}/availability`, null, { date });
export const getAdminContacts = (params) => request('GET', '/admin-contacts', null, params);

export const importRoomsFromCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const url = `${BASE}/rooms/import`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new APIError(res.status, data?.detail || res.statusText, data?.errors?.join('; '));
  }
  return data;
};

// Bookings
export const getBookings = (params) => request('GET', '/bookings', null, params);
export const createBooking = (payload) => request('POST', '/bookings', payload);
export const updateBooking = (id, payload) => request('PUT', `/bookings/${id}`, payload);
export const cancelBooking = (id) => request('DELETE', `/bookings/${id}`);
export const checkInBooking = (id) => request('POST', `/bookings/${id}/checkin`);
export const checkOutBooking = (id) => request('POST', `/bookings/${id}/checkout`);

// VisiFlow Visitor Management
export const getVisitors = (params) => request('GET', '/visitors', null, params);
export const createVisitor = (payload) => request('POST', '/visitors', payload);
export const updateVisitor = (id, payload) => request('PUT', `/visitors/${id}`, payload);
export const checkInVisitor = (id) => request('POST', `/visitors/${id}/checkin`);
export const checkOutVisitor = (id) => request('POST', `/visitors/${id}/checkout`);
export const deleteVisitor = (id) => request('DELETE', `/visitors/${id}`);

// ParkSwift Smart Parking
export const getParkingSlots = (params) => request('GET', '/parking/slots', null, params);
export const createParkingSlot = (payload) => request('POST', '/parking/slots', payload);
export const getParkingReservations = (params) => request('GET', '/parking/reservations', null, params);
export const createParkingReservation = (payload) => request('POST', '/parking/reservations', payload);
export const checkInParking = (id) => request('POST', `/parking/reservations/${id}/checkin`);
export const checkOutParking = (id) => request('POST', `/parking/reservations/${id}/checkout`);
export const cancelParkingReservation = (id) => request('DELETE', `/parking/reservations/${id}`);

// Users & Directory
export const getUsers = () => request('GET', '/users');
export const createUser = (payload) => request('POST', '/users', payload);
export const getUserBookings = (id) => request('GET', `/users/${id}/bookings`);

// Notifications
export const getNotifications = (params) => request('GET', '/notifications', null, params);
export const markNotificationRead = (id) => request('PUT', `/notifications/${id}/read`, {});
export const markNotificationUnread = (id) => request('PUT', `/notifications/${id}/unread`, {});
export const markAllNotificationsRead = (user_id) => request('PUT', '/notifications/read-all', {}, { user_id });
export const markAllNotificationsUnread = (user_id) => request('PUT', '/notifications/unread-all', {}, { user_id });

// AI Assistant Chatbot
export const sendChatMessage = (message, history = []) => request('POST', '/chat', { message, history });

export { APIError };
