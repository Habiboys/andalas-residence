import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import Pelaporan from './Pelaporan';

it.each([0, 1, 2])(
    'shows pagination only for multiple pages (last page: %s)',
    (lastPage) => {
        const page = {
            data: [],
            total: lastPage === 0 ? 0 : lastPage === 1 ? 1 : 25,
            last_page: Math.max(1, lastPage),
            links: [
                { url: '/pelaporan?page=1', label: '1', active: true },
                ...(lastPage > 1
                    ? [{ url: '/pelaporan?page=2', label: '2', active: false }]
                    : []),
            ],
        };
        const html = renderToStaticMarkup(
            <Pelaporan
                reports={page}
                daily={page}
                logbooks={page}
                summary={{}}
                blocked_count={0}
                technicians={[]}
                buildings={[]}
                filters={{ date: '2026-11-12' }}
                today="2026-11-12"
                can_order={false}
                can_logbook={false}
                can_complain={false}
                can_report={false}
                resident_name=""
                assets={[]}
                facilities={[]}
                notifications={[]}
            />,
        );
        for (const label of [
            'Halaman logbook',
            'Halaman laporan kerusakan',
            'Halaman aktivitas teknisi',
        ]) {
            expect(html.includes(`aria-label="${label}"`)).toBe(lastPage > 1);
        }
    },
);

it('renders create damage report form inside a modal rather than an inline details toggle', () => {
    const emptyPage = { data: [], total: 0, last_page: 1, links: [] };
    const html = renderToStaticMarkup(
        <Pelaporan
            reports={emptyPage}
            daily={emptyPage}
            logbooks={emptyPage}
            summary={{}}
            blocked_count={0}
            technicians={[]}
            buildings={[]}
            filters={{ date: '2026-11-12' }}
            today="2026-11-12"
            can_order={false}
            can_logbook={false}
            can_complain={false}
            can_report
            resident_name="MUHAMMAD NOUVAL HABIBIE"
            room={{
                id: 'room-1',
                nomor_kamar: '2A.05',
                lantai: { gedung: { nama_gedung: 'Hijau (G)' } },
            }}
            assets={[]}
            facilities={[]}
            notifications={[]}
        />,
    );

    expect(html).not.toContain(
        '<details><summary class="cursor-pointer font-semibold">Buat laporan / tambah item kamar</summary>',
    );
    expect(html).toContain('Buat laporan / tambah item kamar');
    expect(html).toContain('Buat Laporan / Tambah Item Kamar');
    expect(html).toContain('<dialog class="modal');
    expect(html).toContain('Simpan item laporan');
    expect(html).toContain('Batal');
});

it('renders logbook, link asset, cancel ticket, and complaint forms inside modals', () => {
    const emptyPage = { data: [], total: 0, last_page: 1, links: [] };
    const reportsPage = {
        data: [
            {
                id: 'rep-1',
                nomor_tiket: 'TKT-001',
                status: 'selesai',
                deskripsi: 'Keran bocor',
                source: 'resident',
                priority: 'sedang',
                is_blocked: false,
                photos: [],
                assignments: [],
                status_histories: [],
                progress: [],
                items: [
                    {
                        id: 'item-1',
                        description: 'Keran wastafel',
                        completed_at: '2026-11-12',
                        photos: [],
                    },
                ],
                complaints: [],
                abilities: {
                    claim: false,
                    progress: false,
                    team: false,
                    complete: false,
                    linkAsset: true,
                    cancel: true,
                    confirm: false,
                },
            },
        ],
        total: 1,
        last_page: 1,
        links: [],
    };
    const html = renderToStaticMarkup(
        <Pelaporan
            reports={reportsPage}
            daily={emptyPage}
            logbooks={emptyPage}
            summary={{}}
            blocked_count={0}
            technicians={[]}
            buildings={[]}
            filters={{ date: '2026-11-12' }}
            today="2026-11-12"
            can_order={false}
            can_logbook
            can_complain
            can_report={false}
            resident_name=""
            assets={[]}
            facilities={[]}
            notifications={[]}
        />,
    );

    expect(html).not.toContain(
        '<details><summary class="cursor-pointer font-semibold">Catat logbook',
    );
    expect(html).not.toContain(
        '<details><summary class="cursor-pointer">Hubungkan inventaris</summary>',
    );
    expect(html).not.toContain(
        '<details><summary class="text-error cursor-pointer">Batalkan dengan alasan</summary>',
    );
    expect(html).not.toContain(
        '<details><summary class="cursor-pointer font-medium">Ajukan komplain ulang',
    );
    expect(html).toContain('Catat Logbook Pekerjaan Lain / Perintah Pimpinan');
    expect(html).toContain('Hubungkan Inventaris ke Item Laporan');
    expect(html).toContain('Batalkan Tiket TKT-001');
    expect(html).toContain('Ajukan Komplain Ulang Hasil Perbaikan');
});
