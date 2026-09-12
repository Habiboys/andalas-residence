import { useState } from "react";
import { PageHeader, Card, Table, FormField, inputClass } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";

type AbsensiRow = { mahasiswa?: { user?: { nim_nip?: string; nama?: string } }; waktu_sholat?: string; waktu_scan?: string; tanggal?: string };

export default function RekapKehadiran() {
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const { data } = useAndalasApi<AbsensiRow[]>(`/api/andalas/absensi?tanggal=${tanggal}`);

  return (
    <div className="p-6">
      <PageHeader title="Rekap Kehadiran" subtitle="Rekap absensi sholat per tanggal" />
      <Card className="p-4 mb-4">
        <FormField label="Tanggal">
          <input type="date" className={inputClass} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </FormField>
      </Card>
      <Card>
        <Table columns={[
          { key: "nim", label: "NIM", render: (r: AbsensiRow) => r.mahasiswa?.user?.nim_nip ?? "-" },
          { key: "nama", label: "Nama", render: (r: AbsensiRow) => r.mahasiswa?.user?.nama ?? "-" },
          { key: "waktu_sholat", label: "Sholat", render: (r: AbsensiRow) => <span className="capitalize">{r.waktu_sholat}</span> },
          { key: "waktu_scan", label: "Jam", render: (r: AbsensiRow) => String(r.waktu_scan ?? "").slice(11, 16) },
        ]} data={data ?? []} emptyMessage="Tidak ada data absensi" />
      </Card>
    </div>
  );
}
