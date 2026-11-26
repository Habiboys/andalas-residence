import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import OrganizationChart, { type OrganizationNode } from './OrganizationChart';
import Sidebar from './Sidebar';
import LandingManage from '@/pages/admin/landing-manage';
import Beranda from '@/pages/landing/beranda';
import { type LandingSettings } from '../lib/landing-settings';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
    usePage: () => ({
        props: {
            profilSections: {},
            informasiMenu: ['berita', 'pengumuman'],
            auth: { user: null },
        },
    }),
}));

vi.mock('./RichTextEditor', () => ({
    default: ({ value }: { value: string }) => (
        <div aria-label="Editor konten">{value}</div>
    ),
}));

const settings: LandingSettings = {
    hero: {
        title: 'Hero dari database',
        eyebrow: 'Kampus',
        description: 'Deskripsi yang dikelola',
        image: '/storage/landing/media/hero.jpg',
        image_alt: 'Gedung kampus',
    },
    site: {
        name: 'Nama situs',
        tagline: 'Hunian',
        footer: 'Footer situs',
        email: 'asrama@example.com',
    },
    headings: { faq: 'FAQ dari pengelola', news: 'Kabar terbaru' },
    gallery: [],
    steps: [],
    categories: [],
    services: [],
    faqs: [{ q: 'Pertanyaan baru?', a: 'Jawaban dari database.' }],
};

it('groups all landing management destinations in one expandable menu', () => {
    const html = renderToStaticMarkup(
        <Sidebar
            role="staff_admin"
            currentPage="landing-page/visi-misi"
            setPage={() => {}}
        />,
    );
    expect(html).toContain('Submenu Landing Page');
    expect(html).toContain('Beranda &amp; Hero');
    expect(html).toContain('Struktur Organisasi');
    expect(html).toContain('Pustaka Media');
    expect(html).toContain('Visi &amp; Misi');
    expect(html).not.toContain('Kelola Profil');
});

it('opens a profile section directly in its editor instead of listing profile rows', () => {
    const html = renderToStaticMarkup(
        <LandingManage
            section="visi-misi"
            record={{
                id: 'vision',
                title: 'Visi & Misi',
                content: 'Isi visi misi',
                published: true,
            }}
            rows={[]}
            positions={[]}
            settings={settings}
        />,
    );
    expect(html).toContain('Isi visi misi');
    expect(html).toContain('Simpan konten');
    expect(html).toContain('Pilih dari pustaka media');
    expect(html).not.toContain('<table');
    expect(html).not.toContain('Kembali ke daftar');
});

it('draws reporting lines in sibling order and hides draft branches', () => {
    const node = (
        id: string,
        title: string,
        parent_id: string | null,
        sort_order: number,
        published = true,
    ): OrganizationNode => ({
        id,
        title,
        parent_id,
        sort_order,
        published,
        name: null,
        photo: null,
    });
    const html = renderToStaticMarkup(
        <OrganizationChart
            positions={[
                node('root', 'Kepala', null, 0),
                node('right', 'Layanan', 'root', 2),
                node('left', 'Keuangan', 'root', 1),
                node('draft', 'Draft cabang', 'root', 3, false),
                node('hidden', 'Nama tersembunyi', 'draft', 0),
            ]}
        />,
    );
    expect(html).toContain('Bagan struktur organisasi');
    expect(html).toContain('org-node');
    expect(html.indexOf('Keuangan')).toBeLessThan(html.indexOf('Layanan'));
    expect(html).not.toContain('Draft cabang');
    expect(html).not.toContain('Nama tersembunyi');
});

it('renders the configured hero FAQ and news on the public homepage', () => {
    const html = renderToStaticMarkup(
        <Beranda
            landingSettings={settings}
            testimoni={[]}
            berita={[{ id: 'news', judul: 'Berita terbit', tanggal: null }]}
            statistik={{ gedung: 10, kamar: 799, penghuni: 1200 }}
        />,
    );
    expect(html).toContain('Hero dari database');
    expect(html).toContain('/storage/landing/media/hero.jpg');
    expect(html).toContain('Pertanyaan baru?');
    expect(html).toContain('Jawaban dari database.');
    expect(html).toContain('Berita terbit');
    expect(html).toContain('Kabar terbaru');
    expect(html).toContain('Pilih jalur yang sesuai sebelum membuat akun.');
    expect(html).toContain('Tabel Ringkas Tarif Resmi');
    expect(html).toContain('Fasilitas Asrama &amp; Aturan Penting');
    expect(html).toContain('Prosedur Pembayaran Asrama');
    expect(html).not.toContain(
        'Pembayaran fleksibel sesuai kebijakan periode, termasuk opsi pengajuan cicilan/penundaan.',
    );
});

