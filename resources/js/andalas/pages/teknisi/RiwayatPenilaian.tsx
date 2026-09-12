import { PageHeader, Card } from "../../components/ui";
import { useAuth } from "../../context/AppContext";
import { useAndalasApi } from "../../hooks/useAndalasApi";

type TeknisiStat = {
  teknisi_id: string;
  nama: string;
  nim_nip: string;
  rata_skor: number | null;
  total_tiket: number;
  total_penilaian: number;
};

export default function RiwayatPenilaian() {
  const { currentUser } = useAuth();
  const { data } = useAndalasApi<TeknisiStat[]>("/api/andalas/teknisi/performance");
  const mine = data?.find(
    (t) => t.nim_nip === currentUser?.nim || t.nama === currentUser?.nama,
  );

  return (
    <div className="p-6">
      <PageHeader title="Riwayat & Penilaian" subtitle="Skor kinerja dari kuesioner teknis" />
      <Card className="p-6">
        {mine ? (
          <dl className="grid grid-cols-1 gap-6 text-center sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Rata Skor</dt>
              {/* A missing score says so instead of showing a dash, which reads
                  like a value that was measured. */}
              <dd className="text-3xl text-accent">
                {mine.rata_skor?.toFixed(1) ?? "Belum dinilai"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Tiket Selesai</dt>
              <dd className="text-3xl">{mine.total_tiket}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Penilaian</dt>
              <dd className="text-3xl">{mine.total_penilaian}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-muted">
            Belum ada penilaian untuk akun ini. Skor muncul setelah kuesioner teknisi pertama
            dikirim.
          </p>
        )}
      </Card>
    </div>
  );
}
