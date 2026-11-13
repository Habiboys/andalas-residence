import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { show as roomShow } from '@/routes/andalas/kamar';
import { RoomGridMap } from '../../components/organisms/RoomGridMap';
import { Card, PageHeader, StatCard, inputClass } from '../../components/ui';

type GedungRow = {
    id?: string;
    nama_gedung?: string;
    lantai?: Array<{
        id?: string;
        nomor_lantai?: number;
        nama_lantai?: string;
        kamar?: Array<{
            id: string;
            nomor_kamar: string;
            kapasitas: number;
            status: string;
            penempatan_kamar?: unknown[];
        }>;
    }>;
};

type Props = {
    gedung: GedungRow[];
};

export default function MonitoringKamar({ gedung = [] }: Props) {
    const [selectedGedung, setSelectedGedung] = useState(gedung[0]?.id ?? '');
    const [selectedLantai, setSelectedLantai] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    const activeGedung = useMemo(
        () => gedung.find((g) => g.id === selectedGedung) ?? gedung[0],
        [gedung, selectedGedung],
    );
    const floors = activeGedung?.lantai ?? [];
    const activeLantai = useMemo(
        () =>
            selectedLantai
                ? floors.filter((f) => f.id === selectedLantai)
                : floors,
        [floors, selectedLantai],
    );
    const allRooms = useMemo(
        () =>
            activeLantai.flatMap((l) =>
                (l.kamar ?? []).map((k) => ({
                    ...k,
                    okupansi: k.penempatan_kamar?.length ?? 0,
                })),
            ),
        [activeLantai],
    );
    const filteredRooms = useMemo(
        () =>
            selectedStatus
                ? allRooms.filter((r) => r.status === selectedStatus)
                : allRooms,
        [allRooms, selectedStatus],
    );

    const counts = useMemo(
        () => ({
            total: allRooms.length,
            kosong: allRooms.filter((r) => r.status === 'kosong').length,
            sebagian: allRooms.filter((r) => r.status === 'terisi_sebagian')
                .length,
            penuh: allRooms.filter((r) => r.status === 'penuh').length,
            maintenance: allRooms.filter((r) => r.status === 'maintenance')
                .length,
        }),
        [allRooms],
    );

    return (
        <div className="space-y-4">
            <PageHeader
                title="Monitoring Kamar"
                subtitle="Status kamar wilayah fasilitator dan koordinasi operasional"
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard label="Total Kamar" value={counts.total} />
                <StatCard label="Kosong" value={counts.kosong} color="green" />
                <StatCard
                    label="Terisi Sebagian"
                    value={counts.sebagian}
                    color="gold"
                />
                <StatCard label="Penuh" value={counts.penuh} color="red" />
                <StatCard label="Maintenance" value={counts.maintenance} />
            </div>
            <Card className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-3">
                    {gedung.length > 1 && (
                        <select
                            aria-label="Filter gedung"
                            className={`${inputClass} w-auto`}
                            value={activeGedung?.id ?? ''}
                            onChange={(e) => {
                                setSelectedGedung(e.target.value);
                                setSelectedLantai('');
                            }}
                        >
                            {gedung.map((g, i) => (
                                <option key={g.id ?? i} value={g.id ?? ''}>
                                    {g.nama_gedung ?? `Gedung ${i + 1}`}
                                </option>
                            ))}
                        </select>
                    )}
                    <select
                        aria-label="Filter lantai"
                        className={`${inputClass} w-auto`}
                        value={selectedLantai}
                        onChange={(e) => setSelectedLantai(e.target.value)}
                    >
                        <option value="">Semua Lantai</option>
                        {floors.map((f, i) => (
                            <option key={f.id ?? i} value={f.id ?? ''}>
                                {f.nomor_lantai != null
                                    ? `Lantai ${f.nomor_lantai}`
                                    : f.nama_lantai ?? `Lantai ${i + 1}`}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label="Filter status kamar"
                        className={`${inputClass} w-auto`}
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="">Semua Status</option>
                        <option value="kosong">Kosong</option>
                        <option value="terisi_sebagian">Terisi sebagian</option>
                        <option value="penuh">Penuh</option>
                        <option value="maintenance">Maintenance</option>
                    </select>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="border-success bg-success/15 inline-block size-3 rounded border" />
                        Kosong
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="border-warning bg-warning/15 inline-block size-3 rounded border" />
                        Terisi sebagian
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="border-error bg-error/15 inline-block size-3 rounded border" />
                        Penuh
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="border-base-300 bg-base-200 inline-block size-3 rounded border" />
                        Maintenance
                    </span>
                </div>
                <RoomGridMap
                    rooms={filteredRooms as never}
                    onSelect={(room) => router.visit(roomShow.url(room.id))}
                />
            </Card>
        </div>
    );
}
