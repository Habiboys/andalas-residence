import { Head, Link } from '@inertiajs/react';

export default function Layanan({
    housingUrl,
    letterUrl,
    dashboardUrl,
}: {
    housingUrl: string;
    letterUrl: string;
    dashboardUrl: string;
}) {
    return (
        <main className="bg-base-200 min-h-screen px-4 py-16">
            <Head title="Pilih layanan" />
            <div className="mx-auto max-w-3xl space-y-6">
                <h1 className="text-3xl font-bold">Pilih layanan asrama</h1>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Link href={housingUrl} className="card bg-base-100 border-base-300 space-y-2 border p-6 shadow-sm hover:border-primary">
                        <h2 className="text-xl font-semibold">Daftar Hunian</h2>
                        <p>Lengkapi data pendaftaran, pilih hunian, lalu ajukan.</p>
                    </Link>
                    <Link href={letterUrl} className="card bg-base-100 border-base-300 space-y-2 border p-6 shadow-sm hover:border-primary">
                        <h2 className="text-xl font-semibold">Bebas Asrama</h2>
                        <p>Ajukan surat bebas asrama atau surat keterangan tidak tinggal.</p>
                    </Link>
                </div>
                <Link href={dashboardUrl} className="link">Buka dasbor</Link>
            </div>
        </main>
    );
}
