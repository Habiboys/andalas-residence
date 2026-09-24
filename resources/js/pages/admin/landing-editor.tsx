import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import RichTextEditor from '@/andalas/components/RichTextEditor';
import {
    Button,
    Card,
    FormField,
    inputClass,
    PageHeader,
} from '@/andalas/components/ui';
import * as contents from '@/routes/andalas/landing/contents';
import * as informasi from '@/routes/andalas/landing/informasi';
import * as program from '@/routes/andalas/landing/program';
import * as sub from '@/routes/andalas/landing/program-sub';
import * as testimoni from '@/routes/andalas/landing/testimoni';
import { images } from '@/routes/andalas/landing/editor';

type Section = 'profil' | 'informasi' | 'program' | 'program-sub' | 'testimoni';
type RecordData = {
    id: string;
    title?: string;
    judul?: string;
    nama?: string;
    content?: string;
    konten?: string;
    deskripsi?: string;
    teks?: string;
    kategori?: string;
    tanggal?: string;
    published?: boolean;
    urutan?: number;
    prodi?: string;
    file?: string;
    gambar?: string;
    foto?: string;
};
type Props = {
    section: Section;
    record: RecordData | null;
    parentProgram: { id: string; nama: string } | null;
    returnUrl: string;
};
const labels: Record<Section, string> = {
    profil: 'Profil',
    informasi: 'Informasi',
    program: 'Program',
    'program-sub': 'Uraian Program',
    testimoni: 'Testimoni',
};

export default function LandingEditor(props: Props) {
    return (
        <EditorForm
            key={`${props.section}-${props.record?.id ?? 'new'}`}
            {...props}
        />
    );
}

