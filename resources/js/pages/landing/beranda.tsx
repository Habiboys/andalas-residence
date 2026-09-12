import { useState } from "react";
import { Head } from "@inertiajs/react";
import LandingLayout from "@/andalas/components/LandingLayout";
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
        { val: `${stat.penghuni || 0}+`, label: "Penghuni" },
    ];

    return (
        <>
            <Head title="Beranda" />
            <LandingLayout active="beranda">
                {/* HERO */}
                <section className="relative min-h-[80vh] flex items-center justify-center mb-20 md:mb-28">
                    <div className="absolute inset-0 bg-primary">
                        <img
                            src="https://images.unsplash.com/photo-1732115234692-3ee71d5363af?w=1600&h=1000&fit=crop&auto=format"
                            alt="Gedung asrama Universitas Andalas"
                            className="w-full h-full object-cover opacity-55"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/25 to-primary/55" />
                    </div>
                    <div className="relative z-10 text-center px-6 max-w-4xl mx-auto pt-32 md:pt-40">
                        <div className="text-primary-content/80 text-sm font-medium tracking-[0.25em] uppercase mb-6">
                            Universitas Andalas
                        </div>
                        <h1 className="font-[DM_Serif_Display,Georgia,serif] text-5xl md:text-7xl text-primary-content leading-[1.05] mb-6">
                            Andalas<br />
                            <span className="italic text-accent">Residence</span>
                        </h1>
                        <p className="text-primary-content/70 text-lg md:text-xl leading-relaxed mb-10 max-w-xl mx-auto">
                            Lebih dari sekadar asrama, rumah kedua bagi mahasiswa Unand, dengan pembinaan karakter dan layanan terdigitalisasi dalam satu platform.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center">
                            <a href="/unit" className="px-8 py-3.5 rounded-lg font-semibold text-sm text-primary-content bg-accent hover:bg-accent-light transition-colors">
                                Lihat Unit Kami
                            </a>
                            <a href="/login" className="border border-white/30 hover:border-white/60 text-primary-content text-sm font-medium px-8 py-3.5 rounded-lg transition-colors">
                                Masuk ke Portal
                            </a>
                        </div>
                        <div className="mt-16 mb-8 inline-grid grid-cols-3 gap-px bg-base-100/10 rounded-xl overflow-hidden">
                            {stats.map((s) => (
                                <div key={s.label} className="bg-base-100/5 backdrop-blur-sm px-8 py-4 text-center">
                                    <div className="font-[DM_Serif_Display,Georgia,serif] text-2xl text-primary-content">{s.val}</div>
                                    <div className="text-primary-content/50 text-xs mt-0.5">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* TENTANG */}
                <section className="py-20 md:py-28 bg-base-100">
                    <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
                        <a href="/profil/sejarah" className="block relative group order-2 md:order-1">
                            <div className="aspect-[4/5] rounded-sm overflow-hidden bg-primary">
                                <img
                                    src="https://images.unsplash.com/photo-1702368708477-284bbdc2b595?w=700&h=900&fit=crop&auto=format"
                                    alt="Gedung asrama Universitas Andalas"
                                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                            <div className="absolute -bottom-6 -left-6 bg-primary text-primary-content px-6 py-5 rounded-sm max-w-[200px]">
                                <div className="font-[DM_Serif_Display,Georgia,serif] text-3xl text-accent">Sejarah</div>
                                <div className="text-primary-content/70 text-xs leading-snug mt-1">Telusuri perjalanan Andalas Residence</div>
                            </div>
                        </a>
                        <div className="order-1 md:order-2">
                            <div className="text-sm font-medium tracking-widest uppercase mb-4 text-accent">Tentang Kami</div>
                            <h2 className="font-[DM_Serif_Display,Georgia,serif] text-4xl md:text-5xl text-base-content leading-tight mb-6">
                                Lebih dari Sekadar<br />
                                <span className="italic">Tempat Tinggal</span>
                            </h2>
                            <p className="text-base-content/70 text-base leading-relaxed mb-8">
                                Andalas Residence adalah asrama mahasiswa resmi Universitas Andalas yang dirancang sebagai ekosistem pembinaan, memadukan kenyamanan hunian, pembinaan akademik, dan pembentukan karakter islami. Dengan sistem informasi terintegrasi, setiap proses dikelola secara digital, transparan, dan efisien.
                            </p>
                            <div className="grid grid-cols-2 gap-6">
                                {[
                                    { label: "Tahun Berdiri", val: "2005" },
                                    { label: "Kapasitas Kamar", val: `${stat.kamar || 480}+` },
                                    { label: "Kehadiran Sholat", val: "Terpantau" },
                                    { label: "Layanan Digital", val: "24 Jam" },
                                ].map((d) => (
                                    <div key={d.label} className="border-l-2 border-accent/40 pl-4">
                                        <div className="font-[DM_Serif_Display,Georgia,serif] text-2xl text-base-content">{d.val}</div>
                                        <div className="text-base-content/70 text-xs mt-0.5">{d.label}</div>
                                    </div>
                                ))}
                            </div>
                            <a
                                href="/profil/sejarah"
                                className="mt-8 inline-flex text-sm font-semibold items-center gap-2 text-accent hover:text-accent-light transition-colors"
                            >
                                Selengkapnya
                                <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
                            </a>
                        </div>
                    </div>
                </section>

                {/* FASILITAS */}
                <section className="py-20 md:py-28 bg-primary">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                            <div>
                                <div className="text-sm font-medium tracking-widest uppercase mb-4 text-accent">Fasilitas</div>
                                <h2 className="font-[DM_Serif_Display,Georgia,serif] text-4xl md:text-5xl text-primary-content leading-tight">
                                    Fasilitas Lengkap<br />
                                    <span className="italic text-accent">Penunjang Studi</span>
                                </h2>
                            </div>
                            <p className="text-primary-content/50 text-sm leading-relaxed max-w-xs">
                                Setiap fasilitas dirancang untuk mendukung kehidupan akademik dan pembinaan karakter mahasiswa.
                            </p>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-base-100/10">
                            {[
                                { t: "Kamar Nyaman", d: "Kamar standar dan tipe VIP dengan furnitur lengkap, pencahayaan alami, dan sirkulasi udara yang baik." },
                                { t: "Ruang Belajar", d: "Ruang belajar bersama yang tenang, tersedia 24 jam dengan akses WiFi kampus berkecepatan tinggi." },
                                { t: "Smart Surrau", d: "Mushola asrama dengan sistem absensi sholat berteknologi barcode untuk membentuk karakter spiritual." },
                                { t: "Keamanan 24 Jam", d: "Sistem keamanan terpadu dengan CCTV, petugas jaga, dan kontrol akses masuk berbasis identitas." },
                                { t: "Dapur Bersama", d: "Dapur bersama tiap lantai dengan peralatan memasak lengkap dan area makan yang bersih dan rapi." },
                                { t: "Portal Digital", d: "Kelola pembayaran, perizinan, jadwal, dan informasi kamar seluruhnya melalui satu platform terintegrasi." },
                            ].map((f) => (
                                <div key={f.t} className="bg-primary p-8 hover:bg-primary-light transition-colors">
                                    <h3 className="font-semibold text-primary-content text-base mb-2">{f.t}</h3>
                                    <p className="text-primary-content/50 text-sm leading-relaxed">{f.d}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* TESTIMONI */}
                <section className="py-20 md:py-28 bg-base-200">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <div className="text-sm font-medium tracking-widest uppercase mb-4 text-accent">Testimoni</div>
                            <h2 className="font-[DM_Serif_Display,Georgia,serif] text-4xl md:text-5xl text-base-content leading-tight">
                                Kata Mereka yang<br />
                                <span className="italic">Sudah Merasakan</span>
                            </h2>
                        </div>
                        {testimoni.length === 0 ? (
                            <p className="text-center text-base-content/70 text-sm">Belum ada testimoni.</p>
                        ) : (
                            <div className="grid md:grid-cols-3 gap-6">
                                {testimoni.map((t) => (
                                    <div key={t.id} className="bg-base-100 p-8 rounded-sm hover:-translate-y-1 transition-transform">
                                        <div className="text-lg mb-5 text-accent">"</div>
                                        <p className="text-base-content/80 text-sm leading-relaxed mb-6 italic">{t.teks}</p>
                                        <div className="flex items-center gap-3">
                                            <img src={t.foto ? `/storage/${t.foto}` : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop"} alt={t.nama} className="w-10 h-10 rounded-full object-cover bg-base-200" />
                                            <div>
                                                <div className="font-semibold text-base-content text-sm">{t.nama}</div>
                                                <div className="text-base-content/70 text-xs">{t.prodi}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* FAQ */}
                <section className="py-20 md:py-28 bg-base-100">
                    <div className="max-w-3xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <div className="text-sm font-medium tracking-widest uppercase mb-4 text-accent">FAQ</div>
                            <h2 className="font-[DM_Serif_Display,Georgia,serif] text-4xl md:text-5xl text-base-content leading-tight">
                                Pertanyaan yang<br />
                                <span className="italic">Sering Diajukan</span>
                            </h2>
                        </div>
                        <div className="flex flex-col gap-3">
                            {FAQ_ITEMS.map((item, i) => {
                                const open = openFaq === i;
                                return (
                                    <div key={item.q} className="bg-base-100 border border-base-300 rounded-lg overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setOpenFaq(open ? null : i)}
                                            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                                        >
                                            <span className="text-sm font-semibold text-base-content">{item.q}</span>
                                            <svg
                                                viewBox="0 0 20 20"
                                                className={`w-4 h-4 flex-shrink-0 text-accent transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                                                fill="currentColor"
                                            >
                                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        {open && (
                                            <div className="px-5 pb-4 text-sm text-base-content/70 leading-relaxed">{item.a}</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* LOKASI */}
                <section className="py-20 md:py-28 bg-primary">
                    <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="text-sm font-medium tracking-widest uppercase mb-4 text-accent">Lokasi</div>
                            <h2 className="font-[DM_Serif_Display,Georgia,serif] text-4xl md:text-5xl text-primary-content leading-tight mb-6">
                                Berada di Jantung<br />
                                <span className="italic text-accent">Kampus Limau Manis</span>
                            </h2>
                            <p className="text-primary-content/50 text-sm leading-relaxed mb-8 max-w-md">
                                Terletak di dalam lingkungan kampus Universitas Andalas, asrama memberikan akses mudah ke fasilitas akademik, masjid, dan transportasi kampus.
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 text-primary-content/80">
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                                    <span className="text-sm">Jl. Limau Manis, Kecamatan Pauh, Kota Padang, Sumatera Barat</span>
                                </div>
                                <div className="flex items-start gap-3 text-primary-content/80">
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                                    <span className="text-sm">(0751) 71111</span>
                                </div>
                                <div className="flex items-start gap-3 text-primary-content/80">
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                                    <span className="text-sm">contact@andalasresidence.ac.id</span>
                                </div>
                            </div>
                        </div>
                        <a href="/kontak" className="block relative group">
                            <div className="aspect-[4/3] rounded-sm overflow-hidden">
                                <img
                                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&h=700&fit=crop&auto=format"
                                    alt="Kawasan kampus Universitas Andalas"
                                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                            <div className="absolute inset-0 bg-primary/30 rounded-sm" />
                        </a>
                    </div>
                </section>

                {/* CTA */}
                <section className="bg-primary py-20">
                    <div className="max-w-6xl mx-auto px-6 text-center">
                        <h2 className="font-[DM_Serif_Display,Georgia,serif] text-4xl md:text-5xl text-primary-content mb-4">Siap Bergabung?</h2>
                        <p className="text-primary-content/60 text-base mb-8 max-w-sm mx-auto">Masuk dengan SSO Unand dan kelola semua layanan asrama digital.</p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <a href="/login" className="px-8 py-3.5 rounded text-primary-content font-semibold text-sm bg-accent hover:bg-accent-light transition-colors">
                                Login SSO Unand
                            </a>
                            <a href="/kontak" className="border border-white/30 hover:border-white/60 text-primary-content text-sm font-medium px-8 py-3.5 rounded transition-colors">
                                Hubungi Kami
                            </a>
                        </div>
                    </div>
                </section>
            </LandingLayout>
        </>
    );
}
