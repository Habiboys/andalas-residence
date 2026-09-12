import { Modal } from '../atoms/Modal';
import { StatusBadge } from '../atoms/Badge';

export type RoomGridItem = {
    id: string;
    nomor_kamar: string;
    kapasitas: number;
    status: string;
    tipe_kamar?: string;
    okupansi?: number;
    penempatan_kamar?: Array<{
        mahasiswa?: { user?: { nama?: string; nim_nip?: string } };
    }>;
};

/*
 * Occupancy is a real state, so it earns colour. The four states are the four
 * semantic tones rather than four hand-picked shades, which is what keeps them
 * correct in both themes. Text stays on base-content over a tinted surface, so
 * contrast does not depend on the tint.
 */
const cellTone: Record<string, string> = {
    kosong: 'border-success bg-success/15',
    terisi_sebagian: 'border-warning bg-warning/15',
    penuh: 'border-error bg-error/15',
    maintenance: 'border-base-300 bg-base-200',
};

type Props = {
    rooms: RoomGridItem[];
    onSelect?: (room: RoomGridItem) => void;
};

export function RoomGridMap({ rooms, onSelect }: Props) {
    if (rooms.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted">
                Belum ada kamar pada gedung ini. Kamar yang ditambahkan lewat Kelola Bangunan akan
                muncul di sini.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {rooms.map((kamar) => {
                const okupansi = kamar.okupansi ?? kamar.penempatan_kamar?.length ?? 0;

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
                        <p className="text-identifier text-sm font-semibold">{kamar.nomor_kamar}</p>
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

export function RoomDetailModal({
    room,
    onClose,
}: {
    room: RoomGridItem | null;
    onClose: () => void;
}) {
    const penghuni = room?.penempatan_kamar ?? [];

    return (
        <Modal
            open={!!room}
            onClose={onClose}
            title={room ? `Detail Kamar ${room.nomor_kamar}` : 'Detail Kamar'}
        >
            {room && (
                <div className="space-y-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-muted">Status:</span>
                        <StatusBadge status={room.status} />
                    </div>

                    <div>
                        <h3 className="mb-2 font-medium">Penghuni</h3>
                        {penghuni.length === 0 ? (
                            <p className="text-muted">
                                Kamar ini belum berpenghuni. Penempatan dilakukan dari halaman
                                Penempatan Kamar.
                            </p>
                        ) : (
                            <ul className="space-y-1">
                                {penghuni.map((p, i) => (
                                    <li
                                        key={i}
                                        className="flex flex-wrap items-baseline gap-1 rounded-field bg-base-200 px-3 py-2"
                                    >
                                        <span>{p.mahasiswa?.user?.nama ?? 'Nama tidak tersedia'}</span>
                                        <span className="text-identifier text-xs text-muted">
                                            {p.mahasiswa?.user?.nim_nip ?? 'NIM tidak tersedia'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}
