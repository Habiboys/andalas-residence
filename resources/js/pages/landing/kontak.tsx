import { Head } from '@inertiajs/react';
import LandingLayout from '@/andalas/components/LandingLayout';
import LandingPageHero from '@/andalas/components/LandingPageHero';
import '@/andalas/index.css';

export default function KontakPage() {
    return (
        <>
            <Head title="Kontak" />
            <LandingLayout active="kontak">
                <LandingPageHero title="Hubungi Kami" breadcrumb="Kontak" />

                <section className="py-16 md:py-24">
                    <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2">
                        {/* Info */}
                        <div>
                            <div className="text-accent mb-3 text-xs font-medium tracking-widest uppercase">
                                Informasi Kontak
                            </div>
                            <h2 className="text-base-content mb-6 font-[DM_Serif_Display,Georgia,serif] text-3xl leading-tight md:text-4xl">
                                Hubungi Kami
                                <br />
                                Asrama Andalas Residence
                            </h2>
                            <p className="text-base-content/70 mb-10 text-base leading-relaxed">
                                Butuh informasi tentang hunian, pendaftaran
                                sebagai penghuni, atau layanan asrama lainnya?
                                Kirim pesan lewat formulir di samping dan tim
                                kami akan menghubungi Anda.
                            </p>

                            <div className="space-y-5">
                                <div className="flex items-start gap-4">
                                    <div className="bg-primary text-accent flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg">
                                        <svg
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            className="h-5 w-5"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-base-content text-sm font-semibold">
                                            Lokasi
                                        </div>
                                        <p className="text-base-content/70 mt-0.5 text-sm">
                                            Jl. Limau Manis, Kecamatan Pauh,
                                            Padang, Kota Padang, Sumatera Barat
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-primary text-accent flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg">
                                        <svg
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            className="h-5 w-5"
                                        >
                                            <path d="M3 4a2 2 0 00-2 2v.5l6.293 4.88a2 2 0 002.414 0L16 6.5V6a2 2 0 00-2-2H3z" />
                                            <path d="M16 8.69l-5.637 4.23a1 1 0 01-1.207 0L3.5 8.69V14a2 2 0 002 2h9a2 2 0 002-2V8.69z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-base-content text-sm font-semibold">
                                            Email
                                        </div>
                                        <p className="text-base-content/70 mt-0.5 text-sm">
                                            andalasresidence@unand.ac.id
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-primary text-accent flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg">
                                        <svg
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            className="h-5 w-5"
                                        >
                                            <path d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-base-content text-sm font-semibold">
                                            Telepon
                                        </div>
                                        <p className="text-base-content/70 mt-0.5 text-sm">
                                            (0751) 71111
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="bg-base-100 border-base-300 rounded-lg border p-8">
                            <h3 className="text-base-content mb-1 text-lg font-semibold">
                                Kirimkan Pesan
                            </h3>
                            <p className="text-base-content/70 mb-6 text-sm">
                                Isi formulir di bawah ini dan tim kami akan
                                segera menghubungi Anda.
                            </p>
                            <form
                                className="space-y-4"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.currentTarget);
                                    const subject = String(
                                        fd.get('subjek') ?? '',
                                    );
                                    const body = [
                                        fd.get('nama_depan'),
                                        fd.get('nama_belakang'),
                                        fd.get('email'),
                                        fd.get('nomor_hp'),
                                        fd.get('pesan'),
                                    ]
                                        .filter(Boolean)
                                        .join('\n');
                                    window.location.href = `mailto:andalasresidence@unand.ac.id?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                }}
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label
                                            htmlFor="nama-depan"
                                            className="text-base-content/70 text-xs font-medium tracking-wide uppercase"
                                        >
                                            Nama Depan
                                        </label>
                                        <input
                                            id="nama-depan"
                                            name="nama_depan"
                                            required
                                            autoComplete="given-name"
                                            className="input input-bordered input-sm mt-1 w-full"
                                            placeholder="Nama depan"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="nama-belakang"
                                            className="text-base-content/70 text-xs font-medium tracking-wide uppercase"
                                        >
                                            Nama Belakang
                                        </label>
                                        <input
                                            id="nama-belakang"
                                            name="nama_belakang"
                                            autoComplete="family-name"
                                            className="input input-bordered input-sm mt-1 w-full"
                                            placeholder="Nama belakang"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label
                                            htmlFor="email"
                                            className="text-base-content/70 text-xs font-medium tracking-wide uppercase"
                                        >
                                            Email
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            autoComplete="email"
                                            className="input input-bordered input-sm mt-1 w-full"
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="nomor-hp"
                                            className="text-base-content/70 text-xs font-medium tracking-wide uppercase"
                                        >
                                            Nomor HP
                                        </label>
                                        <input
                                            id="nomor-hp"
                                            name="nomor_hp"
                                            type="tel"
                                            autoComplete="tel"
                                            className="input input-bordered input-sm mt-1 w-full"
                                            placeholder="0812xxxx"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label
                                        htmlFor="subjek"
                                        className="text-base-content/70 text-xs font-medium tracking-wide uppercase"
                                    >
                                        Subjek
                                    </label>
                                    <input
                                        id="subjek"
                                        name="subjek"
                                        required
                                        className="input input-bordered input-sm mt-1 w-full"
                                        placeholder="Subjek pesan"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="pesan"
                                        className="text-base-content/70 text-xs font-medium tracking-wide uppercase"
                                    >
                                        Pesan
                                    </label>
                                    <textarea
                                        id="pesan"
                                        name="pesan"
                                        rows={4}
                                        required
                                        className="textarea textarea-bordered mt-1 w-full"
                                        placeholder="Tulis pesan Anda"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-sm w-full"
                                >
                                    Kirim Pesan
                                </button>
                            </form>
                        </div>
                    </div>
                </section>
            </LandingLayout>
        </>
    );
}
