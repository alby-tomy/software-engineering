'use client';

import { useState } from 'react';

export function IncidentActions({ incidentId }: { incidentId: string }) {
  const [status, setStatus] = useState('idle');

  const act = async (action: 'acknowledge' | 'resolve') => {
    setStatus('loading');
    const login = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });
    const { access_token } = await login.json();
    await fetch(`/api/incidents/${incidentId}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}` },
    });
    setStatus('done');
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={() => act('acknowledge')} disabled={status === 'loading'}>Acknowledge</button>
      <button onClick={() => act('resolve')} disabled={status === 'loading'}>Resolve</button>
    </div>
  );
}
