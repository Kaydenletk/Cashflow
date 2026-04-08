/**
 * components/landing/asset-curve-chart.tsx
 *
 * Recharts AreaChart that visualizes net-worth-over-time for the public
 * FIRE calculator. Accepts pre-computed {age, netWorth} points so it can
 * stay stateless — all scenario logic lives upstream in FireCalculator.
 *
 * Visual spec matches Compound's dark design system:
 *   - Emerald stroke + gradient fill (matches everything else on brand)
 *   - Subtle neutral axes (stroke #525252) with no axis lines
 *   - Dashed vertical reference line at the retirement age (if finite),
 *     labeled "FIRE" so the user knows where the magic happens
 *   - Mount animation via Framer Motion so the whole chart eases in
 *     instead of popping on first paint
 *
 * Slider drag re-renders use Recharts' built-in `animationDuration` to
 * keep the line smooth without debouncing the slider itself.
 */

'use client';

import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { CurvePoint } from '@/lib/calculations/fire';

interface AssetCurveChartProps {
  data: CurvePoint[];
  retirementAge: number;
  height?: number;
}

function formatCompactDollar(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }
  return `$${Math.round(value)}`;
}

interface TooltipPayload {
  value: number;
  payload: CurvePoint;
}

function ChartTooltip({
  active,
  payload,
  retirementAge,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  retirementAge: number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;
  const isFireRow =
    Number.isFinite(retirementAge) &&
    Math.abs(point.age - Math.round(retirementAge)) <= 0.5;

  return (
    <div className="rounded-lg border border-[#262626] bg-[#0A0A0A]/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="font-medium text-[#FAFAFA]">Age {point.age}</div>
      <div className="text-[#A3A3A3]">{formatCompactDollar(point.netWorth)}</div>
      {isFireRow && (
        <div className="mt-1 text-[#10B981]">you hit FIRE here</div>
      )}
    </div>
  );
}

export function AssetCurveChart({
  data,
  retirementAge,
  height = 260,
}: AssetCurveChartProps) {
  const showReferenceLine =
    Number.isFinite(retirementAge) &&
    data.length > 0 &&
    retirementAge >= data[0].age &&
    retirementAge <= data[data.length - 1].age;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id="fireArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="age"
            stroke="#525252"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#525252', fontSize: 11 }}
          />
          <YAxis
            stroke="#525252"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#525252', fontSize: 11 }}
            tickFormatter={formatCompactDollar}
            width={56}
          />
          <Tooltip
            content={<ChartTooltip retirementAge={retirementAge} />}
            cursor={{ stroke: '#262626', strokeWidth: 1 }}
          />
          {showReferenceLine && (
            <ReferenceLine
              x={Math.round(retirementAge)}
              stroke="#10B981"
              strokeDasharray="4 4"
              label={{
                value: 'FIRE',
                position: 'top',
                fill: '#10B981',
                fontSize: 11,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#fireArea)"
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
