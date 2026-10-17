import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import BuildingWorkspace from './BuildingWorkspace';
import BuildingCreate from '@/pages/admin/building-create';
import KelolaBangunan from './KelolaBangunan';
import DetailKamar from '@/andalas/pages/mahasiswa/DetailKamar';
import { create, show } from '@/routes/andalas/gedung';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
}));

const building = {
    id: 'building-1',
    kode_gedung: 'NEW',
    nama_gedung: 'Gedung Baru',
    allowed_categories: ['student'],
    room_types: [
        {
            type: 'standar',
            enabled: true,
            max_capacity: 2,
            facilities: 'Dipan, Lemari',
        },
    ],
    lantai: [
        {
            id: 'floor-1',
            nomor_lantai: 1,
            nama_lantai: 'Lantai 1',
            kamar: [
                {
                    id: 'room-1',
                    nomor_kamar: '101',
                    kapasitas: 2,
                    tipe_kamar: 'standar',
                    status: 'kosong',
                    foto: 'kamar/101.jpg',
                },
            ],
        },
    ],
    fasilitas_umum: [
        {
            id: 'facility-1',
            nama_fasilitas: 'Dapur bersama',
            kategori: 'Dapur',
            kondisi: 'baik',
        },
    ],
};
const rates = [
    {
        id: 'rate-1',
        tipe_kamar: 'standar',
        unit: 'year',
        amount: '2500000',
        room_amount: '5000000',
    },
];

