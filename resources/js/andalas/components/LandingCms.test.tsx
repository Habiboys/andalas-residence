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
});
