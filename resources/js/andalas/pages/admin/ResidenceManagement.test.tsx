import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import ResidenceManagement from './ResidenceManagement';

it('loads building room type masters without treating nested metadata as a table value', () => {
    const html = renderToStaticMarkup(
        <ResidenceManagement
            gedung={[
                {
                    id: 'A',
                    kode_gedung: 'A',
                    nama_gedung: 'RPX (A)',
                    allowed_categories: ['student'],
                    room_types: [
                        {
                            type: 'standar',
                            enabled: true,
                            max_capacity: 2,
                            facilities: 'Dipan',
                        },
                        {
                            type: 'premium',
                            enabled: false,
                            max_capacity: null,
                            facilities: '',
                        },
                    ],
                },
            ]}
        />,
    );
    expect(html).toContain('Pengaturan Layanan');
    expect(html).not.toContain('[object Object]');
});
