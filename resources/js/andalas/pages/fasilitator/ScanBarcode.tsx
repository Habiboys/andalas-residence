import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, FormField, inputClass, Button, Table } from "../../components/ui";
import { BarcodeScanner } from "../../components/organisms/BarcodeScanner";
import { andalasApi } from "../../lib/api";
import { useAndalasApi } from "../../hooks/useAndalasApi";

type WaktuSholat = "subuh" | "dzuhur" | "ashar" | "maghrib" | "isya";

type AbsensiRow = {
  id: string;
  waktu_sholat: string;
  waktu_scan?: string;
  mahasiswa?: { user?: { nim_nip?: string; nama?: string } };
};

export default function ScanBarcode() {
  const { data: absensi, reload } = useAndalasApi<AbsensiRow[]>("/api/andalas/absensi");
  const [waktu, setWaktu] = useState<WaktuSholat>("subuh");

  async function handleScan(code: string) {
    try {
      const res = await andalasApi.post<{ mahasiswa?: { user?: { nama?: string; nim_nip?: string } }; already_scanned?: boolean }>(
        "/api/andalas/absensi/scan",
        { barcode_code: code, waktu_sholat: waktu },
      );
      const nama = res.mahasiswa?.user?.nama ?? code;
      const nim = res.mahasiswa?.user?.nim_nip ?? "";
      if (res.already_scanned) {
        toast.info(`${nama} sudah tercatat hari ini`);
      } else {
        toast.success(`Absensi tercatat: ${nama} (${nim})`);
      }
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan gagal");
    }
  }

  const columns = [
    { key: "nim", label: "NIM", render: (row: AbsensiRow) => row.mahasiswa?.user?.nim_nip ?? "-" },
    { key: "nama", label: "Nama", render: (row: AbsensiRow) => row.mahasiswa?.user?.nama ?? "-" },
    { key: "waktu_sholat", label: "Waktu Sholat", render: (row: AbsensiRow) => <span className="capitalize">{row.waktu_sholat}</span> },
    { key: "waktu_scan", label: "Jam Scan", render: (row: AbsensiRow) => row.waktu_scan ? String(row.waktu_scan).slice(11, 16) : "-" },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Scan Barcode Absensi" subtitle="Rekam kehadiran sholat mahasiswa via barcode" />

      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Waktu Sholat">
            <select value={waktu} onChange={(e) => setWaktu(e.target.value as WaktuSholat)} className={inputClass + " w-full"}>
              {(["subuh", "dzuhur", "ashar", "maghrib", "isya"] as const).map((w) => (
                <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Barcode / NIM">
            <BarcodeScanner onScan={handleScan} />
          </FormField>
        </div>
      </Card>

      <Card>
        <div className="border-b border-base-300 px-6 py-4">
          <h2 className="font-semibold">Scan Hari Ini ({absensi?.length ?? 0})</h2>
        </div>
        <Table columns={columns} data={absensi ?? []} emptyMessage="Belum ada scan hari ini" />
      </Card>
    </div>
  );
}
