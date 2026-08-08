const API = process.env.PULSEGRID_API_URL || 'http://localhost:8000';

async function getIncidents() {
  try {
    const login = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
      cache: 'no-store',
    });
    const { access_token } = await login.json();
    const res = await fetch(`${API}/incidents`, {
      headers: { Authorization: `Bearer ${access_token}` },
      cache: 'no-store',
    });
    return res.json();
  } catch {
    return [];
  }
}

export default async function IncidentsPage() {
  const incidents = await getIncidents();

  return (
    <div>
      <h1>🚨 PulseGrid Incidents (SSR)</h1>
      <p style={{ color: '#6b7280' }}>Server-rendered incident list — no loading spinner on first paint</p>
      {incidents.length === 0 ? (
        <p>No active incidents</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {incidents.map((i: { id: string; title: string; severity: string; status: string; service_id: string }) => (
            <li key={i.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 8 }}>
              <strong>[{i.severity.toUpperCase()}]</strong> {i.title}
              <br />
              <small>{i.service_id} · {i.status}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
