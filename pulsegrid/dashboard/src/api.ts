const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let token: string | null = localStorage.getItem('pg_token');

export interface Incident {
  id: string;
  service_id: string;
  title: string;
  severity: string;
  status: string;
  alert_count: number;
  correlated_services: string[];
  created_at: string;
}

async function authFetch(path: string, options: RequestInit = {}) {
  if (!token) {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });
    const data = await res.json();
    token = data.access_token;
    localStorage.setItem('pg_token', token!);
  }
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchIncidents(): Promise<Incident[]> {
  return authFetch('/incidents');
}

export async function acknowledgeIncident(id: string): Promise<Incident> {
  return authFetch(`/incidents/${id}/acknowledge`, { method: 'POST' });
}

export async function resolveIncident(id: string): Promise<Incident> {
  return authFetch(`/incidents/${id}/resolve`, { method: 'POST' });
}

export function connectWebSocket(onMessage: (data: unknown) => void) {
  const wsUrl = API.replace('http', 'ws') + '/ws/incidents';
  const ws = new WebSocket(wsUrl);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  return ws;
}
