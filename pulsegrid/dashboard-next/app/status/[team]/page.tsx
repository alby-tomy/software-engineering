const API = process.env.PULSEGRID_API_URL || 'http://localhost:8000';

export const revalidate = 60;

async function getStatus(team: string) {
  const res = await fetch(`${API}/status/${team}`, { next: { revalidate: 60 } });
  return res.json();
}

const STATUS_COLORS: Record<string, string> = {
  operational: '#22c55e',
  degraded: '#eab308',
  outage: '#ef4444',
};

export default async function StatusPage({ params }: { params: { team: string } }) {
  const status = await getStatus(params.team);

  return (
    <div>
      <h1>Status — {params.team}</h1>
      <p>
        Overall:{' '}
        <span style={{ color: STATUS_COLORS[status.overall] || '#6b7280', fontWeight: 600 }}>
          {status.overall}
        </span>
      </p>
      <div style={{ display: 'grid', gap: 12, maxWidth: 600 }}>
        {status.services.map((s: { service_id: string; status: string; active_incidents: number }) => (
          <div
            key={s.service_id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: 12,
              borderRadius: 8,
              background: '#f9fafb',
              borderLeft: `4px solid ${STATUS_COLORS[s.status] || '#6b7280'}`,
            }}
          >
            <span>{s.service_id}</span>
            <span style={{ color: STATUS_COLORS[s.status] }}>{s.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
