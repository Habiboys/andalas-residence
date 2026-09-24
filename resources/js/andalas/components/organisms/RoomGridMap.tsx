import { Modal } from "../atoms/Modal";
import { StatusBadge } from "../atoms/Badge";
import {
    PaymentStatusBadge,
    type ResidentPayment,
} from "../atoms/PaymentStatusBadge";
import { formatDate } from "../../lib/format";

export type RoomAsset = {
    id: string;
    nama_aset: string;
    kode_inventaris: string;
    jumlah: number;
    kondisi: string;
};

export type RoomResident = {
    mahasiswa?: {
        user?: {
            nama?: string;
            nim_nip?: string;
            email?: string | null;
            no_hp?: string | null;
            gender?: string;
        };
        prodi?: { name?: string } | null;
        angkatan?: number | string | null;
        status_huni?: string;
        tanggal_masuk?: string | null;
        pembayaran?: ResidentPayment[];
    };
    status?: string;
    tanggal_mulai?: string | null;
    tanggal_selesai?: string | null;
};

export type RoomGridItem = {
    id: string;
    nomor_kamar: string;
    kapasitas: number;
    status: string;
    tipe_kamar?: string;
    okupansi?: number;
    aset?: RoomAsset[];
    penempatan_kamar?: RoomResident[];
};

/*
 * Occupancy is a real state, so it earns colour. The four states are the four
 * semantic tones rather than four hand-picked shades, which is what keeps them
 * correct in both themes. Text stays on base-content over a tinted surface, so
 * contrast does not depend on the tint.
 */
const cellTone: Record<string, string> = {
    kosong: "border-success bg-success/15",
    terisi_sebagian: "border-warning bg-warning/15",
    penuh: "border-error bg-error/15",
    maintenance: "border-base-300 bg-base-200",
};

type Props = {
    rooms: RoomGridItem[];
    onSelect?: (room: RoomGridItem) => void;
};

export function RoomGridMap({ rooms, onSelect }: Props) {
    if (rooms.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted">
                Belum ada kamar pada gedung ini. Kamar yang ditambahkan lewat
                Kelola Bangunan akan muncul di sini.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {rooms.map((kamar) => {
                const okupansi =
                    kamar.okupansi ?? kamar.penempatan_kamar?.length ?? 0;

                return (
                    <button
                        key={kamar.id}
                        type="button"
                        onClick={() => onSelect?.(kamar)}
                        className={`rounded-field border p-3 text-left transition-colors hover:brightness-95 ${
                            cellTone[kamar.status] ?? cellTone.maintenance
                        }`}
                    >
                        {/* A room number is an identifier and is read as one. */}
                        <p className="text-identifier text-sm font-semibold">
                            {kamar.nomor_kamar}
                        </p>
                        <p className="mt-1 text-xs">
                            {okupansi}/{kamar.kapasitas} penghuni
                        </p>
                        {kamar.tipe_kamar && (
                            <span className="mt-1 inline-block text-xs text-muted">
                                {kamar.tipe_kamar}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export function ResidentDetail({ resident }: { resident: RoomResident }) {
    const mahasiswa = resident.mahasiswa;

    return (
        <li className="space-y-1.5 rounded-field bg-base-200 px-3 py-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">
                    {mahasiswa?.user?.nama ?? "Nama tidak tersedia"}
                </span>
                <span className="text-identifier text-xs text-muted">
                    {mahasiswa?.user?.nim_nip ?? "NIM tidak tersedia"}
                </span>
                <StatusBadge status={mahasiswa?.status_huni ?? ""} />
            </div>
            {mahasiswa?.prodi?.name && (
                <p className="text-xs text-muted">
                    {mahasiswa.prodi.name}
                    {mahasiswa.angkatan
                        ? ` · Angkatan ${mahasiswa.angkatan}`
                        : ""}
                </p>
            )}
            <p className="text-xs text-muted">
                Masuk asrama: {formatDate(mahasiswa?.tanggal_masuk)}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted">Pembayaran:</span>
                <PaymentStatusBadge pembayaran={mahasiswa?.pembayaran} />
            </div>
        </li>
    );
}

export function RoomDetailModal({
    room,
    onClose,
}: {
    room: RoomGridItem | null;
    onClose: () => void;
}) {
    const penghuni = room?.penempatan_kamar ?? [];
    const aset = room?.aset ?? [];

    return (
        <Modal
            open={!!room}
            onClose={onClose}
            title={room ? `Detail Kamar ${room.nomor_kamar}` : "Detail Kamar"}
            width="max-w-xl"
        >
            {room && (
                <div className="space-y-5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted">Status:</span>
                        <StatusBadge status={room.status} />
                        <span className="text-muted">/</span>
                        <span>
                            {penghuni.length}/{room.kapasitas} penghuni
                        </span>
                    </div>

                    <div>
                        <h3 className="mb-2 font-medium">Aset Kamar</h3>
                        {aset.length === 0 ? (
                            <p className="text-muted">
                                Belum ada aset terdaftar di kamar ini.
                            </p>
                        ) : (
                            <ul className="space-y-1.5">
                                {aset.map((a) => (
                                    <li
                                        key={a.id}
                                        className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-field bg-base-200 px-3 py-2"
                                    >
                                        <span className="font-medium">
                                            {a.nama_aset}
                                        </span>
                                        <span className="text-identifier text-xs text-muted">
                                            {a.kode_inventaris}
                                        </span>
                                        <span className="text-identifier text-xs text-muted">
                                            ×{a.jumlah}
                                        </span>
                                        <StatusBadge status={a.kondisi} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div>
                        <h3 className="mb-2 font-medium">Penghuni</h3>
                        {penghuni.length === 0 ? (
                            <p className="text-muted">
                                Kamar ini belum berpenghuni. Penempatan
                                dilakukan dari halaman Penempatan Kamar.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {penghuni.map((p, i) => (
                                    <ResidentDetail key={i} resident={p} />
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}
