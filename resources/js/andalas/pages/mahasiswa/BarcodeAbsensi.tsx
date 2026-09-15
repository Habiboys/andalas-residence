import { PageHeader, Card, Table } from "../../components/ui";
import { useAuth } from "../../context/AppContext";

type AbsensiRow = { tanggal?: string; waktu_sholat?: string; waktu_scan?: string };

export default function BarcodeAbsensi({ absensi = [] }: { absensi?: AbsensiRow[] }) {
  const { currentUser } = useAuth();

  return (
    <div className="space-y-4">
      <PageHeader title="Absensi Sholat" subtitle="Barcode pribadi dan riwayat kehadiran" />
      <Card className="p-6 mb-6 text-center">
        <p className="text-xs text-muted uppercase mb-2">Barcode Anda</p>
        <p className="font-mono text-2xl font-bold text-primary">{currentUser?.barcode_code ?? "-"}</p>
        <p className="text-sm text-muted mt-2">Tunjukkan ke fasilitator saat absensi sholat</p>
      </Card>
      <Card>
        <div className="border-b border-base-300 px-5 py-4"><h2 className="font-semibold">Riwayat Absensi</h2></div>
        <Table
          columns={[
            { key: "tanggal", label: "Tanggal", render: (r: AbsensiRow) => String(r.tanggal ?? "").slice(0, 10) },
            { key: "waktu_sholat", label: "Sholat", render: (r: AbsensiRow) => <span className="capitalize">{r.waktu_sholat}</span> },
            { key: "waktu_scan", label: "Jam", render: (r: AbsensiRow) => String(r.waktu_scan ?? "").slice(11, 16) },
          ]}
          data={absensi}
          emptyMessage="Belum ada riwayat absensi"
        />
      </Card>
    </div>
  );
}