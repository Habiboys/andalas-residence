import { Link, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHeader, Card, Button, inputClass } from '../../components/ui';
import { newDamageRequestKey as key } from '../../lib/damage-reports';

type Option = { id: string; nama: string };
type Photo = { id: string; type: string };
type Progress = {
    id: string;
    description: string;
    work_date: string;
    is_blocked: boolean;
    user?: { nama: string };
    report?: { nomor_tiket: string };
};
type Report = {
    id: string;
    nomor_tiket: string;
    status: string;
    deskripsi: string;
    source: string;
    location_label?: string;
    priority: string;
    is_blocked: boolean;
    catatan_penyelesaian?: string;
    cancellation_reason?: string;
    gedung?: { nama_gedung: string };
    teknisi?: Option;
    photos: Photo[];
    assignments: {
        id: string;
        technician_id: string;
        role: string;
        ended_at: string | null;
        technician?: Option;
    }[];
    status_histories: { id: string; description: string; created_at: string }[];
    progress: Progress[];
    abilities: Record<string, boolean>;
    linkable_assets?: { id: string; nama_aset: string }[];
};
type Pagination<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
};
type Props = {
    reports: Pagination<Report>;
    daily: Pagination<Progress>;
    summary: Record<string, number>;
    blocked_count: number;
    technicians: Option[];
    buildings: { id: string; nama_gedung: string }[];
    filters: Record<string, string>;
    today: string;
    can_order: boolean;
    can_report: boolean;
    assets: { id: string; nama_aset: string }[];
    facilities: { id: string; nama_fasilitas: string }[];
    notifications: { id: string; data: { subject: string; message: string } }[];
};
const labels: Record<string, string> = {
    menunggu_triage: 'Belum dimulai',
    didisposisikan: 'Disposisi',
    sedang_dikerjakan: 'Sedang dikerjakan',
    selesai: 'Selesai',
    dibatalkan: 'Dibatalkan',
};
function Errors({ errors }: { errors: Record<string, string | undefined> }) {
    return (
        <>
            {Object.entries(errors).map(([field, error]) =>
                error ? (
                    <p className="text-error text-sm" role="alert" key={field}>
                        {error}
                    </p>
                ) : null,
            )}
        </>
    );
}
function Pages<T>({ page }: { page: Pagination<T> }) {
    return (
        <nav aria-label="Halaman" className="flex flex-wrap gap-2">
            {page.links.map((link, i) =>
                link.url ? (
                    <Link
                        key={i}
                        href={link.url}
                        className={`btn btn-sm ${link.active ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        {link.label
                            .replace(/&laquo;|&raquo;/g, '')
                            .replace('Previous', 'Sebelumnya')
                            .replace('Next', 'Selanjutnya')}
                    </Link>
                ) : null,
            )}
        </nav>
    );
}

function Ticket({
    report: r,
    technicians,
    today,
}: {
    report: Report;
    technicians: Option[];
    today: string;
}) {
    const progress = useForm({
        description: '',
        work_date: today,
        is_blocked: r.is_blocked,
        request_key: key(),
    });
    const team = useForm({
        technician_ids: r.assignments
            .filter((a) => !a.ended_at && a.role === 'member')
            .map((a) => a.technician_id),
        reason: '',
    });
    const complete = useForm<{
        _method: string;
        status: string;
        catatan_penyelesaian: string;
        bukti_penyelesaian: File[];
    }>({
        _method: 'put',
        status: 'selesai',
        catatan_penyelesaian: '',
        bukti_penyelesaian: [],
    });
    const cancel = useForm({ reason: '' });
    const asset = useForm({ aset_id: '', reason: '' });
    const base = `/andalas/tiket/${r.id}`;
    return (
        <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h2 className="font-semibold">{r.nomor_tiket}</h2>
                    <p className="text-muted text-sm">
                        {r.gedung?.nama_gedung} / {r.location_label} /{' '}
                        {r.source === 'leader'
                            ? 'Perintah pimpinan'
                            : r.source === 'checkout'
                              ? 'Temuan inspeksi'
                              : r.source === 'resident'
                                ? 'Laporan penghuni'
                                : 'Riwayat lama'}
                    </p>
                </div>
                <span className="badge badge-outline">
                    {labels[r.status]}
                    {r.is_blocked ? ' - terhambat' : ''}
                </span>
            </div>
            <p>{r.deskripsi}</p>
            <p className="text-sm">
                Penanggung jawab: {r.teknisi?.nama ?? 'Belum diambil'} /
                Prioritas: {r.priority}
            </p>
            {r.abilities.claim && r.status !== 'sedang_dikerjakan' && (
                <Button onClick={() => router.post(`${base}/claim`)}>
                    Ambil pekerjaan
                </Button>
            )}
            {r.abilities.confirm && (
                <button
                    className="btn btn-outline btn-sm"
                    onClick={() => router.post(`${base}/confirm`)}
                >
                    Ini kejadian yang sama - tautkan konfirmasi saya
                </button>
            )}
            <div className="flex flex-wrap gap-3">
                {r.photos.map((p, i) => (
                    <a
                        key={p.id}
                        href={`/andalas/tiket/foto/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="link link-primary"
                    >
                        {p.type === 'after' ? 'Bukti hasil' : 'Foto awal'}{' '}
                        {i + 1}
                    </a>
                ))}
            </div>
            {r.catatan_penyelesaian && (
                <p className="bg-success/10 rounded p-3">
                    Hasil: {r.catatan_penyelesaian}
                </p>
            )}
            {r.cancellation_reason && (
                <p>Alasan pembatalan: {r.cancellation_reason}</p>
            )}
            <details>
                <summary className="cursor-pointer font-medium">
                    Tim, progres dan riwayat
                </summary>
                <div className="mt-3 space-y-2 text-sm">
                    {r.assignments.map((a) => (
                        <p key={a.id}>
                            {a.technician?.nama ?? 'Teknisi'} -{' '}
                            {a.role === 'lead' ? 'Penanggung jawab' : 'Anggota'}
                            {a.ended_at ? ' (penugasan berakhir)' : ''}
                        </p>
                    ))}
                    {r.progress.map((p) => (
                        <p key={p.id}>
                            {p.work_date.slice(0, 10)} / {p.user?.nama}:{' '}
                            {p.description}
                            {p.is_blocked ? ' [Terhambat]' : ''}
                        </p>
                    ))}
                    {r.status_histories.map((h) => (
                        <p key={h.id}>
                            {h.created_at.slice(0, 16).replace('T', ' ')} /{' '}
                            {h.description}
                        </p>
                    ))}
                </div>
            </details>
            {r.abilities.progress && (
                <form
                    className="space-y-2 border-t pt-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        progress.post(`${base}/progress`, {
                            preserveScroll: true,
                            onSuccess: () => {
                                progress.reset('description');
                                progress.setData('request_key', key());
                            },
                        });
                    }}
                >
                    <h3 className="font-medium">Tambah progres harian</h3>
                    <label className="block">
                        Tanggal
                        <input
                            aria-label="Tanggal progres"
                            type="date"
                            className={inputClass}
                            value={progress.data.work_date}
                            max={today}
                            onChange={(e) =>
                                progress.setData('work_date', e.target.value)
                            }
                            required
                        />
                    </label>
                    <textarea
                        aria-label="Uraian progres"
                        className={inputClass}
                        value={progress.data.description}
                        onChange={(e) =>
                            progress.setData('description', e.target.value)
                        }
                        placeholder="Apa yang dikerjakan, hasil sementara, dan hambatan"
                        required
                    />
                    <label className="flex gap-2">
                        <input
                            type="checkbox"
                            checked={progress.data.is_blocked}
                            onChange={(e) =>
                                progress.setData('is_blocked', e.target.checked)
                            }
                        />
                        Terhambat material/akses; pekerjaan belum selesai
                    </label>
                    <Errors errors={progress.errors} />
                    <Button disabled={progress.processing}>
                        Simpan progres
                    </Button>
                </form>
            )}
            {r.abilities.team && (
                <form
                    className="space-y-2 border-t pt-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        team.post(`${base}/team`, { preserveScroll: true });
                    }}
                >
                    <h3 className="font-medium">Anggota tim</h3>
                    <p className="text-muted text-sm">
                        Penanggung jawab tetap. Pilih anggota tambahan;
                        kosongkan untuk mengakhiri seluruh anggota.
                    </p>
                    {technicians
                        .filter((t) => t.id !== r.teknisi?.id)
                        .map((t) => (
                            <label className="flex gap-2" key={t.id}>
                                <input
                                    type="checkbox"
                                    checked={team.data.technician_ids.includes(
                                        t.id,
                                    )}
                                    onChange={(e) =>
                                        team.setData(
                                            'technician_ids',
                                            e.target.checked
                                                ? [
                                                      ...team.data
                                                          .technician_ids,
                                                      t.id,
                                                  ]
                                                : team.data.technician_ids.filter(
                                                      (id) => id !== t.id,
                                                  ),
                                        )
                                    }
                                />
                                {t.nama}
                            </label>
                        ))}
                    <input
                        aria-label="Alasan perubahan tim"
                        className={inputClass}
                        value={team.data.reason}
                        onChange={(e) => team.setData('reason', e.target.value)}
                        placeholder="Alasan perubahan tim"
                        required
                    />
                    <Errors errors={team.errors} />
                    <Button disabled={team.processing}>Simpan anggota</Button>
                </form>
            )}
            {r.abilities.complete && r.status === 'sedang_dikerjakan' && (
                <form
                    className="space-y-2 border-t pt-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        complete.post(base, {
                            forceFormData: true,
                            preserveScroll: true,
                        });
                    }}
                >
                    <h3 className="font-medium">Selesaikan pekerjaan</h3>
                    <textarea
                        aria-label="Catatan penyelesaian"
                        className={inputClass}
                        value={complete.data.catatan_penyelesaian}
                        onChange={(e) =>
                            complete.setData(
                                'catatan_penyelesaian',
                                e.target.value,
                            )
                        }
                        placeholder="Hasil perbaikan akhir"
                        required
                    />
                    <label className="block">
                        Bukti final (JPG/PNG, maksimal 5 foto, masing-masing 5
                        MB)
                        <input
                            type="file"
                            className="file-input w-full"
                            accept="image/jpeg,image/png"
                            multiple
                            required
                            onChange={(e) =>
                                complete.setData(
                                    'bukti_penyelesaian',
                                    Array.from(e.target.files ?? []),
                                )
                            }
                        />
                    </label>
                    <Errors errors={complete.errors} />
                    <Button disabled={complete.processing}>
                        Unggah bukti dan selesaikan
                    </Button>
                </form>
            )}
            {r.abilities.linkAsset && (
                <details>
                    <summary className="cursor-pointer">
                        Hubungkan inventaris
                    </summary>
                    <form
                        className="mt-2 space-y-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            asset.post(`${base}/asset`, {
                                preserveScroll: true,
                            });
                        }}
                    >
                        <select
                            aria-label="Inventaris yang ditautkan"
                            className={inputClass}
                            value={asset.data.aset_id}
                            onChange={(e) =>
                                asset.setData('aset_id', e.target.value)
                            }
                            required
                        >
                            <option value="">
                                Pilih inventaris lokasi ini
                            </option>
                            {r.linkable_assets?.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.nama_aset}
                                </option>
                            ))}
                        </select>
                        <input
                            aria-label="Alasan pengaitan aset"
                            className={inputClass}
                            value={asset.data.reason}
                            onChange={(e) =>
                                asset.setData('reason', e.target.value)
                            }
                            placeholder="Alasan pengaitan"
                            required
                        />
                        <Errors errors={asset.errors} />
                        <Button disabled={asset.processing}>
                            Tautkan inventaris
                        </Button>
                    </form>
                </details>
            )}
            {r.abilities.cancel && r.status !== 'dibatalkan' && (
                <details>
                    <summary className="text-error cursor-pointer">
                        Batalkan dengan alasan
                    </summary>
                    <form
                        className="mt-2 space-y-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            cancel.post(`${base}/cancel`, {
                                preserveScroll: true,
                            });
                        }}
                    >
                        <input
                            aria-label="Alasan pembatalan"
                            className={inputClass}
                            value={cancel.data.reason}
                            onChange={(e) =>
                                cancel.setData('reason', e.target.value)
                            }
                            placeholder="Alasan pembatalan"
                            required
                        />
                        <Errors errors={cancel.errors} />
                        <Button disabled={cancel.processing}>
                            Konfirmasi pembatalan
                        </Button>
                    </form>
                </details>
            )}
        </Card>
    );
}

