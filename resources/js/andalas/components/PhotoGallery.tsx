import { useEffect, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    ImageIcon,
    Pause,
    Play,
    Trash2,
} from 'lucide-react';

export type PhotoFields = {
    photos: File[];
    retained_photos: string[];
    photo_order: string[];
    manage_gallery: boolean;
};
export function photoPaths(value: {
    photos?: string[] | null;
    foto?: string | null;
}): string[] {
    return value.photos ?? (value.foto ? [value.foto] : []);
}
export function photoFields(paths: string[] = []): PhotoFields {
    return {
        photos: [],
        retained_photos: paths,
        photo_order: paths,
        manage_gallery: true,
    };
}
type Item = { path?: string; file?: File };
function items(value: PhotoFields): Item[] {
    return value.photo_order.map((key) =>
        key.startsWith('new:')
            ? { file: value.photos[Number(key.slice(4))] }
            : { path: key },
    );
}
export function galleryFields(list: Item[]): PhotoFields {
    const photos: File[] = [];
    const retained_photos: string[] = [];
    const photo_order = list.map((item) => {
        if (item.file) {
            photos.push(item.file);
            return `new:${photos.length - 1}`;
        }
        retained_photos.push(item.path!);
        return item.path!;
    });
    return { photos, retained_photos, photo_order, manage_gallery: true };
}
export function reorderPhotos(
    value: PhotoFields,
    from: number,
    to: number,
): PhotoFields {
    const list = items(value);
    if (from < 0 || to < 0 || from >= list.length || to >= list.length)
        return value;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    return galleryFields(list);
}
function Preview({ item }: { item: Item }) {
    const [url, setUrl] = useState('');
    useEffect(() => {
        if (!item.file) return;
        const next = URL.createObjectURL(item.file);
        setUrl(next);
        return () => URL.revokeObjectURL(next);
    }, [item.file]);
    const src = item.path ? `/storage/${item.path}` : url;
    return src ? (
        <img
            src={src}
            alt={item.file?.name ?? 'Foto tersimpan'}
            className="aspect-[4/3] w-full object-cover"
        />
    ) : (
        <div className="bg-base-200 aspect-[4/3]" />
    );
}
export function PhotoEditor({
    value,
    onChange,
    error,
}: {
    value: PhotoFields;
    onChange: (next: PhotoFields) => void;
    error?: string;
}) {
    const list = items(value);
    const [localError, setLocalError] = useState('');
    function move(index: number, offset: number) {
        onChange(reorderPhotos(value, index, index + offset));
    }
    return (
        <div className="space-y-3">
            <p className="text-muted text-sm">
                Pilih beberapa foto sekaligus. Foto pertama menjadi cover. Atur
                urutan dengan tombol panah. Maksimal 10 foto, masing-masing 2 MB
                (JPG, PNG, WebP).
            </p>
            <input
                aria-label="Unggah foto galeri"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="file-input file-input-bordered w-full"
                disabled={list.length >= 10}
                onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = '';
                    if (
                        list.length + files.length > 10 ||
                        files.some((file) => file.size > 2 * 1024 * 1024)
                    ) {
                        setLocalError(
                            'Maksimal 10 foto, masing-masing tidak lebih dari 2 MB.',
                        );
                        return;
                    }
                    setLocalError('');
                    onChange(
                        galleryFields([
                            ...list,
                            ...files.map((file) => ({ file })),
                        ]),
                    );
                }}
            />
            {(error || localError) && (
                <p role="alert" className="text-error text-sm">
                    {error || localError}
                </p>
            )}
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {list.map((item, index) => (
                    <li
                        key={value.photo_order[index]}
                        className="border-base-300 overflow-hidden rounded-lg border"
                    >
                        <Preview item={item} />
                        <div className="flex items-center justify-between gap-1 p-2">
                            <span
                                className={
                                    index === 0
                                        ? 'badge badge-primary badge-sm'
                                        : 'text-muted text-xs'
                                }
                            >
                                {index === 0 ? 'Cover' : `Foto ${index + 1}`}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-xs btn-square"
                                    title="Geser ke kiri"
                                    aria-label={`Geser foto ${index + 1} ke kiri`}
                                    disabled={index === 0}
                                    onClick={() => move(index, -1)}
                                >
                                    <ArrowLeft size={14} />
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-xs btn-square"
                                    title="Geser ke kanan"
                                    aria-label={`Geser foto ${index + 1} ke kanan`}
                                    disabled={index === list.length - 1}
                                    onClick={() => move(index, 1)}
                                >
                                    <ArrowRight size={14} />
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-xs btn-square text-error"
                                    title="Hapus foto"
                                    aria-label={`Hapus foto ${index + 1}`}
                                    onClick={() =>
                                        onChange(
                                            galleryFields(
                                                list.filter(
                                                    (_, i) => i !== index,
                                                ),
                                            ),
                                        )
                                    }
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    );
}
export function PhotoCarousel({
    photos,
    title,
}: {
    photos: string[];
    title: string;
}) {
    const [selected, setSelected] = useState(0);
    const [paused, setPaused] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const index = selected < photos.length ? selected : 0;
    useEffect(() => {
        if (
            paused ||
            hovered ||
            focused ||
            photos.length < 2 ||
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        )
            return;
        const timer = window.setInterval(() => {
            if (!document.hidden)
                setSelected((current) => (current + 1) % photos.length);
        }, 5000);
        return () => window.clearInterval(timer);
    }, [paused, hovered, focused, photos.length]);
    const step = (offset: number) =>
        setSelected((index + offset + photos.length) % photos.length);
    if (!photos.length)
        return (
            <div className="bg-base-200 text-muted flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl">
                <ImageIcon size={36} />
                <span>Belum ada foto</span>
            </div>
        );
    return (
        <section
            aria-label={`Galeri ${title}`}
            aria-roledescription="carousel"
            className="min-w-0 space-y-3"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocusCapture={() => setFocused(true)}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                    setFocused(false);
            }}
        >
            <div className="bg-base-200 relative overflow-hidden rounded-xl">
                <img
                    src={`/storage/${photos[index]}`}
                    alt={`${title}, foto ${index + 1}`}
                    className="aspect-[4/3] w-full object-cover"
                />
                {photos.length > 1 && (
                    <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
                        <button
                            type="button"
                            className="btn btn-circle btn-sm"
                            aria-label="Foto sebelumnya"
                            onClick={() => step(-1)}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="flex items-center gap-2 rounded-full bg-black/65 px-3 py-1 text-sm text-white">
                            <span>
                                {index + 1} / {photos.length}
                            </span>
                            <button
                                type="button"
                                aria-label={
                                    paused
                                        ? 'Putar slideshow'
                                        : 'Jeda slideshow'
                                }
                                onClick={() => setPaused(!paused)}
                            >
                                {paused ? (
                                    <Play size={14} />
                                ) : (
                                    <Pause size={14} />
                                )}
                            </button>
                        </div>
                        <button
                            type="button"
                            className="btn btn-circle btn-sm"
                            aria-label="Foto berikutnya"
                            onClick={() => step(1)}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>
            {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {photos.map((path, i) => (
                        <button
                            key={path}
                            type="button"
                            aria-label={`Tampilkan foto ${i + 1}`}
                            aria-pressed={index === i}
                            onClick={() => setSelected(i)}
                            className={`shrink-0 overflow-hidden rounded-md border-2 ${index === i ? 'border-primary' : 'border-transparent'}`}
                        >
                            <img
                                src={`/storage/${path}`}
                                alt=""
                                className="h-14 w-20 object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}
