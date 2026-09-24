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
    sub: Sub[];
};

type Props = {
    program: Program;
    programs: Program[];
};

export default function ProgramDetailPage(props: Props) {
    const { program, programs } = props;

    return (
        <>
            <Head title={program?.nama ?? 'Program'} />
            <LandingLayout active="program">
                <LandingPageHero
                    title={program?.nama ?? 'Program'}
                    breadcrumb="Program"
                />

                <section className="py-16 md:py-24">
                    <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-4">
                        <aside className="lg:col-span-1">
                            <div className="bg-base-100 border-base-300 rounded-lg border p-4">
                                <div className="text-accent mb-3 text-[10px] font-semibold tracking-widest uppercase">
                                    Program
                                </div>
                                <div className="flex flex-col gap-1">
                                    {(programs ?? []).map((p) => (
                                        <Link
                                            key={p.id}
                                            href={`/program/${p.id}`}
                                            className={`rounded px-3 py-2 text-sm transition-colors ${
                                                program?.id === p.id
                                                    ? 'bg-primary text-primary-content'
                                                    : 'text-primary/70 text-base-content/80 hover:bg-primary/5 hover:bg-base-200 hover:text-primary hover:text-base-content'
                                            }`}
                                        >
                                            {p.nama}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </aside>

                        <div className="lg:col-span-3">
                            {program?.deskripsi && (
                                <LandingRichContent
                                    html={program.deskripsi}
                                    className="mb-10"
                                />
                            )}

                            {(program?.sub ?? []).length === 0 ? (
                                <p className="text-base-content/70 py-10 text-center text-sm">
                                    Belum ada uraian program.
                                </p>
                            ) : (
                                <div className="space-y-8">
                                    {(program?.sub ?? []).map((s, i) => (
                                        <div
                                            key={s.id}
                                            className="bg-base-100 border-base-300 overflow-hidden rounded-lg border"
                                        >
                                            <div className="bg-primary text-primary-content flex items-center gap-4 px-6 py-4">
                                                <div className="bg-accent text-primary flex h-9 w-9 flex-shrink-0 items-center justify-center rounded font-[JetBrains_Mono,monospace] text-sm font-semibold">
                                                    {String(i + 1).padStart(
                                                        2,
                                                        '0',
                                                    )}
                                                </div>
                                                <h3 className="font-semibold">
                                                    {s.judul}
                                                </h3>
                                            </div>
                                            {s.gambar && (
                                                <img
                                                    src={`/storage/${s.gambar}`}
                                                    alt={s.judul}
                                                    loading="lazy"
                                                    className="max-h-96 w-full object-contain"
                                                />
                                            )}
                                            {s.deskripsi && (
                                                <div className="px-6 py-5">
                                                    <LandingRichContent
                                                        html={s.deskripsi}
                                                    />
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
