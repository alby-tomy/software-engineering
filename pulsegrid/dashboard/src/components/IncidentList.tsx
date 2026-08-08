import { useMemo, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { IncidentCard } from './IncidentCard';
import type { Incident } from '../api';

interface Props {
  incidents: Incident[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}

const ROW_HEIGHT = 160;

export function IncidentList({ incidents, onAcknowledge, onResolve }: Props) {
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState('');

  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      if (severityFilter && i.severity !== severityFilter) return false;
      if (serviceFilter && !i.service_id.includes(serviceFilter)) return false;
      return true;
    });
  }, [incidents, severityFilter, serviceFilter]);

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <IncidentCard
        incident={filtered[index]}
        onAcknowledge={onAcknowledge}
        onResolve={onResolve}
      />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="">All severities</option>
          <option value="p1">P1</option>
          <option value="p2">P2</option>
          <option value="p3">P3</option>
          <option value="p4">P4</option>
        </select>
        <input
          placeholder="Filter by service..."
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
        />
        <span style={{ lineHeight: '32px', color: '#6b7280' }}>
          {filtered.length} incidents
        </span>
      </div>
      <List height={600} itemCount={filtered.length} itemSize={ROW_HEIGHT} width="100%">
        {Row}
      </List>
    </div>
  );
}
