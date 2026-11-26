import { useEffect, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Trash2, Upload } from 'lucide-react';
import LandingEditor from './landing-editor';
import OrganizationManager from '@/andalas/pages/admin/OrganizationManager';
import LandingContentList, {
    type LandingRow,
} from '@/andalas/components/LandingContentList';
import { type OrganizationNode } from '@/andalas/components/OrganizationChart';
import MediaPicker, { MediaLibrary } from '@/andalas/components/MediaLibrary';
import { type LandingSettings, mediaUrl } from '@/andalas/lib/landing-settings';
import { settings as saveSettings, manage } from '@/routes/andalas/landing';
import {
    Button,
    ConfirmDialog,
    FormField,
    inputClass,
    PageHeader,
    IconButton,
} from '@/andalas/components/ui';

type ProfileRecord = {
    id: string;
    title: string;
    content: string;
    image?: string;
    published: boolean;
};
type AutoGalleryItem = {
    title: string;
    image: string;
    category: string;
};
type Props = {
    section: string;
    record: ProfileRecord | null;
    settings: LandingSettings;
    galleryAutoPreview?: AutoGalleryItem[];
    rows: LandingRow[];
    positions: OrganizationNode[];
};

export default function LandingManage(props: Props) {
    const { section, record, rows, positions } = props;
    if (section === 'struktur-organisasi' && record)
        return <OrganizationManager positions={positions} record={record} />;
    if (['sejarah', 'visi-misi'].includes(section) && record)
        return (
            <LandingEditor
                section="profil"
                record={record}
                parentProgram={null}
                returnUrl={manage.url(section)}
                direct
            />
        );
    if (section === 'media')
        return (
            <div className="space-y-5">
                <PageHeader
                    title="Pustaka Media"
                    subtitle="Semua unggahan landing page disimpan di sini dan dapat digunakan kembali."
                />
                <MediaLibrary />
            </div>
        );
    if (['beranda', 'kontak', 'galeri'].includes(section))
        return (
            <SettingsForm
                key={section}
                settings={props.settings}
                section={section}
                galleryAutoPreview={props.galleryAutoPreview ?? []}
            />
        );
    return (
        <LandingContentList
            section={
                section === 'program'
                    ? 'program'
                    : section === 'testimoni'
                      ? 'testimoni'
                      : 'informasi'
            }
            rows={rows}
            category={section}
        />
    );
}

const labels: Record<string, string> = {
    eyebrow: 'Teks pembuka',
    title: 'Judul',
    description: 'Deskripsi',
    image_alt: 'Deskripsi gambar',
    registration: 'Judul pendaftaran',
    registration_intro: 'Pengantar pendaftaran',
    steps: 'Judul tahapan',
    gallery: 'Judul galeri',
    gallery_intro: 'Pengantar galeri',
    announcements: 'Judul pengumuman',
    announcements_intro: 'Pengantar pengumuman',
    news: 'Judul berita',
    services: 'Judul layanan',
    services_intro: 'Pengantar layanan',
    faq: 'Judul FAQ',
    faq_intro: 'Pengantar FAQ',
    location: 'Judul lokasi',
    location_note: 'Catatan lokasi',
    name: 'Nama situs',
    tagline: 'Tagline',
    address: 'Alamat',
    email: 'Email',
    phone: 'Telepon',
    hours: 'Jam layanan',
    maps_url: 'Tautan petunjuk lokasi',
    map_embed: 'URL peta sematan (HTTPS)',
    contact_title: 'Judul halaman kontak',
    contact_intro: 'Pengantar kontak',
    footer: 'Teks footer',
    testimonials: 'Judul testimoni',
    testimonials_intro: 'Pengantar testimoni',
    unit_title: 'Judul unit hunian',
    unit_intro: 'Pengantar unit hunian',
    unit_heading: 'Judul pengantar hunian',
    program_title: 'Judul halaman program',
    program_heading: 'Judul pengantar program',
    program_intro: 'Pengantar program',
    tracks_eyebrow: 'Label kecil jalur pendaftaran',
    tracks: 'Judul jalur pendaftaran',
    tracks_intro: 'Pengantar jalur pendaftaran',
    tariffs_eyebrow: 'Label kecil tabel tarif',
    tariffs: 'Judul tabel tarif',
    tariffs_intro: 'Pengantar tabel tarif',
    tariffs_note: 'Catatan bawah tabel tarif',
    facilities_eyebrow: 'Label kecil fasilitas',
    facilities: 'Judul fasilitas & aturan',
    facilities_intro: 'Pengantar fasilitas & aturan',
    rules_badge: 'Lencana aturan penting',
    rules: 'Judul aturan penting',
    rules_intro: 'Pengantar aturan penting',
    payment_eyebrow: 'Label kecil prosedur pembayaran',
    payment: 'Judul prosedur pembayaran',
    payment_intro: 'Pengantar prosedur pembayaran',
};