it('renders editable residence guide sections in beranda management and reflects custom settings on homepage', () => {
    const customSettings: LandingSettings = {
        ...settings,
        headings: {
            ...settings.headings,
            tracks: 'Jalur Masuk Khusus CMS',
            facilities: 'Fasilitas Unggulan CMS',
            payment: 'Tata Cara Bayar CMS',
        },
        registration_tracks: [
            {
                badge: 'Baru',
                title: 'Jalur Custom S1',
                description: 'Deskripsi jalur custom',
                points_text: 'Poin satu\nPoin dua',
                cta_label: 'Daftar Custom',
                cta_href: '/register',
            },
        ],
        facilities: [{ title: 'WiFi Kencang', text: 'Akses 24 jam' }],
        core_rules: [{ title: 'Tertib Waktu', text: 'Patuhi jam malam' }],
        payment_steps: [{ title: 'Cek Invoice', text: 'Buka menu Tagihan' }],
    };

    const manageHtml = renderToStaticMarkup(
        <LandingManage
            section="beranda"
            record={null}
            rows={[]}
            positions={[]}
            settings={customSettings}
        />,
    );
    expect(manageHtml).toContain('Jalur pendaftaran (Kartu beranda)');
    expect(manageHtml).toContain('Fasilitas asrama');
    expect(manageHtml).toContain('Aturan penting penghuni');
    expect(manageHtml).toContain('Langkah prosedur pembayaran');
    expect(manageHtml).toContain('Jalur Custom S1');

    const homeHtml = renderToStaticMarkup(
        <Beranda
            landingSettings={customSettings}
            testimoni={[]}
            statistik={{ gedung: 10, kamar: 799, penghuni: 1200 }}
        />,
    );
    expect(homeHtml).toContain('Jalur Masuk Khusus CMS');
    expect(homeHtml).toContain('Jalur Custom S1');
    expect(homeHtml).toContain('Fasilitas Unggulan CMS');
    expect(homeHtml).toContain('WiFi Kencang');
    expect(homeHtml).toContain('Tertib Waktu');
    expect(homeHtml).toContain('Tata Cara Bayar CMS');
    expect(homeHtml).toContain('Cek Invoice');
});

it('displays day, month, 6-month, and year tariffs side-by-side on the homepage', () => {
    const html = renderToStaticMarkup(
        <Beranda
            landingSettings={settings}
            testimoni={[]}
            statistik={{ gedung: 1, kamar: 20, penghuni: 10 }}
            residenceCatalog={[
                {
                    id: 'b-1',
                    name: 'Pupera Putera (F)',
                    code: 'F',
                    gender: 'laki_laki',
                    address: 'Limau Manis',
                    description: 'Gedung putra',
                    image: null,
                    floors: 3,
                    rooms: 20,
                    types: [
                        {
                            type: 'reguler',
                            rooms: 20,
                            capacity: 4,
                            facilities: 'Kasur, lemari',
                        },
                    ],
                    offers: [
                        {
                            category: 'local_non_kipk',
                            type: 'reguler',
                            unit: 'day',
                            amount: 75000,
                            places: 4,
                        },
                        {
                            category: 'local_non_kipk',
                            type: 'reguler',
                            unit: 'month',
                            amount: 300000,
                            places: 4,
                        },
                        {
                            category: 'local_non_kipk',
                            type: 'reguler',
                            unit: 'semester',
                            amount: 1250000,
                            places: 4,
                        },
                        {
                            category: 'local_non_kipk',
                            type: 'reguler',
                            unit: 'year',
                            amount: 2500000,
                            room_amount: 10000000,
                            places: 4,
                        },
                    ],
                },
            ]}
        />,
    );

    expect(html).toContain('Per Hari');
    expect(html).toContain('Per Bulan');
    expect(html).toContain('Per 6 Bulan');
    expect(html).toContain('Per Tahun');
    expect(html).toContain('75.000');
    expect(html).toContain('300.000');
    expect(html).toContain('1.250.000');
    expect(html).toContain('2.500.000');
});
