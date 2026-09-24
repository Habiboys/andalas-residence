export type ResidentProfile = {
    angkatan?: string | number | null;
    status_huni?: string;
    prodi?: { name?: string } | null;
    user?: {
        nama?: string;
        nim_nip?: string;
        email?: string;
        no_hp?: string | null;
        client_profile_category?: string;
    };
};

export default function ResidentIdentity({
    profile,
}: {
    profile?: ResidentProfile;
}) {
    const fields = [
        ['Nama lengkap', profile?.user?.nama],
        ['NIM / Nomor identitas', profile?.user?.nim_nip],
        ['Angkatan', profile?.angkatan],
        ['Program studi', profile?.prodi?.name],
        ['Email', profile?.user?.email],
        ['Nomor telepon', profile?.user?.no_hp],
        [
            'Kategori penghuni',
            profile?.user?.client_profile_category?.replaceAll('_', ' '),
        ],
        ['Status hunian', profile?.status_huni?.replaceAll('_', ' ')],
    ];
    return (
        <dl className="border-base-300 grid gap-x-6 gap-y-4 border-b pb-5 text-sm sm:grid-cols-2">
            {fields.map(([label, value]) => (
                <div key={label} className="min-w-0">
                    <dt className="text-muted">{label}</dt>
                    <dd className="mt-1 break-words">{value || '-'}</dd>
                </div>
            ))}
        </dl>
    );
}
