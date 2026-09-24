import { Head, Link } from '@inertiajs/react';
import LandingLayout from '@/andalas/components/LandingLayout';
import LandingRichContent from '@/andalas/components/LandingRichContent';
import LandingPageHero from '@/andalas/components/LandingPageHero';
import '@/andalas/index.css';

type Sub = {
    id: string;
    judul: string;
    deskripsi: string | null;
    gambar: string | null;
};

type Program = {
    id: string;
    nama: string;
    deskripsi: string | null;
    ikon: string | null;
    sub: Sub[];
};

type Props = {
    programs: Program[];
};

export default function ProgramPage(props: Props) {
    const { programs } = props;

    return (
        <>
            <Head title="Program" />
            <LandingLayout active="program">
                <LandingPageHero
                    title="Program Andalas Residence"
                    breadcrumb="Program"
                />

                <section className="py-16 md:py-24">
                    <div className="mx-auto max-w-6xl px-6">
                        <div className="mb-14 max-w-2xl">
                            <div className="text-accent mb-3 text-xs font-medium tracking-widest uppercase">
                                Program Kami
                            </div>
                            <h2 className="text-base-content mb-4 font-[DM_Serif_Display,Georgia,serif] text-4xl leading-tight">
                                Program Pembinaan
                                <br />
                                Mahasiswa
                            </h2>
                            <p className="text-base-content/70 text-base leading-relaxed">
                                Berbagai program pembinaan dirancang untuk
                                membentuk karakter, keagamaan, dan prestasi
                                akademik mahasiswa Andalas Residence.
                            </p>
                        </div>

                        {programs.length === 0 ? (
                            <p className="text-base-content/70 text-center text-sm">
                                Belum ada program.
                            </p>
                        ) : (
                            <div className="space-y-8">
                                {programs.map((p) => (
                                    <div
                                        key={p.id}
                                        className="bg-base-100 border-base-300 rounded-lg border p-6 md:p-8"
                                    >
                                        <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                            <div>
                                                <h3 className="text-base-content font-[DM_Serif_Display,Georgia,serif] text-2xl">
                                                    {p.nama}
                                                </h3>
                                                {p.deskripsi && (
                                                    <LandingRichContent
                                                        html={p.deskripsi}
                                                        className="mt-3 line-clamp-3"
                                                    />
                                                )}
                                            </div>
                                            <Link
                                                href={`/program/${p.id}`}
                                                className="text-base-content border-base-content/30 hover:border-base-content inline-flex flex-shrink-0 items-center gap-2 border-b pb-0.5 text-sm font-medium transition-colors"
                                            >
                                                Lihat Detail
                                                <svg
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                    className="h-3.5 w-3.5"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </Link>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-3">
                                            {(p.sub ?? []).map((s) => (
                                                <div
                                                    key={s.id}
                                                    className="bg-base-200 rounded p-4"
                                                >
                                                    <div className="text-base-content mb-1 text-sm font-medium">
                                                        {s.judul}
                                                    </div>
                                                    {s.deskripsi && (
                                                        <LandingRichContent
                                                            html={s.deskripsi}
                                                            className="line-clamp-3"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </LandingLayout>
        </>
    );
}