describe('building management stages', () => {
    it('shows a room photo to its resident with the room identity', () => {
        const html = renderToStaticMarkup(
            <DetailKamar
                penempatan={[
                    {
                        kamar: {
                            nomor_kamar: '101',
                            foto: 'kamar/101.jpg',
                            kapasitas: 2,
                            tipe_kamar: 'standar',
                            lantai: {
                                nama_lantai: 'Lantai 1',
                                gedung: { nama_gedung: 'Gedung Baru' },
                            },
                        },
                    },
                ]}
            />,
        );
        expect(html).toContain('/storage/kamar/101.jpg');
        expect(html).toContain('Gedung Baru');
        expect(html).toContain('101');
    });
    it('shows building information once without a hero or shortcut cards', () => {
        const html = renderToStaticMarkup(
            <BuildingWorkspace
                building={{
                    ...building,
                    alamat: 'Kampus Limau Manis',
                    deskripsi: 'Hunian mahasiswa',
                    gender_peruntukan: 'perempuan',
                }}
                rates={rates}
                canManage
            />,
        );
        expect(html).toContain('Tab informasi gedung');
        expect(html).toContain('role="tablist"');
        expect(html).toContain('Edit informasi dasar');
        expect(html).not.toContain('Simpan tipe Standar');
        expect(html).not.toContain('Tambah Kamar');
        expect(html).toContain('Kode gedung');
        expect(html).toContain('Kampus Limau Manis');
        expect(html).toContain('Hunian mahasiswa');
        expect(html).toContain('Perempuan');
        expect(html).toContain('Kapasitas penghuni');
        expect(html).not.toContain('Foto gedung belum tersedia');
        expect(html).not.toContain('Sudah tercatat');
        expect(html).not.toContain('lengkapi pengaturan');
        expect(html.match(/role="tab"/g)).toHaveLength(2);
        expect(html).toContain('Informasi Gedung');
        expect(html).toContain('Lantai &amp; Kamar');
        expect(html).toContain('<table');
    });

    it('keeps the building photo in its information tab instead of repeating it on every tab', () => {
        const photographed = { ...building, foto: 'gedung/baru.jpg' };
        const overview = renderToStaticMarkup(
            <BuildingWorkspace building={photographed} />,
        );
        const ratesTab = renderToStaticMarkup(
            <BuildingWorkspace building={photographed} initialStep={1} />,
        );
        expect(overview).toContain('/storage/gedung/baru.jpg');
        expect(ratesTab).not.toContain('/storage/gedung/baru.jpg');
    });

    it.each([
        [0, 'Edit kategori', 'Edit tipe Standar'],
        [0, 'Tambah tarif', 'Edit tarif'],
        [0, 'Tambah fasilitas', 'Dapur bersama'],
        [1, 'Tambah Lantai', '/storage/kamar/101.jpg'],
    ])('provides management actions in stage %s', (step, first, second) => {
        const html = renderToStaticMarkup(
            <BuildingWorkspace
                building={building}
                rates={rates}
                canManage
                initialStep={Number(step)}
            />,
        );
        expect(html).toContain(first);
        expect(html).toContain(second);
    });

    it('shows categories and room type data without edit fields or save buttons by default', () => {
        const html = renderToStaticMarkup(
            <BuildingWorkspace building={building} canManage initialStep={0} />,
        );
        expect(html).toContain('Mahasiswa S1 non-maba');
        expect(html).toContain('Dipan, Lemari');
        expect(html).toContain('2 orang');
        expect(html).toContain('Edit kategori');
        expect(html).toContain('Edit tipe Standar');
        expect(html).not.toContain('<input');
        expect(html).not.toContain('<textarea');
        expect(html).not.toContain('Simpan kategori');
        expect(html).not.toContain('Simpan tipe');
    });

    it('shows all building master data together without inline edit fields', () => {
        const html = renderToStaticMarkup(
            <BuildingWorkspace
                building={building}
                rates={rates}
                canManage
                initialStep={0}
            />,
        );
        expect(html).not.toContain('<input');
        expect(html).not.toContain('<textarea');
        expect(html).not.toContain('<select');
        expect(html).not.toContain('Simpan tarif');
        expect(html).not.toContain('Simpan fasilitas');
    });

    it('shows the room catalog without mutation controls to a viewer', () => {
        const html = renderToStaticMarkup(
            <BuildingWorkspace building={building} initialStep={1} />,
        );
        expect(html).toContain('/storage/kamar/101.jpg');
        expect(html).toContain('Kamar 101');
        expect(html).not.toContain('Tambah Kamar');
        expect(html).not.toContain('Edit fasilitas');
    });

    it('opens creation as a dedicated page instead of a drawer', () => {
        const list = renderToStaticMarkup(
            <KelolaBangunan gedung={[building]} />,
        );
        expect(list).toContain(`href="${create.url()}"`);
        expect(list).toContain(`href="${show.url(building.id)}"`);
        const html = renderToStaticMarkup(<BuildingCreate />);
        expect(html).toContain('Langkah tambah gedung');
        expect(html).toContain('Simpan &amp; lanjutkan pengaturan');
        expect(html).toContain('Nama Gedung');
        expect(html).toContain('Summer Course');
        expect(html).not.toContain('role="dialog"');
        expect(html).not.toContain('Cari gedung');
    });
    it('opens building edits as the full form with all existing gallery photos', () => {
        const html = renderToStaticMarkup(
            <BuildingCreate
                building={{
                    ...building,
                    photos: ['gedung/cover.jpg', 'gedung/inside.jpg'],
                }}
            />,
        );
        expect(html).toContain('Edit Gedung');
        expect(html).toContain('Simpan perubahan');
        expect(html).toContain('/storage/gedung/cover.jpg');
        expect(html).toContain('/storage/gedung/inside.jpg');
        expect(html).not.toContain('role="dialog"');
    });
    it('uses icon actions and places the gallery beside the basic information', () => {
        const html = renderToStaticMarkup(
            <BuildingWorkspace
                building={{
                    ...building,
                    photos: ['gedung/cover.jpg', 'gedung/inside.jpg'],
                }}
                rates={[
                    {
                        id: 'rate-1',
                        tipe_kamar: 'standar',
                        unit: 'year',
                        amount: '2500000',
                    },
                ]}
                canManage
            />,
        );
        expect(html).toContain('aria-label="Galeri Gedung Baru"');
        expect(html).toContain('aria-label="Edit informasi dasar"');
        expect(html).toContain('aria-label="Edit tarif"');
        expect(html).toContain('aria-label="Edit tipe Standar"');
        expect(html).not.toContain('>Edit tarif</button>');
        expect(html.split('<dialog')[0]).not.toContain('>Hapus</button>');
    });
});
