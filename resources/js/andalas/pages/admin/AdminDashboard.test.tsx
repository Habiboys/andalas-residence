import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import AdminDashboard from './AdminDashboard';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    usePage: () => ({ props: { role: 'staff_admin' } }),
}));

vi.mock('../../components/charts', () => ({
    ChartCard: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
    DonutChart: () => null,
    OccupancyChart: () => null,
    TrendAreaChart: () => null,
    TrendBarChart: ({ data }: { data: unknown[] }) => (
        <pre>{JSON.stringify(data)}</pre>
    ),
    TrendLineChart: ({ data }: { data: unknown[] }) => (
        <pre>{JSON.stringify(data)}</pre>
    ),
}));

it('groups payment chart transactions by type and month without counting undated payments in the monthly trend', () => {
    const html = renderToStaticMarkup(
        <AdminDashboard
            pembayaran={[
                {
                    id: '1',
                    jenis_pembayaran: 'Sewa',
                    status: 'terverifikasi',
                    created_at: '2026-10-01',
                },
                {
                    id: '2',
                    jenis_pembayaran: 'Sewa',
                    status: 'menunggu_verifikasi',
                    created_at: '2026-10-02',
                },
                { id: '3', status: 'ditolak', created_at: '2026-09-01' },
                { id: '4', jenis_pembayaran: 'Sewa', status: 'terverifikasi' },
            ]}
        />,
    ).replaceAll('&quot;', '"');
    expect(html).toContain('{"jenis":"Sewa","jumlah":3}');
    expect(html).toContain('{"jenis":"Belum dikategorikan","jumlah":1}');
    expect(html).toContain(
        '{"bulan":"2026-10","menunggu":1,"terverifikasi":1,"ditolak":0}',
    );
    expect(html).toContain(
        '{"bulan":"2026-09","menunggu":0,"terverifikasi":0,"ditolak":1}',
    );
    expect(html.indexOf('2026-09')).toBeLessThan(html.indexOf('2026-10'));
});

it('passes empty series data to both new charts when no payments are recorded', () => {
    const html = renderToStaticMarkup(<AdminDashboard />);
    expect(html.match(/<pre>\[\]<\/pre>/g)).toHaveLength(2);
});
