import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import MasterData from './MasterData';

it.each([
    ['jenis-kegiatan', 'Jenis Kegiatan'],
    ['penugasan', 'Penugasan Fasilitator'],
    ['fakultas', 'Fakultas'],
    ['departemen', 'Departemen'],
    ['prodi', 'Prodi'],
    ['periode', 'Periode'],
    ['provinsi', 'Provinsi'],
    ['kota', 'Kota / Kabupaten'],
    ['kategori', 'Kategori Transaksi'],
])(
    'shows only the selected %s master section without tabs',
    (section, label) => {
        const html = renderToStaticMarkup(<MasterData section={section} />);
        expect(html).toContain(`Data Master — ${label}`);
        expect(html).toContain(`Tambah ${label}`);
        expect(html).not.toContain('role="tab');
        expect(html.match(/<table/g)).toHaveLength(1);
    },
);
