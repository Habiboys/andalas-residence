import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import MasterData from './MasterData';

it.each([
    ['jenis-kegiatan', 'Jenis Kegiatan'],
    ['penugasan', 'Penugasan Fasilitator'],
    ['fakultas', 'Fakultas'],
    ['departemen', 'Departemen'],
    ['prodi', 'Program Studi'],
    ['periode', 'Periode'],
    ['provinsi', 'Provinsi'],
    ['kota', 'Kota / Kabupaten'],
    ['kategori', 'Kategori Transaksi'],
])(
    'shows only the selected %s master section without tabs',
    (section, label) => {
        const html = renderToStaticMarkup(<MasterData section={section} />);
        expect(html).not.toContain('Data Master —');
        expect(html.match(/<h1/g)).toHaveLength(1);
        if (['provinsi', 'kota'].includes(section)) {
            expect(html).toContain('Sinkronkan dari wilayah.id');
            expect(html).not.toContain(`Tambah ${label}`);
        } else {
            expect(html).toContain(`Tambah ${label}`);
        }
        expect(html).not.toContain('>Tambah</button>');
        expect(html).not.toContain('role="tab');
        expect(html.match(/<table/g)).toHaveLength(1);
    },
);
