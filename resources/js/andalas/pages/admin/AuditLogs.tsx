import { useMemo, useState } from 'react';
import {
    PageHeader,
    Card,
    DataTable,
    Modal,
    Button,
    StatusBadge,
} from '../../components/ui';
import { useAuth } from '../../context/AppContext';

type AuditRow = {
    id: string;
    event?: string;
    auditable_type?: string;
    auditable_id?: string;
    old_values?: Record<string, unknown> | null;
    new_values?: Record<string, unknown> | null;
    ip_address?: string;
    user_agent?: string;
    created_at?: string;
    user?: { nama?: string; nim_nip?: string };
};

type Props = { audit_logs: AuditRow[] | null };

const EVENT_LABELS: Record<string, string> = {
    created: 'Dibuat',
    updated: 'Diubah',
    deleted: 'Dihapus',
    restored: 'Dipulihkan',
};

function formatAuditableType(value?: string): string {
    if (!value) return '-';
    return (value.split('\\').pop() ?? value)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();
}

export default function AuditLogs({ audit_logs }: Props) {
    const { currentUser } = useAuth();
    const isSuperadmin =
        currentUser?.role === 'superadmin' ||
        currentUser?.raw_role === 'superadmin';
    const [selected, setSelected] = useState<AuditRow | null>(null);

    const rows = useMemo(
        () =>
            (audit_logs ?? []).map((item) => ({
                ...item,
                user_name: item.user?.nama ?? '-',
                event_label:
                    EVENT_LABELS[item.event ?? ''] ?? item.event ?? '-',
                entity_label: formatAuditableType(item.auditable_type),
            })),
        [audit_logs],
    );

    const eventOptions = useMemo(
        () =>
            [
                ...new Set(
                    rows
                        .map((item) => item.event)
                        .filter((event): event is string => Boolean(event)),
                ),
            ].map((event) => ({
                value: event,
                label: EVENT_LABELS[event] ?? event,
            })),
        [rows],
    );

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
                subtitle="Riwayat aktivitas sistem (maksimal 500 catatan terbaru)"
            />
            <DataTable
                columns={[
                    {
                        key: 'created_at',
                        label: 'Waktu',
                        render: (r) =>
                            String(r.created_at ?? '')
                                .slice(0, 19)
                                .replace('T', ' ') || '-',
                    },
                    {
                        key: 'user_name',
                        label: 'Pengguna',
                        render: (r) => (
                            <div>
                                <p className="font-medium">
                                    {r.user?.nama ?? 'Sistem'}
                                </p>
                                {r.user?.nim_nip && (
                                    <p className="text-muted text-xs">
                                        {r.user.nim_nip}
                                    </p>
                                )}
                            </div>
                        ),
                    },
                    {
                        key: 'event',
                        label: 'Aksi',
                        filter:
                            eventOptions.length > 0
                                ? { type: 'select', options: eventOptions }
                                : undefined,
                        render: (r) => (
                            <StatusBadge
                                status={
                                    r.event === 'deleted'
                                        ? 'ditolak'
                                        : r.event === 'created'
                                          ? 'aktif'
                                          : 'berlangsung'
                                }
                                label={
                                    EVENT_LABELS[r.event ?? ''] ??
                                    r.event ??
                                    '-'
                                }
                            />
                        ),
                    },
                    {
                        key: 'entity_label',
                        label: 'Entitas',
                    },
                    {
                        key: 'ip_address',
                        label: 'Alamat IP',
                        render: (r) => r.ip_address || '-',
                    },
                    {
                        key: 'aksi',
                        label: 'Detail',
                        action: true,
                        render: (r) => (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setSelected(r)}
                            >
                                Lihat
                            </Button>
                        ),
                    },
                ]}
                data={rows}
                searchKeys={[
                    'user_name',
                    'event_label',
                    'entity_label',
                    'ip_address',
                ]}
                searchPlaceholder="Cari pengguna, aksi, entitas, atau IP..."
                emptyMessage="Belum ada log"
            />
            {selected && (
                <Modal
                    open={!!selected}
                    onClose={() => setSelected(null)}
                    title={`Detail Log · ${formatAuditableType(selected.auditable_type)}`}
                    width="max-w-2xl"
                >
                    <div className="space-y-4 text-sm">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <p className="text-muted text-xs">Waktu</p>
                                <p className="font-medium">
                                    {String(selected.created_at ?? '')
                                        .slice(0, 19)
                                        .replace('T', ' ') || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted text-xs">Pengguna</p>
                                <p className="font-medium">
                                    {selected.user?.nama ?? 'Sistem'}
                                    {selected.user?.nim_nip
                                        ? ` (${selected.user.nim_nip})`
                                        : ''}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted text-xs">Alamat IP</p>
                                <p className="font-mono text-xs">
                                    {selected.ip_address || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted text-xs">
                                    ID Entitas
                                </p>
                                <p className="font-mono text-xs">
                                    {selected.auditable_id || '-'}
                                </p>
                            </div>
                        </div>
                        {selected.user_agent && (
                            <div>
                                <p className="text-muted text-xs">Perangkat</p>
                                <p className="text-xs break-all">
                                    {selected.user_agent}
                                </p>
                            </div>
                        )}
                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <p className="text-muted mb-1 text-xs font-semibold">
                                    Nilai Sebelumnya
                                </p>
                                <pre className="bg-base-200 rounded-box max-h-60 overflow-auto p-3 text-xs">
                                    {selected.old_values &&
                                    Object.keys(selected.old_values).length > 0
                                        ? JSON.stringify(
                                              selected.old_values,
                                              null,
                                              2,
                                          )
                                        : 'Tidak ada perubahan sebelumnya'}
                                </pre>
                            </div>
                            <div>
                                <p className="text-muted mb-1 text-xs font-semibold">
                                    Nilai Baru
                                </p>
                                <pre className="bg-base-200 rounded-box max-h-60 overflow-auto p-3 text-xs">
                                    {selected.new_values &&
                                    Object.keys(selected.new_values).length > 0
                                        ? JSON.stringify(
                                              selected.new_values,
                                              null,
                                              2,
                                          )
                                        : 'Tidak ada data baru'}
                                </pre>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
