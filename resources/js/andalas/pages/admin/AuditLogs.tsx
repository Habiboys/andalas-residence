import { PageHeader, Card, Table, TableSkeleton } from "../../components/ui";
import { useAndalasApi } from "../../hooks/useAndalasApi";
import { useAuth } from "../../context/AppContext";

type AuditRow = {
  id: string;
  event?: string;
  auditable_type?: string;
  created_at?: string;
  user?: { nama?: string; nim_nip?: string };
};

export default function AuditLogs() {
  const { currentUser } = useAuth();
  const isSuperadmin = currentUser?.role === "superadmin" || currentUser?.raw_role === "superadmin";
  const { data, loading } = useAndalasApi<AuditRow[]>(isSuperadmin ? "/api/andalas/admin/audit-logs" : null);

  if (!isSuperadmin) {
    return (
      <div className="p-6">
        <PageHeader title="Audit Log" subtitle="Hanya superadmin yang dapat mengakses halaman ini" />
        <Card className="p-6 text-sm text-muted">Anda tidak memiliki akses ke modul ini.</Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader title="Audit Log" subtitle="Riwayat aktivitas sistem (superadmin)" />
      <Card>
        {loading ? <TableSkeleton /> : (
          <Table
            columns={[
              { key: "created_at", label: "Waktu", render: (r: AuditRow) => String(r.created_at ?? "").slice(0, 19).replace("T", " ") },
              { key: "user", label: "Pengguna", render: (r: AuditRow) => r.user?.nama ?? "-" },
              { key: "event", label: "Aksi" },
              { key: "auditable_type", label: "Entitas", render: (r: AuditRow) => (r.auditable_type ?? "").split("\\").pop() ?? "-" },
            ]}
            data={data ?? []}
            emptyMessage="Belum ada log"
          />
        )}
      </Card>
    </div>
  );
}
