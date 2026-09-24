import { useState, type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Card,
    PageHeader,
    Button,
    FormField,
    inputClass,
    DataTable,
    Drawer,
    RowActions,
} from './ui';
import { store, review, proof, evidence } from '@/routes/andalas/perizinan';

type Leave = {
    id: string;
    jenis: string;
    status: string;
    tanggal_mulai: string;
    tanggal_kembali: string;
    alasan: string;
    tujuan_alamat: string;
    kontak_darurat?: string;
    catatan_verifikasi?: string;
    dokumen_path?: string;
    sampai_foto_path?: string;
    kembali_foto_path?: string;
    sampai_pada?: string;
    kembali_pada?: string;
    sampai_latitude?: string;
    sampai_longitude?: string;
    kembali_latitude?: string;
    kembali_longitude?: string;
    sampai_accuracy?: string;
    kembali_accuracy?: string;
    mahasiswa?: { user?: { nama?: string } };
    gedung?: { nama_gedung?: string };
};
const statuses: Record<string, string> = {
    diajukan: 'Menunggu verifikasi',
    sedang_izin: 'Sedang izin',
    sudah_sampai: 'Sudah sampai',
    selesai_kembali: 'Sudah kembali',
    ditolak: 'Ditolak',
};
const date = (value?: string) =>
    value ? new Date(value).toLocaleString('id-ID') : '—';

