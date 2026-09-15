import { useState } from "react";
import { Head } from "@inertiajs/react";
import {
    BedDouble,
    BookOpen,
    Landmark,
    LayoutDashboard,
    MapPin,
    MonitorSmartphone,
    ShieldCheck,
} from "lucide-react";
import LandingLayout from "@/andalas/components/LandingLayout";
import { login } from "@/routes";
import "@/andalas/index.css";

type Testimoni = {
    id: string;
    nama: string;
    prodi: string | null;
    teks: string;
    foto: string | null;
};

type Statistik = {
    gedung: number;
    kamar: number;
    penghuni: number;
};

type Props = {
    testimoni: Testimoni[];
    statistik: Statistik;
};

const FACILITIES = [
    { icon: BedDouble, title: "Kamar Nyaman", desc: "Kamar standar dan tipe VIP dengan furnitur lengkap, pencahayaan alami, dan sirkulasi udara yang baik." },
    { icon: BookOpen, title: "Ruang Belajar", desc: "Ruang belajar bersama yang tenang, tersedia 24 jam dengan akses WiFi kampus berkecepatan tinggi." },
    { icon: Landmark, title: "Smart Surrau", desc: "Mushola asrama dengan sistem absensi sholat berteknologi barcode untuk membentuk karakter spiritual." },
    { icon: ShieldCheck, title: "Keamanan 24 Jam", desc: "Sistem keamanan terpadu dengan CCTV, petugas jaga, dan kontrol akses masuk berbasis identitas." },
    { icon: MonitorSmartphone, title: "Portal Digital", desc: "Kelola pembayaran, perizinan, jadwal, dan informasi kamar seluruhnya melalui satu platform terintegrasi.", featured: true },
    { icon: LayoutDashboard, title: "Dapur Bersama", desc: "Dapur bersama tiap lantai dengan peralatan memasak lengkap dan area makan yang bersih dan rapi." },
] satisfies ReadonlyArray<{
    icon: typeof BedDouble;
    title: string;
    desc: string;
    featured?: boolean;
}>;

const FAQ_ITEMS: { q: string; a: string }[] = [
    {
        q: "Bagaimana cara mendaftar sebagai penghuni asrama?",
        a: "Mahasiswa aktif Universitas Andalas dapat mendaftar melalui halaman Unit, kemudian mengikuti proses penempatan kamar yang dikelola secara terpusat dan tercatat digital.",
    },
    {
        q: "Apakah saya bisa memilih kamar atau gedung tertentu?",
        a: "Penempatan mengikuti aspek gender, jalur, dan ketersediaan kamar pada periode berjalan. Informasi ketersediaan dan tarif dapat dicek di menu Unit.",
    },
    {
        q: "Bagaimana cara melakukan pembayaran biaya asrama?",
        a: "Pembayaran dilakukan melalui portal digital dengan status yang terverifikasi otomatis. Riwayat dan bukti pembayaran dapat diakses kapan saja dari akun Anda.",
    },
    {
        q: "Apakah absensi sholat wajib untuk semua penghuni?",
        a: "Ya, kehadiran sholat berjamaah menjadi bagian dari pembinaan karakter dan dipantau melalui sistem absensi barcode di smart surrau setiap gedung.",
    },
    {
        q: "Bagaimana jika saya mengalami kerusakan fasilitas kamar?",
        a: "Anda dapat melaporkan kerusakan melalui laporan perbaikan di portal, dan petugas teknisi akan memprosesnya sesuai prioritas secara terjadwal.",
    },
];

