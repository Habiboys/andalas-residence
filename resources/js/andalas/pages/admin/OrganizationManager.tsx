import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { store, update, destroy } from '@/routes/andalas/landing/organization';
import { update as updateContent } from '@/routes/andalas/landing/contents';
import OrganizationChart, {
    type OrganizationNode,
} from '../../components/OrganizationChart';
import LandingRichContent from '../../components/LandingRichContent';
import MediaPicker from '../../components/MediaLibrary';
import {
    PageHeader,
    Button,
    DataTable,
    Modal,
    FormField,
    inputClass,
    IconButton,
    ConfirmDialog,
} from '../../components/ui';

export default function OrganizationManager({
    positions,
    record,
}: {
    positions: OrganizationNode[];
    record: { id: string; title: string; published: boolean; content?: string };
}) {
    const [target, setTarget] = useState<OrganizationNode | 'new' | null>(null);
    const [deleting, setDeleting] = useState<OrganizationNode | null>(null);
    const [picker, setPicker] = useState(false);
    const [photoName, setPhotoName] = useState('');
    const form = useForm({
        title: '',
        name: '',
        parent_id: '',
        sort_order: 0,
        published: false,
        media_id: '',
        remove_photo: false,
    });
    const publication = useForm({
        title: record.title,
        published: record.published,
    });
    const deletion = useForm<{ position?: string }>({});
    function open(node: OrganizationNode | 'new') {
        form.clearErrors();
        setPhotoName('');
        form.setData(
            node === 'new'
                ? {
                      title: '',
                      name: '',
                      parent_id: '',
                      sort_order: positions.length,
                      published: false,
                      media_id: '',
                      remove_photo: false,
                  }
                : {
                      title: node.title,
                      name: node.name ?? '',
                      parent_id: node.parent_id ?? '',
                      sort_order: node.sort_order,
                      published: node.published,
                      media_id: '',
                      remove_photo: false,
                  },
        );
        setTarget(node);
    }
    return (
        <div className="space-y-6">
            <PageHeader
                title="Struktur Organisasi"
                subtitle="Pilih atasan untuk menentukan tingkat bagan. Urutan posisi menentukan letak dari kiri ke kanan pada tingkat yang sama."
            />
            <form
                className="border-base-300 flex flex-wrap items-end gap-4 rounded-xl border p-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    publication.put(updateContent.url(record.id), {
                        preserveScroll: true,
                    });
                }}
            >
                <FormField label="Judul halaman">
                    <input
                        className={inputClass}
                        value={publication.data.title}
                        onChange={(event) =>
                            publication.setData('title', event.target.value)
                        }
                        required
                    />
                </FormField>
                <label className="flex items-center gap-2 pb-2 text-sm">
                    <input
                        type="checkbox"
                        checked={publication.data.published}
                        onChange={(event) =>
                            publication.setData(
                                'published',
                                event.target.checked,
                            )
                        }
                    />
                    Terbitkan halaman struktur
                </label>
                <Button type="submit" disabled={publication.processing}>
                    Simpan publikasi
                </Button>
            </form>
            {Object.values(publication.errors).map((error, index) => (
                <p key={index} role="alert" className="text-error text-sm">
                    {error}
                </p>
            ))}
            {record.content && (
                <details className="border-base-300 rounded-lg border p-4">
                    <summary className="cursor-pointer text-sm font-medium">
                        Catatan struktur sebelumnya
                    </summary>
                    <div className="mt-4">
                        <LandingRichContent html={record.content} />
                    </div>
                </details>
            )}
            <OrganizationChart positions={positions} preview />
            <DataTable
                data={positions}
                searchKeys={['title', 'name']}
                emptyMessage="Belum ada jabatan. Tambahkan jabatan paling atas terlebih dahulu."
                actions={
                    <Button onClick={() => open('new')}>Tambah jabatan</Button>
                }
                columns={[
                    { key: 'title', label: 'Jabatan' },
                    { key: 'name', label: 'Nama' },
                    {
                        key: 'parent_id',
                        label: 'Atasan',
                        render: (node) =>
                            positions.find(
                                (parent) => parent.id === node.parent_id,
                            )?.title ?? 'Paling atas',
                    },
                    { key: 'sort_order', label: 'Urutan posisi' },
                    {
                        key: 'published',
                        label: 'Status',
                        render: (node) => (node.published ? 'Terbit' : 'Draft'),
                    },
                    {
                        key: 'actions',
                        label: 'Aksi',
                        render: (node) => (
                            <div className="flex gap-1">
                                <IconButton
                                    label={`Edit ${node.title}`}
                                    icon={Pencil}
                                    onClick={() => open(node)}
                                />
                                <IconButton
                                    label={`Hapus ${node.title}`}
                                    icon={Trash2}
                                    onClick={() => setDeleting(node)}
                                />
                            </div>
                        ),
                    },
                ]}
            />
            <Modal
                open={target !== null}
                onClose={() => setTarget(null)}
                title={target === 'new' ? 'Tambah jabatan' : 'Edit jabatan'}
            >
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.transform((data) => ({
                            ...data,
                            parent_id: data.parent_id || null,
                        }));
                        const options = {
                            preserveScroll: true,
                            onSuccess: () => setTarget(null),
                        };
                        if (target === 'new') form.post(store.url(), options);
                        else if (target)
                            form.put(update.url(target.id), options);
                    }}
                >
                    <FormField label="Jabatan">
                        <input
                            className={inputClass}
                            value={form.data.title}
                            onChange={(event) =>
                                form.setData('title', event.target.value)
                            }
                            required
                            maxLength={150}
                        />
                    </FormField>
                    <FormField label="Nama pejabat">
                        <input
                            className={inputClass}
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            maxLength={150}
                        />
                    </FormField>
                    <FormField label="Atasan / posisi di bawah">
                        <select
                            className={inputClass}
                            value={form.data.parent_id}
                            onChange={(event) =>
                                form.setData('parent_id', event.target.value)
                            }
                        >
                            <option value="">Paling atas</option>
                            {positions
                                .filter(
                                    (node) =>
                                        target === 'new' ||
                                        node.id !== target?.id,
                                )
                                .map((node) => (
                                    <option key={node.id} value={node.id}>
                                        {node.title}{' '}
                                        {node.name && `- ${node.name}`}
                                    </option>
                                ))}
                        </select>
                    </FormField>
                    <FormField label="Urutan posisi (kiri ke kanan)">
                        <input
                            className={inputClass}
                            type="number"
                            min={0}
                            max={10000}
                            value={form.data.sort_order}
                            onChange={(event) =>
                                form.setData(
                                    'sort_order',
                                    Number(event.target.value),
                                )
                            }
                            required
                        />
                    </FormField>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setPicker(true)}
                        >
                            Pilih foto dari media
                        </Button>
                        <span className="text-muted text-sm">
                            {photoName ||
                                (target &&
                                target !== 'new' &&
                                target.photo &&
                                !form.data.remove_photo
                                    ? 'Foto tersimpan'
                                    : 'Tanpa foto')}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                form.setData({
                                    ...form.data,
                                    media_id: '',
                                    remove_photo: true,
                                });
                                setPhotoName('');
                            }}
                        >
                            Lepas foto
                        </Button>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.data.published}
                            onChange={(event) =>
                                form.setData('published', event.target.checked)
                            }
                        />
                        Tampilkan jabatan di bagan publik
                    </label>
                    <p className="text-muted text-xs">
                        Bawahan dari atasan yang masih draft juga tidak
                        ditampilkan pada bagan publik.
                    </p>
                    {Object.values(form.errors).map((error, index) => (
                        <p
                            key={index}
                            role="alert"
                            className="text-error text-sm"
                        >
                            {error}
                        </p>
                    ))}
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setTarget(null)}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Simpan jabatan
                        </Button>
                    </div>
                </form>
            </Modal>
            <MediaPicker
                open={picker}
                onClose={() => setPicker(false)}
                onSelect={(asset) => {
                    form.setData({
                        ...form.data,
                        media_id: asset.id,
                        remove_photo: false,
                    });
                    setPhotoName(asset.name);
                }}
            />
            <ConfirmDialog
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                title="Hapus jabatan?"
                message={deleting?.title ?? ''}
                onConfirm={() => {
                    if (deleting)
                        deletion.delete(destroy.url(deleting.id), {
                            preserveScroll: true,
                            onSuccess: () => setDeleting(null),
                            onError: () => setDeleting(null),
                        });
                }}
            />
            {deletion.errors.position && (
                <p role="alert" className="text-error text-sm">
                    {deletion.errors.position}
                </p>
            )}
        </div>
    );
}
