import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import TemporaryStays from './TemporaryStays';

it('shows the temporary stay list and links the unified registration workflow', () => {
    const html = renderToStaticMarkup(
        <TemporaryStays
            rooms={[
                { id: 'room-1', nomor_kamar: '101', tipe_kamar: 'Standar' },
            ]}
            stays={[]}
        />,
    );

    expect(html).toContain('Hunian Sementara');
    expect(html).toContain('Buka proses pendaftaran');
    expect(html).toContain('setelah kunci kembali');
    expect(html).not.toContain('dilepas otomatis');
    expect(html).toContain('Belum ada data di sini');
});