function EditorForm({ section, record, parentProgram, returnUrl }: Props) {
    const titleField =
        section === 'profil'
            ? 'title'
            : ['program', 'testimoni'].includes(section)
              ? 'nama'
              : 'judul';
    const bodyField =
        section === 'profil'
            ? 'content'
            : section === 'informasi'
              ? 'konten'
              : section === 'testimoni'
                ? 'teks'
                : 'deskripsi';
    const uploadField =
        section === 'informasi'
            ? 'file'
            : section === 'program-sub'
              ? 'gambar'
              : 'foto';
    const hasUpload = ['informasi', 'program-sub', 'testimoni'].includes(
        section,
    );
    const [uploading, setUploading] = useState(false);
    const { data, setData, errors, processing, post, transform, isDirty } =
        useForm({
            title: record?.title ?? '',
            judul: record?.judul ?? '',
            nama: record?.nama ?? '',
            content: record?.content ?? '',
            konten: record?.konten ?? '',
            deskripsi: record?.deskripsi ?? '',
            teks: record?.teks ?? '',
            kategori: record?.kategori ?? 'pengumuman',
            tanggal: record?.tanggal?.slice(0, 10) ?? '',
            published: record?.published ?? false,
            urutan: record?.urutan ?? 0,
            prodi: record?.prodi ?? '',
            program_id: parentProgram?.id ?? '',
            file: null as File | null,
            gambar: null as File | null,
            foto: null as File | null,
        });

    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => {
            if (isDirty) event.preventDefault();
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [isDirty]);

    async function uploadImage(file: File): Promise<string> {
        setUploading(true);
        try {
            const body = new FormData();
            body.append('image', file);
            const token = document.cookie
                .split('; ')
                .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
                ?.slice(11);
            const response = await fetch(images.url(), {
                method: 'POST',
                credentials: 'same-origin',
                body,
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(token ?? ''),
                },
            });
            const result = await response.json();
            if (!response.ok)
                throw new Error(
                    result.errors?.image?.[0] ??
                        'Gambar gagal diunggah. Silakan coba lagi.',
                );
            return result.url;
        } finally {
            setUploading(false);
        }
    }

    function save(event: FormEvent) {
        event.preventDefault();
        const routes = { informasi, program, 'program-sub': sub, testimoni };
        const url =
            section === 'profil'
                ? contents.update.url(record!.id)
                : record
                  ? routes[section].update.url(record.id)
                  : routes[section].store.url();
        transform((values) => ({
            ...values,
            _method: record ? 'put' : 'post',
        }));
        post(url, { forceFormData: true, preserveScroll: true });
    }

    return (
        <div className="space-y-5">
            <Head title={`${record ? 'Edit' : 'Tambah'} ${labels[section]}`} />
            <Link
                href={returnUrl}
                className="text-muted hover:text-primary inline-flex items-center gap-2 text-sm"
            >
                <ArrowLeft size={16} />
                Kembali ke daftar {labels[section].toLowerCase()}
            </Link>
            <PageHeader
                title={`${record ? 'Edit' : 'Tambah'} ${labels[section]}`}
                subtitle={
                    parentProgram
                        ? `Program: ${parentProgram.nama}`
                        : 'Susun konten dan atur kapan ditampilkan di halaman publik.'
                }
            />
            <form
                onSubmit={save}
                className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]"
            >
                <Card className="min-w-0 space-y-5 p-5 md:p-7">
                    <FormField
                        label={
                            section === 'testimoni'
                                ? 'Nama pemberi testimoni'
                                : 'Judul'
                        }
                    >
                        <input
                            autoFocus
                            className={inputClass}
                            value={data[titleField]}
                            onChange={(event) =>
                                setData(titleField, event.target.value)
                            }
                            required
                            maxLength={
                                ['program', 'testimoni'].includes(section)
                                    ? 150
                                    : 200
                            }
                        />
                        {errors[titleField] && (
                            <p className="text-error mt-1 text-sm">
                                {errors[titleField]}
                            </p>
                        )}
                    </FormField>
                    <FormField
                        label={
                            section === 'testimoni' ? 'Testimoni' : 'Isi konten'
                        }
                    >
                        {section === 'testimoni' ? (
                            <textarea
                                className={inputClass}
                                rows={8}
                                value={data.teks}
                                onChange={(event) =>
                                    setData('teks', event.target.value)
                                }
                                required
                            />
                        ) : (
                            <RichTextEditor
                                value={data[bodyField]}
                                onChange={(html) => setData(bodyField, html)}
                                uploadImage={uploadImage}
                            />
                        )}
                        {errors[bodyField] && (
                            <p className="text-error mt-1 text-sm">
                                {errors[bodyField]}
                            </p>
                        )}
                    </FormField>
                    {section !== 'testimoni' && (
                        <p className="text-muted text-xs leading-5">
                            Gunakan judul bagian, daftar, tautan, dan gambar
                            untuk menyusun konten. Gambar: JPG, PNG, atau WebP,
                            maksimal 2 MB.
                        </p>
                    )}
                </Card>
                <Card className="space-y-5 p-5">
                    <h2 className="font-semibold">Pengaturan konten</h2>
                    {section !== 'program-sub' ? (
                        <label className="flex items-start gap-3 text-sm">
                            <input
                                className="mt-1"
                                type="checkbox"
                                checked={data.published}
                                onChange={(event) =>
                                    setData('published', event.target.checked)
                                }
                            />
                            <span>
                                Tampilkan di publik
                                <span className="text-muted mt-1 block text-xs leading-5">
                                    Biarkan tidak dicentang untuk menyimpan
                                    sebagai draft.
                                </span>
                            </span>
                        </label>
                    ) : (
                        <p className="text-muted text-sm">
                            Uraian mengikuti status publikasi program induk.
                        </p>
                    )}
                    {section === 'informasi' && (
                        <>
                            <FormField label="Kategori">
                                <select
                                    className={inputClass}
                                    value={data.kategori}
                                    onChange={(event) =>
                                        setData('kategori', event.target.value)
                                    }
                                >
                                    {[
                                        'pengumuman',
                                        'regulasi',
                                        'sop',
                                        'panduan',
                                    ].map((value) => (
                                        <option key={value} value={value}>
                                            {value === 'sop'
                                                ? 'SOP'
                                                : value
                                                      .charAt(0)
                                                      .toUpperCase() +
                                                  value.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                            <FormField label="Tanggal">
                                <input
                                    type="date"
                                    className={inputClass}
                                    value={data.tanggal}
                                    onChange={(event) =>
                                        setData('tanggal', event.target.value)
                                    }
                                />
                            </FormField>
                        </>
                    )}
                    {section !== 'informasi' && (
                        <FormField label="Urutan tampil">
                            <input
                                type="number"
                                min={0}
                                step={1}
                                className={inputClass}
                                value={data.urutan}
                                onChange={(event) =>
                                    setData(
                                        'urutan',
                                        Number(event.target.value),
                                    )
                                }
                            />
                        </FormField>
                    )}
                    {section === 'testimoni' && (
                        <FormField label="Program studi">
                            <input
                                className={inputClass}
                                value={data.prodi}
                                onChange={(event) =>
                                    setData('prodi', event.target.value)
                                }
                                maxLength={150}
                            />
                        </FormField>
                    )}
                    {hasUpload && (
                        <FormField
                            label={
                                section === 'informasi'
                                    ? 'Lampiran dokumen'
                                    : 'Gambar'
                            }
                        >
                            <input
                                type="file"
                                className={`${inputClass} text-xs`}
                                accept={
                                    section === 'informasi'
                                        ? '.pdf,.doc,.docx'
                                        : '.jpg,.jpeg,.png,.webp'
                                }
                                onChange={(event) =>
                                    setData(
                                        uploadField,
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                            />
                            <p className="text-muted mt-2 text-xs">
                                {section === 'informasi'
                                    ? 'PDF, DOC, atau DOCX. Maksimal 10 MB.'
                                    : 'JPG, PNG, atau WebP. Maksimal 2 MB.'}
                            </p>
                            {record?.[uploadField] && (
                                <a
                                    className="text-primary mt-2 block text-sm underline"
                                    href={`/storage/${record[uploadField]}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Lihat berkas saat ini
                                </a>
                            )}
                            {errors[uploadField] && (
                                <p className="text-error mt-1 text-sm">
                                    {errors[uploadField]}
                                </p>
                            )}
                        </FormField>
                    )}
                    {Object.keys(errors).length > 0 && (
                        <p role="alert" className="text-error text-sm">
                            Periksa data sebelum menyimpan.{' '}
                            {Object.entries(errors)
                                .filter(
                                    ([field]) =>
                                        ![
                                            titleField,
                                            bodyField,
                                            uploadField,
                                        ].includes(field),
                                )
                                .map(([, message]) => message)
                                .join(' ')}
                        </p>
                    )}
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={processing || uploading}
                    >
                        <Save size={16} />
                        {processing
                            ? 'Menyimpan…'
                            : uploading
                              ? 'Mengunggah gambar…'
                              : 'Simpan konten'}
                    </Button>
                </Card>
            </form>
        </div>
    );
}
