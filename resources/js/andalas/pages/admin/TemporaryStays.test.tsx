import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import TemporaryStays from './TemporaryStays';

it('keeps the temporary stay list visible and opens the structured entry sheet on demand', () => {
    const html = renderToStaticMarkup(
        <TemporaryStays
            rooms={[
                { id: 'room-1', nomor_kamar: '101', tipe_kamar: 'Standar' },
            ]}
            stays={[]}
        />,
    );

    expect(html).toContain('Hunian Sementara');
    expect(html).toContain('Catat penghuni');
    expect(html).toContain('Informasi penghuni');
    expect(html).toContain('Masa tinggal dan kamar');
    expect(html).toContain('Belum ada data di sini');
});
