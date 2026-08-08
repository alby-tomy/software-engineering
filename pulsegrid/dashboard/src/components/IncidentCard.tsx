import { SeverityBadge } from './SeverityBadge';
import type { Incident } from '../api';

interface Props {
  incident: Incident;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}

export function IncidentCard({ incident, onAcknowledge, onResolve }: Props) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SeverityBadge severity={incident.severity} />
        <span style={{ fontSize: 12, color: '#6b7280' }}>{incident.status}</span>
      </div>
      <h3 style={{ margin: '8px 0 4px' }}>{incident.title}</h3>
      <p style={{ margin: 0, fontSize: 14, color: '#4b5563' }}>
        {incident.service_id} · {incident.alert_count} alerts
      </p>
      {incident.correlated_services.length > 0 && (
        <p style={{ fontSize: 12, color: '#9ca3af' }}>
          Correlated: {incident.correlated_services.slice(0, 3).join(', ')}
        </p>
      )}
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        {incident.status === 'triggered' && (
          <button onClick={() => onAcknowledge(incident.id)}>Acknowledge</button>
        )}
        {incident.status !== 'resolved' && (
          <button onClick={() => onResolve(incident.id)}>Resolve</button>
        )}
      </div>
    </div>
  );
}
