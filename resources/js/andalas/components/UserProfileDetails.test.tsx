import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import UserProfileDetails from './UserProfileDetails';
import DataMahasiswa from '../pages/admin/DataMahasiswa';

const summary = {
    category: 'Mahasiswa internasional berbayar',
    residence: 'Alumni asrama',
    account: 'Aktif',
    sections: [
        {
            title: 'Identitas dan akun',
            fields: {
                'Nama lengkap': '<script>nama</script>',
                'Nomor telepon': null,
            },
        },
    ],
};

it('renders escaped identity values and missing data clearly', () => {
    const html = renderToStaticMarkup(<UserProfileDetails summary={summary} />);
    expect(html).toContain('&lt;script&gt;nama&lt;/script&gt;');
    expect(html).toContain('Belum tersedia / tidak berlaku');
    expect(html).toContain('Identitas dan akun');
});

it('shows category and residence separately in the administrative directory', () => {
    const html = renderToStaticMarkup(
        <DataMahasiswa
            mahasiswa={[
                {
                    id: 'one',
                    user: { nama: 'Penghuni Uji' },
                    profile_summary: summary,
                },
            ]}
            periode={[]}
        />,
    );
    expect(html).toContain('Mahasiswa internasional berbayar');
    expect(html).toContain('Alumni asrama');
    expect(html).toContain('Status akun');
    expect(html).toContain('Lihat detail');
});
