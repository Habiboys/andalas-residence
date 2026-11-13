import * as workflow from '@/actions/App/Http/Controllers/ResidenceWorkflowController';
import { ConfirmDialog } from '@/andalas/components/ui';
import { formatRupiah } from '@/andalas/lib/format';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { WorkflowPanel, fieldInputClass } from './shared';
import {
    CATEGORY_LABELS,
    STANDARD_DOC_KINDS,
    formatDocumentLabel,
    type Building,
    type Policy,
    type Rate,
    type Settings,
    type TemplateItem,
} from './types';

export default function PoliciesTab({
    buildings,
    policyCatalog,
    policies,
    masterHousingUrl,
    templates = [],
}: {
    buildings: Building[];
    policyCatalog: Record<
        string,
        Array<{ id: string; name: string; rates: Rate[]; issue: string | null }>
    >;
    policies: Policy[];
    masterHousingUrl: string | null;
    templates?: TemplateItem[];
}) {
    const defaults: Settings = {
        open: false,
        documents: ['perjanjian'],
        building_ids: [],
        rates: [],
        month_days: 30,
        day_basis: 'nights',
        monthly_allowed: false,
    };
    const firstCategory = 'local_non_kipk';
    const form = useForm({
        category: firstCategory,
        settings:
            policies.find((policy) => policy.category === firstCategory)
                ?.settings ?? defaults,
    });
    const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
    const [deletingTemplate, setDeletingTemplate] =
        useState<TemplateItem | null>(null);
    const [templateBusy, setTemplateBusy] = useState<string | null>(null);
    const [templateError, setTemplateError] = useState<string | null>(null);

    const active = policies.find(
        (policy) => policy.category === form.data.category,
    );
    const isOpen = Boolean(active?.published_at && active.settings.open);
    const catalog = policyCatalog[form.data.category] ?? [];
    const ready = catalog.filter((building) => !building.issue);
    const blocked = catalog.filter((building) => building.issue);
    const policyCategories = Object.entries(CATEGORY_LABELS).filter(
        ([category]) => category !== 'postgraduate',
    );

    const selectedDocs = form.data.settings.documents.filter(Boolean);
    const extraCustomDocs = selectedDocs.filter(
        (kind) => !STANDARD_DOC_KINDS.some((std) => std.key === kind),
    );
    const templateKinds = Array.from(new Set([...selectedDocs, 'perjanjian']));

    function selectCategory(category: string) {
        form.setData({
            category,
            settings:
                policies.find((policy) => policy.category === category)
                    ?.settings ?? defaults,
        });
        form.clearErrors();
        setTemplateError(null);
    }

    function toggleDocument(kind: string, checked: boolean) {
        const current = new Set(selectedDocs);
        if (checked) {
            current.add(kind);
        } else if (kind !== 'perjanjian') {
            current.delete(kind);
        }
        form.setData('settings', {
            ...form.data.settings,
            documents: Array.from(current),
        });
    }

    function changeStatus(open: boolean) {
        form.transform(({ category, settings }) => ({
            category,
            settings: {
                open,
                documents: settings.documents.filter(Boolean),
                month_days: settings.month_days,
                day_basis: settings.day_basis,
                monthly_allowed: settings.monthly_allowed,
            },
        }));
        form.post(workflow.policy.url(), {
            preserveScroll: true,
            onSuccess: () => setConfirmCloseOpen(false),
        });
    }

    function confirmDeleteTemplate() {
        if (!deletingTemplate) {
            return;
        }
        setTemplateBusy(deletingTemplate.id);
        setTemplateError(null);
        router.delete(`/residence-process/templates/${deletingTemplate.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingTemplate(null),
            onError: (errors) =>
                setTemplateError(
                    String(
                        Object.values(errors)[0] ?? 'Gagal menghapus template.',
                    ),
                ),
            onFinish: () => setTemplateBusy(null),
        });
    }

    return (
        <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {policyCategories.map(([catKey, catLabel]) => {
                    const catPolicy = policies.find(
                        (p) => p.category === catKey,
                    );
                    const catOpen = Boolean(
                        catPolicy?.published_at && catPolicy.settings.open,
                    );
                    const catReadyCount = (policyCatalog[catKey] ?? []).filter(
                        (b) => !b.issue,
                    ).length;
                    const selected = form.data.category === catKey;

                    return (
                        <button
                            key={catKey}
                            type="button"
                            onClick={() => selectCategory(catKey)}
                            className={`rounded-xl border p-4 text-left transition ${
                                selected
                                    ? 'border-primary bg-primary/5 ring-primary/20 ring-2'
                                    : 'border-base-300 bg-base-100 hover:border-primary/50'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span
                                    className={`badge badge-xs ${
                                        catOpen
                                            ? 'badge-success'
                                            : 'badge-ghost'
                                    }`}
                                >
                                    {catOpen ? 'Dibuka' : 'Ditutup'}
                                </span>
                                {catPolicy?.version ? (
                                    <span className="text-base-content/50 text-xs">
                                        v{catPolicy.version}
                                    </span>
                                ) : null}
                            </div>
                            <p className="mt-2 font-semibold">{catLabel}</p>
                            <p className="text-base-content/60 mt-1 text-xs">
                                {catReadyCount} gedung siap dibuka
                            </p>
                        </button>
                    );
                })}
            </div>

            <WorkflowPanel title="Buka / Tutup Pendaftaran">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <label className="block min-w-64 flex-1 space-y-1 text-sm font-medium">
                        <span>Kategori pendaftaran</span>
                        <select
                            className={fieldInputClass}
                            value={form.data.category}
                            onChange={(event) =>
                                selectCategory(event.target.value)
                            }
                        >
                            {policyCategories.map(([category, label]) => (
                                <option key={category} value={category}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="bg-base-200/60 border-base-300 rounded-lg border px-4 py-2.5 text-sm">
                        Status{' '}
                        <strong
                            className={
                                isOpen ? 'text-success' : 'text-base-content'
                            }
                        >
                            {isOpen ? 'Dibuka' : 'Ditutup'}
                        </strong>
                    </div>
                </div>

                <div className="border-base-300 space-y-3 rounded-xl border p-4">
                    <div>
                        <h3 className="font-semibold">Gedung yang siap</h3>
                        <p className="text-base-content/70 text-sm">
                            Sistem mengambil kategori penghuni, tipe kamar, dan
                            tarif dari Gedung &amp; Kamar secara otomatis tanpa
                            input berulang.
                        </p>
                    </div>
                    {ready.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {ready.map((building) => (
                                <div
                                    key={building.id}
                                    className="bg-base-200/50 border-base-300 space-y-2 rounded-lg border p-3"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold">
                                            {building.name}
                                        </span>
                                        <span className="badge badge-success badge-xs">
                                            Siap
                                        </span>
                                    </div>
                                    {building.rates.length > 0 && (
                                        <ul className="text-base-content/70 space-y-1 text-xs">
                                            {building.rates.map((r, idx) => (
                                                <li key={idx}>
                                                    Tipe {r.type} ({r.unit}):{' '}
                                                    {formatRupiah(
                                                        Number(r.amount),
                                                    )}
                                                    {Number(r.room_amount) > 0
                                                        ? ` · Sewa kamar: ${formatRupiah(Number(r.room_amount))}`
                                                        : ''}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-base-content/70 text-sm">
                            Belum ada gedung siap untuk kategori ini.
                        </p>
                    )}
                </div>

                {(blocked.length > 0 || !ready.length) && (
                    <div
                        className="border-warning/40 bg-warning/10 space-y-3 rounded-xl border p-4"
                        role="status"
                    >
                        <p className="font-medium">
                            Gedung yang belum siap tidak ikut dibuka.
                        </p>
                        <div className="space-y-2">
                            {blocked.map((building) => {
                                const url = buildings.find(
                                    (item) => item.id === building.id,
                                )?.settings_url;
                                return (
                                    <div
                                        key={building.id}
                                        className="bg-base-100/80 border-base-300 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                                    >
                                        <p>
                                            <strong>{building.name}</strong> ·{' '}
                                            {building.issue}
                                        </p>
                                        {url && (
                                            <a
                                                className="btn btn-xs btn-outline"
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Atur gedung
                                            </a>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                            {masterHousingUrl && (
                                <a
                                    className="btn btn-sm"
                                    href={masterHousingUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Buka Gedung &amp; Kamar
                                </a>
                            )}
                            <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() =>
                                    router.reload({
                                        only: ['policyCatalog', 'buildings'],
                                    })
                                }
                            >
                                Periksa ulang konfigurasi
                            </button>
                        </div>
                    </div>
                )}

                <details className="border-base-300 rounded-xl border p-4" open>
                    <summary className="cursor-pointer font-medium">
                        Persyaratan Dokumen &amp; Template Resmi
                    </summary>
                    <div className="mt-3 space-y-4">
                        <fieldset className="space-y-2">
                            <legend className="text-sm font-medium">
                                Dokumen wajib diunggah pendaftar
                            </legend>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {STANDARD_DOC_KINDS.map(({ key, label }) => (
                                    <label
                                        key={key}
                                        className="bg-base-200/40 border-base-300 flex items-center gap-2 rounded-lg border p-2.5 text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-sm"
                                            checked={selectedDocs.includes(key)}
                                            disabled={key === 'perjanjian'}
                                            onChange={(e) =>
                                                toggleDocument(
                                                    key,
                                                    e.target.checked,
                                                )
                                            }
                                        />
                                        <span>
                                            {label}
                                            {key === 'perjanjian' && (
                                                <span className="text-base-content/50 ml-1 text-xs">
                                                    (wajib sistem)
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {extraCustomDocs.length > 0 && (
                                <p className="text-base-content/70 text-xs">
                                    Dokumen tambahan aktif:{' '}
                                    {extraCustomDocs.join(', ')}
                                </p>
                            )}
                        </fieldset>

                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={form.data.settings.monthly_allowed}
                                onChange={(event) =>
                                    form.setData('settings', {
                                        ...form.data.settings,
                                        monthly_allowed: event.target.checked,
                                    })
                                }
                            />
                            Izinkan pengajuan skema pembayaran bulanan sesuai
                            syarat
                        </label>

                        <div className="border-base-200 space-y-2 border-t pt-3">
                            <p className="text-sm font-medium">
                                Template Dokumen (Word / PDF)
                            </p>
                            <p className="text-base-content/70 text-xs">
                                Unggah format resmi per jenis dokumen agar
                                mahasiswa dapat mengunduh, mengisi, dan
                                mengunggah kembali.
                            </p>
                            {templateError && (
                                <p
                                    role="alert"
                                    className="alert alert-error py-2 text-xs"
                                >
                                    {templateError}
                                </p>
                            )}
                            <div className="space-y-2">
                                {templateKinds.map((kind) => {
                                    const tpl = templates.find(
                                        (t) =>
                                            t.category === form.data.category &&
                                            t.kind === kind,
                                    );
                                    return (
                                        <div
                                            key={kind}
                                            className="bg-base-200/40 flex flex-wrap items-center justify-between gap-2 rounded-lg p-2.5 text-xs"
                                        >
                                            <div>
                                                <strong className="text-sm">
                                                    {formatDocumentLabel(kind)}
                                                </strong>
                                                <span className="text-base-content/70 block">
                                                    {tpl
                                                        ? `Tersedia: ${tpl.original_name}`
                                                        : 'Belum ada template'}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {tpl && (
                                                    <>
                                                        <a
                                                            className="btn btn-xs btn-outline"
                                                            href={`/residence-process/templates/${form.data.category}/${kind}`}
                                                        >
                                                            Unduh
                                                        </a>
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-ghost text-error"
                                                            onClick={() =>
                                                                setDeletingTemplate(
                                                                    tpl,
                                                                )
                                                            }
                                                        >
                                                            Hapus
                                                        </button>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    accept=".doc,.docx,.pdf,.odt,.rtf"
                                                    aria-label={`Unggah template ${kind}`}
                                                    disabled={
                                                        templateBusy === kind
                                                    }
                                                    className="file-input file-input-xs max-w-52"
                                                    onChange={(e) => {
                                                        const file =
                                                            e.target.files?.[0];
                                                        if (!file) return;
                                                        setTemplateError(null);
                                                        setTemplateBusy(kind);
                                                        router.post(
                                                            '/residence-process/templates',
                                                            {
                                                                category:
                                                                    form.data
                                                                        .category,
                                                                kind,
                                                                file,
                                                            },
                                                            {
                                                                forceFormData: true,
                                                                preserveScroll: true,
                                                                onError: (
                                                                    errs,
                                                                ) =>
                                                                    setTemplateError(
                                                                        String(
                                                                            Object.values(
                                                                                errs,
                                                                            )[0] ??
                                                                                'Gagal mengunggah template.',
                                                                        ),
                                                                    ),
                                                                onFinish: () =>
                                                                    setTemplateBusy(
                                                                        null,
                                                                    ),
                                                            },
                                                        );
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </details>

                {Object.values(form.errors).map((error, index) => (
                    <p
                        key={index}
                        role="alert"
                        className="alert alert-error py-2 text-sm"
                    >
                        {error}
                    </p>
                ))}

                <div className="border-base-300 flex flex-wrap gap-2 border-t pt-4">
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={form.processing || !ready.length}
                        onClick={() => changeStatus(true)}
                    >
                        {isOpen
                            ? 'Perbarui konfigurasi pembukaan'
                            : 'Buka Pendaftaran'}
                    </button>
                    {isOpen && (
                        <button
                            type="button"
                            className="btn btn-outline"
                            disabled={form.processing}
                            onClick={() => setConfirmCloseOpen(true)}
                        >
                            Tutup Pendaftaran
                        </button>
                    )}
                </div>
            </WorkflowPanel>

            {confirmCloseOpen && (
                <ConfirmDialog
                    open
                    onClose={() => setConfirmCloseOpen(false)}
                    onConfirm={() => changeStatus(false)}
                    loading={form.processing}
                    title="Tutup Pendaftaran Kategori Ini?"
                    message={`Calon penghuni pada kategori ${CATEGORY_LABELS[form.data.category] ?? form.data.category} tidak akan dapat mengajukan pendaftaran baru setelah ditutup.`}
                    confirmLabel="Ya, Tutup Pendaftaran"
                />
            )}

            {deletingTemplate && (
                <ConfirmDialog
                    open
                    onClose={() => setDeletingTemplate(null)}
                    onConfirm={confirmDeleteTemplate}
                    loading={templateBusy === deletingTemplate.id}
                    title="Hapus Template Dokumen?"
                    message={`Template "${deletingTemplate.original_name}" akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.`}
                    confirmLabel="Hapus Template"
                />
            )}
        </div>
    );
}
