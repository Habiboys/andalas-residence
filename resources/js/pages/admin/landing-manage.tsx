import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
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
type Props = {
    section: string;
    record: ProfileRecord | null;
    settings: LandingSettings;
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
};

function SettingsForm({
    settings,
    section,
}: {
    settings: LandingSettings;
    section: string;
}) {
    const form = useForm({ settings, section });
    const [picker, setPicker] = useState<'hero' | 'logo' | number | null>(null);
    const text = (
        group: 'hero' | 'headings' | 'site',
        field: string,
        value: string,
    ) => (
        <FormField key={field} label={labels[field] ?? field}>
            <textarea
                className="textarea w-full"
                rows={2}
                value={value ?? ''}
                onChange={(event) =>
                    form.setData('settings', {
                        ...form.data.settings,
                        [group]: {
                            ...form.data.settings[group],
                            [field]: event.target.value,
                        },
                    })
                }
            />
        </FormField>
    );
    return (
        <div className="space-y-5">
            <PageHeader
                title={
                    section === 'beranda'
                        ? 'Beranda & Hero'
                        : section === 'galeri'
                          ? 'Galeri Landing Page'
                          : 'Kontak & Identitas Situs'
                }
                subtitle="Perubahan disimpan ke database dan digunakan pada halaman publik."
            />
            <form
                className="space-y-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.put(saveSettings.url(), { preserveScroll: true });
                }}
            >
                {section === 'galeri' ? (
                    <section className="space-y-4">
                        <p className="text-muted text-sm">
                            Foto tambahan di beranda. Foto gedung dan program
                            juga ditampilkan otomatis dari data masing-masing.
                        </p>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() =>
                                form.setData('settings', {
                                    ...form.data.settings,
                                    gallery: [
                                        ...(form.data.settings.gallery ?? []),
                                        {
                                            title: '',
                                            image: '',
                                            category: 'Kegiatan',
                                        },
                                    ],
                                })
                            }
                        >
                            Tambah foto
                        </Button>
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
                                    <div>
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
                                        <IconButton
                                            label="Hapus foto galeri"
                                            icon={Trash2}
                                            onClick={() =>
                                                form.setData('settings', {
                                                    ...form.data.settings,
                                                    gallery:
                                                        form.data.settings.gallery.filter(
                                                            (_, i) =>
                                                                i !== index,
                                                        ),
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            ),
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
                        {(
                            ['categories', 'steps', 'services', 'faqs'] as const
                        ).map((group) => (
                            <section
                                key={group}
                                className="border-base-300 space-y-4 rounded-xl border p-4"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="font-semibold">
                                        {
                                            {
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
                                                    ...form.data.settings[
                                                        group
                                                    ],
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
                                {form.data.settings[group].map(
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
                                                        <textarea
                                                            className="textarea w-full"
                                                            value={value}
                                                            required
                                                            onChange={(event) =>
                                                                form.setData(
                                                                    'settings',
                                                                    {
                                                                        ...form
                                                                            .data
                                                                            .settings,
                                                                        [group]:
                                                                            form.data.settings[
                                                                                group
                                                                            ].map(
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
                                                    </FormField>
                                                ),
                                            )}
                                            <IconButton
                                                label={`Hapus item ${index + 1}`}
                                                icon={Trash2}
                                                onClick={() =>
                                                    form.setData('settings', {
                                                        ...form.data.settings,
                                                        [group]:
                                                            form.data.settings[
                                                                group
                                                            ].filter(
                                                                (_, rowIndex) =>
                                                                    index !==
                                                                    rowIndex,
                                                            ),
                                                    })
                                                }
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
        </div>
    );
}
