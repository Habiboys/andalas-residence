import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import { show as buildingShow } from '@/routes/andalas/gedung';
import { show as floorShow } from '@/routes/andalas/lantai';
import { show as roomShow } from '@/routes/andalas/kamar';
import { show as assetShow } from '@/routes/andalas/aset';
import { show as residentShow } from '@/routes/andalas/mahasiswa';
import ResidenceDetail from './residence-detail';
import KelolaBangunan from '@/andalas/pages/admin/KelolaBangunan';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
}));

const building = {
    id: 'building-1',
    kode_gedung: 'A',
    nama_gedung: 'RPX (A)',
    room_types: [
        {
            type: 'standar',
            enabled: true,
            max_capacity: 2,
            facilities: 'Dipan, Lemari',
        },
    ],
};
const floor = { id: 'floor-1', nomor_lantai: 1, nama_lantai: 'Lantai 1' };
const room = {
    id: 'room-1',
    nomor_kamar: '101',
    tipe_kamar: 'standar',
    kapasitas: 2,
    status: 'terisi_sebagian',
};

it('links room assets occupants and parent locations to separate detail pages', () => {
    const html = renderToStaticMarkup(
        <ResidenceDetail
            kind="room"
            building={building}
            floor={floor}
            type_definition={building.room_types[0]}
            can_manage
            can_view_assets
            can_view_residents
            room={{
                ...room,
                aset: [
                    {
                        id: 'asset-1',
                        nama_aset: 'Lemari',
                        kode_inventaris: 'INV-1',
                        kategori: 'Furniture',
                        kondisi: 'baik',
                        jumlah: 2,
                    },
                ],
                penempatan_kamar: [
                    {
                        id: 'placement-1',
                        status: 'aktif',
                        tanggal_mulai: '2026-10-07',
                        mahasiswa: {
                            id: 'student-1',
                            user: { nama: 'Penghuni Kamar', nim_nip: '261234' },
                        },
                    },
                ],
            }}
        />,
    );
    for (const destination of [
        buildingShow.url('building-1'),
        floorShow.url('floor-1'),
        assetShow.url('asset-1'),
        residentShow.url('student-1'),
    ]) {
        expect(html).toContain(`href="${destination}"`);
    }
    expect(html).toContain('Fasilitas menurut master');
    expect(html).toContain('Dipan, Lemari');
    expect(html).toContain('Penghuni Kamar');
    expect(html).toContain('INV-1');
    expect(html).not.toContain('Kelola lantai dan kamar');
    expect(html).not.toContain('Tambah Kamar');
});

it('shows empty inventory and placement states instead of claiming master facilities are installed', () => {
    const html = renderToStaticMarkup(
        <ResidenceDetail
            kind="room"
            building={building}
            floor={floor}
            room={room}
            type_definition={building.room_types[0]}
        />,
    );
    expect(html).toContain('Belum ada aset yang didata');
    expect(html).toContain('Belum ada penempatan penghuni');
    expect(html).not.toContain('Kelola lantai dan kamar');
});

it('renders floor and room management inline on a detail page', () => {
    const html = renderToStaticMarkup(
        <KelolaBangunan
            detail
            gedung={[{ ...building, lantai: [{ ...floor, kamar: [room] }] }]}
        />,
    );
    expect(html).toContain('Tambah Lantai');
    expect(html).toContain('Tambah Kamar');
    expect(html).toContain(`href="${roomShow.url('room-1')}"`);
    expect(html).toContain(`href="${floorShow.url('floor-1')}"`);
    expect(html).not.toContain('Cari gedung');
});

it('links asset locations back to rooms', () => {
    const html = renderToStaticMarkup(
        <ResidenceDetail
            kind="asset"
            building={building}
            asset={{
                id: 'asset-1',
                nama_aset: 'Lemari',
                kode_inventaris: 'INV-1',
                kategori: 'Furniture',
                kondisi: 'baik',
                jumlah: 2,
                kamar: room,
            }}
        />,
    );
    expect(html).toContain(`href="${roomShow.url('room-1')}"`);
    expect(html).toContain('Belum ada laporan kerusakan');
});
