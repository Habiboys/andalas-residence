import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import type { ApexOptions } from 'apexcharts';
import { Card } from './ui';

const ApexChart = lazy(() => import('react-apexcharts'));
export const CHART_COLORS = ['#27745a', '#dbad4a', '#578cc8', '#bc6676', '#7e75bd', '#67aaa0'];

export function ChartCard({ title, subtitle, children, className = '' }: {
    title: string; subtitle?: string; children: ReactNode; className?: string;
}) {
    return <Card className={'min-w-0 border border-base-200 p-5 ' + className}>
        <h3 className="font-semibold text-base-content">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-base-content/60">{subtitle}</p>}
        <div className="mt-4 min-w-0">{children}</div>
    </Card>;
}

function useOptions(): ApexOptions {
    const [dark, setDark] = useState(false);
    useEffect(() => {
        const update = () => setDark(document.documentElement.dataset.theme?.includes('dark') ?? false);
        update();
        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);
    return {
        chart: { background: 'transparent', foreColor: dark ? '#cbd5e1' : '#64748b', fontFamily: 'DM Sans, sans-serif', toolbar: { show: false }, animations: { enabled: false }, parentHeightOffset: 0 },
        theme: { mode: dark ? 'dark' : 'light' },
        colors: CHART_COLORS,
        dataLabels: { enabled: false },
        grid: { borderColor: dark ? '#334155' : '#e8edf0', strokeDashArray: 4 },
        legend: { position: 'bottom', fontSize: '12px', itemMargin: { horizontal: 10, vertical: 6 } },
        tooltip: { theme: dark ? 'dark' : 'light' },
        noData: { text: 'Belum ada data' },
    };
}

function Chart({ options, series, type, label }: {
    options: ApexOptions; series: ApexOptions['series'];
    type: 'bar' | 'line' | 'area' | 'donut' | 'radialBar'; label: string;
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return <div role="img" aria-label={label} className="min-w-0">
        {mounted ? <Suspense fallback={<div className="skeleton h-64 w-full" />}>
            <ApexChart options={options} series={series} type={type} height={280} width="100%" />
        </Suspense> : <div className="skeleton h-64 w-full" />}
    </div>;
}

type TrendProps = {
    data: Array<Record<string, unknown>>; xKey: string;
    series: Array<{ key: string; name: string; color: string }>;
    valueFormatter?: (value: number) => string; labelFormatter?: (value: string) => string;
};

function TrendChart({ data, xKey, series, valueFormatter, labelFormatter, type }: TrendProps & { type: 'bar' | 'line' | 'area' }) {
    const base = useOptions();
    const options: ApexOptions = {
        ...base, colors: series.map((item) => item.color),
        stroke: { curve: 'smooth', width: type === 'bar' ? 0 : 3 },
        fill: type === 'area' ? { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.03 } } : { opacity: 1 },
        plotOptions: { bar: { borderRadius: 5, columnWidth: '45%' } },
        xaxis: { categories: data.map((row) => labelFormatter ? labelFormatter(String(row[xKey] ?? '')) : String(row[xKey] ?? '')), axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { min: 0, labels: { formatter: valueFormatter ?? ((value) => value.toLocaleString('id-ID', { maximumFractionDigits: 0 })) } },
        tooltip: { ...base.tooltip, y: { formatter: valueFormatter } },
    };
    return <Chart type={type} options={options} series={data.length ? series.map((item) => ({ name: item.name, data: data.map((row) => Number(row[item.key] ?? 0)) })) : []} label={series.map((item) => item.name).join(', ')} />;
}

export function TrendBarChart(props: TrendProps) { return <TrendChart {...props} type="bar" />; }
export function TrendLineChart(props: TrendProps) { return <TrendChart {...props} type="line" />; }
export function TrendAreaChart(props: TrendProps) { return <TrendChart {...props} type="area" />; }

export function DonutChart({ data, valueFormatter, centerLabel = 'Total', centerValue }: {
    data: Array<{ name: string; value: number; color: string }>; valueFormatter?: (value: number) => string;
    centerLabel?: string; centerValue?: string;
}) {
    const base = useOptions();
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (!total) return <div className="flex h-70 items-center justify-center text-sm text-base-content/60">Belum ada data untuk ditampilkan.</div>;
    return <Chart type="donut" label={data.map((item) => item.name + ': ' + item.value).join(', ')}
        series={data.map((item) => item.value)}
        options={{ ...base, labels: data.map((item) => item.name), colors: data.map((item) => item.color),
            stroke: { width: 3, colors: ['transparent'] },
            tooltip: { ...base.tooltip, y: { formatter: valueFormatter } },
            plotOptions: { pie: { donut: { size: '72%', labels: { show: true, total: { show: true, showAlways: true, label: centerLabel, formatter: () => centerValue ?? total.toLocaleString('id-ID') } } } } },
        }} />;
}

export function OccupancyChart({ total, empty }: { total: number; empty: number }) {
    const base = useOptions();
    const occupied = Math.max(0, total - empty);
    const percentage = total ? Math.round(occupied / total * 100) : 0;
    return <Chart type="radialBar" series={[percentage]} label={occupied + ' dari ' + total + ' kamar terisi'}
        options={{ ...base, labels: [occupied + ' / ' + total + ' kamar'], stroke: { lineCap: 'round' },
            plotOptions: { radialBar: { startAngle: -130, endAngle: 130, hollow: { size: '68%' }, track: { background: '#cbd5e133' },
                dataLabels: { name: { offsetY: 28, fontSize: '12px' }, value: { offsetY: -12, fontSize: '32px', fontWeight: 700 } } } } }} />;
}
