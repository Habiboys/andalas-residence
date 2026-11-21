import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import Pelaporan, { ReportDetailModal } from './Pelaporan';

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
        expect(html.includes('aria-label="Halaman laporan kerusakan"')).toBe(
            lastPage > 1,
        );
    },
);

it('renders create damage report form with camera capture inside a modal and removes summary totals', () => {
    const emptyPage = { data: [], total: 0, last_page: 1, links: [] };
    const html = renderToStaticMarkup(
        <Pelaporan
            reports={emptyPage}
            daily={emptyPage}
            logbooks={emptyPage}
            summary={{ menunggu_triage: 3, selesai: 2 }}
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

    expect(html).toContain('Buat laporan / tambah item kamar');
    expect(html).toContain('Buat Laporan / Tambah Item Kamar');
    expect(html).toContain('<dialog class="modal');
    expect(html).toContain('Ambil Foto Langsung');
    expect(html).toContain('capture="environment"');
    expect(html).toContain('Pilih Galeri');
    expect(html).toContain('Simpan item laporan');
    expect(html).not.toContain('Belum Dikerjakan (disposisi)');
});

it('shows concise report summary cards with BARU badge, claim button, and omits Anggota tim', () => {
    const emptyPage = { data: [], total: 0, last_page: 1, links: [] };
    const reportsPage = {
        data: [
            {
                id: 'rep-1',
                nomor_tiket: '0001/H/107/2026',
                status: 'menunggu_triage',
                deskripsi: 'Keran bocor',
                source: 'resident',
                location_label: 'Kamar 107',
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
                        completed_at: null,
                        is_new: false,
                        photos: [],
                    },
                    {
                        id: 'item-2',
                        description: 'Lampu kamar mandi mati',
                        completed_at: null,
                        is_new: true,
                        photos: [],
                    },
                ],
                complaints: [],
                abilities: {
                    claim: true,
                    progress: false,
                    team: false,
                    complete: false,
                    linkAsset: false,
                    cancel: false,
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
            can_complain={false}
            can_report={false}
            resident_name=""
            assets={[]}
            facilities={[]}
            notifications={[]}
        />,
    );

    expect(html).toContain('0001/H/107/2026');
    expect(html).toContain('BARU (+1)');
    expect(html).toContain('Lampu kamar mandi mati');
    expect(html).toContain('Ambil &amp; Kerjakan');
    expect(html).toContain('Buka Detail');
    expect(html).not.toContain('Anggota tim');
});

it('shows reporter phone number and WhatsApp contact button in report detail modal', () => {
    const html = renderToStaticMarkup(
        <ReportDetailModal
            open
            onClose={() => {}}
            today="2026-11-21"
            canComplain={false}
            report={{
                id: 'rep-1',
                nomor_tiket: '0001/H/107/2026',
                status: 'sedang_dikerjakan',
                deskripsi: 'Keran bocor',
                source: 'resident',
                location_label: 'Kamar 107',
                priority: 'sedang',
                is_blocked: false,
                pelapor: {
                    id: 'u-1',
                    nama: 'Syauqi',
                    no_hp: '081234567890',
                },
                photos: [],
                assignments: [],
                status_histories: [],
                progress: [],
                items: [],
                complaints: [],
                abilities: {},
            }}
        />,
    );

    expect(html).toContain('Pelapor: Syauqi');
    expect(html).toContain('081234567890');
    expect(html).toContain('https://wa.me/6281234567890');
    expect(html).toContain('Hubungi WA');
});
