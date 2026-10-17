import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import RoomTypeMaster from './RoomTypeMaster';
import BuildingWorkspace from './BuildingWorkspace';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    usePage: () => ({
        props: {
            roomTypeCatalog: [
                {
                    id: 'new',
                    code: 'studio',
                    name: 'Studio keluarga',
                    active: true,
                },
                {
                    id: 'old',
                    code: 'old_suite',
                    name: 'Suite lama',
                    active: false,
                },
            ],
        },
    }),
}));

it('lists database types including disabled types in the master menu', () => {
    const html = renderToStaticMarkup(<RoomTypeMaster />);
    expect(html).toContain('Master Tipe Kamar');
    expect(html).toContain('Tambah tipe kamar');
    expect(html).toContain('Studio keluarga');
    expect(html).toContain('Suite lama');
    expect(html).toContain('Nonaktif');
    expect(html).not.toContain('Hapus');
});

it('offers custom active types in a building without a fixed list of five types', () => {
    const html = renderToStaticMarkup(
        <BuildingWorkspace
            building={{
                id: 'building',
                kode_gedung: 'NEW',
                nama_gedung: 'Gedung baru',
                room_types: [],
            }}
            canManage
        />,
    );
    expect(html).toContain('Studio keluarga');
    expect(html).toContain('Edit tipe Studio keluarga');
    expect(html).not.toContain('Suite lama');
    expect(html).not.toContain('Edit tipe Premium');
});
