import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import RegistrationReview from './RegistrationReview';

it('shows registration management rows in a table and keeps actions closed initially', () => {
    const html = renderToStaticMarkup(
        <RegistrationReview
            registrations={{
                data: [
                    {
                        id: 'registration-1',
                        status: 'submitted',
                        funding: 'sponsor',
                        is_kipk: false,
                        student_profile: {
                            user: {
                                nama: 'Mahasiswa Contoh',
                                nim_nip: '22001001',
                            },
                        },
                    },
                ],
                current_page: 2,
                per_page: 10,
                last_page: 3,
                total: 21,
            }}
        />,
    );

    expect(html).toContain('<table');
    expect(html).toContain('No.');
    expect(html).toContain('>11</td>');
    expect(html).toContain('Mahasiswa Contoh');
    expect(html).toContain('Kelola');
    expect(html).not.toContain('Penanggung biaya');
});
