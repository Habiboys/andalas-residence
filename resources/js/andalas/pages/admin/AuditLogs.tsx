import { PageHeader, Card, Table } from '../../components/ui';
import { useAuth } from '../../context/AppContext';

type AuditRow = {
    id: string;
    event?: string;
    auditable_type?: string;
    created_at?: string;
    user?: { nama?: string; nim_nip?: string };
};

type Props = { audit_logs: AuditRow[] | null };

export default function AuditLogs({ audit_logs }: Props) {
    const { currentUser } = useAuth();
    const isSuperadmin =
        currentUser?.role === 'superadmin' ||
        currentUser?.raw_role === 'superadmin';

    if (!isSuperadmin) {
        return (
            <div className="space-y-4">
                <PageHeader
                    title="Audit Log"
                    subtitle="Hanya superadmin yang dapat mengakses halaman ini"
                />
                <Card className="text-muted p-6 text-sm">
                    Anda tidak memiliki akses ke modul ini.
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title="Audit Log"
                subtitle="Riwayat aktivitas sistem (superadmin)"
            />
            <Card>
                <Table
                    columns={[
                        {
                            key: 'created_at',
                            label: 'Waktu',
                            render: (r: AuditRow) =>
                                String(r.created_at ?? '')
                                    .slice(0, 19)
                                    .replace('T', ' '),
                        },
                        {
                            key: 'user',
                            label: 'Pengguna',
                            render: (r: AuditRow) => r.user?.nama ?? '-',
                        },
                        { key: 'event', label: 'Aksi' },
                        {
                            key: 'auditable_type',
                            label: 'Entitas',
                            render: (r: AuditRow) =>
                                (r.auditable_type ?? '').split('\\').pop() ??
                                '-',
                        },
                    ]}
                    data={audit_logs ?? []}
                    emptyMessage="Belum ada log"
                />
            </Card>
        </div>
    );
}
