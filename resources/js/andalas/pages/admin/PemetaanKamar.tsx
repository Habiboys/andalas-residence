import { useEffect, useMemo, useState } from "react";
import { PageHeader, Card, Modal, inputClass, Skeleton } from "../../components/ui";
import { RoomGridMap, RoomDetailModal, type RoomGridItem } from "../../components/organisms/RoomGridMap";
import { andalasApi } from "../../lib/api";
import { useAndalasApi } from "../../hooks/useAndalasApi";

type Gedung = {
  id: string;
  kode_gedung: string;
  nama_gedung: string;
  lantai?: Array<{
    id: string;
    nomor_lantai: number;
    nama_lantai: string;
    kamar?: Array<RoomGridItem & { penempatan_kamar?: RoomGridItem["penempatan_kamar"] }>;
  }>;
};

export default function PemetaanKamar() {
  const { data: gedungList, loading } = useAndalasApi<Gedung[]>("/api/andalas/gedung");
  const [selectedGedung, setSelectedGedung] = useState("");
  const [selectedLantai, setSelectedLantai] = useState("");
  const [selectedKamar, setSelectedKamar] = useState<RoomGridItem | null>(null);

  useEffect(() => {
    if (gedungList?.length && !selectedGedung) {
      setSelectedGedung(gedungList[0].id);
      setSelectedLantai(gedungList[0].lantai?.[0]?.id ?? "");
    }
  }, [gedungList, selectedGedung]);

  const lantaiForGedung = useMemo(
    () => gedungList?.find((g) => g.id === selectedGedung)?.lantai ?? [],
    [gedungList, selectedGedung],
  );

  const filteredKamar = useMemo(() => {
    const lantai = lantaiForGedung.find((l) => l.id === selectedLantai);
    return (lantai?.kamar ?? []).map((k) => ({
      ...k,
      okupansi: k.penempatan_kamar?.length ?? 0,
    }));
  }, [lantaiForGedung, selectedLantai]);

  if (loading) {
    return <div className="p-6 space-y-3"><Skeleton className="h-8 w-56" /><Skeleton className="h-72 w-full" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Pemetaan Kamar" subtitle="Visualisasi status dan detail kamar per gedung dan lantai" />

      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Gedung:</label>
            <select className={inputClass} value={selectedGedung} onChange={(e) => {
              setSelectedGedung(e.target.value);
              const first = gedungList?.find((g) => g.id === e.target.value)?.lantai?.[0];
              setSelectedLantai(first?.id ?? "");
            }}>
              {(gedungList ?? []).map((g) => (
                <option key={g.id} value={g.id}>{g.nama_gedung}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Lantai:</label>
            <select className={inputClass} value={selectedLantai} onChange={(e) => setSelectedLantai(e.target.value)}>
              {lantaiForGedung.map((l) => (
                <option key={l.id} value={l.id}>{l.nama_lantai ?? `Lantai ${l.nomor_lantai}`}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <RoomGridMap rooms={filteredKamar} onSelect={setSelectedKamar} />
      </Card>

      <RoomDetailModal room={selectedKamar} onClose={() => setSelectedKamar(null)} />
    </div>
  );
}
