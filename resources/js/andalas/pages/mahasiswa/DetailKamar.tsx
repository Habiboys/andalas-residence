import { PageHeader, Card, Skeleton } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";

type Penempatan = {
  kamar?: { nomor_kamar?: string; status?: string; kapasitas?: number; tipe_kamar?: string; lantai?: { nama_lantai?: string; gedung?: { nama_gedung?: string } } };
  mahasiswa?: { user?: { nama?: string } };
};

export default function DetailKamar() {
  const { data: penempatan, loading } = useAndalasApi<Penempatan[]>("/api/andalas/penempatan");
  const mine = penempatan?.[0];

  if (loading)
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );

  return (
    <div className="p-6">
      <PageHeader title="Detail Kamar" subtitle="Informasi kamar hunian Anda" />
      {!mine ? (
        <Card className="p-6 text-muted">Anda belum ditempatkan ke kamar.</Card>
      ) : (
        <Card className="p-6 space-y-2">
          <p><strong>Gedung:</strong> {mine.kamar?.lantai?.gedung?.nama_gedung ?? "-"}</p>
          <p><strong>Lantai:</strong> {mine.kamar?.lantai?.nama_lantai ?? "-"}</p>
          <p><strong>Nomor Kamar:</strong> {mine.kamar?.nomor_kamar ?? "-"}</p>
          <p><strong>Tipe:</strong> {mine.kamar?.tipe_kamar ?? "-"}</p>
          <p><strong>Status:</strong> {mine.kamar?.status ?? "-"}</p>
          <p><strong>Kapasitas:</strong> {mine.kamar?.kapasitas ?? "-"}</p>
        </Card>
      )}
    </div>
  );
}