const MULTILINE_FIELDS = new Set([
    'description',
    'image_alt',
    'registration_intro',
    'gallery_intro',
    'announcements_intro',
    'services_intro',
    'faq_intro',
    'location_note',
    'address',
    'contact_intro',
    'footer',
    'testimonials_intro',
    'unit_intro',
    'program_intro',
    'tracks_intro',
    'tariffs_intro',
    'tariffs_note',
    'facilities_intro',
    'rules_intro',
    'payment_intro',
]);

type DeleteItemTarget =
    | { kind: 'gallery'; index: number; label: string }
    | {
          kind:
              | 'registration_tracks'
              | 'facilities'
              | 'core_rules'
              | 'payment_steps'
              | 'categories'
              | 'steps'
              | 'services'
              | 'faqs';
          index: number;
          label: string;
      };

function SettingsForm({
    settings,
    section,
    galleryAutoPreview = [],
}: {
    settings: LandingSettings;
    section: string;
    galleryAutoPreview?: AutoGalleryItem[];
}) {
    const form = useForm({ settings, section });
    const uploadForm = useForm({
        title: '',
        category: 'Kehidupan Asrama',
        file: null as File | null,
    });
    const [picker, setPicker] = useState<'hero' | 'logo' | number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteItemTarget | null>(
        null,
    );

    const moveGallery = (index: number, delta: number) => {
        const list = [...(form.data.settings.gallery ?? [])];
        const target = index + delta;
        if (target < 0 || target >= list.length) {
            return;
        }
        [list[index], list[target]] = [list[target], list[index]];
        form.setData('settings', {
            ...form.data.settings,
            gallery: list,
        });
    };

    useEffect(() => {
        if (!form.isDirty) return;
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault();
        };
        const stopNav =
            typeof router?.on === 'function'
                ? router.on('before', (event) => {
                      if (
                          !form.processing &&
                          event.detail.visit.method === 'get' &&
                          !window.confirm(
                              'Perubahan pengaturan belum disimpan. Yakin ingin meninggalkan halaman ini?',
                          )
                      ) {
                          return false;
                      }
                  })
                : undefined;
        window.addEventListener('beforeunload', warn);
        return () => {
            window.removeEventListener('beforeunload', warn);
            stopNav?.();
        };
    }, [form.isDirty, form.processing]);

    const text = (
        group: 'hero' | 'headings' | 'site',
        field: string,
        value: string,
    ) => {
        const updateValue = (next: string) =>
            form.setData('settings', {
                ...form.data.settings,
                [group]: {
                    ...form.data.settings[group],
                    [field]: next,
                },
            });

        const inputType =
            field === 'email'
                ? 'email'
                : field === 'phone'
                  ? 'tel'
                  : ['maps_url', 'map_embed'].includes(field)
                    ? 'url'
                    : 'text';

        return (
            <FormField key={field} label={labels[field] ?? field}>
                {MULTILINE_FIELDS.has(field) ? (
                    <textarea
                        className="textarea w-full"
                        rows={2}
                        value={value ?? ''}
                        onChange={(event) => updateValue(event.target.value)}
                    />
                ) : (
                    <input
                        type={inputType}
                        className={inputClass}
                        value={value ?? ''}
                        onChange={(event) => updateValue(event.target.value)}
                    />
                )}
            </FormField>
        );
    };
    return (
        <div className="space-y-5">
            <PageHeader
                title={
                    section === 'beranda'
                        ? 'Beranda & Hero'
                        : section === 'galeri'
                          ? 'Galeri & Kehidupan di Andalas Residence'
                          : 'Kontak & Identitas Situs'
                }
                subtitle="Perubahan disimpan ke database dan digunakan pada halaman publik."
            />
            {section === 'galeri' && (
                <section className="border-primary/25 bg-base-100 space-y-4 rounded-xl border p-5 shadow-xs">
                    <div>
                        <h2 className="flex items-center gap-2 text-base font-semibold">
                            <Upload className="text-primary size-4" />
                            Unggah Foto Langsung ke &ldquo;Kehidupan di Andalas
                            Residence&rdquo;
                        </h2>
                        <p className="text-muted mt-0.5 text-xs">
                            Foto yang diunggah di sini langsung tampil di urutan
                            pertama pada bagian Kehidupan di Andalas Residence
                            di Beranda.
                        </p>
                    </div>
                    <form
                        className="grid gap-4 md:grid-cols-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            uploadForm.post('/andalas/landing/gallery-upload', {
                                forceFormData: true,
                                preserveScroll: true,
                                onSuccess: () => uploadForm.reset(),
                            });
                        }}
                    >
                        <FormField label="Judul Foto">
                            <input
                                required
                                className={inputClass}
                                placeholder="Contoh: Kegiatan Subuh Berjamaah"
                                value={uploadForm.data.title}
                                onChange={(e) =>
                                    uploadForm.setData('title', e.target.value)
                                }
                            />
                        </FormField>
                        <FormField label="Kategori">
                            <input
                                required
                                className={inputClass}
                                placeholder="Contoh: Kehidupan Asrama"
                                value={uploadForm.data.category}
                                onChange={(e) =>
                                    uploadForm.setData(
                                        'category',
                                        e.target.value,
                                    )
                                }
                            />
                        </FormField>
                        <FormField label="Pilih File Foto (JPG/PNG/WebP)">
                            <input
                                type="file"
                                required
                                accept="image/jpeg,image/png,image/webp"
                                className="file-input file-input-bordered w-full"
                                onChange={(e) =>
                                    uploadForm.setData(
                                        'file',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                            />
                        </FormField>
                        <div className="flex items-end">
                            <Button
                                type="submit"
                                disabled={
                                    uploadForm.processing ||
                                    !uploadForm.data.file
                                }
                            >
                                {uploadForm.processing
                                    ? 'Mengunggah...'
                                    : 'Unggah Foto'}
                            </Button>
                        </div>
                        {Object.values(uploadForm.errors).map((err, idx) => (
                            <p
                                key={idx}
                                className="text-error text-xs md:col-span-4"
                            >
                                {err}
                            </p>
                        ))}
                    </form>
                </section>
            )}
            <form
                className="space-y-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.put(saveSettings.url(), { preserveScroll: true });
                }}
            >
                {section === 'galeri' ? (
                    <section className="space-y-5">
                        <div className="border-base-300 bg-base-100 grid gap-4 rounded-xl border p-4 md:grid-cols-2">
                            {text(
                                'headings',
                                'gallery',
                                form.data.settings.headings?.gallery ??
                                    'Kehidupan di Andalas Residence',
                            )}
                            {text(
                                'headings',
                                'gallery_intro',
                                form.data.settings.headings?.gallery_intro ??
                                    '',
                            )}
                            <label className="inline-flex cursor-pointer items-center gap-2 text-sm md:col-span-2">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm checkbox-primary"
                                    checked={
                                        form.data.settings.show_auto_gallery ??
                                        true
                                    }
                                    onChange={(e) =>
                                        form.setData('settings', {
                                            ...form.data.settings,
                                            show_auto_gallery: e.target.checked,
                                        })
                                    }
                                />
                                <span>
                                    Tampilkan juga foto otomatis dari data
                                    Gedung &amp; Program di bawah foto galeri
                                    kelolaan
                                </span>
                            </label>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h3 className="text-base font-semibold">
                                    Daftar Foto Galeri (
                                    {(form.data.settings.gallery ?? []).length})
                                </h3>
                                <p className="text-muted text-xs">
                                    Anda juga dapat menambah foto dari Pustaka
                                    Media, mengatur urutan, atau menghapus foto.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                    form.setData('settings', {
                                        ...form.data.settings,
                                        gallery: [
                                            ...(form.data.settings.gallery ??
                                                []),
                                            {
                                                title: '',
                                                image: '',
                                                category: 'Kehidupan Asrama',
                                            },
                                        ],
                                    })
                                }
                            >
                                Tambah dari Pustaka Media
                            </Button>
                        </div>
                        {(form.data.settings.gallery ?? []).map(
                            (photo, index) => (
                                <div
                                    key={index}
                                    className="border-base-300 grid gap-4 rounded-lg border p-4 md:grid-cols-3"
                                >
                                    <div>
                                        {photo.image && (
                                            <img
                                                src={mediaUrl(photo.image)}
                                                alt={photo.title}
                                                className="mb-3 aspect-video rounded object-cover"
                                            />
                                        )}
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setPicker(index)}
                                        >
                                            Pilih gambar
                                        </Button>
                                    </div>
                                    <FormField label="Judul foto">
                                        <input
                                            className={inputClass}
                                            value={photo.title}
                                            required
                                            onChange={(event) =>
                                                form.setData('settings', {
                                                    ...form.data.settings,
                                                    gallery:
                                                        form.data.settings.gallery.map(
                                                            (row, i) =>
                                                                i === index
                                                                    ? {
                                                                          ...row,
                                                                          title: event
                                                                              .target
                                                                              .value,
                                                                      }
                                                                    : row,
                                                        ),
                                                })
                                            }
                                        />
                                    </FormField>
                                    <div className="space-y-3">
                                        <FormField label="Kategori">
                                            <input
                                                className={inputClass}
                                                value={photo.category}
                                                required
                                                onChange={(event) =>
                                                    form.setData('settings', {
                                                        ...form.data.settings,
                                                        gallery:
                                                            form.data.settings.gallery.map(
                                                                (row, i) =>
                                                                    i === index
                                                                        ? {
                                                                              ...row,
                                                                              category:
                                                                                  event
                                                                                      .target
                                                                                      .value,
                                                                          }
                                                                        : row,
                                                            ),
                                                    })
                                                }
                                            />
                                        </FormField>
                                        <div className="flex items-center gap-1">
                                            <IconButton
                                                label="Geser ke atas"
                                                icon={ArrowUp}
                                                disabled={index === 0}
                                                onClick={() =>
                                                    moveGallery(index, -1)
                                                }
                                            />
                                            <IconButton
                                                label="Geser ke bawah"
                                                icon={ArrowDown}
                                                disabled={
                                                    index ===
                                                    (
                                                        form.data.settings
                                                            .gallery ?? []
                                                    ).length -
                                                        1
                                                }
                                                onClick={() =>
                                                    moveGallery(index, 1)
                                                }
                                            />
                                            <IconButton
                                                label="Hapus foto galeri"
                                                icon={Trash2}
                                                onClick={() =>
                                                    setDeleteTarget({
                                                        kind: 'gallery',
                                                        index,
                                                        label:
                                                            photo.title ||
                                                            `Foto galeri #${index + 1}`,
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            ),
                        )}
                        {galleryAutoPreview.length > 0 && (
                            <div className="border-base-300 bg-base-200/40 space-y-3 rounded-xl border p-4">
                                <p className="text-sm font-semibold">
                                    Pratinjau Foto Otomatis dari Gedung &amp;
                                    Program ({galleryAutoPreview.length})
                                </p>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {galleryAutoPreview.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="border-base-300 bg-base-100 overflow-hidden rounded-lg border"
                                        >
                                            <img
                                                src={mediaUrl(item.image)}
                                                alt={item.title}
                                                className="aspect-video w-full object-cover"
                                            />
                                            <div className="p-2 text-xs">
                                                <p className="truncate font-medium">
                                                    {item.title}
                                                </p>
                                                <p className="text-muted">
                                                    {item.category}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                ) : section === 'beranda' ? (
                    <>
                        <div className="grid items-start gap-6 lg:grid-cols-2">
                            <div className="space-y-4">
                                {Object.entries(form.data.settings.hero)
                                    .filter(([key]) => key !== 'image')
                                    .map(([key, value]) =>
                                        text('hero', key, value),
                                    )}
                            </div>
                            <div className="space-y-3">
                                {form.data.settings.hero.image && (
                                    <img
                                        src={mediaUrl(
                                            form.data.settings.hero.image,
                                        )}
                                        alt={form.data.settings.hero.image_alt}
                                        className="aspect-video w-full rounded-lg object-cover"
                                    />
                                )}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setPicker('hero')}
                                >
                                    Pilih foto hero dari media
                                </Button>
                            </div>
                        </div>
                        <details className="border-base-300 rounded-xl border p-4">
                            <summary className="cursor-pointer font-semibold">
                                Judul dan pengantar bagian beranda
                            </summary>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                {Object.entries(
                                    form.data.settings.headings,
                                ).map(([key, value]) =>
                                    text('headings', key, value),
                                )}
                            </div>
                        </details>
                        <section className="border-base-300 space-y-4 rounded-xl border p-4">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="font-semibold">
                                    Jalur pendaftaran (Kartu beranda)
                                </h2>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        form.setData('settings', {
                                            ...form.data.settings,
                                            registration_tracks: [
                                                ...(form.data.settings
                                                    .registration_tracks ?? []),
                                                {
                                                    badge: '',
                                                    title: '',
                                                    description: '',
                                                    points_text: '',
                                                    cta_label: 'Daftar Akun',
                                                    cta_href: '/register',
                                                },
                                            ],
                                        })
                                    }
                                >
                                    Tambah jalur
                                </Button>
                            </div>
                            {(form.data.settings.registration_tracks ?? []).map(
                                (track, index) => (
                                    <div
                                        key={index}
                                        className="border-base-300 space-y-3 border-t pt-4"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-muted text-xs font-semibold uppercase">
                                                Kartu #{index + 1}
                                            </p>
                                            <IconButton
                                                label={`Hapus jalur ${index + 1}`}
                                                icon={Trash2}
                                                onClick={() =>
                                                    setDeleteTarget({
                                                        kind: 'registration_tracks',
                                                        index,
                                                        label:
                                                            track.title ||
                                                            `Jalur #${index + 1}`,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <FormField label="Lencana / target">
                                                <input
                                                    className={inputClass}
                                                    value={track.badge}
                                                    onChange={(event) =>
                                                        form.setData(
                                                            'settings',
                                                            {
                                                                ...form.data
                                                                    .settings,
                                                                registration_tracks:
                                                                    (
                                                                        form
                                                                            .data
                                                                            .settings
                                                                            .registration_tracks ??
                                                                        []
                                                                    ).map(
                                                                        (
                                                                            row,
                                                                            rowIndex,
                                                                        ) =>
                                                                            rowIndex ===
                                                                            index
                                                                                ? {
                                                                                      ...row,
                                                                                      badge: event
                                                                                          .target
                                                                                          .value,
                                                                                  }
                                                                                : row,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Judul jalur">
                                                <input
                                                    className={inputClass}
                                                    value={track.title}
                                                    required
                                                    onChange={(event) =>
                                                        form.setData(
                                                            'settings',
                                                            {
                                                                ...form.data
                                                                    .settings,
                                                                registration_tracks:
                                                                    (
                                                                        form
                                                                            .data
                                                                            .settings
                                                                            .registration_tracks ??
                                                                        []
                                                                    ).map(
                                                                        (
                                                                            row,
                                                                            rowIndex,
                                                                        ) =>
                                                                            rowIndex ===
                                                                            index
                                                                                ? {
                                                                                      ...row,
                                                                                      title: event
                                                                                          .target
                                                                                          .value,
                                                                                  }
                                                                                : row,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Label tombol">
                                                <input
                                                    className={inputClass}
                                                    value={track.cta_label}
                                                    required
                                                    onChange={(event) =>
                                                        form.setData(
                                                            'settings',
                                                            {
                                                                ...form.data
                                                                    .settings,
                                                                registration_tracks:
                                                                    (
                                                                        form
                                                                            .data
                                                                            .settings
                                                                            .registration_tracks ??
                                                                        []
                                                                    ).map(
                                                                        (
                                                                            row,
                                                                            rowIndex,
                                                                        ) =>
                                                                            rowIndex ===
                                                                            index
                                                                                ? {
                                                                                      ...row,
                                                                                      cta_label:
                                                                                          event
                                                                                              .target
                                                                                              .value,
                                                                                  }
                                                                                : row,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Tujuan tautan tombol">
                                                <input
                                                    className={inputClass}
                                                    value={track.cta_href}
                                                    onChange={(event) =>
                                                        form.setData(
                                                            'settings',
                                                            {
                                                                ...form.data
                                                                    .settings,
                                                                registration_tracks:
                                                                    (
                                                                        form
                                                                            .data
                                                                            .settings
                                                                            .registration_tracks ??
                                                                        []
                                                                    ).map(
                                                                        (
                                                                            row,
                                                                            rowIndex,
                                                                        ) =>
                                                                            rowIndex ===
                                                                            index
                                                                                ? {
                                                                                      ...row,
                                                                                      cta_href:
                                                                                          event
                                                                                              .target
                                                                                              .value,
                                                                                  }
                                                                                : row,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                />
                                            </FormField>
                                        </div>
                                        <FormField label="Deskripsi singkat">
                                            <textarea
                                                className="textarea w-full"
                                                rows={2}
                                                value={track.description}
                                                required
                                                onChange={(event) =>
                                                    form.setData('settings', {
                                                        ...form.data.settings,
                                                        registration_tracks: (
                                                            form.data.settings
                                                                .registration_tracks ??
                                                            []
                                                        ).map(
                                                            (row, rowIndex) =>
                                                                rowIndex ===
                                                                index
                                                                    ? {
                                                                          ...row,
                                                                          description:
                                                                              event
                                                                                  .target
                                                                                  .value,
                                                                      }
                                                                    : row,
                                                        ),
                                                    })
                                                }
                                            />
                                        </FormField>
                                        <FormField label="Daftar poin (1 baris = 1 poin)">
                                            <textarea
                                                className="textarea w-full"
                                                rows={3}
                                                value={track.points_text}
                                                required
                                                onChange={(event) =>
                                                    form.setData('settings', {
                                                        ...form.data.settings,
                                                        registration_tracks: (
                                                            form.data.settings
                                                                .registration_tracks ??
                                                            []
                                                        ).map(
                                                            (row, rowIndex) =>
                                                                rowIndex ===
                                                                index
                                                                    ? {
                                                                          ...row,
                                                                          points_text:
                                                                              event
                                                                                  .target
                                                                                  .value,
                                                                      }
                                                                    : row,
                                                        ),
                                                    })
                                                }
                                            />
                                        </FormField>
                                    </div>
                                ),
                            )}
                        </section>
                        {(
                            [
                                'facilities',
                                'core_rules',
                                'payment_steps',
                                'categories',
                                'steps',
                                'services',
                                'faqs',
                            ] as const
                        ).map((group) => (
                            <section
                                key={group}
                                className="border-base-300 space-y-4 rounded-xl border p-4"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="font-semibold">
                                        {
                                            {
                                                facilities: 'Fasilitas asrama',
                                                core_rules:
                                                    'Aturan penting penghuni',
                                                payment_steps:
                                                    'Langkah prosedur pembayaran',
                                                categories: 'Kategori penghuni',
                                                steps: 'Tahapan pendaftaran',
                                                services: 'Layanan',
                                                faqs: 'Pertanyaan umum',
                                            }[group]
                                        }
                                    </h2>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
                                            form.setData('settings', {
                                                ...form.data.settings,
                                                [group]: [
                                                    ...(form.data.settings[
                                                        group
                                                    ] ?? []),
                                                    group === 'faqs'
                                                        ? { q: '', a: '' }
                                                        : {
                                                              title: '',
                                                              text: '',
                                                          },
                                                ],
                                            })
                                        }
                                    >
                                        Tambah item
                                    </Button>
                                </div>
                                {(form.data.settings[group] ?? []).map(
                                    (item, index) => (
                                        <div
                                            key={index}
                                            className="border-base-300 grid gap-3 border-t pt-4 md:grid-cols-[1fr_2fr_auto]"
                                        >
                                            {Object.entries(item).map(
                                                ([field, value]) => (
                                                    <FormField
                                                        key={field}
                                                        label={
                                                            field === 'title'
                                                                ? 'Judul'
                                                                : field === 'q'
                                                                  ? 'Pertanyaan'
                                                                  : field ===
                                                                      'a'
                                                                    ? 'Jawaban'
                                                                    : 'Uraian'
                                                        }
                                                    >
                                                        {field === 'title' ||
                                                        field === 'q' ? (
                                                            <input
                                                                className={
                                                                    inputClass
                                                                }
                                                                value={value}
                                                                required
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    form.setData(
                                                                        'settings',
                                                                        {
                                                                            ...form
                                                                                .data
                                                                                .settings,
                                                                            [group]:
                                                                                (
                                                                                    form
                                                                                        .data
                                                                                        .settings[
                                                                                        group
                                                                                    ] ??
                                                                                    []
                                                                                ).map(
                                                                                    (
                                                                                        row,
                                                                                        rowIndex,
                                                                                    ) =>
                                                                                        rowIndex ===
                                                                                        index
                                                                                            ? {
                                                                                                  ...row,
                                                                                                  [field]:
                                                                                                      event
                                                                                                          .target
                                                                                                          .value,
                                                                                              }
                                                                                            : row,
                                                                                ),
                                                                        },
                                                                    )
                                                                }
                                                            />
                                                        ) : (
                                                            <textarea
                                                                className="textarea w-full"
                                                                rows={2}
                                                                value={value}
                                                                required
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    form.setData(
                                                                        'settings',
                                                                        {
                                                                            ...form
                                                                                .data
                                                                                .settings,
                                                                            [group]:
                                                                                (
                                                                                    form
                                                                                        .data
                                                                                        .settings[
                                                                                        group
                                                                                    ] ??
                                                                                    []
                                                                                ).map(
                                                                                    (
                                                                                        row,
                                                                                        rowIndex,
                                                                                    ) =>
                                                                                        rowIndex ===
                                                                                        index
                                                                                            ? {
                                                                                                  ...row,
                                                                                                  [field]:
                                                                                                      event
                                                                                                          .target
                                                                                                          .value,
                                                                                              }
                                                                                            : row,
                                                                                ),
                                                                        },
                                                                    )
                                                                }
                                                            />
                                                        )}
                                                    </FormField>
                                                ),
                                            )}
                                            <IconButton
                                                label={`Hapus item ${index + 1}`}
                                                icon={Trash2}
                                                onClick={() => {
                                                    const rowRecord =
                                                        item as Record<
                                                            string,
                                                            string
                                                        >;
                                                    setDeleteTarget({
                                                        kind: group,
                                                        index,
                                                        label:
                                                            rowRecord.title ||
                                                            rowRecord.q ||
                                                            `Item #${index + 1}`,
                                                    });
                                                }}
                                            />
                                        </div>
                                    ),
                                )}
                            </section>
                        ))}
                    </>
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-2">
                            {Object.entries(form.data.settings.site)
                                .filter(([key]) => key !== 'logo')
                                .map(([key, value]) =>
                                    text('site', key, value),
                                )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            {form.data.settings.site.logo && (
                                <img
                                    className="max-h-16 max-w-48 object-contain"
                                    src={mediaUrl(form.data.settings.site.logo)}
                                    alt="Logo situs"
                                />
                            )}
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setPicker('logo')}
                            >
                                Pilih logo dari media
                            </Button>
                        </div>
                    </>
                )}
                {Object.entries(form.errors).map(([field, error]) => (
                    <p key={field} role="alert" className="text-error text-sm">
                        {error}
                    </p>
                ))}
                <div className="flex justify-end">
                    <Button type="submit" disabled={form.processing}>
                        Simpan perubahan
                    </Button>
                </div>
            </form>
            <MediaPicker
                open={picker !== null}
                onClose={() => setPicker(null)}
                onSelect={(asset) =>
                    form.setData(
                        'settings',
                        typeof picker === 'number'
                            ? {
                                  ...form.data.settings,
                                  gallery: form.data.settings.gallery.map(
                                      (row, index) =>
                                          index === picker
                                              ? {
                                                    ...row,
                                                    image: `/storage/${asset.path}`,
                                                }
                                              : row,
                                  ),
                              }
                            : picker === 'hero'
                              ? {
                                    ...form.data.settings,
                                    hero: {
                                        ...form.data.settings.hero,
                                        image: `/storage/${asset.path}`,
                                    },
                                }
                              : {
                                    ...form.data.settings,
                                    site: {
                                        ...form.data.settings.site,
                                        logo: `/storage/${asset.path}`,
                                    },
                                },
                    )
                }
            />
            {deleteTarget && (
                <ConfirmDialog
                    open={deleteTarget !== null}
                    onClose={() => setDeleteTarget(null)}
                    title="Hapus Item"
                    message={`Yakin ingin menghapus "${deleteTarget.label}"? Perubahan akan berlaku permanen setelah Anda menekan Simpan perubahan.`}
                    confirmLabel="Ya, Hapus"
                    onConfirm={() => {
                        if (deleteTarget.kind === 'gallery') {
                            form.setData('settings', {
                                ...form.data.settings,
                                gallery: form.data.settings.gallery.filter(
                                    (_, i) => i !== deleteTarget.index,
                                ),
                            });
                        } else {
                            const kind = deleteTarget.kind;
                            form.setData('settings', {
                                ...form.data.settings,
                                [kind]: (form.data.settings[kind] ?? []).filter(
                                    (_, i) => i !== deleteTarget.index,
                                ),
                            });
                        }
                        setDeleteTarget(null);
                    }}
                />
            )}
        </div>
    );
}
