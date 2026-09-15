import { useEffect, useReducer, type ReactNode } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Card } from "./ui";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  ChartTooltip,
);

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

/*
 * Canvas can't use CSS `var()` or `color-mix()` directly, unlike the SVG charts
 * recharts drew. Resolve the active daisyUI theme's CSS custom properties to
 * real colors instead, and re-resolve whenever `data-theme` flips so the chart
 * follows the theme toggle.
 */
function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") {
    return fallback;
  }

  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function withAlpha(hex: string, alpha: string): string {
  return hex.length === 7 ? `${hex}${alpha}` : hex;
}

function useChartTheme() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const observer = new MutationObserver(() => rerender());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => observer.disconnect();
  }, []);

  const content = cssVar("--color-base-content", "#111827");

  return {
    axis: withAlpha(content, "99"),
    grid: withAlpha(content, "24"),
    tooltipBg: cssVar("--color-base-100", "#ffffff"),
    tooltipBorder: withAlpha(content, "2e"),
    tooltipText: content,
  };
}

function tooltipTheme(theme: ReturnType<typeof useChartTheme>) {
  return {
    backgroundColor: theme.tooltipBg,
    borderColor: theme.tooltipBorder,
    borderWidth: 1,
    titleColor: theme.tooltipText,
    bodyColor: theme.tooltipText,
    padding: 10,
    boxPadding: 4,
    usePointStyle: true,
  };
}

interface TrendSeries {
  key: string;
  name: string;
  color: string;
}

function trendScales(theme: ReturnType<typeof useChartTheme>, labelFormatter?: (v: string) => string, valueFormatter?: (v: number) => string) {
  return {
    x: {
      ticks: {
        color: theme.axis,
        font: { size: 11 },
        callback: labelFormatter ? ((value: string) => labelFormatter(value)) as never : undefined,
      },
      grid: { display: false },
      border: { display: false },
    },
    y: {
      ticks: {
        color: theme.axis,
        font: { size: 11 },
        callback: valueFormatter ? ((value: number) => valueFormatter(Number(value))) as never : undefined,
      },
      grid: { color: theme.grid },
      border: { display: false },
    },
  };
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
  series: TrendSeries[];
  valueFormatter?: (v: number) => string;
  labelFormatter?: (v: string) => string;
}) {
  const theme = useChartTheme();

  const chartData = {
    labels: data.map((row) => String(row[xKey] ?? "")),
    datasets: series.map((s) => ({
      label: s.name,
      data: data.map((row) => Number(row[s.key] ?? 0)),
      backgroundColor: s.color,
      borderRadius: { topLeft: 4, topRight: 4 },
      maxBarThickness: 32,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: trendScales(theme, labelFormatter, valueFormatter),
    plugins: {
      legend: { labels: { color: theme.tooltipText, font: { size: 12 } } },
      tooltip: {
        ...tooltipTheme(theme),
        callbacks: {
          label: (ctx: { dataset?: { label?: string }; parsed?: { y?: number } }) =>
            `${ctx.dataset?.label ?? ""}: ${valueFormatter ? valueFormatter(Number(ctx.parsed?.y ?? 0)) : ctx.parsed?.y}`,
        },
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Bar data={chartData as never} options={options as never} />
    </div>
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
  series: TrendSeries[];
  valueFormatter?: (v: number) => string;
  labelFormatter?: (v: string) => string;
}) {
  const theme = useChartTheme();

  const chartData = {
    labels: data.map((row) => String(row[xKey] ?? "")),
    datasets: series.map((s) => ({
      label: s.name,
      data: data.map((row) => Number(row[s.key] ?? 0)),
      borderColor: s.color,
      backgroundColor: s.color,
      borderWidth: 2.5,
      tension: 0.35,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: s.color,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: trendScales(theme, labelFormatter, valueFormatter),
    plugins: {
      legend: { labels: { color: theme.tooltipText, font: { size: 12 } } },
      tooltip: {
        ...tooltipTheme(theme),
        callbacks: {
          label: (ctx: { dataset?: { label?: string }; parsed?: { y?: number } }) =>
            `${ctx.dataset?.label ?? ""}: ${valueFormatter ? valueFormatter(Number(ctx.parsed?.y ?? 0)) : ctx.parsed?.y}`,
        },
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Line data={chartData as never} options={options as never} />
    </div>
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
  series: TrendSeries[];
  valueFormatter?: (v: number) => string;
  labelFormatter?: (v: string) => string;
}) {
  const theme = useChartTheme();

  const chartData = {
    labels: data.map((row) => String(row[xKey] ?? "")),
    datasets: series.map((s) => ({
      label: s.name,
      data: data.map((row) => Number(row[s.key] ?? 0)),
      borderColor: s.color,
      backgroundColor: withAlpha(s.color, "40"),
      borderWidth: 2.5,
      tension: 0.35,
      fill: true,
      pointRadius: 2,
      pointHoverRadius: 5,
      pointBackgroundColor: s.color,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: trendScales(theme, labelFormatter, valueFormatter),
    plugins: {
      legend: { labels: { color: theme.tooltipText, font: { size: 12 } } },
      tooltip: {
        ...tooltipTheme(theme),
        callbacks: {
          label: (ctx: { dataset?: { label?: string }; parsed?: { y?: number } }) =>
            `${ctx.dataset?.label ?? ""}: ${valueFormatter ? valueFormatter(Number(ctx.parsed?.y ?? 0)) : ctx.parsed?.y}`,
        },
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Line data={chartData as never} options={options as never} />
    </div>
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
  const theme = useChartTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const chartData = {
    labels: data.map((d) => d.name),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: data.map((d) => d.color),
        borderColor: theme.tooltipBg,
        borderWidth: 2,
        spacing: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipTheme(theme),
        callbacks: {
          label: (ctx: { parsed?: number; dataset?: { label?: string } }) =>
            valueFormatter ? valueFormatter(Number(ctx.parsed ?? 0)) : `${ctx.dataset?.label ?? ""}: ${ctx.parsed}`,
        },
      },
    },
  };

  return (
    <div className="relative h-full w-full">
      <div className="h-full w-full">
        <Doughnut data={chartData as never} options={options as never} />
      </div>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <span className="text-2xl font-bold text-base-content">{centerValue}</span>}
          {centerLabel && (
            <span className="text-[11px] uppercase tracking-wide text-base-content/60">
              {centerLabel} · {total}
            </span>
          )}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="truncate text-base-content/70">{d.name}</span>
            <span className="ml-auto font-medium text-base-content">{valueFormatter ? valueFormatter(d.value) : d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}