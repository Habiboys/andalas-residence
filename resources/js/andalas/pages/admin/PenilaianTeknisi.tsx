import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    PageHeader,
    Tabs,
    DataTable,
    Button,
    Drawer,
    StatusBadge,
} from '../../components/ui';
import {
    TechnicianAssessment,
    type KuesionerPertanyaan,
} from '../../components/molecules/TechnicianAssessment';
import { PerformanceSummary } from '../../components/molecules/PerformanceSummary';
import { store as penilaianStore } from '@/routes/andalas/penilaian';
import { mapTicketStatus } from '../../lib/format';

type TiketRow = {
    id: string;
    nomor_tiket?: string;
    deskripsi?: string;
    catatan_penyelesaian?: string;
    tanggal_lapor?: string;
    status?: string;
    aset?: {
        nama_aset?: string;
        kode_inventaris?: string;
        fasilitas_umum?: { nama_fasilitas?: string; gedung?: { nama_gedung?: string } };
    } | null;
    kamar?: {
        nomor_kamar?: string;
        lantai?: { gedung?: { nama_gedung?: string } };
    } | null;
    teknisi?: { nama?: string };
    penilaian?: unknown[];
};
type Kuesioner = { pertanyaan?: KuesionerPertanyaan[] };
type TeknisiStat = {
    teknisi_id: string;
    nama: string;
    nim_nip: string;
    rata_skor: number | null;
    total_tiket: number;
    total_penilaian: number;
};

export default function PenilaianTeknisi({
    tiket = [],
    kuesioner = [],
    performance = [],
}: {
    tiket?: TiketRow[];
    kuesioner?: Kuesioner[];
    performance?: TeknisiStat[];
}) {
    const {
        data: formData,
        setData,
        post,
        processing,
        errors,
        reset,
    } = useForm<{
        answers: Record<string, { nilai_skor?: number; jawaban_teks?: string }>;
    }>({ answers: {} });
    const [tab, setTab] = useState(0);
    const [selected, setSelected] = useState<string | null>(null);
    const selectedTicket = tiket.find((item) => item.id === selected);

    const activeKuesioner = kuesioner[0];
    const belumDinilai = tiket.filter(
        (t) => t.status === 'selesai' && !t.penilaian?.length,
    );

    function submitPenilaian() {
        if (!selected) return;
        post(penilaianStore.url({ id: selected }), {
            onSuccess: () => {
                setSelected(null);
                reset();
            },
        });
    }

    const tiketCols = [
        { key: 'nomor_tiket', label: 'No. Tiket' },
        {
            key: 'teknisi',
            label: 'Teknisi',
            render: (r: TiketRow) => r.teknisi?.nama ?? '-',
        },
        {
            key: 'status',
            label: 'Status',
            render: (r: TiketRow) => (
                <StatusBadge status={mapTicketStatus(r.status ?? '')} />
            ),
        },
        {
            key: 'aksi',
            label: '',
            render: (r: TiketRow) => (
                <Button size="sm" onClick={() => setSelected(r.id)}>
                    Nilai
                </Button>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Penilaian Teknisi"
                subtitle="Kuesioner dinamis penilaian kinerja teknisi"
            />
            <section className="space-y-4">
                <Tabs
                    tabs={['Tiket Belum Dinilai', 'Rekap Performa']}
                    active={tab}
                    onChange={setTab}
                />
                {tab === 0 ? (
                    <DataTable
                        columns={tiketCols as never}
                        data={belumDinilai as never}
                        emptyMessage="Semua tiket sudah dinilai"
                    />
                ) : (
                    <PerformanceSummary stats={performance} />
                )}
            </section>
            <Drawer
                open={!!selected}
                onClose={() => setSelected(null)}
                title="Penilaian Kuesioner"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => setSelected(null)}
                        >
                            Batal
                        </Button>
                        <Button onClick={submitPenilaian} disabled={processing}>
                            Simpan
                        </Button>
                    </div>
                }
            >
                {selectedTicket && (
                    <div className="border-base-200 bg-base-200/50 mb-4 space-y-1.5 rounded-lg border p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold">
                                {selectedTicket.nomor_tiket}
                            </span>
                            <span className="text-muted text-xs">
                                Teknisi: {selectedTicket.teknisi?.nama ?? '-'}
                            </span>
                        </div>
                        <p className="text-xs">
                            <span className="font-medium">Lokasi / Aset:</span>{' '}
                            {[
                                selectedTicket.kamar?.lantai?.gedung
                                    ?.nama_gedung ??
                                    selectedTicket.aset?.fasilitas_umum?.gedung
                                        ?.nama_gedung,
                                selectedTicket.kamar?.nomor_kamar
                                    ? `Kamar ${selectedTicket.kamar.nomor_kamar}`
                                    : selectedTicket.aset?.fasilitas_umum
                                          ?.nama_fasilitas,
                                selectedTicket.aset?.nama_aset,
                            ]
                                .filter(Boolean)
                                .join(' · ') || '-'}
                        </p>
                        {selectedTicket.deskripsi && (
                            <p className="text-xs">
                                <span className="font-medium">Keluhan:</span>{' '}
                                {selectedTicket.deskripsi}
                            </p>
                        )}
                        {selectedTicket.catatan_penyelesaian && (
                            <p className="text-xs">
                                <span className="font-medium">
                                    Hasil penyelesaian:
                                </span>{' '}
                                {selectedTicket.catatan_penyelesaian}
                            </p>
                        )}
                    </div>
                )}
                {activeKuesioner?.pertanyaan && (
                    <TechnicianAssessment
                        pertanyaan={activeKuesioner.pertanyaan}
                        answers={formData.answers}
                        onChange={(id, val) =>
                            setData('answers', {
                                ...formData.answers,
                                [id]: val,
                            })
                        }
                    />
                )}
                {errors.answers && (
                    <p className="text-error mt-3 text-sm">{errors.answers}</p>
                )}
            </Drawer>
        </div>
    );
}
