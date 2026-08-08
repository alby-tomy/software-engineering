interface Props {
  severity: string;
}

const COLORS: Record<string, string> = {
  p1: '#ef4444',
  p2: '#f97316',
  p3: '#eab308',
  p4: '#6b7280',
};

export function SeverityBadge({ severity }: Props) {
  return (
    <span
      style={{
        background: COLORS[severity] || '#6b7280',
        color: '#fff',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'uppercase',
      }}
    >
      {severity}
    </span>
  );
}