export default function PerizinanPanel({
    perizinan = [],
    reviewer = false,
    canSubmit = false,
}: {
    perizinan?: Leave[];
    reviewer?: boolean;
    canSubmit?: boolean;
}) {
    const [selected, setSelected] = useState<Leave | null>(null);
    const [locating, setLocating] = useState(false);
    const [locationError, setLocationError] = useState('');
    const form = useForm({
        jenis: 'pulkam',
        tanggal_mulai: '',
        tanggal_kembali: '',
        alasan: '',
        tujuan_alamat: '',
        kontak_darurat: '',
        dokumen: null as File | null,
    });
    const approval = useForm({ status: 'disetujui', catatan_verifikasi: '' });
    const evidenceForm = useForm({ foto: null as File | null });
    const pending = perizinan.some(
        (leave) => !['selesai_kembali', 'ditolak'].includes(leave.status),
    );
    const open = (leave: Leave) => {
        setSelected(leave);
        evidenceForm.resetAndClearErrors();
        approval.resetAndClearErrors();
        setLocationError('');
    };
    const close = () => {
        if (!locating && !evidenceForm.processing && !approval.processing)
            setSelected(null);
    };
    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(store.url(), {
            forceFormData: true,
            onSuccess: () => form.reset(),
            preserveScroll: true,
        });
    }
    function decide(status: string) {
        if (!selected) return;
        approval.transform((values) => ({ ...values, status }));
        approval.post(review.url(selected.id), {
            onSuccess: () => setSelected(null),
            preserveScroll: true,
        });
    }
    function sendProof(event: FormEvent) {
        event.preventDefault();
        if (!selected || !evidenceForm.data.foto) return;
        if (!navigator.geolocation) {
            setLocationError(
                'Perangkat tidak mendukung lokasi. Gunakan perangkat yang menyediakan GPS.',
            );
            return;
        }
        setLocating(true);
        setLocationError('');
        const kind = selected.status === 'sudah_sampai' ? 'kembali' : 'sampai';
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocating(false);
                evidenceForm.transform((values) => ({
                    ...values,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                }));
                evidenceForm.post(proof.url({ perizinan: selected.id, kind }), {
                    forceFormData: true,
                    preserveScroll: true,
                    onSuccess: () => setSelected(null),
                });
            },
            () => {
                setLocating(false);
                setLocationError(
                    'Lokasi belum diperoleh. Aktifkan GPS dan izinkan akses lokasi, lalu coba lagi.',
                );
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
        );
    }
    return (
        <div className="space-y-5">
            <PageHeader
                title={
                    reviewer ? 'Monitoring Perizinan' : 'Perizinan Mahasiswa'
                }
                subtitle={
                    reviewer
                        ? 'Verifikasi dan pantau izin mahasiswa pada gedung penugasan Anda.'
                        : 'Ajukan izin pulang kampung atau kegiatan, lalu unggah bukti sampai dan kembali.'
                }
            />
            {!reviewer && (
                <Card className="p-5">
                    {!canSubmit ? (
                        <p className="text-muted text-sm">
                            Perizinan tersedia setelah Anda menjadi penghuni
                            aktif.
                        </p>
                    ) : pending ? (
                        <p className="text-muted text-sm">
                            Masih ada izin yang berjalan. Buka detail izin untuk
                            memantau status atau mengunggah bukti.
                        </p>
                    ) : (
                        <details>
                            <summary className="cursor-pointer font-medium">
                                Ajukan izin baru
                            </summary>
                            <p className="text-muted my-4 text-sm">
                                Izin perlu verifikasi fasilitator jika jumlah
                                pengajuan sebelumnya lebih dari 6.
                            </p>
                            <form
                                onSubmit={submit}
                                className="grid gap-4 md:grid-cols-2"
                            >
                                <FormField label="Jenis izin">
                                    <select
                                        className={inputClass}
                                        value={form.data.jenis}
                                        onChange={(event) =>
                                            form.setData(
                                                'jenis',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="pulkam">
                                            Pulang kampung
                                        </option>
                                        <option value="kegiatan">
                                            Kegiatan
                                        </option>
                                    </select>
                                </FormField>
                                <FormField label="Tujuan / alamat">
                                    <input
                                        required
                                        maxLength={255}
                                        className={inputClass}
                                        value={form.data.tujuan_alamat}
                                        onChange={(event) =>
                                            form.setData(
                                                'tujuan_alamat',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField label="Tanggal mulai">
                                    <input
                                        required
                                        type="date"
                                        className={inputClass}
                                        value={form.data.tanggal_mulai}
                                        onChange={(event) =>
                                            form.setData(
                                                'tanggal_mulai',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField label="Rencana kembali">
                                    <input
                                        required
                                        type="date"
                                        className={inputClass}
                                        value={form.data.tanggal_kembali}
                                        onChange={(event) =>
                                            form.setData(
                                                'tanggal_kembali',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField label="Alasan">
                                    <textarea
                                        required
                                        rows={3}
                                        maxLength={2000}
                                        className={inputClass}
                                        value={form.data.alasan}
                                        onChange={(event) =>
                                            form.setData(
                                                'alasan',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <div className="space-y-4">
                                    <FormField label="Dokumen pendukung (opsional)">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                                            className={inputClass}
                                            onChange={(event) =>
                                                form.setData(
                                                    'dokumen',
                                                    event.target.files?.[0] ??
                                                        null,
                                                )
                                            }
                                        />
                                        <p className="text-muted mt-1 text-xs">
                                            PDF atau foto, maksimal 5 MB.
                                        </p>
                                    </FormField>
                                    <FormField label="Kontak darurat (opsional)">
                                        <input
                                            maxLength={50}
                                            className={inputClass}
                                            value={form.data.kontak_darurat}
                                            onChange={(event) =>
                                                form.setData(
                                                    'kontak_darurat',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                </div>
                                <div className="md:col-span-2">
                                    {Object.values(form.errors).map(
                                        (message) => (
                                            <p
                                                key={message}
                                                role="alert"
                                                className="text-error text-sm"
                                            >
                                                {message}
                                            </p>
                                        ),
                                    )}
                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                    >
                                        {form.processing
                                            ? 'Mengirim…'
                                            : 'Kirim pengajuan'}
                                    </Button>
                                </div>
                            </form>
                        </details>
                    )}
                </Card>
            )}
            <Card>
                <DataTable
                    data={perizinan}
                    searchKeys={[
                        'alasan',
                        'tujuan_alamat',
                        'mahasiswa.user.nama',
                    ]}
                    columns={[
                        ...(reviewer
                            ? [
                                  {
                                      key: 'nama',
                                      label: 'Mahasiswa',
                                      render: (row: Leave) =>
                                          row.mahasiswa?.user?.nama ?? '—',
                                  },
                                  {
                                      key: 'gedung',
                                      label: 'Gedung',
                                      value: (row: Leave) =>
                                          row.gedung?.nama_gedung ?? '—',
                                  },
                              ]
                            : []),
                        {
                            key: 'jenis',
                            label: 'Jenis',
                            filter: {
                                type: 'select',
                                options: [
                                    {
                                        value: 'pulkam',
                                        label: 'Pulang kampung',
                                    },
                                    { value: 'kegiatan', label: 'Kegiatan' },
                                ],
                            },
                            render: (row) =>
                                row.jenis === 'pulkam'
                                    ? 'Pulang kampung'
                                    : 'Kegiatan',
                        },
                        {
                            key: 'tanggal_mulai',
                            label: 'Mulai',
                            render: (row) => row.tanggal_mulai.slice(0, 10),
                        },
                        {
                            key: 'tanggal_kembali',
                            label: 'Rencana kembali',
                            render: (row) => row.tanggal_kembali.slice(0, 10),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            filter: {
                                type: 'select',
                                options: Object.entries(statuses).map(
                                    ([value, label]) => ({ value, label }),
                                ),
                            },
                            render: (row) => statuses[row.status] ?? row.status,
                        },
                        {
                            key: 'actions',
                            label: 'Aksi',
                            action: true,
                            render: (row) => (
                                <RowActions onDetail={() => open(row)} />
                            ),
                        },
                    ]}
                />
            </Card>
            <Drawer
                open={!!selected}
                onClose={close}
                title="Detail perizinan"
                width="w-full max-w-2xl"
            >
                {selected && (
                    <div className="space-y-5">
                        <dl className="space-y-3 text-sm">
                            <div>
                                <dt className="text-muted">Status</dt>
                                <dd className="font-medium">
                                    {statuses[selected.status]}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted">Alasan</dt>
                                <dd className="whitespace-pre-line">
                                    {selected.alasan}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted">Tujuan</dt>
                                <dd>{selected.tujuan_alamat}</dd>
                            </div>
                            {selected.kontak_darurat && (
                                <div>
                                    <dt className="text-muted">
                                        Kontak darurat
                                    </dt>
                                    <dd>{selected.kontak_darurat}</dd>
                                </div>
                            )}
                            {selected.catatan_verifikasi && (
                                <div>
                                    <dt className="text-muted">
                                        Catatan fasilitator
                                    </dt>
                                    <dd>{selected.catatan_verifikasi}</dd>
                                </div>
                            )}
                        </dl>
                        {selected.dokumen_path && (
                            <a
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary text-sm underline"
                                href={evidence.url({
                                    perizinan: selected.id,
                                    kind: 'dokumen',
                                })}
                            >
                                Buka dokumen pendukung
                            </a>
                        )}
                        {(['sampai', 'kembali'] as const).map(
                            (kind) =>
                                selected[`${kind}_foto_path`] && (
                                    <section
                                        key={kind}
                                        className="border-base-300 space-y-2 border-t pt-4"
                                    >
                                        <h3 className="font-medium">
                                            Bukti{' '}
                                            {kind === 'sampai'
                                                ? 'sampai di tujuan'
                                                : 'kembali ke asrama'}
                                        </h3>
                                        <a
                                            href={evidence.url({
                                                perizinan: selected.id,
                                                kind,
                                            })}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <img
                                                className="max-h-64 rounded-md object-contain"
                                                src={evidence.url({
                                                    perizinan: selected.id,
                                                    kind,
                                                })}
                                                alt={`Bukti ${kind}`}
                                            />
                                        </a>
                                        <p className="text-sm">
                                            Waktu unggah:{' '}
                                            {date(selected[`${kind}_pada`])}
                                        </p>
                                        <a
                                            className="text-primary text-sm underline"
                                            target="_blank"
                                            rel="noreferrer"
                                            href={`https://www.google.com/maps/search/?api=1&query=${selected[`${kind}_latitude`]},${selected[`${kind}_longitude`]}`}
                                        >
                                            Lihat lokasi unggah
                                        </a>
                                        <p className="text-muted text-xs">
                                            Akurasi perangkat:{' '}
                                            {selected[`${kind}_accuracy`]}{' '}
                                            meter.
                                        </p>
                                    </section>
                                ),
                        )}
                        {reviewer && selected.status === 'diajukan' && (
                            <div className="border-base-300 space-y-3 border-t pt-4">
                                <FormField label="Catatan keputusan (wajib jika ditolak)">
                                    <textarea
                                        rows={3}
                                        className={inputClass}
                                        value={approval.data.catatan_verifikasi}
                                        onChange={(event) =>
                                            approval.setData(
                                                'catatan_verifikasi',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                {Object.values(approval.errors).map((error) => (
                                    <p
                                        key={error}
                                        className="text-error text-sm"
                                    >
                                        {error}
                                    </p>
                                ))}
                                <div className="flex gap-2">
                                    <Button
                                        disabled={approval.processing}
                                        onClick={() => decide('disetujui')}
                                    >
                                        Setujui
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        disabled={approval.processing}
                                        onClick={() => decide('ditolak')}
                                    >
                                        Tolak
                                    </Button>
                                </div>
                            </div>
                        )}
                        {!reviewer &&
                            ['sedang_izin', 'sudah_sampai'].includes(
                                selected.status,
                            ) && (
                                <form
                                    onSubmit={sendProof}
                                    className="border-base-300 space-y-3 border-t pt-4"
                                >
                                    <FormField
                                        label={
                                            selected.status === 'sudah_sampai'
                                                ? 'Foto sudah kembali ke asrama'
                                                : 'Foto sudah sampai di tujuan'
                                        }
                                    >
                                        <input
                                            type="file"
                                            required
                                            accept="image/jpeg,image/png,image/webp"
                                            capture="environment"
                                            className={inputClass}
                                            onChange={(event) =>
                                                evidenceForm.setData(
                                                    'foto',
                                                    event.target.files?.[0] ??
                                                        null,
                                                )
                                            }
                                        />
                                    </FormField>
                                    <p className="text-muted text-xs">
                                        Foto maksimal 5 MB. Lokasi perangkat
                                        diambil saat Anda menekan unggah; waktu
                                        dicatat oleh sistem.
                                    </p>
                                    {locationError && (
                                        <p
                                            role="alert"
                                            className="text-error text-sm"
                                        >
                                            {locationError}
                                        </p>
                                    )}
                                    {Object.values(evidenceForm.errors).map(
                                        (error) => (
                                            <p
                                                key={error}
                                                className="text-error text-sm"
                                            >
                                                {error}
                                            </p>
                                        ),
                                    )}
                                    <Button
                                        type="submit"
                                        disabled={
                                            locating || evidenceForm.processing
                                        }
                                    >
                                        {locating
                                            ? 'Mengambil lokasi…'
                                            : evidenceForm.processing
                                              ? 'Mengunggah…'
                                              : 'Unggah bukti dan lokasi'}
                                    </Button>
                                </form>
                            )}
                    </div>
                )}
            </Drawer>
        </div>
    );
}
