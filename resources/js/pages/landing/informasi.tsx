import { Head, Link } from '@inertiajs/react';
import LandingLayout from '@/andalas/components/LandingLayout';
import LandingRichContent from '@/andalas/components/LandingRichContent';
import LandingPageHero from '@/andalas/components/LandingPageHero';
import { useState } from 'react';
import '@/andalas/index.css';

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
    regulasi: 'Regulasi',
    sop: 'SOP',
    panduan: 'Panduan',
    pengumuman: 'Pengumuman',
};

const KATEGORI_ORDER = ['regulasi', 'sop', 'panduan', 'pengumuman'];

export default function InformasiPage(props: Props) {
    const { kategori, items } = props;
    const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);

    return (
        <>
            <Head title={KATEGORI_LABEL[kategori] ?? kategori} />
            <LandingLayout active="informasi">
                <LandingPageHero
                    title={KATEGORI_LABEL[kategori] ?? kategori}
                    breadcrumb="Informasi"
                />

                <section className="py-16 md:py-24">
                    <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-4">
                        {/* Sidebar */}
                        <aside className="lg:col-span-1">
                            <div className="bg-base-100 border-base-300 rounded-lg border p-4">
                                <div className="text-accent mb-3 text-[10px] font-semibold tracking-widest uppercase">
                                    Informasi
                                </div>
                                <div className="flex flex-col gap-1">
                                    {KATEGORI_ORDER.map((cat) => (
                                        <Link
                                            key={cat}
                                            href={`/informasi/${cat}`}
                                            className={`rounded px-3 py-2 text-sm transition-colors ${
                                                kategori === cat
                                                    ? 'bg-primary text-primary-content'
                                                    : 'text-primary/70 text-base-content/80 hover:bg-primary/5 hover:bg-base-200 hover:text-primary hover:text-base-content'
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
                                <p className="text-base-content/70 py-10 text-center text-sm">
                                    Belum ada{' '}
                                    {KATEGORI_LABEL[kategori]?.toLowerCase()}.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="bg-base-100 border-base-300 overflow-hidden rounded-lg border"
                                        >
                                            <button
                                                onClick={() =>
                                                    setOpen(
                                                        open === item.id
                                                            ? null
                                                            : item.id,
                                                    )
                                                }
                                                className="hover:bg-base-200 flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-base-content text-base leading-snug font-semibold">
                                                        {item.judul}
                                                    </h3>
                                                    {item.tanggal && (
                                                        <span className="text-base-content/50 mt-1 block text-xs">
                                                            {item.tanggal}
                                                        </span>
                                                    )}
                                                </div>
                                                <svg
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                    className={`text-accent h-5 w-5 flex-shrink-0 transition-transform ${open === item.id ? 'rotate-180' : ''}`}
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                            {open === item.id && (
                                                <div className="border-base-300 border-t px-6 pt-2 pb-6">
                                                    <LandingRichContent
                                                        html={item.konten}
                                                    />
                                                    {item.file && (
                                                        <a
                                                            href={`/storage/${item.file}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-base-content border-base-content/30 hover:border-base-content mt-4 inline-flex items-center gap-2 border-b pb-0.5 text-sm font-medium transition-colors"
                                                        >
                                                            Unduh File
                                                            <svg
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                                className="h-3.5 w-3.5"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M10 3a.75.75 0 01.75.75v7.5l2.1-2.1a.75.75 0 111.06 1.06l-3.3 3.3a.75.75 0 01-1.06 0l-3.3-3.3a.75.75 0 111.06-1.06l2.1 2.1V3.75A.75.75 0 0110 3z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
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
