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
                <LandingPageHero title="Program Andalas Residence" breadcrumb="Program" />

                <section className="py-16 md:py-24">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="max-w-2xl mb-14">
                            <div className="text-accent text-xs font-medium tracking-widest uppercase mb-3">Program Kami</div>
                            <h2 className="font-[DM_Serif_Display,Georgia,serif] text-4xl text-base-content leading-tight mb-4">
                                Program Pembinaan<br />Mahasiswa
                            </h2>
                            <p className="text-base-content/70 text-base leading-relaxed">
                                Berbagai program pembinaan dirancang untuk membentuk karakter, keagamaan, dan prestasi akademik mahasiswa Andalas Residence.
                            </p>
                        </div>

                        {programs.length === 0 ? (
                            <p className="text-center text-base-content/70 text-sm">Belum ada program.</p>
                        ) : (
                            <div className="space-y-8">
                                {programs.map((p) => (
                                    <div key={p.id} className="bg-base-100 border border-base-300 rounded-lg p-6 md:p-8">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                            <div>
                                                <h3 className="font-[DM_Serif_Display,Georgia,serif] text-2xl text-base-content">{p.nama}</h3>
                                                {p.deskripsi && <p className="text-base-content/70 text-sm mt-1 max-w-2xl">{p.deskripsi}</p>}
                                            </div>
                                            <Link href={`/program/${p.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-base-content border-b border-base-content/30 pb-0.5 hover:border-base-content transition-colors flex-shrink-0">
                                                Lihat Detail
                                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
                                            </Link>
                                        </div>
                                        <div className="grid md:grid-cols-3 gap-4">
                                            {(p.sub ?? []).map((s) => (
                                                <div key={s.id} className="bg-base-200 rounded p-4">
                                                    <div className="font-medium text-base-content text-sm mb-1">{s.judul}</div>
                                                    {s.deskripsi && <p className="text-base-content/70 text-xs leading-relaxed line-clamp-3">{s.deskripsi.split("\n")[0]}</p>}
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
