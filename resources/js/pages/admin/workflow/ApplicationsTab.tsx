import * as applications from '@/actions/App/Http/Controllers/ResidenceApplicationController';
import { StatusBadge } from '@/andalas/components/ui';
import { useMemo, useState } from 'react';
import {
    ActionForm,
    ConfirmCheckbox,
    Field,
    WorkflowPanel,
    fieldInputClass,
} from './shared';
import {
    CATEGORY_LABELS,
    type Application,
    type Program,
    type Room,
} from './types';

export default function ApplicationsTab({
    rooms,
    programs,
    items,
}: {
    rooms: Room[];
    programs: Program[];
    items: Application[];
}) {
    const [participantKeys, setParticipantKeys] = useState<string[]>(['p-1']);
    const [kind, setKind] = useState('international');
    const [funding, setFunding] = useState('sponsor');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterKind, setFilterKind] = useState('all');

    const visibleItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return items.filter((item) => {
            if (filterKind !== 'all' && item.kind !== filterKind) {
                return false;
            }
            if (
                q &&
                !`${item.number} ${item.institution ?? ''} ${item.recipient_email}`
                    .toLowerCase()
                    .includes(q)
            ) {
                return false;
            }
            return true;
        });
    }, [items, filterKind, searchQuery]);

    function addParticipant() {
        setParticipantKeys((prev) => [
            ...prev,
            `p-${Date.now()}-${prev.length + 1}`,
        ]);
    }

    function removeParticipant(key: string) {
        if (participantKeys.length <= 1) {
            return;
        }
        setParticipantKeys((prev) => prev.filter((item) => item !== key));
    }

    return (
        <div className="space-y-5">
            <WorkflowPanel title="Permohonan internasional, S2/S3, dan kegiatan">
                <ActionForm
                    url={applications.store.url()}
                    label="Simpan permohonan dan peserta"
                    onSuccess={() => setParticipantKeys(['p-1'])}
                >
                    <fieldset className="border-base-300 grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                        <legend className="px-1 font-medium">
                            Identitas permohonan
                        </legend>
                        <Field
                            name="number"
                            label="Nomor surat / permohonan"
                        />

                        <Field name="kind" label="Jenis">
                            <select
                                className={fieldInputClass}
                                name="kind"
                                value={kind}
                                onChange={(e) => {
                                    setKind(e.target.value);
                                    setFunding(
                                        e.target.value === 'postgraduate'
                                            ? 'personal'
                                            : 'sponsor',
                                    );
                                }}
                            >
                                <option value="international">
                                    Internasional
                                </option>
                                <option value="postgraduate">
                                    S2 / S3 mandiri
                                </option>
                                <option value="summer_course">
                                    Summer Course
                                </option>
                            </select>
                        </Field>

                        <Field
                            name="institution"
                            label="Institusi / penyelenggara / pembayar"
                            required={kind !== 'postgraduate'}
                        />

                        <Field
                            name="letter"
                            label="Surat permohonan (opsional untuk S2/S3 mandiri)"
                            required={kind !== 'postgraduate'}
                            type="file"
                        />
                    </fieldset>

                    <fieldset className="border-base-300 grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                        <legend className="px-1 font-medium">
                            Pembiayaan dan kontak
                        </legend>
                        <Field name="funding" label="Pembiayaan">
                            <select
                                className={fieldInputClass}
                                name="funding"
                                value={funding}
                                onChange={(event) =>
                                    setFunding(event.target.value)
                                }
                            >
                                {kind !== 'postgraduate' && (
                                    <option value="sponsor">
                                        Institusi / rektorat / penyelenggara
                                    </option>
                                )}
                                <option value="personal">Pribadi</option>
                            </select>
                        </Field>
                        <Field
                            name="recipient_email"
                            label="Email penerima invoice"
                            type="email"
                        />
                    </fieldset>

                    <fieldset className="border-base-300 grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                        <legend className="px-1 font-medium">
                            Rencana masa tinggal
                        </legend>
                        <Field
                            name="starts_at"
                            label="Mulai tinggal"
                            type="date"
                        />
                        <Field
                            name="ends_at"
                            label="Akhir tinggal"
                            type="date"
                        />

                        <Field
                            name="rate_unit"
                            label="Satuan tarif (Summer Course selalu harian)"
                        >
                            {kind === 'summer_course' ? (
                                <>
                                    <input
                                        type="hidden"
                                        name="rate_unit"
                                        value="day"
                                    />
                                    <p className="py-2 text-sm font-medium">
                                        Per hari
                                    </p>
                                </>
                            ) : (
                                <select
                                    name="rate_unit"
                                    className={fieldInputClass}
                                >
                                    <option value="year">Tahun</option>
                                    <option value="semester">Semester</option>
                                    <option value="month">Bulan</option>
                                    <option value="day">Hari</option>
                                </select>
                            )}
                        </Field>
                    </fieldset>

                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-semibold">
                                Daftar peserta ({participantKeys.length} orang)
                            </h3>
                            <button
                                className="btn btn-sm btn-outline"
                                type="button"
                                onClick={addParticipant}
                            >
                                Tambah peserta
                            </button>
                        </div>

                        {participantKeys.map((pKey, i) => (
                            <fieldset
                                className="bg-base-200/40 border-base-300 grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
                                key={pKey}
                            >
                                <legend className="flex items-center gap-2 px-1 font-medium">
                                    <span>Peserta {i + 1}</span>
                                    {participantKeys.length > 1 && (
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs text-error"
                                            onClick={() =>
                                                removeParticipant(pKey)
                                            }
                                        >
                                            Hapus baris
                                        </button>
                                    )}
                                </legend>

                                <Field
                                    name={`participants[${i}][nama]`}
                                    label="Nama sesuai identitas"
                                />
                                <Field
                                    name={`participants[${i}][nim_nip]`}
                                    label="NIM / nomor identitas"
                                />
                                <Field
                                    name={`participants[${i}][email]`}
                                    label="Email"
                                    type="email"
                                />
                                <Field
                                    name={`participants[${i}][gender]`}
                                    label="Jenis kelamin"
                                >
                                    <select
                                        className={fieldInputClass}
                                        name={`participants[${i}][gender]`}
                                    >
                                        <option value="perempuan">
                                            Perempuan
                                        </option>
                                        <option value="laki_laki">
                                            Laki-laki
                                        </option>
                                    </select>
                                </Field>

                                <Field
                                    name={`participants[${i}][kamar_id]`}
                                    label="Kamar"
                                >
                                    <select
                                        className={fieldInputClass}
                                        name={`participants[${i}][kamar_id]`}
                                        required
                                    >
                                        <option value="">Pilih kamar</option>
                                        {rooms.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.lantai.gedung.nama_gedung} /{' '}
                                                {r.nomor_kamar}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field
                                    name={`participants[${i}][prodi_id]`}
                                    label="Program studi (bila mahasiswa)"
                                >
                                    <select
                                        className={fieldInputClass}
                                        name={`participants[${i}][prodi_id]`}
                                        required={kind === 'postgraduate'}
                                    >
                                        <option value="">Tidak ada</option>
                                        {programs
                                            .filter(
                                                (p) =>
                                                    kind !== 'postgraduate' ||
                                                    ['S2', 'S3'].includes(
                                                        p.jenjang,
                                                    ),
                                            )
                                            .map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} {p.jenjang}
                                                </option>
                                            ))}
                                    </select>
                                </Field>

                                {funding === 'sponsor' && (
                                    <Field
                                        name={`participants[${i}][sponsor_limit]`}
                                        label="Batas tanggungan sponsor (kosong = seluruh biaya)"
                                        type="number"
                                        required={false}
                                    />
                                )}
                            </fieldset>
                        ))}
                    </div>
                </ActionForm>
            </WorkflowPanel>

            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">
                        Daftar permohonan tercatat ({visibleItems.length})
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <select
                            className="select select-bordered select-sm"
                            aria-label="Filter jenis permohonan"
                            value={filterKind}
                            onChange={(e) => setFilterKind(e.target.value)}
                        >
                            <option value="all">Semua jenis</option>
                            <option value="international">Internasional</option>
                            <option value="postgraduate">
                                S2 / S3 mandiri
                            </option>
                            <option value="summer_course">Summer Course</option>
                        </select>
                        <input
                            type="search"
                            className="input input-bordered input-sm w-56"
                            placeholder="Cari nomor, institusi, email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {visibleItems.length === 0 && (
                    <p className="bg-base-100 border-base-300 text-base-content/70 rounded-xl border p-5 text-sm">
                        Belum ada permohonan yang sesuai dengan filter saat ini.
                    </p>
                )}

                {visibleItems.map((a) => (
                    <WorkflowPanel
                        key={a.id}
                        title={`${a.number} · ${a.institution ?? 'Mandiri'}`}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <p className="font-medium">
                                {CATEGORY_LABELS[a.kind] ?? a.kind} ·{' '}
                                {a.registrations.length} peserta · Email
                                invoice: {a.recipient_email}
                            </p>
                            <StatusBadge
                                status={a.approved_at ? 'disetujui' : 'menunggu'}
                                label={
                                    a.approved_at
                                        ? 'Dukungan disahkan'
                                        : 'Menunggu pengesahan'
                                }
                            />
                        </div>

                        {a.letter_path && (
                            <a
                                className="btn btn-xs btn-outline"
                                href={applications.letter.url(a.id)}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Unduh surat
                            </a>
                        )}

                        {a.approved_at ? (
                            <p className="text-success text-sm font-medium">
                                Dukungan pembiayaan disahkan.
                            </p>
                        ) : (
                            <ActionForm
                                url={applications.approve.url(a.id)}
                                label="Sahkan dukungan"
                                confirmTitle="Sahkan Dukungan Institusi?"
                                confirmMessage="Pengesahan dukungan akan membuka proses lanjutan bagi peserta pada permohonan ini."
                            >
                                <ConfirmCheckbox name="support_verified">
                                    Surat dan penanggung biaya telah
                                    diverifikasi.
                                </ConfirmCheckbox>
                            </ActionForm>
                        )}

                        <p className="text-base-content/70 text-xs">
                            Invoice final Summer Course diterbitkan setelah masa
                            sewa berakhir. Kunci dicatat kembali per peserta.
                        </p>
                    </WorkflowPanel>
                ))}
            </section>
        </div>
    );
}
