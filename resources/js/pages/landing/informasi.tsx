import { Head, Link } from "@inertiajs/react";
import LandingLayout from "@/andalas/components/LandingLayout";
import LandingPageHero from "@/andalas/components/LandingPageHero";
import { useState } from "react";
import "@/andalas/index.css";

type Item = {
    id: string;
    judul: string;
    konten: string | null;
    tanggal: string | null;
    file: string | null;
};

type Props = {
    kategori: string;
    items: Item[];
};

const KATEGORI_LABEL: Record<string, string> = {
    regulasi: "Regulasi",
    sop: "SOP",
    panduan: "Panduan",
    pengumuman: "Pengumuman",
};

const KATEGORI_ORDER = ["regulasi", "sop", "panduan", "pengumuman"];

export default function InformasiPage(props: Props) {
    const { kategori, items } = props;
    const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);

    return (
        <>
            <Head title={KATEGORI_LABEL[kategori] ?? kategori} />
            <LandingLayout active="informasi">
                <LandingPageHero title={KATEGORI_LABEL[kategori] ?? kategori} breadcrumb="Informasi" />

                <section className="py-16 md:py-24">
                    <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-4 gap-10">
                        {/* Sidebar */}
                        <aside className="lg:col-span-1">
                            <div className="bg-base-100 border border-base-300 rounded-lg p-4">
                                <div className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-3">Informasi</div>
                                <div className="flex flex-col gap-1">
                                    {KATEGORI_ORDER.map((cat) => (
                                        <Link
                                            key={cat}
                                            href={`/informasi/${cat}`}
                                            className={`px-3 py-2 text-sm rounded transition-colors ${
                                                kategori === cat ? "bg-primary text-primary-content" : "text-primary/70 text-base-content/80 hover:bg-primary/5 hover:bg-base-200 hover:text-primary hover:text-base-content"
                                            }`}
                                        >
                                            {KATEGORI_LABEL[cat] ?? cat}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </aside>

                        {/* Content */}
                        <div className="lg:col-span-3">
                            {items.length === 0 ? (
                                <p className="text-center text-base-content/70 text-sm py-10">Belum ada {KATEGORI_LABEL[kategori]?.toLowerCase()}.</p>
                            ) : (
                                <div className="space-y-4">
                                    {items.map((item) => (
                                        <div key={item.id} className="bg-base-100 border border-base-300 rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => setOpen(open === item.id ? null : item.id)}
                                                className="w-full flex items-center justify-between gap-4 text-left px-6 py-4 hover:bg-base-200 transition-colors"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-base-content text-base leading-snug">{item.judul}</h3>
                                                    {item.tanggal && <span className="text-xs text-base-content/50 mt-1 block">{item.tanggal}</span>}
                                                </div>
                                                <svg
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                    className={`w-5 h-5 flex-shrink-0 text-accent transition-transform ${open === item.id ? "rotate-180" : ""}`}
                                                >
                                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                            {open === item.id && (
                                                <div className="px-6 pb-6 pt-2 border-t border-base-300">
                                                    <p className="text-base-content/80 text-sm leading-relaxed whitespace-pre-line">{item.konten ?? "Tidak ada konten."}</p>
                                                    {item.file && (
                                                        <a href={`/storage/${item.file}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-base-content border-b border-base-content/30 pb-0.5 hover:border-base-content transition-colors">
                                                            Unduh File
                                                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v7.5l2.1-2.1a.75.75 0 111.06 1.06l-3.3 3.3a.75.75 0 01-1.06 0l-3.3-3.3a.75.75 0 111.06-1.06l2.1 2.1V3.75A.75.75 0 0110 3z" clipRule="evenodd" /></svg>
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </LandingLayout>
        </>
    );
}
