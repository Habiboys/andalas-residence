import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card } from "./ui";

export const CHART_COLORS = [
  "#1A3D2B",
  "#C9A227",
  "#499443",
  "#E8C44A",
  "#2D5A40",
  "#B8722D",
  "#5DB352",
  "#7A9E9F",
  "#8A6F2D",
  "#0F2419",
];

export function ChartCard({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={`p-5 ${className}`}>
      <h3 className="mb-0.5 font-semibold text-base-content">{title}</h3>
      {subtitle && <p className="mb-4 text-xs text-base-content/60">{subtitle}</p>}
      <div className="h-64">{children}</div>
    </Card>
  );
}

function useChartColors() {
  return {
    axis: "color-mix(in oklab, var(--color-base-content) 60%, transparent)",
    grid: "color-mix(in oklab, var(--color-base-content) 14%, transparent)",
    tooltipBg: "var(--color-base-100)",
    tooltipBorder: "color-mix(in oklab, var(--color-base-content) 18%, transparent)",
    tooltipText: "var(--color-base-content)",
    label: "var(--color-base-content)",
  };
}

function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  colors,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string }>;
  label?: string | number;
  labelFormatter?: (v: string | number) => string;
  valueFormatter?: (v: number) => string;
  colors: ReturnType<typeof useChartColors>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{
        background: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        color: colors.tooltipText,
      }}
    >
      {label != null && <p className="font-semibold mb-1">{labelFormatter ? labelFormatter(String(label)) : label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: entry.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />
          {entry.name}: <span className="font-medium">{valueFormatter ? valueFormatter(Number(entry.value ?? 0)) : entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function TrendBarChart({
  data,
  xKey,
  series,
  valueFormatter,
  labelFormatter,
}: {
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: Array<{ key: string; name: string; color: string }>;
  valueFormatter?: (v: number) => string;
  labelFormatter?: (v: string) => string;
}) {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data as never} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: colors.axis }} tickFormatter={labelFormatter} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: colors.axis }} axisLine={false} tickLine={false} tickFormatter={(v: number) => (valueFormatter ? valueFormatter(v) : String(v))} width={52} />
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} colors={colors} />} cursor={{ fill: colors.grid }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={32} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({
  data,
  xKey,
  series,
  valueFormatter,
  labelFormatter,
}: {
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: Array<{ key: string; name: string; color: string }>;
  valueFormatter?: (v: number) => string;
  labelFormatter?: (v: string) => string;
}) {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data as never} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: colors.axis }} tickFormatter={labelFormatter} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: colors.axis }} axisLine={false} tickLine={false} tickFormatter={(v: number) => (valueFormatter ? valueFormatter(v) : String(v))} width={52} />
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} colors={colors} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TrendAreaChart({
  data,
  xKey,
  series,
  valueFormatter,
  labelFormatter,
}: {
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: Array<{ key: string; name: string; color: string }>;
  valueFormatter?: (v: number) => string;
  labelFormatter?: (v: string) => string;
}) {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data as never} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: colors.axis }} tickFormatter={labelFormatter} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: colors.axis }} axisLine={false} tickLine={false} tickFormatter={(v: number) => (valueFormatter ? valueFormatter(v) : String(v))} width={52} />
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} colors={colors} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} fill={`url(#grad-${i})`} strokeWidth={2.5} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  valueFormatter,
  centerLabel,
  centerValue,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  valueFormatter?: (v: number) => string;
  centerLabel?: string;
  centerValue?: string;
}) {
  const colors = useChartColors();
  const total = data.reduce((s, d) => s + d.value, 0);

  const pieTooltip = (props: { active?: boolean; payload?: Array<{ name?: string; value?: number }> }) =>
    props.active && props.payload?.length ? (
      <div
        className="rounded-lg border px-3 py-2 text-xs shadow-lg"
        style={{ background: colors.tooltipBg, borderColor: colors.tooltipBorder, color: colors.tooltipText }}
      >
        <p className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: colors.label }} />
          <span className="font-medium">{props.payload[0]?.name}</span>
        </p>
        <p className="mt-1">{valueFormatter ? valueFormatter(Number(props.payload[0]?.value ?? 0)) : props.payload[0]?.value}</p>
      </div>
    ) : null;

  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data as never}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={3}
            strokeWidth={2}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} stroke={colors.tooltipBg} />
            ))}
          </Pie>
          <Tooltip content={pieTooltip as never} />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue && <span className="text-2xl font-bold text-base-content">{centerValue}</span>}
          {centerLabel && <span className="text-[11px] uppercase tracking-wide text-base-content/60">{centerLabel} · {total}</span>}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="truncate text-base-content/70">{d.name}</span>
            <span className="ml-auto font-medium text-base-content">{valueFormatter ? valueFormatter(d.value) : d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
