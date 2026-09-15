import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useForm } from "@inertiajs/react";
import { PageHeader, Card, FormField, inputClass, Table } from "../../components/ui";
import { BarcodeScanner } from "../../components/organisms/BarcodeScanner";
import { scan as absensiScan } from "@/routes/andalas/absensi";

type WaktuSholat = "subuh" | "dzuhur" | "ashar" | "maghrib" | "isya";

type AbsensiRow = {
  id: string;
  waktu_sholat: string;
  waktu_scan?: string;
  mahasiswa?: { user?: { nim_nip?: string; nama?: string } };
};

type ScanResult = {
  mahasiswa?: { user?: { nama?: string; nim_nip?: string } };
  already_scanned?: boolean;
  error?: string;
};

type Props = {
  absensi: AbsensiRow[];
  scan_result: ScanResult | null;
};

export default function ScanBarcode({ absensi = [], scan_result = null }: Props) {
  const [waktu, setWaktu] = useState<WaktuSholat>("subuh");
  const { setData, post, reset } = useForm({ barcode_code: "", waktu_sholat: "subuh" });

  useEffect(() => {
    if (!scan_result) return;
    if (scan_result.error) {
      toast.error(scan_result.error);
      return;
    }
    const nama = scan_result.mahasiswa?.user?.nama ?? "";
    const nim = scan_result.mahasiswa?.user?.nim_nip ?? "";
    if (scan_result.already_scanned) {
      toast.info(`${nama} sudah tercatat hari ini`);
    } else {
      toast.success(`Absensi tercatat: ${nama}${nim ? ` (${nim})` : ""}`);
    }
  }, [scan_result]);

  function handleScan(code: string) {
    setData("barcode_code", code);
    setData("waktu_sholat", waktu);
    post(absensiScan.url(), {
      onSuccess: () => reset(),
    });
  }

  const columns = [
    { key: "nim", label: "NIM", render: (row: AbsensiRow) => row.mahasiswa?.user?.nim_nip ?? "-" },
    { key: "nama", label: "Nama", render: (row: AbsensiRow) => row.mahasiswa?.user?.nama ?? "-" },
    { key: "waktu_sholat", label: "Waktu Sholat", render: (row: AbsensiRow) => <span className="capitalize">{row.waktu_sholat}</span> },
    { key: "waktu_scan", label: "Jam Scan", render: (row: AbsensiRow) => row.waktu_scan ? String(row.waktu_scan).slice(11, 16) : "-" },
  ];

  return (
    <div className="space-y-4">
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
          <h2 className="font-semibold">Scan Hari Ini ({absensi.length})</h2>
        </div>
        <Table columns={columns} data={absensi} emptyMessage="Belum ada scan hari ini" />
      </Card>
    </div>
  );
}