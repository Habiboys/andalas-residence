import { Head, Link } from "@inertiajs/react";
import { ChevronDown } from "lucide-react";
import LandingLayout from "@/andalas/components/LandingLayout";
import TestimonialSlider, {
    type Testimoni,
} from "@/andalas/components/TestimonialSlider";
import { login, register } from "@/routes";
import "@/andalas/index.css";

type Notice = { id: string; judul: string; tanggal: string | null };
type GalleryPhoto = {
    id: string;
    judul: string;
    foto: string;
    kategori: string;
};
type Props = {
    testimoni: Testimoni[];
    pengumuman?: Notice[];
    galeri?: GalleryPhoto[];
    statistik: { gedung: number; kamar: number; penghuni: number };
};

const steps = [
    {
        title: "Buat akun dan lengkapi identitas",
        text: "Pilih kategori penghuni. Mahasiswa juga mencantumkan tahun masuk kuliah.",
    },
    {
        title: "Tentukan kamar dan masa tinggal",
        text: "Pilih tipe serta nomor kamar yang tersedia. Khusus KIPK, pengelola yang menentukan penempatan.",
    },
    {
        title: "Periksa dan selesaikan tagihan",
        text: "Ikuti invoice di akun. Pengajuan cicilan ditinjau admin layanan; kategori bebas biaya mengikuti hasil verifikasi.",
    },
    {
        title: "Terima kwitansi dan informasi hunian",
        text: "Kwitansi memuat pembayaran, gedung, tipe serta nomor kamar, dan lama masa tinggal.",
    },
];
const categories = [
    {
        title: "Mahasiswa lokal",
        text: "Mahasiswa baru KIPK dan non-KIPK, serta mahasiswa yang melanjutkan masa hunian.",
    },
    {
        title: "Mahasiswa internasional",
        text: "Kategori reguler atau fasilitas gratis asrama, sesuai verifikasi pengelola.",
    },
    {
        title: "Non-mahasiswa",
        text: "Pendaftaran mengikuti ketersediaan kamar dan ketentuan pengelola asrama.",
    },
];
const services = [
    {
        title: "Tagihan dan kwitansi",
        text: "Lihat rincian tagihan, ajukan cicilan, dan unduh kwitansi pembayaran.",
    },
    {
        title: "Pelaporan kerusakan",
        text: "Tentukan barang dan lokasi kamar, lampirkan foto, lalu pantau penanganan teknisi.",
    },
    {
        title: "Kegiatan mahasiswa binaan",
        text: "Lihat jadwal dan pindai QR kehadiran di lokasi kegiatan selama tahun pertama pembinaan.",
    },
    {
        title: "Checkout dan bebas asrama",
        text: "Ajukan akhir masa tinggal dan urus surat sesuai pemeriksaan kamar serta status tagihan.",
    },
];
const faqs = [
    {
        q: "Bagaimana cara mulai mendaftar?",
        a: "Buat akun melalui tombol Daftar hunian, pilih kategori penghuni, dan lengkapi profil. Setelah masuk, buka menu Pendaftaran Hunian untuk memilih periode dan kamar yang tersedia.",
    },
    {
        q: "Apakah semua calon penghuni memilih kamar sendiri?",
        a: "Calon penghuni dapat memilih tipe dan nomor kamar yang tersedia. Untuk mahasiswa KIPK, pilihan kamar dilewati dan penempatan dilakukan oleh pengelola.",
    },
    {
        q: "Bagaimana pembayaran dan pengajuan cicilan dilakukan?",
        a: "Tagihan muncul di akun setelah pendaftaran diproses. Ikuti petunjuk pembayaran pada invoice dan unggah bukti bila diminta. Cicilan dapat diajukan melalui menu Tagihan dan jadwalnya ditetapkan admin. Pembayaran saat ini melalui verifikasi pengelola.",
    },
    {
        q: "Mengapa tidak semua penghuni dapat melakukan absensi?",
        a: "Absensi kegiatan ditujukan untuk mahasiswa lokal binaan pada tahun pertama, mulai angkatan 2026. Penghuni yang sudah checkout dan masuk kembali tidak termasuk binaan. QR harus masih berlaku dan mahasiswa serta fasilitator berada dalam radius kegiatan.",
    },
    {
        q: "Bagaimana mengurus surat bebas asrama untuk angkatan lama?",
        a: "Buat akun dan buka layanan Bebas Asrama. Untuk angkatan 2025 ke bawah, admin memverifikasi status alumni dan pelunasannya karena riwayatnya belum tercatat dalam sistem. Angkatan 2026 ke atas mengikuti riwayat hunian, checkout, dan tagihan yang tercatat.",
    },
];

