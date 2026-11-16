import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { AlertCircle, Upload } from 'lucide-react';
import { store as pembayaranStore } from '@/routes/andalas/pembayaran';
import type { PaymentBankAccountItem } from './PaymentAccountsBox';
import { FormField, inputClass, selectClass } from './ui';
import { formatRupiah } from '../lib/format';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function PaymentProofForm({
    tagihanId,
    totalRemaining,
    dueAmount,
    terminKe = null,
    jenisPembayaran,
    paymentAccounts = [],
    onCancel,
    onSuccess,
}: {
    tagihanId: string;
    totalRemaining: number;
    dueAmount?: number;
    terminKe?: number | null;
    jenisPembayaran?: string;
    paymentAccounts?: PaymentBankAccountItem[];
    onCancel?: () => void;
    onSuccess?: () => void;
}) {
    const activeAccounts = paymentAccounts.filter(
        (account) => account.is_active !== false,
    );
    const defaultNominal = Math.round(dueAmount ?? totalRemaining);

    const [clientFileError, setClientFileError] = useState<string | null>(null);
    const [manualTarget, setManualTarget] = useState(
        activeAccounts.length === 0,
    );

    const form = useForm<{
        tagihan_id: string;
        jenis_pembayaran: string;
        nominal: string;
        termin_ke: string;
        metode_pembayaran: string;
        payment_bank_account_id: string;
        rekening_tujuan: string;
        nama_bank: string;
        nomor_rekening_pengirim: string;
        atas_nama_pengirim: string;
        tanggal_bayar: string;
        bukti_transfer: File | null;
    }>({
        tagihan_id: tagihanId,
        jenis_pembayaran:
            jenisPembayaran ?? (terminKe ? 'cicilan' : 'sewa_asrama'),
        nominal: String(defaultNominal),
        termin_ke: terminKe ? String(terminKe) : '',
        metode_pembayaran: 'transfer_bank',
        payment_bank_account_id: activeAccounts[0]?.id ?? '',
        rekening_tujuan: '',
        nama_bank: '',
        nomor_rekening_pengirim: '',
        atas_nama_pengirim: '',
        tanggal_bayar: '',
        bukti_transfer: null,
    });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        setClientFileError(null);
        if (!form.data.bukti_transfer) {
            setClientFileError('Pilih file bukti transfer terlebih dahulu.');
            return;
        }
        if (form.data.bukti_transfer.size > MAX_UPLOAD_BYTES) {
            setClientFileError(
                'Ukuran file melebihi 5 MB. Kompres atau pilih file yang lebih kecil.',
            );
            return;
        }

        form.post(pembayaranStore.url(), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset(
                    'nama_bank',
                    'nomor_rekening_pengirim',
                    'atas_nama_pengirim',
                    'rekening_tujuan',
                    'tanggal_bayar',
                    'bukti_transfer',
                );
                onSuccess?.();
            },
        });
    };

    const formErrors = form.errors as Record<string, string | undefined>;
    const firstFormError =
        clientFileError ?? Object.values(formErrors).find(Boolean);
    const numericNominal = Number(form.data.nominal || 0);

    return (
        <form onSubmit={submit} className="space-y-4">
            <p className="text-base-content/75 text-sm">
                Lengkapi detail transfer sesuai struk pembayaran, lalu unggah
                bukti pembayaran Anda untuk diverifikasi oleh pengelola.
            </p>

            {firstFormError && (
                <div role="alert" className="alert alert-error text-sm">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{firstFormError}</span>
                </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
                {activeAccounts.length > 0 && (
                    <FormField label="Rekening Tujuan Pengiriman">
                        <select
                            className={selectClass}
                            value={
                                manualTarget
                                    ? 'manual'
                                    : form.data.payment_bank_account_id
                            }
                            onChange={(event) => {
                                const value = event.target.value;
                                if (value === 'manual') {
                                    setManualTarget(true);
                                    form.setData(
                                        'payment_bank_account_id',
                                        '',
                                    );
                                } else {
                                    setManualTarget(false);
                                    form.setData({
                                        ...form.data,
                                        payment_bank_account_id: value,
                                        rekening_tujuan: '',
                                    });
                                }
                            }}
                            required={!manualTarget}
                        >
                            {activeAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.bank_name} ·{' '}
                                    {account.account_number} (a.n.{' '}
                                    {account.account_name})
                                </option>
                            ))}
                            <option value="manual">
                                Lainnya (ketik nomor rekening tujuan)
                            </option>
                        </select>
                    </FormField>
                )}

                {manualTarget && (
                    <FormField label="Nomor Rekening Tujuan Pengiriman">
                        <input
                            className={inputClass}
                            placeholder="Contoh: Bank Nagari · 2100020188888"
                            value={form.data.rekening_tujuan}
                            onChange={(event) =>
                                form.setData(
                                    'rekening_tujuan',
                                    event.target.value,
                                )
                            }
                            required
                        />
                    </FormField>
                )}

                <FormField label="Bank Pengirim">
                    <input
                        className={inputClass}
                        placeholder="Contoh: BNI / BRI / Mandiri / Bank Nagari"
                        value={form.data.nama_bank}
                        onChange={(event) =>
                            form.setData('nama_bank', event.target.value)
                        }
                        required
                    />
                </FormField>

                <FormField label="Nomor Rekening Pengirim">
                    <input
                        className={inputClass}
                        placeholder="Nomor rekening pengirim"
                        value={form.data.nomor_rekening_pengirim}
                        onChange={(event) =>
                            form.setData(
                                'nomor_rekening_pengirim',
                                event.target.value,
                            )
                        }
                        required
                    />
                </FormField>

                <FormField label="Atas Nama Pengirim">
                    <input
                        className={inputClass}
                        placeholder="Nama pemilik rekening pengirim"
                        value={form.data.atas_nama_pengirim}
                        onChange={(event) =>
                            form.setData(
                                'atas_nama_pengirim',
                                event.target.value,
                            )
                        }
                        required
                    />
                </FormField>

                <FormField
                    label="Jumlah Pembayaran (Contoh: Rp700.000)"
                    hint={
                        numericNominal > 0
                            ? `Terbaca: ${formatRupiah(numericNominal)}`
                            : undefined
                    }
                >
                    <input
                        className={inputClass}
                        type="number"
                        min={1}
                        max={totalRemaining}
                        step="1"
                        value={form.data.nominal}
                        onChange={(event) =>
                            form.setData('nominal', event.target.value)
                        }
                        required
                    />
                </FormField>

                <FormField
                    label="Tanggal dan Jam Pembayaran (Waktu Mengirim)"
                    hint="Contoh format: 01-01-2026 05:05"
                >
                    <input
                        className={inputClass}
                        type="datetime-local"
                        value={form.data.tanggal_bayar}
                        onChange={(event) =>
                            form.setData('tanggal_bayar', event.target.value)
                        }
                        required
                    />
                </FormField>
            </div>

            <FormField label="Upload Bukti Bayar (PDF, JPG, JPEG, PNG — maks. 5 MB)">
                <input
                    className="file-input file-input-bordered w-full"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setClientFileError(null);
                        if (file && file.size > MAX_UPLOAD_BYTES) {
                            setClientFileError(
                                'Ukuran file melebihi batas 5 MB.',
                            );
                        }
                        form.setData('bukti_transfer', file);
                    }}
                    required
                />
            </FormField>

            {form.progress && (
                <div className="space-y-1">
                    <progress
                        className="progress progress-primary w-full"
                        value={form.progress.percentage ?? 0}
                        max={100}
                    />
                    <p className="text-base-content/70 text-xs">
                        Mengunggah bukti... {form.progress.percentage ?? 0}%
                    </p>
                </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
                {onCancel && (
                    <button
                        type="button"
                        className="btn btn-outline"
                        disabled={form.processing}
                        onClick={onCancel}
                    >
                        Batal
                    </button>
                )}
                <button
                    type="submit"
                    className="btn btn-primary gap-2"
                    disabled={form.processing}
                >
                    <Upload className="size-4" />
                    {form.processing
                        ? 'Mengirim...'
                        : 'Kirim Bukti Pembayaran'}
                </button>
            </div>
        </form>
    );
}
