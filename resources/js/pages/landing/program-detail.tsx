import { Head, Link } from "@inertiajs/react";
import LandingLayout from "@/andalas/components/LandingLayout";
import LandingPageHero from "@/andalas/components/LandingPageHero";
import "@/andalas/index.css";

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
            <Head title={program?.nama ?? "Program"} />
            <LandingLayout active="program">
                <LandingPageHero title={program?.nama ?? "Program"} breadcrumb="Program" />

                <section className="py-16 md:py-24">
                    <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-4 gap-10">
                        <aside className="lg:col-span-1">
                            <div className="bg-base-100 border border-base-300 rounded-lg p-4">
                                <div className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-3">Program</div>
                                <div className="flex flex-col gap-1">
                                    {(programs ?? []).map((p) => (
                                        <Link
                                            key={p.id}
                                            href={`/program/${p.id}`}
                                            className={`px-3 py-2 text-sm rounded transition-colors ${
                                                program?.id === p.id ? "bg-primary text-primary-content" : "text-primary/70 text-base-content/80 hover:bg-primary/5 hover:bg-base-200 hover:text-primary hover:text-base-content"
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
                                <p className="text-base-content/80 text-base leading-relaxed mb-10 max-w-3xl">{program.deskripsi}</p>
                            )}

                            {(program?.sub ?? []).length === 0 ? (
                                <p className="text-center text-base-content/70 text-sm py-10">Belum ada uraian program.</p>
                            ) : (
                                <div className="space-y-8">
                                    {(program?.sub ?? []).map((s, i) => (
                                        <div key={s.id} className="bg-base-100 border border-base-300 rounded-lg overflow-hidden">
                                            <div className="flex items-center gap-4 px-6 py-4 bg-primary text-primary-content">
                                                <div className="w-9 h-9 rounded flex items-center justify-center bg-accent text-primary font-[JetBrains_Mono,monospace] font-semibold text-sm flex-shrink-0">
                                                    {String(i + 1).padStart(2, "0")}
                                                </div>
                                                <h3 className="font-semibold">{s.judul}</h3>
                                            </div>
                                            {s.deskripsi && (
                                                <div className="px-6 py-5">
                                                    <p className="text-base-content/80 text-sm leading-relaxed whitespace-pre-line">{s.deskripsi}</p>
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