export default function Pelaporan(p: Props) {
    const filter = useForm({
        status: p.filters.status ?? '',
        gedung_id: p.filters.gedung_id ?? '',
        technician_id: p.filters.technician_id ?? '',
        date: p.filters.date,
    });
    const order = useForm({
        gedung_id: '',
        location_label: '',
        deskripsi: '',
        priority: 'normal',
        different_incident_reason: '',
        request_key: key(),
    });
    const resident = useForm<{
        aset_id: string;
        fasilitas_umum_id: string;
        location_label: string;
        deskripsi: string;
        different_incident_reason: string;
        request_key: string;
        foto_awal: File[];
    }>({
        aset_id: '',
        fasilitas_umum_id: '',
        location_label: '',
        deskripsi: '',
        different_incident_reason: '',
        request_key: key(),
        foto_awal: [],
    });
    function submitResident(e: FormEvent) {
        e.preventDefault();
        resident.post('/andalas/laporan-kerusakan', {
            forceFormData: true,
            onSuccess: () => {
                resident.reset();
                resident.setData('request_key', key());
            },
        });
    }
    return (
        <div className="space-y-5">
            <PageHeader
                title="Pelaporan dan pekerjaan teknisi"
                subtitle="Laporan penghuni, perintah pimpinan, progres harian dan hasil perbaikan"
            />
            {p.notifications.map((n) => (
                <Card key={n.id} className="space-y-2 p-4">
                    <h2 className="font-semibold">{n.data.subject}</h2>
                    <p>{n.data.message}</p>
                    <button
                        className="btn btn-sm"
                        onClick={() =>
                            router.post(`/pelaporan/notifications/${n.id}/read`)
                        }
                    >
                        Tandai sudah dibaca
                    </button>
                </Card>
            ))}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                {Object.entries(labels).map(([status, label]) => (
                    <Card className="p-3" key={status}>
                        <p className="text-muted text-sm">{label}</p>
                        <strong className="text-xl">
                            {p.summary[status] ?? 0}
                        </strong>
                    </Card>
                ))}
            </div>
            <p className="text-sm">
                Terhambat: {p.blocked_count} (termasuk dalam sedang dikerjakan).
            </p>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    filter.get('/pelaporan', { preserveState: true });
                }}
                className="grid gap-2 md:grid-cols-5"
            >
                <select
                    aria-label="Filter status"
                    className={inputClass}
                    value={filter.data.status}
                    onChange={(e) => filter.setData('status', e.target.value)}
                >
                    <option value="">Semua status</option>
                    {Object.entries(labels).map(([s, l]) => (
                        <option key={s} value={s}>
                            {l}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Filter gedung"
                    className={inputClass}
                    value={filter.data.gedung_id}
                    onChange={(e) =>
                        filter.setData('gedung_id', e.target.value)
                    }
                >
                    <option value="">Semua gedung yang berhak</option>
                    {p.buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.nama_gedung}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Filter teknisi"
                    className={inputClass}
                    value={filter.data.technician_id}
                    onChange={(e) =>
                        filter.setData('technician_id', e.target.value)
                    }
                >
                    <option value="">Semua teknisi</option>
                    {p.technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.nama}
                        </option>
                    ))}
                </select>
                <input
                    aria-label="Tanggal aktivitas"
                    className={inputClass}
                    type="date"
                    value={filter.data.date}
                    onChange={(e) => filter.setData('date', e.target.value)}
                />
                <Button>Terapkan filter</Button>
            </form>
            {p.can_report && (
                <details>
                    <summary className="cursor-pointer font-semibold">
                        Buat laporan kerusakan
                    </summary>
                    <form onSubmit={submitResident} className="mt-3 space-y-3">
                        <select
                            aria-label="Aset laporan"
                            className={inputClass}
                            value={resident.data.aset_id}
                            onChange={(e) =>
                                resident.setData('aset_id', e.target.value)
                            }
                        >
                            <option value="">
                                Tanpa inventaris / belum terdaftar
                            </option>
                            {p.assets.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.nama_aset}
                                </option>
                            ))}
                        </select>
                        {!resident.data.aset_id && (
                            <>
                                <select
                                    aria-label="Lokasi fasilitas"
                                    className={inputClass}
                                    value={resident.data.fasilitas_umum_id}
                                    onChange={(e) =>
                                        resident.setData(
                                            'fasilitas_umum_id',
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">Kamar saya</option>
                                    {p.facilities.map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.nama_fasilitas}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    aria-label="Rincian lokasi"
                                    className={inputClass}
                                    value={resident.data.location_label}
                                    onChange={(e) =>
                                        resident.setData(
                                            'location_label',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Rincian lokasi, misalnya dinding dekat jendela"
                                    required
                                />
                            </>
                        )}
                        <textarea
                            aria-label="Deskripsi kerusakan"
                            className={inputClass}
                            value={resident.data.deskripsi}
                            onChange={(e) =>
                                resident.setData('deskripsi', e.target.value)
                            }
                            placeholder="Jelaskan kejadian kerusakan"
                            required
                        />
                        <input
                            aria-label="Pembeda kejadian"
                            className={inputClass}
                            value={resident.data.different_incident_reason}
                            onChange={(e) =>
                                resident.setData(
                                    'different_incident_reason',
                                    e.target.value,
                                )
                            }
                            placeholder="Isi jika berbeda dari kejadian aktif pada lokasi yang sama"
                        />
                        <label className="block">
                            Foto awal (JPG/PNG)
                            <input
                                type="file"
                                accept="image/jpeg,image/png"
                                multiple
                                required
                                className="file-input w-full"
                                onChange={(e) =>
                                    resident.setData(
                                        'foto_awal',
                                        Array.from(e.target.files ?? []),
                                    )
                                }
                            />
                        </label>
                        <Errors errors={resident.errors} />
                        <Button disabled={resident.processing}>
                            Kirim laporan
                        </Button>
                    </form>
                </details>
            )}
            {p.can_order && (
                <details>
                    <summary className="cursor-pointer font-semibold">
                        Catat perintah pimpinan
                    </summary>
                    <form
                        className="mt-3 space-y-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            order.post('/pekerjaan-teknisi', {
                                onSuccess: () => {
                                    order.reset();
                                    order.setData('request_key', key());
                                },
                            });
                        }}
                    >
                        <select
                            aria-label="Gedung perintah"
                            className={inputClass}
                            value={order.data.gedung_id}
                            onChange={(e) =>
                                order.setData('gedung_id', e.target.value)
                            }
                            required
                        >
                            <option value="">Pilih gedung</option>
                            {p.buildings.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.nama_gedung}
                                </option>
                            ))}
                        </select>
                        <input
                            aria-label="Lokasi perintah"
                            className={inputClass}
                            value={order.data.location_label}
                            onChange={(e) =>
                                order.setData('location_label', e.target.value)
                            }
                            placeholder="Lokasi pekerjaan, termasuk di luar kamar"
                            required
                        />
                        <textarea
                            aria-label="Instruksi pimpinan"
                            className={inputClass}
                            value={order.data.deskripsi}
                            onChange={(e) =>
                                order.setData('deskripsi', e.target.value)
                            }
                            placeholder="Instruksi pekerjaan"
                            required
                        />
                        <select
                            aria-label="Prioritas perintah"
                            className={inputClass}
                            value={order.data.priority}
                            onChange={(e) =>
                                order.setData('priority', e.target.value)
                            }
                        >
                            <option value="normal">Normal</option>
                            <option value="high">Tinggi</option>
                            <option value="urgent">Mendesak</option>
                        </select>
                        <input
                            aria-label="Alasan kejadian berbeda perintah"
                            className={inputClass}
                            value={order.data.different_incident_reason}
                            onChange={(e) =>
                                order.setData(
                                    'different_incident_reason',
                                    e.target.value,
                                )
                            }
                            placeholder="Pembeda jika ada kejadian aktif lain"
                        />
                        <Errors errors={order.errors} />
                        <Button disabled={order.processing}>
                            Catat perintah
                        </Button>
                    </form>
                </details>
            )}
            <section className="space-y-3" aria-label="Daftar laporan">
                <p className="text-muted text-sm">
                    {p.reports.total} laporan dalam cakupan akses/filter.
                </p>
                {p.reports.data.map((r) => (
                    <Ticket
                        key={r.id}
                        report={r}
                        technicians={p.technicians}
                        today={p.today}
                    />
                ))}
                {!p.reports.data.length && (
                    <p>Belum ada laporan yang dapat ditampilkan.</p>
                )}
                <Pages page={p.reports} />
            </section>
            <section className="space-y-3" aria-label="Aktivitas harian">
                <h2 className="font-semibold">
                    Aktivitas teknisi pada {p.filters.date}
                </h2>
                {p.daily.data.map((d) => (
                    <Card className="p-3" key={d.id}>
                        <strong>
                            {d.user?.nama} / {d.report?.nomor_tiket}
                        </strong>
                        <p>
                            {d.description}
                            {d.is_blocked ? ' [Terhambat]' : ''}
                        </p>
                    </Card>
                ))}
                {!p.daily.data.length && (
                    <p>Belum ada aktivitas tercatat untuk tanggal ini.</p>
                )}
                <Pages page={p.daily} />
            </section>
        </div>
    );
}
