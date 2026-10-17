import { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { store, update, destroy } from '@/routes/andalas/room-invitations';
import { tagihan } from '@/routes/mahasiswa';
import { Button, Modal, inputClass } from './ui';
import { formatRupiah } from '../lib/format';

export type RoomInvitation = {
    id: string;
    incoming: boolean;
    status: string;
    expires_at: string;
    sender_name: string;
    invitee_name: string;
    room_number: string;
    building_name: string;
    floor_name: string;
    rate_unit: string;
    estimated_total?: number;
    starts_at?: string;
    ends_at?: string | null;
};
function InviteForm({
    registrationId,
    onClose,
}: {
    registrationId: string;
    onClose: () => void;
}) {
    const form = useForm({ registration_id: registrationId, nim: '' });
    return (
        <form
            className="space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                form.post(store.url(), {
                    preserveScroll: true,
                    onSuccess: onClose,
                });
            }}
        >
            <label className="block space-y-2 text-sm">
                <span>NIM calon teman sekamar</span>
                <input
                    className={inputClass}
                    required
                    maxLength={50}
                    value={form.data.nim}
                    onChange={(event) =>
                        form.setData('nim', event.target.value)
                    }
                    placeholder="Masukkan NIM mahasiswa non-KIP-K"
                />
            </label>
            <p className="text-muted text-sm">
                Teman harus memiliki akun aktif dan belum mempunyai hunian atau
                pendaftaran berjalan. Undangan tidak menahan tempat; kapasitas
                diperiksa saat diterima.
            </p>
            {Object.entries(form.errors).map(([key, error]) => (
                <p key={key} role="alert" className="text-error text-sm">
                    {error}
                </p>
            ))}
            <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>
                    Batal
                </Button>
                <Button type="submit" disabled={form.processing}>
                    Kirim undangan
                </Button>
            </div>
        </form>
    );
}
export function InviteRoommateButton({
    registrationId,
}: {
    registrationId: string;
}) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
                Ajak calon penghuni lain
            </Button>
            {open && (
                <Modal
                    open
                    title="Ajak teman sekamar"
                    onClose={() => setOpen(false)}
                >
                    <InviteForm
                        registrationId={registrationId}
                        onClose={() => setOpen(false)}
                    />
                </Modal>
            )}
        </>
    );
}
function InvitationCard({ invitation }: { invitation: RoomInvitation }) {
    const form = useForm({ accept: true });
    const [confirm, setConfirm] = useState(false);
    function respond(accept: boolean) {
        form.transform(() => ({ accept }));
        form.put(update.url(invitation.id), {
            preserveScroll: true,
            onSuccess: () => setConfirm(false),
        });
    }
    return (
        <article className="border-base-300 space-y-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                    {invitation.incoming
                        ? `Dari ${invitation.sender_name}`
                        : `Untuk ${invitation.invitee_name}`}
                </h3>
                <span className="badge badge-ghost">
                    {{
                        pending: 'Menunggu jawaban',
                        accepted: 'Diterima',
                        declined: 'Ditolak',
                        cancelled: 'Dibatalkan',
                        expired: 'Kedaluwarsa',
                    }[invitation.status] ?? invitation.status}
                </span>
            </div>
            <p>
                {invitation.building_name} / {invitation.floor_name} / Kamar{' '}
                {invitation.room_number}
            </p>
            {invitation.estimated_total != null && (
                <div className="bg-base-200 rounded-lg p-3">
                    <p className="text-muted text-xs">
                        Estimasi tagihan pribadi
                    </p>
                    <p className="text-primary font-semibold">
                        {formatRupiah(invitation.estimated_total)}
                    </p>
                    <p className="text-muted mt-1 text-xs">
                        {invitation.starts_at} s.d.{' '}
                        {invitation.ends_at ?? 'akhir periode'} / tarif{' '}
                        {
                            {
                                year: 'tahunan',
                                month: 'bulanan',
                                day: 'harian',
                            }[invitation.rate_unit]
                        }
                    </p>
                </div>
            )}
            <p className="text-muted text-sm">
                Berlaku sampai{' '}
                {new Date(invitation.expires_at).toLocaleString('id-ID')}
            </p>
            {invitation.status === 'pending' &&
                (invitation.incoming ? (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={() => setConfirm(true)}
                            disabled={form.processing}
                        >
                            Terima undangan
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => respond(false)}
                            disabled={form.processing}
                        >
                            Tolak
                        </Button>
                    </div>
                ) : (
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={form.processing}
                        onClick={() =>
                            form.delete(destroy.url(invitation.id), {
                                preserveScroll: true,
                            })
                        }
                    >
                        Batalkan undangan
                    </Button>
                ))}
            {invitation.status === 'accepted' && invitation.incoming && (
                <Link
                    className="link link-primary text-sm"
                    href={tagihan.url()}
                >
                    Lihat tagihan untuk mengaktifkan hunian
                </Link>
            )}
            {Object.entries(form.errors).map(([key, error]) => (
                <p key={key} role="alert" className="text-error text-sm">
                    {error}
                </p>
            ))}
            {confirm && (
                <Modal
                    open
                    title="Terima undangan sekamar?"
                    onClose={() => setConfirm(false)}
                >
                    <div className="space-y-4">
                        {invitation.estimated_total != null && (
                            <p className="font-semibold">
                                Estimasi tagihan:{' '}
                                {formatRupiah(invitation.estimated_total)}
                            </p>
                        )}
                        <p>
                            Anda akan didaftarkan ke kamar{' '}
                            {invitation.room_number} di{' '}
                            {invitation.building_name}. Tagihan pribadi dibuat
                            sesuai tarif dan masa tinggal yang berlaku. Hunian
                            otomatis disetujui setelah persyaratan pembayaran
                            terpenuhi.
                        </p>
                        {Object.entries(form.errors).map(([key, error]) => (
                            <p
                                key={key}
                                role="alert"
                                className="text-error text-sm"
                            >
                                {error}
                            </p>
                        ))}
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setConfirm(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={() => respond(true)}
                                disabled={form.processing}
                            >
                                Setuju & daftar
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </article>
    );
}
export default function RoomInvitations({
    invitations,
}: {
    invitations: RoomInvitation[];
}) {
    return (
        <section className="space-y-4">
            <h2 className="text-lg font-semibold">Undangan teman sekamar</h2>
            <p className="text-muted text-sm">
                Terima undangan untuk memilih kamar yang sama. Pendaftaran dan
                penempatan diproses otomatis setelah seluruh persyaratan
                terpenuhi.
            </p>
            {invitations.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    {invitations.map((invitation) => (
                        <InvitationCard
                            key={invitation.id}
                            invitation={invitation}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-muted">
                    Belum ada undangan masuk atau terkirim.
                </p>
            )}
        </section>
    );
}
