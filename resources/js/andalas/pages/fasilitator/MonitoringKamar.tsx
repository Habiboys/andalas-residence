import { PageHeader, Card, Skeleton } from "../../components/ui";
import { RoomGridMap } from "../../components/organisms/RoomGridMap";
import { useAndalasApi } from "../../hooks/useAndalasApi";

type Gedung = { lantai?: Array<{ kamar?: Array<{ id: string; nomor_kamar: string; kapasitas: number; status: string; penempatan_kamar?: unknown[] }> }> };

export default function MonitoringKamar() {
  const { data, loading } = useAndalasApi<Gedung[]>("/api/andalas/gedung");
  const rooms = (data ?? []).flatMap((g) => (g.lantai ?? []).flatMap((l) => (l.kamar ?? []).map((k) => ({ ...k, okupansi: k.penempatan_kamar?.length ?? 0 }))));

  return (
    <div className="p-6">
      <PageHeader title="Monitoring Kamar" subtitle="Status kamar wilayah fasilitator" />
      <Card className="p-5">{loading ? <Skeleton className="h-64 w-full" /> : <RoomGridMap rooms={rooms as never} />}</Card>
    </div>
  );
}
