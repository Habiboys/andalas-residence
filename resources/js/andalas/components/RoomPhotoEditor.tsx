import { useEffect, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { update } from '@/routes/andalas/kamar';
import { Button } from './ui';

export default function RoomPhotoEditor({
    room,
}: {
    room: { id: string; foto?: string | null };
}) {
    const form = useForm({ foto: null as File | null, remove_foto: false });
    const [preview, setPreview] = useState<string | null>(null);
    useEffect(() => {
        if (!form.data.foto) {
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(form.data.foto);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [form.data.foto]);

    return (
        <form
            className="space-y-3"
            onSubmit={(event) => {
                event.preventDefault();
                form.transform((data) => ({
                    _method: 'put',
                    remove_foto: data.remove_foto,
                    ...(data.foto ? { foto: data.foto } : {}),
                }));
                form.post(update.url(room.id), {
                    preserveScroll: true,
                    onSuccess: () => form.reset(),
                });
            }}
        >
            <label className="block space-y-1 text-sm">
                <span>Upload foto kamar</span>
                <input
                    className="file-input file-input-sm w-full"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                        form.setData('foto', event.target.files?.[0] ?? null);
                        form.setData('remove_foto', false);
                    }}
                />
            </label>
            <p className="text-muted text-xs">
                JPG, PNG, WebP · maksimal 2 MB.
            </p>
            {preview && (
                <img
                    src={preview}
                    alt="Pratinjau foto kamar"
                    className="h-36 w-full rounded-lg object-cover"
                />
            )}
            {room.foto && (
                <label className="flex items-center gap-2 text-sm">
                    <input
                        className="checkbox checkbox-sm"
                        type="checkbox"
                        checked={form.data.remove_foto}
                        onChange={(event) => {
                            form.setData('remove_foto', event.target.checked);
                            if (event.target.checked)
                                form.setData('foto', null);
                        }}
                    />
                    Hapus foto saat ini
                </label>
            )}
            {Object.entries(form.errors).map(([key, error]) => (
                <p className="text-error text-sm" role="alert" key={key}>
                    {error}
                </p>
            ))}
            {form.progress && (
                <progress
                    className="progress progress-primary"
                    value={form.progress.percentage}
                    max={100}
                />
            )}
            <Button
                size="sm"
                disabled={
                    form.processing ||
                    (!form.data.foto && !form.data.remove_foto)
                }
            >
                Simpan foto
            </Button>
            {form.recentlySuccessful && (
                <p role="status" className="text-success text-sm">
                    Foto kamar diperbarui.
                </p>
            )}
        </form>
    );
}