export default function Beranda({
    testimoni = [],
    pengumuman = [],
    galeri = [],
    statistik = { gedung: 0, kamar: 0, penghuni: 0 },
}: Props) {
    const stats = [
        { val: String(statistik.gedung), label: "Gedung" },
        { val: String(statistik.kamar), label: "Kamar" },
        { val: String(statistik.penghuni), label: "Penghuni aktif" },
    ];
    return (
        <>
            <Head title="Andalas Residence — Hunian Universitas Andalas">
                <meta
                    name="description"
                    content="Informasi hunian Universitas Andalas, pendaftaran kamar, kegiatan pembinaan, dan layanan administrasi penghuni."
                />
            </Head>
            <LandingLayout active="beranda">
                {/* HERO */}
                <section className="bg-hero relative flex min-h-svh items-center overflow-hidden">
                    <div className="absolute inset-0">
                        <img
                            src="https://images.unsplash.com/photo-1732115234692-3ee71d5363af?w=1600&h=1000&fit=crop&auto=format"
                            alt="Ilustrasi bangunan hunian"
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="from-hero/95 via-hero/40 absolute inset-0 bg-gradient-to-t to-black/25" />
                    <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-28 md:px-6 md:py-32">
                        <p className="text-sm text-white/70">
                            Universitas Andalas
                        </p>
                        <h1 className="font-display mt-3 max-w-3xl text-4xl leading-tight text-white md:text-6xl">
                            Andalas Residence
                        </h1>
                        <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">
                            Lebih dari sekadar asrama, rumah kedua bagi
                            mahasiswa Unand, dengan pembinaan karakter dan
                            layanan terdigitalisasi dalam satu platform.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <a
                                href="/unit"
                                className="text-hero inline-flex rounded-md bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-white/90"
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

                {/* Statistik hunian dari database */}
                <div className="relative z-10 mx-auto -mt-16 max-w-7xl px-4 md:px-6">
                    <div className="border-base-200 bg-surface grid grid-cols-1 overflow-hidden rounded-md border sm:grid-cols-3">
                        {stats.map((s) => (
                            <div
                                key={s.label}
                                className="flex flex-col items-center gap-1 px-4 py-6 text-center"
                            >
                                <span className="font-display text-primary text-3xl">
                                    {s.val}
                                </span>
                                <span className="text-base-content/70 text-xs font-medium">
                                    {s.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <section className="bg-base-100 py-16 md:py-24">
                    <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-6 lg:grid-cols-2 lg:gap-20">
                        <div>
                            <p className="text-muted text-sm">
                                Pendaftaran hunian
                            </p>
                            <h2 className="font-display mt-3 text-3xl leading-tight md:text-4xl">
                                Kenali kategori Anda
                                <br className="hidden sm:block" /> sebelum
                                memilih kamar.
                            </h2>
                            <p className="text-muted mt-5 max-w-lg leading-7">
                                Alur penempatan dan tagihan mengikuti kategori
                                penghuni. Semua tahapan dapat dipantau melalui
                                akun Andalas Residence.
                            </p>
                            <dl className="divide-base-300 border-base-300 mt-8 divide-y border-y">
                                {categories.map((item) => (
                                    <div
                                        key={item.title}
                                        className="grid gap-2 py-5 sm:grid-cols-3 sm:gap-6"
                                    >
                                        <dt className="text-sm font-medium">
                                            {item.title}
                                        </dt>
                                        <dd className="text-muted text-sm leading-6 sm:col-span-2">
                                            {item.text}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                            <Link
                                href="/unit"
                                className="text-primary mt-6 inline-block text-sm font-medium underline underline-offset-4"
                            >
                                Lihat gedung dan pilihan unit
                            </Link>
                        </div>
                        <div className="lg:pt-9">
                            <h3 className="font-display text-xl">
                                Tahapan pendaftaran
                            </h3>
                            <ol className="mt-6 space-y-6">
                                {steps.map((step, index) => (
                                    <li
                                        key={step.title}
                                        className="grid grid-cols-[auto_1fr] gap-5"
                                    >
                                        <span
                                            className="font-display text-primary pt-0.5 text-xl"
                                            aria-hidden="true"
                                        >
                                            {index + 1}.
                                        </span>
                                        <div>
                                            <h4 className="text-base font-medium">
                                                {step.title}
                                            </h4>
                                            <p className="text-muted mt-2 text-sm leading-6">
                                                {step.text}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                            <Link
                                href={register.url()}
                                className="btn btn-primary mt-8"
                            >
                                Mulai pendaftaran
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="bg-base-100 pb-16 md:pb-24">
                    <div className="mx-auto max-w-7xl px-4 md:px-6">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <h2 className="font-display text-2xl md:text-3xl">
                                    Galeri hunian dan kegiatan
                                </h2>
                                <p className="text-muted mt-3 max-w-xl text-sm leading-6">
                                    Dokumentasi gedung dan program yang
                                    diterbitkan pengelola.
                                </p>
                            </div>
                            <Link
                                href="/program"
                                className="text-primary text-sm font-medium underline underline-offset-4"
                            >
                                Kenali program pembinaan
                            </Link>
                        </div>
                        {galeri.length ? (
                            <div
                                className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4"
                                tabIndex={0}
                                aria-label="Galeri foto, geser untuk melihat foto lainnya"
                            >
                                {galeri.map((photo) => (
                                    <figure
                                        key={photo.id}
                                        className="w-72 shrink-0 snap-start sm:w-96"
                                    >
                                        <a
                                            href={photo.foto}
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label={`Buka foto ${photo.judul}`}
                                        >
                                            <img
                                                src={photo.foto}
                                                alt={photo.judul}
                                                loading="lazy"
                                                className="aspect-[4/3] w-full rounded-md object-cover"
                                            />
                                        </a>
                                        <figcaption className="mt-3">
                                            <p className="text-muted text-xs">
                                                {photo.kategori}
                                            </p>
                                            <p className="mt-1 text-sm font-medium">
                                                {photo.judul}
                                            </p>
                                        </figcaption>
                                    </figure>
                                ))}
                            </div>
                        ) : (
                            <div className="border-base-300 mt-8 border-y py-10">
                                <p className="text-muted text-sm">
                                    Dokumentasi foto belum tersedia.
                                </p>
                                <Link
                                    href="/unit"
                                    className="text-primary mt-3 inline-block text-sm font-medium underline underline-offset-4"
                                >
                                    Lihat informasi unit hunian
                                </Link>
                            </div>
                        )}
                    </div>
                </section>

                <section className="border-base-300 bg-mist border-y py-12 md:py-16">
                    <div className="mx-auto grid max-w-7xl gap-8 px-4 md:px-6 lg:grid-cols-3 lg:gap-16">
                        <div>
                            <h2 className="font-display text-2xl md:text-3xl">
                                Pengumuman
                            </h2>
                            <p className="text-muted mt-3 text-sm leading-6">
                                Informasi terbaru dari pengelola Andalas
                                Residence.
                            </p>
                            <Link
                                href="/informasi/pengumuman"
                                className="text-primary mt-5 inline-block text-sm font-medium underline underline-offset-4"
                            >
                                Semua pengumuman
                            </Link>
                        </div>
                        <div className="lg:col-span-2">
                            {pengumuman.length ? (
                                <ul className="divide-base-300 divide-y">
                                    {pengumuman.map((item) => (
                                        <li key={item.id}>
                                            <Link
                                                href="/informasi/pengumuman"
                                                className="hover:text-primary block py-5 first:pt-0"
                                            >
                                                <time
                                                    className="text-muted text-xs"
                                                    dateTime={
                                                        item.tanggal ??
                                                        undefined
                                                    }
                                                >
                                                    {item.tanggal
                                                        ? new Date(
                                                              item.tanggal,
                                                          ).toLocaleDateString(
                                                              "id-ID",
                                                              {
                                                                  day: "numeric",
                                                                  month: "long",
                                                                  year: "numeric",
                                                              },
                                                          )
                                                        : "Pengumuman pengelola"}
                                                </time>
                                                <h3 className="mt-2 text-lg font-medium">
                                                    {item.judul}
                                                </h3>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="border-base-300 text-muted border-l py-4 pl-6 text-sm leading-7">
                                    Belum ada pengumuman yang diterbitkan.
                                    Panduan, regulasi, dan SOP tersedia melalui
                                    menu Informasi.
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="bg-base-100 py-16 md:py-24">
                    <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-6 lg:grid-cols-3 lg:gap-16">
                        <div className="bg-hero flex flex-col items-start p-7 text-white md:p-9">
                            <p className="text-sm text-white/80">
                                Untuk penghuni
                            </p>
                            <h2 className="font-display mt-4 text-3xl leading-tight">
                                Layanan selama
                                <br />
                                masa tinggal.
                            </h2>
                            <p className="mt-5 text-sm leading-7 text-white/80">
                                Masuk ke akun untuk mengakses layanan sesuai
                                status hunian Anda.
                            </p>
                            <Link
                                href={login.url()}
                                className="text-hero mt-8 rounded-md bg-white px-5 py-3 text-sm font-medium hover:bg-white/90"
                            >
                                Masuk ke portal
                            </Link>
                        </div>
                        <dl className="divide-base-300 divide-y lg:col-span-2">
                            {services.map((service) => (
                                <div
                                    key={service.title}
                                    className="grid gap-2 py-6 first:pt-0 last:pb-0 md:grid-cols-2 md:gap-8"
                                >
                                    <dt className="font-display text-xl">
                                        {service.title}
                                    </dt>
                                    <dd className="text-muted text-sm leading-7">
                                        {service.text}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                <TestimonialSlider items={testimoni} />

                <section className="bg-base-100 py-16 md:py-24">
                    <div className="mx-auto grid max-w-7xl gap-8 px-4 md:px-6 lg:grid-cols-3 lg:gap-16">
                        <div>
                            <h2 className="font-display text-2xl md:text-3xl">
                                Pertanyaan umum
                            </h2>
                            <p className="text-muted mt-4 text-sm leading-7">
                                Tentang pendaftaran, pembayaran, dan layanan
                                administrasi.
                            </p>
                            <Link
                                href="/kontak"
                                className="text-primary mt-5 inline-block text-sm font-medium underline underline-offset-4"
                            >
                                Hubungi pengelola
                            </Link>
                        </div>
                        <div className="divide-base-300 divide-y lg:col-span-2">
                            {faqs.map((item) => (
                                <details
                                    key={item.q}
                                    name="residence-faq"
                                    className="group py-5 first:pt-0"
                                >
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                                        {item.q}
                                        <ChevronDown
                                            className="text-muted size-4 shrink-0 group-open:rotate-180"
                                            aria-hidden="true"
                                        />
                                    </summary>
                                    <p className="text-muted mt-4 text-sm leading-7">
                                        {item.a}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="bg-mist py-12 md:py-16">
                    <div className="mx-auto grid max-w-7xl gap-8 px-4 md:px-6 lg:grid-cols-3 lg:items-center lg:gap-16">
                        <div>
                            <p className="text-muted text-sm">Lokasi</p>
                            <h2 className="font-display mt-3 text-2xl md:text-3xl">
                                Di lingkungan kampus
                                <br />
                                Limau Manis.
                            </h2>
                            <address className="text-muted mt-5 text-sm leading-7 not-italic">
                                Universitas Andalas
                                <br />
                                Limau Manis, Kecamatan Pauh
                                <br />
                                Kota Padang, Sumatera Barat
                            </address>
                            <p className="text-muted mt-4 text-sm leading-6">
                                Pastikan gedung tujuan sesuai informasi
                                penempatan kamar sebelum berkunjung.
                            </p>
                            <a
                                href="https://www.google.com/maps/search/?api=1&query=Asrama+Universitas+Andalas+Limau+Manis"
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline mt-6"
                            >
                                Buka petunjuk lokasi
                            </a>
                        </div>
                        <div className="lg:col-span-2">
                            <iframe
                                title="Peta lokasi Asrama Universitas Andalas"
                                src="https://maps.google.com/maps?q=Asrama%20Universitas%20Andalas%20Limau%20Manis&output=embed"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                className="border-base-300 h-80 w-full rounded-md border md:h-96"
                            />
                            <p className="text-muted mt-2 text-xs">
                                Peta tidak tampil? Gunakan tautan petunjuk
                                lokasi.
                            </p>
                        </div>
                    </div>
                </section>
            </LandingLayout>
        </>
    );
}
