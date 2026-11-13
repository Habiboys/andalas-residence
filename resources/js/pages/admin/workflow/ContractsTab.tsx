import * as workflow from '@/actions/App/Http/Controllers/ResidenceWorkflowController';
import { ActionForm, WorkflowPanel } from './shared';
import type { Registration } from './types';

export default function ContractsTab({
    pendingContracts,
    compact = false,
}: {
    pendingContracts: Registration[];
    compact?: boolean;
}) {
    if (pendingContracts.length === 0) {
        if (compact) {
            return null;
        }
        return (
            <WorkflowPanel title="Pengesahan kontrak kamar bersama">
                <p className="text-base-content/70 text-sm">
                    Belum ada kontrak kamar bersama yang menunggu pengesahan
                    saat ini.
                </p>
            </WorkflowPanel>
        );
    }

    const groupedByRoom = Object.values(
        pendingContracts.reduce<
            Record<string, { roomLabel: string; members: Registration[] }>
        >((acc, r) => {
            const roomId = r.reserved_room?.id ?? 'unassigned';
            const roomLabel = r.reserved_room
                ? `${r.reserved_room.lantai?.gedung?.nama_gedung ?? '-'} · Kamar ${r.reserved_room.nomor_kamar}`
                : 'Belum mendapat kamar';
            acc[roomId] ??= { roomLabel, members: [] };
            acc[roomId].members.push(r);
            return acc;
        }, {}),
    );

    return (
        <WorkflowPanel
            title={
                compact
                    ? 'Kamar bersama menunggu penerbitan tagihan'
                    : 'Pengesahan kontrak kamar bersama'
            }
            subtitle="Undangan teman sekamar dikelola langsung antar penghuni. Setiap kamar disahkan per kelompok kamar agar tarif kamar tahunan terbagi tepat kepada seluruh anggotanya."
        >
            <div className="space-y-4">
                {groupedByRoom.map((group) => (
                    <div
                        key={group.roomLabel}
                        className="border-base-300 bg-base-200/30 space-y-3 rounded-xl border p-4"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold">
                                {group.roomLabel} ({group.members.length}{' '}
                                anggota)
                            </h3>
                        </div>
                        <ActionForm
                            url={workflow.contract.url()}
                            label={`Sahkan & terbitkan tagihan (${group.members.length} anggota)`}
                            confirmTitle="Sahkan Kontrak Kamar Bersama?"
                            confirmMessage={`Total tarif kamar untuk ${group.roomLabel} akan dibagi kepada ${group.members.length} anggota terpilih dan tagihan masing-masing akan diterbitkan.`}
                        >
                            <div className="grid gap-2 sm:grid-cols-2">
                                {group.members.map((r) => (
                                    <label
                                        key={r.id}
                                        className="bg-base-100 border-base-300 flex items-center gap-2 rounded-lg border p-3 text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-sm"
                                            name="registration_ids[]"
                                            value={r.id}
                                            defaultChecked
                                        />
                                        <span>
                                            <strong>
                                                {r.student_profile.user.nama}
                                            </strong>{' '}
                                            ({r.student_profile.user.nim_nip})
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </ActionForm>
                    </div>
                ))}
            </div>
        </WorkflowPanel>
    );
}
