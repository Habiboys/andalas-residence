import { useEffect, useMemo, useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { show as roomShow } from '@/routes/andalas/kamar';
import { show as buildingShow } from '@/routes/andalas/gedung';
import { show as floorShow } from '@/routes/andalas/lantai';
import { PageHeader, Card, inputClass } from '../../components/ui';
import {
    RoomGridMap,
    type RoomGridItem,
} from '../../components/organisms/RoomGridMap';

type Gedung = {
    id: string;
    kode_gedung: string;
    nama_gedung: string;
    lantai?: Array<{
        id: string;
        nomor_lantai: number;
        nama_lantai: string;
        kamar?: RoomGridItem[];
    }>;
};

export default function PemetaanKamar({ gedung = [] }: { gedung?: Gedung[] }) {
    const [selectedGedung, setSelectedGedung] = useState('');
    const [selectedLantai, setSelectedLantai] = useState('');

    useEffect(() => {
        if (gedung?.length && !selectedGedung) {
            setSelectedGedung(gedung[0].id);
            setSelectedLantai(gedung[0].lantai?.[0]?.id ?? '');
        }
    }, [gedung, selectedGedung]);

    const lantaiForGedung = useMemo(
        () => gedung?.find((g) => g.id === selectedGedung)?.lantai ?? [],
        [gedung, selectedGedung],
    );

    const filteredKamar = useMemo(() => {
        const lantai = lantaiForGedung.find((l) => l.id === selectedLantai);
        return (lantai?.kamar ?? []).map((k) => ({
            ...k,
            okupansi: k.penempatan_kamar?.length ?? 0,
        }));
    }, [lantaiForGedung, selectedLantai]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Pemetaan Kamar"
                subtitle="Visualisasi status dan detail kamar per gedung dan lantai"
            />

            <Card className="p-4">
                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Gedung:</label>
                        <select
                            className={inputClass}
                            value={selectedGedung}
                            onChange={(e) => {
                                setSelectedGedung(e.target.value);
                                const first = gedung?.find(
                                    (g) => g.id === e.target.value,
                                )?.lantai?.[0];
                                setSelectedLantai(first?.id ?? '');
                            }}
                        >
                            {(gedung ?? []).map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.nama_gedung}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Lantai:</label>
                        <select
                            className={inputClass}
                            value={selectedLantai}
                            onChange={(e) => setSelectedLantai(e.target.value)}
                        >
                            {lantaiForGedung.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.nama_lantai ??
                                        `Lantai ${l.nomor_lantai}`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            <Card className="p-5">
                <div className="mb-4 flex flex-wrap gap-4 text-sm">
                    {selectedGedung && (
                        <Link
                            className="link link-primary"
                            href={buildingShow.url(selectedGedung)}
                        >
                            Detail gedung
                        </Link>
                    )}
                    {selectedLantai && (
                        <Link
                            className="link link-primary"
                            href={floorShow.url(selectedLantai)}
                        >
                            Detail lantai
                        </Link>
                    )}
                </div>
                <RoomGridMap
                    rooms={filteredKamar}
                    onSelect={(room) => router.visit(roomShow.url(room.id))}
                />
            </Card>
        </div>
    );
}
