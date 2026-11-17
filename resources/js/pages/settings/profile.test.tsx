import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import Profile from './profile';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children }: { href: string; children: string }) => (
        <a href={href}>{children}</a>
    ),
    usePage: () => ({
        props: {
            auth: {
                user: {
                    id: 'u-1',
                    name: 'Putri Aja',
                    email: 'putri@example.com',
                    email_verified_at: '2026-11-17T00:00:00Z',
                },
            },
            page: 'settings-profile',
        },
    }),
    useForm: (initial: Record<string, unknown>) => ({
        data: initial,
        errors: {},
        processing: false,
        setData: vi.fn(),
        patch: vi.fn(),
    }),
}));

vi.mock('@/actions/App/Http/Controllers/Settings/ProfileController', () => ({
    default: { update: { url: () => '/settings/profile' } },
}));

vi.mock('@/routes/verification', () => ({
    send: () => '/email/verification-notification',
}));

vi.mock('@/andalas/components/SettingsNav', () => ({
    default: () => null,
}));

it('renders full editable profile form for students and shows lock notice when academicLocked', () => {
    const html = renderToStaticMarkup(
        <Profile
            mustVerifyEmail={false}
            profileSummary={{
                category: 'Mahasiswa lokal non-KIP-K',
                residence: 'Belum pernah tinggal',
                account: 'Aktif',
                sections: [],
            }}
            hasStudentProfile
            academicLocked
            editableProfile={{
                name: 'Putri Aja',
                email: 'putri@example.com',
                no_hp: '08131231234',
                gender: 'perempuan',
                email_pribadi: 'pribadi@example.com',
                nik: '1371012345678901',
                faculty_id: 'fac-1',
                departemen_id: 'dep-1',
                prodi_id: 'pro-1',
                province_id: 'prov-1',
                city_id: 'city-1',
                alamat: 'Padang',
            }}
            academicOptions={{
                fakultas: [{ id: 'fac-1', name: 'Teknik' }],
                departemen: [
                    { id: 'dep-1', name: 'Informatika', faculty_id: 'fac-1' },
                ],
                prodi: [
                    {
                        id: 'pro-1',
                        name: 'Informatika',
                        jenjang: 'S1',
                        departemen_id: 'dep-1',
                    },
                ],
            }}
            locationOptions={{
                provinces: [{ id: 'prov-1', name: 'Sumatera Barat' }],
                cities: [
                    {
                        id: 'city-1',
                        name: 'Kota Padang',
                        province_id: 'prov-1',
                    },
                ],
            }}
        />,
    );

    expect(html).toContain('Edit data profil');
    expect(html).toContain('Nomor telepon');
    expect(html).toContain('Jenis kelamin');
    expect(html).toContain('Email pribadi');
    expect(html).toContain('NIK (16 digit)');
    expect(html).toContain('Program studi / jenjang');
    expect(html).toContain('Kota / kabupaten');
    expect(html).toContain('Alamat lengkap');
    expect(html).toContain('Jenis kelamin dan program studi dikunci');
});

it('renders only account fields without student sections for non-student users', () => {
    const html = renderToStaticMarkup(
        <Profile
            mustVerifyEmail={false}
            profileSummary={{
                category: 'Petugas internal',
                residence: 'Tidak berlaku',
                account: 'Aktif',
                sections: [],
            }}
            hasStudentProfile={false}
        />,
    );

    expect(html).toContain('Edit data profil');
    expect(html).toContain('Nomor telepon');
    expect(html).toContain('Jenis kelamin');
    expect(html).not.toContain('NIK (16 digit)');
    expect(html).not.toContain('Alamat lengkap');
});
