import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { update } from '@/routes/andalas/kamar';
import { Button, Drawer, IconButton } from './ui';
import { PhotoEditor, photoFields, photoPaths } from './PhotoGallery';

export default function RoomPhotoEditor({
    room,
    initialOpen = false,
}: {
    room: { id: string; foto?: string | null; photos?: string[] | null };
    initialOpen?: boolean;
}) {
    const [open, setOpen] = useState(initialOpen);
    const form = useForm(photoFields(photoPaths(room)));
    return (
        <>
            <IconButton
                label="Edit foto kamar"
                icon={Pencil}
                tone="text-warning hover:bg-warning/10"
                onClick={() => {
                    form.resetAndClearErrors();
                    form.setData(photoFields(photoPaths(room)));
                    setOpen(true);
                }}
            />
            {open && (
                <Drawer
                    open={open}
                    onClose={() => setOpen(false)}
                    title="Galeri foto kamar"
                    width="w-full max-w-xl"
                    footer={
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                form="room-gallery"
                                disabled={form.processing}
                            >
                                Simpan foto
                            </Button>
                        </div>
                    }
                >
                    <form
                        id="room-gallery"
                        className="space-y-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.transform((data) => ({
                                ...data,
                                _method: 'put',
                            }));
                            form.post(update.url(room.id), {
                                forceFormData: true,
                                preserveScroll: true,
                                onSuccess: () => setOpen(false),
                            });
                        }}
                    >
                        <PhotoEditor
                            value={form.data}
                            onChange={(next) => form.setData(next)}
                        />
                        {Object.entries(form.errors).map(([key, message]) => (
                            <p
                                key={key}
                                role="alert"
                                className="text-error text-sm"
                            >
                                {message}
                            </p>
                        ))}
                        {form.progress && (
                            <progress
                                className="progress progress-primary"
                                value={form.progress.percentage}
                                max={100}
                            />
                        )}
                    </form>
                </Drawer>
            )}
        </>
    );
}
