import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IncidentList } from './components/IncidentList';
import {
  acknowledgeIncident,
  connectWebSocket,
  fetchIncidents,
  resolveIncident,
} from './api';

export function App() {
  const queryClient = useQueryClient();
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: fetchIncidents,
    refetchInterval: 30000,
  });

  useEffect(() => {
    const ws = connectWebSocket(() => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    });
    return () => ws.close();
  }, [queryClient]);

  const handleAck = async (id: string) => {
    await acknowledgeIncident(id);
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  };

  const handleResolve = async (id: string) => {
    await resolveIncident(id);
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>🚨 PulseGrid</h1>
        <p style={{ color: '#6b7280' }}>Incident Response Dashboard</p>
      </header>
      {isLoading ? (
        <p>Loading incidents...</p>
      ) : (
        <IncidentList
          incidents={incidents}
          onAcknowledge={handleAck}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}
