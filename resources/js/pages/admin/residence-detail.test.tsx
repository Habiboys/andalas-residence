import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import { show as buildingShow } from '@/routes/andalas/gedung';
import { show as floorShow } from '@/routes/andalas/lantai';
import { show as roomShow } from '@/routes/andalas/kamar';
import { show as assetShow } from '@/routes/andalas/aset';
import { show as residentShow } from '@/routes/andalas/mahasiswa';
import ResidenceDetail, { BuildingInventory } from './residence-detail';
import KelolaBangunan from '@/andalas/pages/admin/KelolaBangunan';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
    usePage: () => ({
        props: {
            roomTypeCatalog: [
                'standar',
                'medium',
                'premium',
                'umum',
                'umum_vip',
            ].map((code) => ({
                id: code,
                code,
                name:
                    code === 'umum_vip'
                        ? 'Umum VIP'
                        : code.charAt(0).toUpperCase() + code.slice(1),
                active: true,
            })),
        },
    }),
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

it.each(['grid', 'table'] as const)(
    'shows linked floors and room occupancy in the %s building view',
    (view) => {
        const html = renderToStaticMarkup(
            <BuildingInventory
                initialView={view}
                floors={[
                    {
                        ...floor,
                        kamar: [{ ...room, occupants_count: 1, aset_count: 2 }],
                    },
                ]}
            />,
        );
        expect(html).toContain('Tampilan lantai dan kamar');
        expect(html).toContain('aria-pressed="true"');
        expect(html).toContain(`href="${floorShow.url(floor.id)}"`);
        expect(html).toContain(`href="${roomShow.url(room.id)}"`);
        expect(html).toContain('Penghuni aktif');
        expect(html).toContain('Data aset');
        expect(html).toContain('101');
    },
);

it.each(['grid', 'table'] as const)(
    'shows an empty building in the %s view',
    (view) => {
        const html = renderToStaticMarkup(
            <BuildingInventory initialView={view} floors={[]} />,
        );
        expect(html).toContain('Belum ada lantai tercatat.');
    },
);

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
    expect(html).toContain('Terisi sebagian');
    expect(html).not.toContain('terisi_sebagian');
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

it('shows room pricing beside the room information without a separate pricing table', () => {
    const html = renderToStaticMarkup(
        <ResidenceDetail
            kind="room"
            room={room}
            rates={[
                {
                    id: 'annual',
                    tipe_kamar: 'standar',
                    unit: 'year',
                    amount: '2500000',
                    room_amount: '10000000',
                },
                {
                    id: 'daily',
                    tipe_kamar: 'umum',
                    unit: 'day',
                    amount: '100000',
                    student_amount: '75000',
                },
            ]}
        />,
    );
    const pricing =
        html.split('aria-label="Tarif kamar"')[1]?.split('</section>')[0] ?? '';
    expect(pricing).toContain('Standar - Per orang / tahun');
    expect(pricing).toContain('Standar - Per kamar / tahun');
    expect(pricing).toContain('Umum - Mahasiswa / hari');
    for (const amount of ['2.500.000', '10.000.000', '100.000', '75.000'])
        expect(pricing).toContain(amount);
    expect(pricing).not.toContain('<table');
    expect(html).not.toContain('Tarif tercatat');
    expect(html.indexOf('aria-label="Tarif kamar"')).toBeLessThan(
        html.indexOf('Inventaris kamar'),
    );
});
it('shows the room annual fallback or an explicit missing tariff', () => {
    const fallback = renderToStaticMarkup(
        <ResidenceDetail
            kind="room"
            room={{ ...room, tarif_per_periode: '1500000' }}
        />,
    );
    expect(fallback).toContain('Per orang / tahun');
    expect(fallback).toContain('1.500.000');
    const empty = renderToStaticMarkup(
        <ResidenceDetail kind="room" room={room} />,
    );
    expect(empty).toContain('Tarif belum ditetapkan.');
});

it.each([true, false])(
    'shows one floor overview without building photography or repeated floor tables for manager %s',
    (canManage) => {
        const html = renderToStaticMarkup(
            <ResidenceDetail
                kind="floor"
                building={{
                    ...building,
                    foto: 'gedung/foto.jpg',
                    deskripsi: 'Deskripsi gedung yang tidak diperlukan',
                }}
                floor={{
                    ...floor,
                    booking_open: true,
                    booking_priority: 2,
                    kamar: [{ ...room, occupants_count: 1 }],
                }}
                can_manage={canManage}
                can_manage_availability={canManage}
            />,
        );
        const overview =
            html.split('Informasi lantai</h2>')[1]?.split('</dl>')[0] ?? '';
        expect(overview).toContain('<dl');
        expect(overview).toContain('Nomor lantai');
        expect(overview).toContain('2 orang');
        expect(overview).toContain('1 orang');
        expect(overview).toContain('Prioritas 2');
        expect(overview).toContain('Dibuka, mengikuti urutan pengisian');
        expect(overview).not.toContain('<table');
        expect(html).not.toContain('gedung/foto.jpg');
        expect(html).not.toContain('Deskripsi gedung yang tidak diperlukan');
        expect(html).not.toContain('<th>Lantai</th>');
        expect(html).not.toContain('Pembukaan dan prioritas lantai');
        expect(html).toContain('101');
        expect(html.includes('Atur lantai')).toBe(canManage);
        expect(html.includes('Tambah Kamar')).toBe(canManage);
    },
);
it('shows closed room selection and empty capacity on an empty floor', () => {
    const html = renderToStaticMarkup(
        <ResidenceDetail
            kind="floor"
            building={building}
            floor={{ ...floor, booking_open: false, kamar: [] }}
        />,
    );
    expect(html).toContain('Ditutup untuk pilihan baru');
    expect(html).toContain('0 orang');
});