export default function Beranda(props: Props) {
    const testimoni = props.testimoni ?? [];
    const stat = props.statistik ?? { gedung: 0, kamar: 0, penghuni: 0 };
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    const stats: { val: string; label: string }[] = [
        { val: String(stat.gedung || 0), label: "Gedung" },
        { val: String(stat.kamar || 0), label: "Kamar" },
        { val: String(stat.penghuni || 0), label: "Penghuni" },
    ];

    return (
        <>
            <Head title="Beranda" />
            <LandingLayout active="beranda">
                {/* HERO */}
                <section className="relative flex min-h-svh items-end overflow-hidden bg-hero">
                    <div className="absolute inset-0">
                        <img
                            src="https://images.unsplash.com/photo-1732115234692-3ee71d5363af?w=1600&h=1000&fit=crop&auto=format"
                            alt="Gedung asrama Universitas Andalas"
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-hero/95 via-hero/40 to-black/25" />
                    <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-chrome pb-32 md:px-6 md:pb-40">
                        <p className="text-sm text-white/70">Universitas Andalas</p>
                        <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-white md:text-6xl">
                            Andalas Residence
                        </h1>
                        <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">
                            Lebih dari sekadar asrama, rumah kedua bagi mahasiswa Unand, dengan
                            pembinaan karakter dan layanan terdigitalisasi dalam satu platform.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <a
                                href="/unit"
                                className="inline-flex rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-hero transition-colors hover:bg-white/90"
                            >
                                Lihat Unit Kami
                            </a>
                            <a
                                href={login.url()}
                                className="inline-flex rounded-md border border-white/70 bg-transparent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                            >
                                Masuk ke Portal
                            </a>
                        </div>
                    </div>
                </section>

                {/* STATS (overlaps the hero, like profile-akademik's service tiles) */}
                <div className="relative z-10 mx-auto -mt-16 max-w-7xl px-4 md:px-6">
                    <div className="grid grid-cols-1 overflow-hidden rounded-md border border-base-200 bg-surface sm:grid-cols-3">
                        {stats.map((s) => (
                            <div
                                key={s.label}
                                className="flex flex-col items-center gap-1 px-4 py-6 text-center"
                            >
                                <span className="font-display text-3xl text-primary">{s.val}</span>
                                <span className="text-xs font-medium text-base-content/70">
                                    {s.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* TENTANG */}
                <section className="bg-mist py-24 md:py-32">
                    <div className="mx-auto grid max-w-7xl gap-12 px-4 md:grid-cols-12 md:items-start md:gap-16 md:px-6">
                        <div className="md:col-span-5">
                            <span className="block h-1 w-16 bg-primary" aria-hidden="true" />
                            <h2 className="mt-6 font-display text-3xl leading-tight text-base-content md:text-5xl">
                                Lebih dari Sekadar
                                <br />
                                Tempat Tinggal
                            </h2>
                        </div>
                        <div className="md:col-span-7">
                            <p className="text-lg leading-8 text-base-content md:text-xl md:leading-9">
                                Andalas Residence adalah asrama mahasiswa resmi Universitas Andalas
                                yang dirancang sebagai ekosistem pembinaan, memadukan kenyamanan
                                hunian, pembinaan akademik, dan pembentukan karakter islami.
                            </p>
                            <p className="mt-5 text-base leading-8 text-base-content/70 md:text-lg">
                                Dengan sistem informasi terintegrasi, setiap proses dikelola secara
                                digital, transparan, dan efisien.
                            </p>
                            <a
                                href="/profil/sejarah"
                                className="mt-8 inline-flex text-base font-medium text-primary transition-colors hover:text-primary-hover"
                            >
                                Baca profil
                            </a>
                        </div>
                    </div>
                </section>

                {/* FASILITAS */}
                <section className="bg-surface py-16 md:py-20">
                    <div className="mx-auto max-w-7xl px-4 md:px-6">
                        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                                <span className="block h-1 w-16 bg-primary" aria-hidden="true" />
                                <h2 className="mt-4 font-display text-3xl text-base-content">
                                    Fasilitas Lengkap
                                </h2>
                            </div>
                            <p className="max-w-sm text-sm leading-relaxed text-base-content/70">
                                Setiap fasilitas dirancang untuk mendukung kehidupan akademik dan
                                pembinaan karakter mahasiswa.
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {FACILITIES.filter((f) => !f.featured).map((f) => (
                                <div
                                    key={f.title}
                                    className="rounded-md border border-base-200 bg-mist p-5"
                                >
                                    <f.icon className="size-6 text-primary" aria-hidden="true" />
                                    <h3 className="mt-3 text-base font-semibold text-base-content">
                                        {f.title}
                                    </h3>
                                    <p className="mt-1 text-sm leading-relaxed text-base-content/70">
                                        {f.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                        {FACILITIES.filter((f) => f.featured).map((f) => (
                            <a
                                key={f.title}
                                href={login.url()}
                                className="mt-4 flex flex-col gap-4 rounded-md border border-base-200 border-l-4 border-l-primary bg-mist p-6 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex items-start gap-4">
                                    <f.icon className="size-6 shrink-0 text-primary" aria-hidden="true" />
                                    <div>
                                        <h3 className="text-base font-semibold text-base-content">
                                            {f.title}
                                        </h3>
                                        <p className="mt-1 text-sm leading-relaxed text-base-content/70">
                                            {f.desc}
                                        </p>
                                    </div>
                                </div>
                                <span className="shrink-0 text-sm font-semibold text-primary transition-colors hover:text-primary-hover">
                                    Buka portal
                                </span>
                            </a>
                        ))}
                    </div>
                </section>

                {/* TESTIMONI */}
                <section className="bg-mist py-16 md:py-20">
                    <div className="mx-auto max-w-7xl px-4 md:px-6">
                        <div className="mb-10 text-center">
                            <span className="mx-auto block h-1 w-16 bg-primary" aria-hidden="true" />
                            <h2 className="mt-4 font-display text-3xl text-base-content">
                                Kata Mereka yang Sudah Merasakan
                            </h2>
                        </div>
                        {testimoni.length === 0 ? (
                            <p className="text-center text-sm text-base-content/70">
                                Belum ada testimoni.
                            </p>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-3">
                                {testimoni.map((t) => (
                                    <div
                                        key={t.id}
                                        className="rounded-md border border-base-200 bg-surface p-6"
                                    >
                                        <p className="text-sm italic leading-relaxed text-base-content/80">
                                            "{t.teks}"
                                        </p>
                                        <div className="mt-5 flex items-center gap-3 border-t border-base-200 pt-4">
                                            {t.foto ? (
                                                <img
                                                    src={`/storage/${t.foto}`}
                                                    alt={t.nama}
                                                    className="size-10 rounded-full bg-base-200 object-cover"
                                                />
                                            ) : (
                                                <span
                                                    aria-hidden="true"
                                                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-content"
                                                >
                                                    {t.nama.trim().slice(0, 1)}
                                                </span>
                                            )}
                                            <div>
                                                <div className="text-sm font-semibold text-base-content">
                                                    {t.nama}
                                                </div>
                                                <div className="text-xs text-base-content/60">
                                                    {t.prodi}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* FAQ */}
                <section className="bg-surface py-16 md:py-20">
                    <div className="mx-auto max-w-3xl px-4 md:px-6">
                        <div className="mb-10 text-center">
                            <span className="mx-auto block h-1 w-16 bg-primary" aria-hidden="true" />
                            <h2 className="mt-4 font-display text-3xl text-base-content">
                                Pertanyaan yang Sering Diajukan
                            </h2>
                        </div>
                        <div className="flex flex-col gap-3">
                            {FAQ_ITEMS.map((item, i) => {
                                const open = openFaq === i;
                                return (
                                    <div
                                        key={item.q}
                                        className="overflow-hidden rounded-md border border-base-200 bg-mist"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setOpenFaq(open ? null : i)}
                                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                                        >
                                            <span className="text-sm font-semibold text-base-content">
                                                {item.q}
                                            </span>
                                            <svg
                                                viewBox="0 0 20 20"
                                                className={`h-4 w-4 shrink-0 text-primary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </button>
                                        {open && (
                                            <div className="px-5 pb-4 text-sm leading-relaxed text-base-content/70">
                                                {item.a}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* LOKASI */}
                <section className="bg-mist py-16 md:py-20">
                    <div className="mx-auto grid max-w-7xl gap-12 px-4 md:grid-cols-2 md:items-center md:px-6">
                        <div>
                            <span className="block h-1 w-16 bg-primary" aria-hidden="true" />
                            <h2 className="mt-4 font-display text-3xl leading-tight text-base-content md:text-4xl">
                                Berada di Jantung Kampus Limau Manis
                            </h2>
                            <p className="mt-4 max-w-md text-base leading-relaxed text-base-content/70">
                                Terletak di dalam lingkungan kampus Universitas Andalas, asrama
                                memberikan akses mudah ke fasilitas akademik, masjid, dan
                                transportasi kampus.
                            </p>
                            <div className="mt-6 space-y-4">
                                <div className="flex items-start gap-3 text-base-content/80">
                                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                                    <span className="text-sm">
                                        Jl. Limau Manis, Kecamatan Pauh, Kota Padang, Sumatera Barat
                                    </span>
                                </div>
                                <div className="flex items-start gap-3 text-base-content/80">
                                    <Landmark className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                                    <span className="text-sm">(0751) 71111</span>
                                </div>
                                <div className="flex items-start gap-3 text-base-content/80">
                                    <MonitorSmartphone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                                    <span className="text-sm">contact@andalasresidence.ac.id</span>
                                </div>
                            </div>
                        </div>
                        <a href="/kontak" className="block overflow-hidden rounded-md">
                            <img
                                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&h=700&fit=crop&auto=format"
                                alt="Kawasan kampus Universitas Andalas"
                                className="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                        </a>
                    </div>
                </section>

                {/* CTA */}
                <section className="bg-primary py-16 text-white md:py-20">
                    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:flex-row md:items-end md:justify-between md:px-6">
                        <div className="max-w-2xl">
                            <h2 className="font-display text-3xl leading-tight md:text-5xl">
                                Siap Bergabung?
                            </h2>
                            <p className="mt-4 text-base leading-relaxed text-white/85 md:text-lg">
                                Masuk dengan SSO Unand dan kelola semua layanan asrama digital.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <a
                                href={login.url()}
                                className="inline-flex rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-white/90"
                            >
                                Login SSO Unand
                            </a>
                            <a
                                href="/kontak"
                                className="inline-flex rounded-md border border-white/70 bg-transparent px-5 py-2.5 text-sm text-white transition-colors hover:bg-white/10"
                            >
                                Hubungi Kami
                            </a>
                        </div>
                    </div>
                </section>
            </LandingLayout>
        </>
    );
}