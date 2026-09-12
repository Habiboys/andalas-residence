import { Head } from "@inertiajs/react";
import LandingLayout from "@/andalas/components/LandingLayout";
import LandingPageHero from "@/andalas/components/LandingPageHero";
import "@/andalas/index.css";

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
        case "laki_laki": return "Putra";
        case "perempuan": return "Putri";
        case "campuran":
        case "campur": return "Campuran";
        default: return "Campuran";
    }
}

export default function UnitPage(props: Props) {
    const gedung = props.gedung ?? [];

    return (
        <>
            <Head title="Unit" />
            <LandingLayout active="unit">
                <LandingPageHero title="Unit Andalas Residence" breadcrumb="Unit" />

                <section className="py-16 md:py-24">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="max-w-2xl mb-14">
                            <div className="text-accent text-xs font-medium tracking-widest uppercase mb-3">Gedung Kami</div>
                            <h2 className="font-[DM_Serif_Display,Georgia,serif] text-4xl text-base-content leading-tight mb-4">
                                Unit Hunian<br />di Andalas Residence
                            </h2>
                            <p className="text-base-content/70 text-base leading-relaxed">
                                Andalas Residence terdiri dari berbagai gedung unit hunian yang masing-masing dirancang untuk mendukung kenyamanan dan aktivitas akademik mahasiswa.
                            </p>
                        </div>

                        {gedung.length === 0 ? (
                            <p className="text-center text-base-content/70 text-sm">Belum ada gedung terdaftar.</p>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {gedung.map((g) => (
                                    <div key={g.id} className="bg-base-100 border border-base-300 rounded-lg overflow-hidden group hover:shadow-lg transition-shadow">
                                        {g.foto ? (
                                            <img src={`/storage/${g.foto}`} alt={g.nama_gedung} className="w-full h-44 object-cover" />
                                        ) : (
                                            <div className="w-full h-44 bg-primary flex items-center justify-center">
                                                <span className="font-[DM_Serif_Display,Georgia,serif] text-5xl text-accent">{g.kode_gedung}</span>
                                            </div>
                                        )}
                                        <div className="p-5">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-semibold text-base-content text-base">{g.nama_gedung}</h3>
                                                <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary text-primary-content px-2 py-0.5 rounded">{g.kode_gedung}</span>
                                            </div>
                                            <div className="mt-1 flex items-center gap-3 text-xs text-base-content/70">
                                                <span className="capitalize">Peruntukan: {genderLabel(g.gender_peruntukan)}</span>
                                                {typeof g.lantai_count === "number" && <span>• {g.lantai_count} lantai</span>}
                                            </div>
                                            {g.deskripsi && <p className="mt-3 text-sm text-base-content/70 leading-relaxed line-clamp-3">{g.deskripsi}</p>}
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
