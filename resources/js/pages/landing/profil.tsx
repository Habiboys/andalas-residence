import { Head, Link } from "@inertiajs/react";
import LandingLayout from "@/andalas/components/LandingLayout";
import LandingPageHero from "@/andalas/components/LandingPageHero";
import "@/andalas/index.css";

type Content = {
    key: string;
    title: string;
    content: string | null;
    image: string | null;
};

type Props = {
    section: string;
    sections: Record<string, string>;
    content: Content;
    statistik?: {
        gedung: number;
        kamar: number;
        penghuni: number;
    };
};

const URL_SLUG: Record<string, string> = {
    sejarah: "sejarah",
    visi_misi: "visi-misi",
    struktur_organisasi: "struktur-organisasi",
};

function Statistik({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-primary text-center py-8 px-4 rounded-sm text-primary-content">
            <div className="font-[DM_Serif_Display,Georgia,serif] text-3xl text-accent">{value}</div>
            <div className="text-primary-content/60 text-xs mt-1">{label}</div>
        </div>
    );
}

export default function ProfilPage(props: Props) {
    const { section, sections, content } = props;
    const statistik = props.statistik ?? { gedung: 0, kamar: 0, penghuni: 0 };
    const isStruktur = section === "struktur_organisasi";
    const strukturList = (content?.content ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

    return (
        <>
            <Head title={content?.title ?? section} />
            <LandingLayout active="profil">
                <LandingPageHero title={content?.title ?? section} breadcrumb="Profil" />

                <section className="py-16 md:py-24">
                    <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-4 gap-10">
                        {/* Sidebar */}
                        <aside className="lg:col-span-1">
                            <div className="bg-base-100 border border-base-300 rounded-lg p-4">
                                <div className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-3">Profil</div>
                                <div className="flex flex-col gap-1">
                                    {Object.entries(sections ?? {}).map(([key, title]) => (
                                        <Link
                                            key={key}
                                            href={`/profil/${URL_SLUG[key] ?? key}`}
                                            className={`px-3 py-2 text-sm rounded transition-colors ${
                                                section === key ? "bg-primary text-primary-content" : "text-primary/70 text-base-content/80 hover:bg-primary/5 hover:bg-base-200 hover:text-primary hover:text-base-content"
                                            }`}
                                        >
                                            {title}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </aside>

                        {/* Content */}
                        <div className="lg:col-span-3">
                            {isStruktur ? (
                                <div>
                                    <h2 className="font-[DM_Serif_Display,Georgia,serif] text-3xl text-base-content mb-8">Struktur Organisasi</h2>
                                    <div className="flex flex-col items-center gap-2">
                                        {strukturList.map((nama, i) => (
                                            <div key={i} className="w-full max-w-md text-center">
                                                <div
                                                    className={`py-4 px-6 rounded-sm border ${
                                                        nama.toLowerCase().includes("rektor")
                                                            ? "bg-primary text-primary-content font-semibold"
                                                            : nama.toLowerCase().includes("direktur") || nama.toLowerCase().includes("kepala") || nama.toLowerCase().includes("manager")
                                                              ? "bg-primary text-primary-content font-medium"
                                                              : "bg-base-100 border-base-300 text-base-content"
                                                    }`}
                                                >
                                                    {nama}
                                                </div>
                                                {i < strukturList.length - 1 && (
                                                    <div className="w-px h-6 mx-auto bg-accent/50" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="prose-landing">
                                    <div className="text-accent text-xs font-medium tracking-widest uppercase mb-3">Profil · {content?.title}</div>
                                    <div className="text-base-content/80 text-base leading-relaxed whitespace-pre-line space-y-0">
                                        {content?.content ?? "Belum ada konten."}
                                    </div>
                                </div>
                            )}

                            {/* Stats strip — angka aktual dari database */}
                            <div className="grid gap-4 mt-14 sm:grid-cols-3">
                                <Statistik label="Gedung" value={String(statistik.gedung)} />
                                <Statistik label="Kamar" value={String(statistik.kamar)} />
                                <Statistik label="Penghuni Aktif" value={String(statistik.penghuni)} />
                            </div>
                        </div>
                    </div>
                </section>
            </LandingLayout>
        </>
    );
}
