import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import type { ProfileSummary } from '@/andalas/components/UserProfileDetails';
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
        clearErrors: vi.fn(),
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

const baseSummary: ProfileSummary = {
    category: 'Mahasiswa lokal non-KIP-K',
    residence: 'Belum pernah tinggal',
    account: 'Aktif',
    sections: [
        {
            title: 'Identitas dan akun',
            fields: {
                'Nama lengkap': 'Putri Aja',
                'NIM / NIP / Nomor identitas': '263434341',
                Email: 'putri@example.com',
                'Email pribadi': 'putri@example.com',
                'Nomor telepon': '08131231234',
                'Jenis kelamin': 'Laki laki',
                'Peran akses': 'Mahasiswa',
                'Status akun': 'Aktif',
                'Kategori akun': 'Mahasiswa lokal non-KIP-K',
            },
        },
        {
            title: 'Data akademik dan asal',
            fields: {
                Angkatan: '2026',
                Jenjang: 'S3',
            },
        },
    ],
};

it('shows unified profile view with Edit Profil button by default without a separate duplicate form section', () => {
    const html = renderToStaticMarkup(
        <Profile
            mustVerifyEmail={false}
            profileSummary={baseSummary}
            hasStudentProfile
        />,
    );

    expect(html).toContain('Ringkasan akun');
    expect(html).toContain('Edit Profil');
    expect(html).toContain('263434341');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('Edit data profil');
});

it('switches rows into inline editable fields when editing is active and keeps read-only constraints clear', () => {
    const html = renderToStaticMarkup(
        <Profile
            mustVerifyEmail={false}
            profileSummary={baseSummary}
            hasStudentProfile
            academicLocked
            defaultEditing
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

    expect(html).toContain('<form');
    expect(html).toContain('Simpan perubahan');
    expect(html).toContain('Batal');
    expect(html).toContain('Nomor telepon');
    expect(html).toContain('Jenis kelamin');
    expect(html).toContain('Email pribadi');
    expect(html).toContain('NIK');
    expect(html).toContain('Program studi');
    expect(html).toContain('Kota / kabupaten');
    expect(html).toContain('Alamat lengkap');
    expect(html).toContain('Jenis kelamin dan program studi dikunci');
});
