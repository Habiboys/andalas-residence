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
        <div className="space-y-6">
            <Head title="Pilih layanan" />
            <header className="space-y-2">
                <span className="badge badge-primary badge-outline">
                    Portal Layanan Mahasiswa
                </span>
                <h1 className="text-2xl font-bold md:text-3xl">
                    Pilih layanan asrama
                </h1>
                <p className="text-base-content/70 max-w-2xl text-sm">
                    Pilih layanan yang ingin Anda ajukan. Anda hanya perlu
                    melengkapi data yang relevan dengan layanan yang dipilih,
                    lalu meninjau ringkasan sebelum mengirimkan pengajuan.
                </p>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
                <Link
                    href={housingUrl}
                    className="card bg-base-100 border-base-300 hover:border-primary group flex flex-col justify-between space-y-4 rounded-xl border p-6 shadow-xs transition"
                >
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="badge badge-primary badge-sm">
                                Layanan Hunian
                            </span>
                            <span className="text-base-content/50 text-xs">
                                3 Tahap
                            </span>
                        </div>
                        <h2 className="group-hover:text-primary text-xl font-semibold transition-colors">
                            Daftar Hunian
                        </h2>
                        <p className="text-base-content/80 text-sm">
                            Lengkapi data pendaftaran, pilih hunian, lalu
                            ajukan.
                        </p>
                        <ul className="text-base-content/70 space-y-1.5 border-t pt-3 text-xs">
                            <li>
                                1. Konfirmasi nama resmi, NIK, akademik, dan
                                alamat asal
                            </li>
                            <li>
                                2. Pilih gedung, tipe kamar, dan kamar sesuai
                                kuota
                            </li>
                            <li>
                                3. Review pengajuan, unggah berkas, dan pantau
                                alokasi
                            </li>
                        </ul>
                    </div>
                    <div className="text-primary pt-2 text-sm font-semibold">
                        Mulai pendaftaran hunian →
                    </div>
                </Link>

                <Link
                    href={letterUrl}
                    className="card bg-base-100 border-base-300 hover:border-primary group flex flex-col justify-between space-y-4 rounded-xl border p-6 shadow-xs transition"
                >
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="badge badge-ghost badge-sm">
                                Administrasi Surat
                            </span>
                            <span className="text-base-content/50 text-xs">
                                Tanpa data hunian lengkap
                            </span>
                        </div>
                        <h2 className="group-hover:text-primary text-xl font-semibold transition-colors">
                            Bebas Asrama
                        </h2>
                        <p className="text-base-content/80 text-sm">
                            Ajukan surat bebas asrama atau surat keterangan
                            tidak tinggal.
                        </p>
                        <ul className="text-base-content/70 space-y-1.5 border-t pt-3 text-xs">
                            <li>
                                1. Ketik ulang nama lengkap resmi untuk cetakan
                                surat
                            </li>
                            <li>
                                2. Periksa kecocokan NIM, fakultas, dan program
                                studi
                            </li>
                            <li>
                                3. Review data surat lalu ajukan penerbitan
                                dokumen
                            </li>
                        </ul>
                    </div>
                    <div className="text-primary pt-2 text-sm font-semibold">
                        Ajukan surat bebas asrama →
                    </div>
                </Link>
            </div>

            <div className="border-base-300 flex items-center justify-between rounded-xl border p-4 text-sm">
                <span className="text-base-content/70">
                    Ingin melihat ringkasan akun, tagihan, atau status hunian
                    Anda terlebih dahulu?
                </span>
                <Link href={dashboardUrl} className="btn btn-ghost btn-sm link">
                    Buka dasbor
                </Link>
            </div>
        </div>
    );
}
