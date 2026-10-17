import { useEffect, useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { index, store, destroy } from '@/routes/andalas/landing/media';
import { Button, Modal, ConfirmDialog, IconButton, inputClass } from './ui';

export type MediaAsset = {
    id: string;
    path: string;
    url: string;
    name: string;
    mime_type: string;
    size: number;
};

export async function mediaRequest(
    url: string,
    method = 'GET',
    body?: FormData,
) {
    const token = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.split('=')
        .slice(1)
        .join('=');
    const response = await fetch(url, {
        method,
        body,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-XSRF-TOKEN': decodeURIComponent(token ?? ''),
        },
    });
    const result = await response.json();
    if (!response.ok)
        throw new Error(
            Object.values(result.errors ?? {})
                .flat()
                .join(' ') ||
                result.message ||
                'Permintaan media gagal.',
        );
    return result;
}

export function MediaLibrary({
    onSelect,
    type = '',
}: {
    onSelect?: (asset: MediaAsset) => void;
    type?: '' | 'image' | 'document';
}) {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [reload, setReload] = useState(0);
    const [rows, setRows] = useState<MediaAsset[]>([]);
    const [lastPage, setLastPage] = useState(1);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<MediaAsset | null>(null);
    useEffect(() => {
        let current = true;
        setLoading(true);
        const timer = setTimeout(() => {
            mediaRequest(
                index.url({
                    query: { search, page, ...(type ? { type } : {}) },
                }),
            )
                .then((data) => {
                    if (current) {
                        setRows(data.data);
                        setLastPage(data.last_page);
                    }
                })
                .catch((failure) => {
                    if (current) setError(failure.message);
                })
                .finally(() => {
                    if (current) setLoading(false);
                });
        }, 200);
        return () => {
            current = false;
            clearTimeout(timer);
        };
    }, [search, page, reload, type]);
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <label className="min-w-48 flex-1 text-sm">
                    Cari media
                    <input
                        aria-label="Cari media"
                        className={inputClass}
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                    />
                </label>
                <label
                    className={`btn btn-primary ${uploading ? 'btn-disabled' : ''}`}
                >
                    {' '}
                    {uploading ? 'Mengunggah...' : 'Unggah media'}
                    <input
                        className="sr-only"
                        type="file"
                        multiple
                        disabled={uploading}
                        accept={
                            type === 'image'
                                ? 'image/jpeg,image/png,image/webp'
                                : type === 'document'
                                  ? '.pdf,.doc,.docx'
                                  : 'image/jpeg,image/png,image/webp,.pdf,.doc,.docx'
                        }
                        onChange={async (event) => {
                            const files = Array.from(event.target.files ?? []);
                            event.target.value = '';
                            setError('');
                            setUploading(true);
                            try {
                                for (const file of files) {
                                    const body = new FormData();
                                    body.append('file', file);
                                    await mediaRequest(
                                        store.url(),
                                        'POST',
                                        body,
                                    );
                                }
                                setPage(1);
                                setReload((value) => value + 1);
                            } catch (failure) {
                                setError(
                                    failure instanceof Error
                                        ? failure.message
                                        : 'Unggah gagal.',
                                );
                                setReload((value) => value + 1);
                            } finally {
                                setUploading(false);
                            }
                        }}
                    />
                </label>
            </div>
            <p className="text-muted text-xs">
                JPG, PNG, WebP, PDF, DOC, atau DOCX; maksimal 10 MB per file.
                Media dapat dipakai di beberapa konten.
            </p>
            {error && (
                <p role="alert" className="text-error text-sm">
                    {error}
                </p>
            )}
            {loading ? (
                <div
                    role="status"
                    className="bg-base-200 h-36 animate-pulse rounded-lg"
                >
                    Memuat media...
                </div>
            ) : rows.length ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {rows.map((asset) => (
                        <li
                            key={asset.id}
                            className="border-base-300 overflow-hidden rounded-lg border"
                        >
                            <button
                                type="button"
                                className="hover:bg-base-200 block w-full text-left"
                                onClick={() =>
                                    onSelect
                                        ? onSelect(asset)
                                        : window.open(
                                              asset.url,
                                              '_blank',
                                              'noopener,noreferrer',
                                          )
                                }
                                aria-label={`${onSelect ? 'Pilih' : 'Lihat'} ${asset.name}`}
                            >
                                {asset.mime_type.startsWith('image/') ? (
                                    <img
                                        src={asset.url}
                                        alt=""
                                        loading="lazy"
                                        className="bg-base-200 aspect-[4/3] w-full object-cover"
                                    />
                                ) : (
                                    <div className="bg-base-200 flex aspect-[4/3] items-center justify-center">
                                        <FileText size={32} />
                                    </div>
                                )}
                                <p
                                    className="truncate px-3 pt-2 text-sm font-medium"
                                    title={asset.name}
                                >
                                    {asset.name}
                                </p>
                            </button>
                            <div className="flex items-center justify-between gap-2 px-3 pb-2">
                                <span className="text-muted text-xs">
                                    {Math.round(asset.size / 1024)} KB
                                </span>
                                {!onSelect && (
                                    <IconButton
                                        icon={Trash2}
                                        label={`Hapus ${asset.name}`}
                                        onClick={() => setDeleting(asset)}
                                    />
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted py-8 text-center text-sm">
                    Belum ada media yang sesuai. Unggah file untuk
                    menambahkannya.
                </p>
            )}
            <div className="flex items-center justify-end gap-3">
                <Button
                    variant="secondary"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage(page - 1)}
                >
                    Sebelumnya
                </Button>
                <span className="text-sm">
                    {page} / {lastPage}
                </span>
                <Button
                    variant="secondary"
                    disabled={page >= lastPage || loading}
                    onClick={() => setPage(page + 1)}
                >
                    Berikutnya
                </Button>
            </div>
            <ConfirmDialog
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                title="Hapus media?"
                message={`Hapus ${deleting?.name ?? ''}? Media yang masih dipakai konten tidak dapat dihapus.`}
                onConfirm={async () => {
                    if (!deleting) return;
                    try {
                        await mediaRequest(destroy.url(deleting.id), 'DELETE');
                        setDeleting(null);
                        setPage(1);
                        setReload((value) => value + 1);
                    } catch (failure) {
                        setDeleting(null);
                        setError(
                            failure instanceof Error
                                ? failure.message
                                : 'Media gagal dihapus.',
                        );
                    }
                }}
            />
        </div>
    );
}

export default function MediaPicker({
    open,
    onClose,
    onSelect,
    type = 'image',
}: {
    open: boolean;
    onClose: () => void;
    onSelect: (asset: MediaAsset) => void;
    type?: '' | 'image' | 'document';
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Pilih dari pustaka media"
            width="max-w-5xl"
        >
            {open && (
                <MediaLibrary
                    type={type}
                    onSelect={(asset) => {
                        onSelect(asset);
                        onClose();
                    }}
                />
            )}
        </Modal>
    );
}
