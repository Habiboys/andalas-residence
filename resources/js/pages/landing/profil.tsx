import { Head, Link } from '@inertiajs/react';
import LandingLayout from '@/andalas/components/LandingLayout';
import LandingRichContent from '@/andalas/components/LandingRichContent';
import LandingPageHero from '@/andalas/components/LandingPageHero';
import '@/andalas/index.css';

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
    sejarah: 'sejarah',
    visi_misi: 'visi-misi',
    struktur_organisasi: 'struktur-organisasi',
};

function Statistik({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-primary text-primary-content rounded-sm px-4 py-8 text-center">
            <div className="text-accent font-[DM_Serif_Display,Georgia,serif] text-3xl">
                {value}
            </div>
            <div className="text-primary-content/60 mt-1 text-xs">{label}</div>
        </div>
    );
}

export default function ProfilPage(props: Props) {
    const { section, sections, content } = props;
    const statistik = props.statistik ?? { gedung: 0, kamar: 0, penghuni: 0 };

    return (
        <>
            <Head title={content?.title ?? section} />
            <LandingLayout active="profil">
                <LandingPageHero
                    title={content?.title ?? section}
                    breadcrumb="Profil"
                />

                <section className="py-16 md:py-24">
                    <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-4">
                        {/* Sidebar */}
                        <aside className="lg:col-span-1">
                            <div className="bg-base-100 border-base-300 rounded-lg border p-4">
                                <div className="text-accent mb-3 text-[10px] font-semibold tracking-widest uppercase">
                                    Profil
                                </div>
                                <div className="flex flex-col gap-1">
                                    {Object.entries(sections ?? {}).map(
                                        ([key, title]) => (
                                            <Link
                                                key={key}
                                                href={`/profil/${URL_SLUG[key] ?? key}`}
                                                className={`rounded px-3 py-2 text-sm transition-colors ${
                                                    section === key
                                                        ? 'bg-primary text-primary-content'
                                                        : 'text-primary/70 text-base-content/80 hover:bg-primary/5 hover:bg-base-200 hover:text-primary hover:text-base-content'
                                                }`}
                                            >
                                                {title}
                                            </Link>
                                        ),
                                    )}
                                </div>
                            </div>
                        </aside>

                        {/* Content */}
                        <div className="lg:col-span-3">
                            <LandingRichContent html={content.content} />

                            {/* Stats strip — angka aktual dari database */}
                            <div className="mt-14 grid gap-4 sm:grid-cols-3">
                                <Statistik
                                    label="Gedung"
                                    value={String(statistik.gedung)}
                                />
                                <Statistik
                                    label="Kamar"
                                    value={String(statistik.kamar)}
                                />
                                <Statistik
                                    label="Penghuni Aktif"
                                    value={String(statistik.penghuni)}
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </LandingLayout>
        </>
    );
}
