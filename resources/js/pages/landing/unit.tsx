import { Head } from '@inertiajs/react';
import LandingLayout from '@/andalas/components/LandingLayout';
import LandingPageHero from '@/andalas/components/LandingPageHero';
import '@/andalas/index.css';

type Gedung = {
    id: string;
    kode_gedung: string;
    nama_gedung: string;
    gender_peruntukan: string;
    alamat: string | null;
    deskripsi: string | null;
    foto: string | null;
    lantai_count?: number;
};

type Props = {
    gedung: Gedung[];
};

function genderLabel(v?: string) {
    switch (v) {
        case 'laki_laki':
            return 'Putra';
        case 'perempuan':
            return 'Putri';
        case 'campuran':
        case 'campur':
            return 'Campuran';
        default:
            return 'Campuran';
    }
}

export default function UnitPage(props: Props) {
    const gedung = props.gedung ?? [];

    return (
        <>
            <Head title="Unit" />
            <LandingLayout active="unit">
                <LandingPageHero
                    title="Unit Andalas Residence"
                    breadcrumb="Unit"
                />

                <section className="py-16 md:py-24">
                    <div className="mx-auto max-w-6xl px-6">
                        <div className="mb-14 max-w-2xl">
                            <div className="text-accent mb-3 text-xs font-medium tracking-widest uppercase">
                                Gedung Kami
                            </div>
                            <h2 className="text-base-content mb-4 font-[DM_Serif_Display,Georgia,serif] text-4xl leading-tight">
                                Unit Hunian
                                <br />
                                di Andalas Residence
                            </h2>
                            <p className="text-base-content/70 text-base leading-relaxed">
                                Andalas Residence terdiri dari berbagai gedung
                                unit hunian yang masing-masing dirancang untuk
                                mendukung kenyamanan dan aktivitas akademik
                                mahasiswa.
                            </p>
                        </div>

                        {gedung.length === 0 ? (
                            <p className="text-base-content/70 text-center text-sm">
                                Belum ada gedung terdaftar.
                            </p>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {gedung.map((g) => (
                                    <div
                                        key={g.id}
                                        className="bg-base-100 border-base-300 group overflow-hidden rounded-lg border transition-shadow hover:shadow-lg"
                                    >
                                        {g.foto ? (
                                            <img
                                                src={`/storage/${g.foto}`}
                                                alt={g.nama_gedung}
                                                className="h-44 w-full object-cover"
                                            />
                                        ) : (
                                            <div className="bg-primary flex h-44 w-full items-center justify-center">
                                                <span className="text-accent font-[DM_Serif_Display,Georgia,serif] text-5xl">
                                                    {g.kode_gedung}
                                                </span>
                                            </div>
                                        )}
                                        <div className="p-5">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-base-content text-base font-semibold">
                                                    {g.nama_gedung}
                                                </h3>
                                                <span className="bg-primary text-primary-content rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                                                    {g.kode_gedung}
                                                </span>
                                            </div>
                                            <div className="text-base-content/70 mt-1 flex items-center gap-3 text-xs">
                                                <span className="capitalize">
                                                    Peruntukan:{' '}
                                                    {genderLabel(
                                                        g.gender_peruntukan,
                                                    )}
                                                </span>
                                                {typeof g.lantai_count ===
                                                    'number' && (
                                                    <span>
                                                        • {g.lantai_count}{' '}
                                                        lantai
                                                    </span>
                                                )}
                                            </div>
                                            {g.deskripsi && (
                                                <p className="text-base-content/70 mt-3 line-clamp-3 text-sm leading-relaxed">
                                                    {g.deskripsi}
                                                </p>
                                            )}
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
