'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DebtEdge {
  from: { id: string; name: string };
  to: { id: string; name: string };
  amount: number;
  currency: string;
}

interface DebtGraphProps {
  debts: DebtEdge[];
  currentUserId?: string;
}

interface NodePosition {
  id: string;
  name: string;
  x: number;
  y: number;
  netBalance: number;
}

const COLORS = [
  'hsl(142, 76%, 36%)',
  'hsl(221, 83%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(24, 95%, 53%)',
  'hsl(346, 77%, 50%)',
  'hsl(47, 96%, 53%)',
  'hsl(173, 80%, 40%)',
  'hsl(292, 84%, 61%)',
];

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

/**
 * Interactive SVG-based debt graph showing money flow between group members.
 * Nodes are arranged in a circle with animated directional arrows.
 */
export const DebtGraph = ({ debts, currentUserId }: DebtGraphProps) => {
  const { nodes, edges } = useMemo(() => {
    const memberMap = new Map<string, { name: string; netBalance: number }>();

    for (const d of debts) {
      if (!memberMap.has(d.from.id)) {
        memberMap.set(d.from.id, { name: d.from.name, netBalance: 0 });
      }
      if (!memberMap.has(d.to.id)) {
        memberMap.set(d.to.id, { name: d.to.name, netBalance: 0 });
      }
      memberMap.get(d.from.id)!.netBalance -= d.amount;
      memberMap.get(d.to.id)!.netBalance += d.amount;
    }

    const members = Array.from(memberMap.entries());
    const count = members.length;
    const cx = 200;
    const cy = 180;
    const radius = Math.min(140, 60 + count * 20);

    const positions: NodePosition[] = members.map(([id, m], i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      return {
        id,
        name: m.name,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        netBalance: m.netBalance,
      };
    });

    const posMap = new Map(positions.map((p) => [p.id, p]));

    const edgeData = debts.map((d, i) => {
      const from = posMap.get(d.from.id)!;
      const to = posMap.get(d.to.id)!;
      return { ...d, fromPos: from, toPos: to, color: COLORS[i % COLORS.length]! };
    });

    return { nodes: positions, edges: edgeData };
  }, [debts]);

  if (debts.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[300px] items-center justify-center">
          <p className="text-sm text-muted-foreground">No debts to visualize. All settled up!</p>
        </CardContent>
      </Card>
    );
  }

  const formatAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Debt Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox="0 0 400 360" className="w-full" style={{ maxHeight: 400 }}>
          <defs>
            {edges.map((e, i) => (
              <marker
                key={`arrow-${i}`}
                id={`arrow-${i}`}
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={e.color} />
              </marker>
            ))}
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            const dx = e.toPos.x - e.fromPos.x;
            const dy = e.toPos.y - e.fromPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const nx = dx / dist;
            const ny = dy / dist;
            const offset = 28;
            const x1 = e.fromPos.x + nx * offset;
            const y1 = e.fromPos.y + ny * offset;
            const x2 = e.toPos.x - nx * offset;
            const y2 = e.toPos.y - ny * offset;

            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;

            const perpX = -ny * 15;
            const perpY = nx * 15;
            const cpx = mx + perpX;
            const cpy = my + perpY;

            return (
              <g key={`edge-${i}`}>
                <path
                  d={`M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`}
                  fill="none"
                  stroke={e.color}
                  strokeWidth={Math.max(1.5, Math.min(4, e.amount / 20))}
                  strokeOpacity={0.7}
                  markerEnd={`url(#arrow-${i})`}
                >
                  <animate
                    attributeName="stroke-dasharray"
                    from="0 1000"
                    to="1000 0"
                    dur="1.5s"
                    fill="freeze"
                  />
                </path>
                <text
                  x={cpx}
                  y={cpy - 6}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-semibold"
                >
                  {formatAmount(e.amount, e.currency)}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isCurrentUser = node.id === currentUserId;
            return (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={24}
                  className={
                    isCurrentUser ? 'fill-primary/20 stroke-primary' : 'fill-muted stroke-border'
                  }
                  strokeWidth={isCurrentUser ? 2.5 : 1.5}
                />
                <text
                  x={node.x}
                  y={node.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-foreground text-[11px] font-bold"
                >
                  {getInitials(node.name)}
                </text>
                <text
                  x={node.x}
                  y={node.y + 38}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {node.name.split(' ')[0]}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2">
          {nodes.map((node) => (
            <Badge
              key={node.id}
              variant={node.netBalance >= 0 ? 'default' : 'destructive'}
              className="text-xs"
            >
              {node.name.split(' ')[0]}: {node.netBalance >= 0 ? '+' : ''}
              {formatAmount(node.netBalance, debts[0]?.currency ?? 'USD')}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
