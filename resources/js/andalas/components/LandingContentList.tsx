import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import {
    Button,
    Card,
    ConfirmDialog,
    DataTable,
    IconButton,
    PageHeader,
    RowActions,
    StatusBadge,
    type DataColumn,
} from './ui';
import { create, edit } from '@/routes/andalas/landing/editor';
import * as informasi from '@/routes/andalas/landing/informasi';
import * as program from '@/routes/andalas/landing/program';
import * as sub from '@/routes/andalas/landing/program-sub';
import * as testimoni from '@/routes/andalas/landing/testimoni';

export type LandingRow = {
    id: string;
    title?: string;
    judul?: string;
    nama?: string;
    kategori?: string;
    tanggal?: string;
    prodi?: string;
    published?: boolean;
    sub?: LandingRow[];
};
type Section = 'profil' | 'informasi' | 'program' | 'testimoni';
const labels: Record<Section, string> = {
    profil: 'Profil',
    informasi: 'Informasi',
    program: 'Program',
    testimoni: 'Testimoni',
};

export default function LandingContentList({
    section,
    rows,
}: {
    section: Section;
    rows: LandingRow[];
}) {
    const [deleting, setDeleting] = useState<{
        row: LandingRow;
        section: Section | 'program-sub';
    } | null>(null);
    const [selectedProgram, setSelectedProgram] = useState('');
    const deletion = useForm({});
    const title = (row: LandingRow) => row.title ?? row.judul ?? row.nama ?? '';
    const openEdit = (
        row: LandingRow,
        target: Section | 'program-sub' = section,
    ) => router.visit(edit.url({ section: target, id: row.id }));
    const columns: DataColumn<LandingRow>[] = [
        {
            key: 'title',
            label: section === 'testimoni' ? 'Nama' : 'Judul',
            value: title,
            render: (row) => <span className="font-medium">{title(row)}</span>,
        },
        ...(section === 'informasi'
            ? [
                  {
                      key: 'kategori',
                      label: 'Kategori',
                      filter: {
                          type: 'select' as const,
                          options: ['pengumuman', 'regulasi', 'sop', 'panduan'],
                      },
                  },
                  {
                      key: 'tanggal',
                      label: 'Tanggal',
                      render: (row: LandingRow) =>
                          row.tanggal?.slice(0, 10) ?? '—',
                  },
              ]
            : []),
        ...(section === 'testimoni'
            ? [{ key: 'prodi', label: 'Program studi' }]
            : []),
        {
            key: 'published',
            label: 'Status',
            value: (row) => (row.published ? 'Publik' : 'Draft'),
            filter: { type: 'select', options: ['Publik', 'Draft'] },
            render: (row) => (
                <StatusBadge status={row.published ? 'aktif' : 'draft'} />
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            action: true,
            render: (row) => (
                <RowActions
                    onEdit={() => openEdit(row)}
                    onDelete={
                        section === 'profil'
                            ? undefined
                            : () => setDeleting({ row, section })
                    }
                    extra={
                        section === 'program' ? (
                            <IconButton
                                icon={Plus}
                                label="Tambah uraian"
                                tone="text-primary hover:bg-primary/10"
                                onClick={() =>
                                    router.visit(
                                        create.url(
                                            { section: 'program-sub' },
                                            { query: { program_id: row.id } },
                                        ),
                                    )
                                }
                            />
                        ) : undefined
                    }
                />
            ),
        },
    ];
    const children = rows.flatMap((parent) =>
        (parent.sub ?? []).map((row) => ({
            ...row,
            programName: title(parent),
            programId: parent.id,
        })),
    );
    function confirmDelete() {
        if (!deleting) return;
        const routes = { informasi, program, testimoni, 'program-sub': sub };
        if (deleting.section === 'profil') return;
        deletion.delete(routes[deleting.section].destroy.url(deleting.row.id), {
            onSuccess: () => setDeleting(null),
            preserveScroll: true,
        });
    }
    return (
        <div className="space-y-6">
            <PageHeader
                title={`Kelola ${labels[section]}`}
                subtitle="Kelola konten yang ditampilkan di situs Andalas Residence."
                actions={
                    section !== 'profil' && (
                        <Button
                            onClick={() =>
                                router.visit(create.url({ section }))
                            }
                        >
                            <Plus size={16} />
                            Tambah {labels[section]}
                        </Button>
                    )
                }
            />
            <Card>
                <DataTable
                    columns={columns}
                    data={rows}
                    searchKeys={['title', 'judul', 'nama', 'kategori', 'prodi']}
                    searchPlaceholder="Cari konten…"
                />
            </Card>
            {section === 'program' && (
                <section className="space-y-3">
                    <div>
                        <h2 className="text-lg font-semibold">
                            Uraian program
                        </h2>
                        <p className="text-muted text-sm">
                            Tambah uraian melalui tombol tambah pada program
                            induk.
                        </p>
                    </div>
                    <Card>
                        <DataTable
                            data={children.filter(
                                (row) =>
                                    !selectedProgram ||
                                    row.programId === selectedProgram,
                            )}
                            searchKeys={['judul', 'programName']}
                            filters={
                                <select
                                    aria-label="Filter program"
                                    className="select select-sm max-w-48"
                                    value={selectedProgram}
                                    onChange={(event) =>
                                        setSelectedProgram(event.target.value)
                                    }
                                >
                                    <option value="">Semua program</option>
                                    {rows.map((row) => (
                                        <option key={row.id} value={row.id}>
                                            {title(row)}
                                        </option>
                                    ))}
                                </select>
                            }
                            columns={[
                                { key: 'judul', label: 'Judul' },
                                { key: 'programName', label: 'Program' },
                                {
                                    key: 'actions',
                                    label: 'Aksi',
                                    action: true,
                                    render: (row) => (
                                        <RowActions
                                            onEdit={() =>
                                                openEdit(row, 'program-sub')
                                            }
                                            onDelete={() =>
                                                setDeleting({
                                                    row,
                                                    section: 'program-sub',
                                                })
                                            }
                                        />
                                    ),
                                },
                            ]}
                        />
                    </Card>
                </section>
            )}
            <ConfirmDialog
                open={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                loading={deletion.processing}
                title="Hapus konten"
                message={`Hapus “${deleting ? title(deleting.row) : ''}”? ${deleting?.section === 'program' ? 'Seluruh uraian di dalam program juga akan dihapus.' : 'Tindakan ini tidak dapat dibatalkan.'}`}
            />
        </div>
    );
}
