import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import Register from '@/pages/auth/register';
import DataHunian from '@/pages/mahasiswa/data-hunian';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
}));

it('creates an account without assuming the visitor is registering for a room', () => {
    const html = renderToStaticMarkup(<Register />);
    expect(html).toContain('Daftar akun');
    expect(html).toContain('pengurusan surat bebas asrama');
    expect(html).not.toContain('Tahapan pendaftaran');
    expect(html).not.toContain('Langkah 1');
    expect(html).not.toContain('Penghuni aktif');
    expect(html).toContain('Jenis pendaftar');
    expect(html).toContain('Nonmahasiswa');
    expect(html).toContain('value="local_student"');
    expect(html).not.toContain('value="local_kipk"');
    expect(html).not.toContain('value="international_free_facility"');
});

it('asks for personal email on SSO housing profile and displays institutional email info', () => {
    const html = renderToStaticMarkup(
        <DataHunian
            identity={{
                nim_nip: '2211523012',
                email: '2211523012_syauqi@student.unand.ac.id',
                is_sso: true,
                status: 'aktif',
            }}
            profile={{ angkatan: 2022 }}
            programs={[]}
            provinces={[{ id: 'p1', name: 'Sumatera Barat' }]}
            cities={[
                {
                    id: 'c1',
                    name: 'Kota Padang',
                    province: { id: 'p1', name: 'Sumatera Barat' },
                },
            ]}
            saveUrl="/residence-process/housing-profile"
            registrationUrl="/mahasiswa/registration"
        />,
    );
    expect(html).toContain('Email pribadi');
    expect(html).toContain('Email institusi (SSO)');
    expect(html).toContain('2211523012_syauqi@student.unand.ac.id');
    expect(html).toContain('Angkatan dari NIM');
});
