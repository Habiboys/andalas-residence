import { Settings2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { availability } from '@/routes/andalas/lantai';
import { Button, IconButton, Modal, FormField, inputClass } from './ui';

type Floor = {
    id: string;
    nomor_lantai: number;
    nama_lantai: string;
    booking_open?: boolean;
    booking_priority?: number;
};
function AvailabilityForm({
    floor,
    onClose,
}: {
    floor: Floor;
    onClose: () => void;
}) {
    const form = useForm({
        booking_open: floor.booking_open ?? true,
        booking_priority: String(floor.booking_priority ?? 1),
    });
    return (
        <form
            className="space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                form.transform((data) => ({
                    ...data,
                    booking_priority: Number(data.booking_priority),
                }));
                form.put(availability.url(floor.id), {
                    preserveScroll: true,
                    onSuccess: onClose,
                });
            }}
        >
            <label className="flex items-center gap-3">
                <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={form.data.booking_open}
                    onChange={(event) =>
                        form.setData('booking_open', event.target.checked)
                    }
                />
                Buka pemilihan kamar di lantai ini
            </label>
            <FormField
                label="Prioritas pengisian"
                hint="Angka lebih kecil diisi lebih dahulu. Jika sama, nomor lantai lebih kecil didahulukan."
            >
                <input
                    aria-label="Prioritas pengisian"
                    className={inputClass}
                    type="number"
                    required
                    min={1}
                    max={1000}
                    value={form.data.booking_priority}
                    onChange={(event) =>
                        form.setData('booking_priority', event.target.value)
                    }
                />
            </FormField>
            <p className="text-muted text-sm">
                Menutup lantai menghentikan pilihan kamar baru. Reservasi dan
                penghuni yang sudah ada tetap berlaku.
            </p>
            {Object.entries(form.errors).map(([key, error]) => (
                <p key={key} role="alert" className="text-error text-sm">
                    {error}
                </p>
            ))}
            <div className="flex justify-end gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    disabled={form.processing}
                >
                    Batal
                </Button>
                <Button type="submit" disabled={form.processing}>
                    Simpan pengaturan lantai
                </Button>
            </div>
        </form>
    );
}
export function FloorAvailabilityButton({ floor }: { floor: Floor }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <IconButton
                label="Atur lantai"
                icon={Settings2}
                onClick={() => setOpen(true)}
            />
            {open && (
                <Modal
                    open
                    title={`Pengaturan ${floor.nama_lantai}`}
                    onClose={() => setOpen(false)}
                >
                    <AvailabilityForm
                        floor={floor}
                        onClose={() => setOpen(false)}
                    />
                </Modal>
            )}
        </>
    );
}
export default function FloorAvailability({ floors }: { floors: Floor[] }) {
    const ordered = [...floors].sort(
        (a, b) =>
            (a.booking_priority ?? 1) - (b.booking_priority ?? 1) ||
            a.nomor_lantai - b.nomor_lantai,
    );
    return (
        <section
            className="space-y-3"
            aria-label="Pembukaan dan prioritas lantai"
        >
            <h3 className="font-semibold">Lantai</h3>
            <div className="overflow-x-auto">
                <table className="table-sm table">
                    <thead>
                        <tr>
                            <th>Lantai</th>
                            <th>Prioritas pengisian</th>
                            <th>Pemilihan kamar</th>
                            <th className="text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ordered.map((floor) => (
                            <tr key={floor.id}>
                                <td className="font-medium">
                                    {floor.nama_lantai}
                                </td>
                                <td>Prioritas {floor.booking_priority ?? 1}</td>
                                <td>
                                    {(floor.booking_open ?? true)
                                        ? 'Dibuka, mengikuti urutan pengisian'
                                        : 'Ditutup untuk pilihan baru'}
                                </td>
                                <td className="text-right">
                                    <FloorAvailabilityButton floor={floor} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
