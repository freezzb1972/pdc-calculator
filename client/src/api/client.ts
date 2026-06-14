const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('pdc_token');
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${url}`, {
    headers,
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem('pdc_token');
    window.location.href = '/login';
    throw new Error('未登录');
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Projects
  getProjects: () => request<any[]>('/projects'),
  getProject: (id: number) => request<any>(`/projects/${id}`),
  createProject: (data: { name: string; description?: string }) =>
    request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: number, data: any) =>
    request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: number) =>
    request<any>(`/projects/${id}`, { method: 'DELETE' }),

  // Layout (Phase 1b)
  getProjectLayout: (projectId: number) => request<any>(`/projects/${projectId}/layout`),
  updateSegmentRoute: (id: number, data: { from_x?: number; from_y?: number; to_x?: number; to_y?: number; length_m?: number }) =>
    request<any>(`/projects/circuits/segment-route/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Rooms
  createRoom: (data: any) => request<any>('/projects/room', { method: 'POST', body: JSON.stringify(data) }),
  updateRoom: (id: number, data: any) => request<any>(`/projects/room/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoom: (id: number) => request<any>(`/projects/room/${id}`, { method: 'DELETE' }),

  // Circuits
  getCircuits: (roomId: number) => request<any[]>(`/circuits/by-room/${roomId}`),
  recommendCable: (filterId: number) => request<any>(`/circuits/recommend?filter_id=${filterId}`),
  createCircuit: (data: any) => request<any>('/circuits', { method: 'POST', body: JSON.stringify(data) }),
  updateCircuit: (id: number, data: any) =>
    request<any>(`/circuits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCircuit: (id: number) => request<any>(`/circuits/${id}`, { method: 'DELETE' }),

  // Segments
  getSegments: (circuitId: number) => request<any[]>(`/circuits/${circuitId}/segments`),
  createSegment: (data: any) => request<any>('/circuits/segments', { method: 'POST', body: JSON.stringify(data) }),
  updateSegment: (id: number, data: any) =>
    request<any>(`/circuits/segments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSegment: (id: number) => request<any>(`/circuits/segments/${id}`, { method: 'DELETE' }),

  // Devices
  createDevice: (data: any) => request<any>('/circuits/devices', { method: 'POST', body: JSON.stringify(data) }),
  updateDevice: (id: number, data: any) => request<any>(`/circuits/devices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDevice: (id: number) => request<any>(`/circuits/devices/${id}`, { method: 'DELETE' }),
  calcDragChain: (data: any) => request<any>('/circuits/calc-dragchain', { method: 'POST', body: JSON.stringify(data) }),

  // Filters
  getFilters: (search?: string) => request<any[]>(`/filters${search ? `?search=${search}` : ''}`),
  createFilter: (data: any) => request<any>('/filters', { method: 'POST', body: JSON.stringify(data) }),
  updateFilter: (id: number, data: any) =>
    request<any>(`/filters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFilter: (id: number) => request<any>(`/filters/${id}`, { method: 'DELETE' }),
  importFilters: (data: any) => request<any>('/filters/import', { method: 'POST', body: JSON.stringify({ filters: data }) }),
  exportFilters: () => request<any[]>('/filters/export/all'),

  // Cable specs
  getCables: () => request<any[]>('/cables'),
  createCable: (data: any) => request<any>('/cables', { method: 'POST', body: JSON.stringify(data) }),
  updateCable: (id: number, data: any) => request<any>(`/cables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCable: (id: number) => request<any>(`/cables/${id}`, { method: 'DELETE' }),
  importCables: (data: any) => request<any>('/cables/import', { method: 'POST', body: JSON.stringify({ cables: data }) }),

  // GB Tables
  getGBTables: () => request<any>('/gb-tables'),
  updateGBAmpacity: (id: number, data: any) =>
    request<any>(`/gb-tables/ampacity/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getGBVersion: () => request<any>('/gb-tables/version'),

  // Prices
  getPriceHistory: (params?: { item_type?: string; limit?: number }) =>
    request<any[]>(`/prices/history?${new URLSearchParams(params as any).toString()}`),
  importPrices: (data: any) => request<any>('/prices/import', { method: 'POST', body: JSON.stringify(data) }),

  // Export
  exportProjectExcel: (id: number) => {
    window.open(`${BASE}/export/project/${id}/excel`);
  },

  // BOM
  getBom: (projectId: number) => request<any>(`/export/project/${projectId}/bom`),

  // GB Compliance Check
  getGBCheck: (projectId: number) => request<any>(`/export/project/${projectId}/check`),

  // Selection Rules
  getSelectionRules: () => request<any[]>('/selection-rules'),
  createSelectionRule: (data: any) => request<any>('/selection-rules', { method: 'POST', body: JSON.stringify(data) }),
  updateSelectionRule: (id: number, data: any) =>
    request<any>(`/selection-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSelectionRule: (id: number) => request<any>(`/selection-rules/${id}`, { method: 'DELETE' }),

  // User Management
  getUsers: () => request<any[]>('/auth/users'),
  createUser: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (id: number) => request<any>(`/auth/users/${id}`, { method: 'DELETE' }),
  changePassword: (id: number, password: string) =>
    request<any>(`/auth/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
  changeMyPassword: (old_password: string, new_password: string) =>
    request<any>('/auth/me/password', { method: 'PUT', body: JSON.stringify({ old_password, new_password }) }),
};
