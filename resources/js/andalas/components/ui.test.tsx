import { expect, it } from 'vite-plus/test';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataTable, Table, RowActions } from './ui';
import Sidebar from './Sidebar';

it('gives legacy tables search filters sorting pagination and per-page controls', () => {
    const html = renderToStaticMarkup(
        <Table
            columns={[{ key: 'nama', label: 'Nama' }]}
            data={[{ nama: 'Penghuni' }]}
        />,
    );
    for (const label of [
        'type="search"',
        'Urutkan berdasarkan Nama',
        'Baris per halaman',
        'Halaman berikutnya',
        'No.',
        'Penghuni',
    ]) {
        expect(html).toContain(label);
    }
});
it('paginates records and keeps allowed row actions visible', () => {
    const html = renderToStaticMarkup(
        <DataTable
            columns={[
                { key: 'nama', label: 'Nama' },
                {
                    key: 'aksi',
                    label: 'Aksi',
                    render: () => <RowActions onEdit={() => {}} />,
                },
            ]}
            data={Array.from({ length: 12 }, (_, index) => ({
                nama: 'Record-' + index + '-end',
            }))}
        />,
    );
    expect(html).toContain('Record-9-end');
    expect(html).not.toContain('Record-10-end');
    expect(html).toContain('Ubah');
    expect(html).not.toContain('Hapus</button>');
    expect(html).not.toContain('Filter Aksi');
});
it('shows the scan and permit menus for binaan residents', () => {
    const html = renderToStaticMarkup(
        <Sidebar
            role="mahasiswa"
            activeResident
            attendanceEligible
            currentPage="dashboard"
            setPage={() => {}}
        />,
    );
    expect(html).toContain('Scan QR / Absensi');
    expect(html).toContain('Perizinan');
});
it('hides binaan menus from residents outside the admission cohort', () => {
    const html = renderToStaticMarkup(
        <Sidebar
            role="mahasiswa"
            activeResident
            attendanceEligible={false}
            currentPage="dashboard"
            setPage={() => {}}
        />,
    );
    expect(html).not.toContain('Scan QR / Absensi');
    expect(html).not.toContain('Perizinan</button>');
});
it('keeps residence-only menus hidden for applicants', () => {
    const html = renderToStaticMarkup(
        <Sidebar
            role="mahasiswa"
            activeResident={false}
            attendanceEligible={false}
            currentPage="dashboard"
            setPage={() => {}}
        />,
    );
    expect(html).not.toContain('Scan QR / Absensi');
});

it('labels unnamed action columns and keeps categorical filters above the table', () => {
    const html = renderToStaticMarkup(
        <DataTable
            columns={[
                { key: 'nama', label: 'Nama' },
                {
                    key: 'status',
                    label: 'Status',
                    filter: { type: 'select', options: ['aktif', 'nonaktif'] },
                },
                {
                    key: 'aksi',
                    label: '',
                    render: () => (
                        <RowActions onEdit={() => {}} onDelete={() => {}} />
                    ),
                },
            ]}
            data={[{ nama: 'Andi', status: 'aktif' }]}
        />,
    );
    expect(html).toContain('>Aksi</span>');
    expect(html.indexOf('aria-label="Filter Status"')).toBeLessThan(
        html.indexOf('<table'),
    );
    expect(html).not.toContain('Filter Nama');
    expect(html).toContain('aria-label="Ubah data"');
    expect(html).toContain('aria-label="Hapus data"');
    expect(html).not.toContain('>Ubah</button>');
    expect(html).toContain('border-current');
});
