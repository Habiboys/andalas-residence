import { useForm } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    Button,
    FormField,
    inputClass,
    StatusBadge,
} from '../../components/ui';
import { store as checkoutStore } from '@/routes/andalas/checkout';

type CheckoutRecord = {
    id: string;
    status: string;
    alasan?: string | null;
    inspection?: { status: string; catatan?: string | null } | null;
};

type Props = { checkout?: CheckoutRecord[] };

export default function Checkout({ checkout = [] }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        alasan: '',
    });

    function submit(event: React.FormEvent) {
        event.preventDefault();
        post(checkoutStore.url(), { onSuccess: () => reset() });
    }

    return (
        <div className="max-w-3xl space-y-4">
            <PageHeader
                title="Pengajuan Check-out"
                subtitle="Pastikan seluruh kewajiban dan kondisi kamar telah diselesaikan."
            />
            <Card className="p-6">
                <h2 className="mb-2 text-lg font-semibold">
                    Syarat dan mekanisme
                </h2>
                <ul className="mb-5 list-disc space-y-1 pl-5 text-sm opacity-80">
                    <li>
                        Ajukan checkout setelah barang pribadi dan kunci kamar
                        siap diserahkan.
                    </li>
                    <li>GO memeriksa kamar dan mencatat barang yang rusak.</li>
                    <li>
                        Fasilitator menyelesaikan checkout; kapasitas kamar
                        diperbarui otomatis.
                    </li>
                    <li>
                        Tagihan tetap menjadi kewajiban dan harus lunas untuk
                        penerbitan surat bebas asrama.
                    </li>
                </ul>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Alasan (opsional)">
                        <textarea
                            className={inputClass}
                            value={data.alasan}
                            onChange={(event) =>
                                setData('alasan', event.target.value)
                            }
                        />
                        {errors.alasan && (
                            <p className="text-error mt-1 text-sm">
                                {errors.alasan}
                            </p>
                        )}
                    </FormField>
                    {Object.entries(errors).map(([key, error]) => (
                        <p key={key} className="text-error">
                            {error}
                        </p>
                    ))}
                    <Button type="submit" disabled={processing}>
                        {processing ? 'Mengirim...' : 'Ajukan Check-out'}
                    </Button>
                </form>
            </Card>
            <Card className="p-6">
                <h2 className="mb-4 text-lg font-semibold">
                    Riwayat pengajuan
                </h2>
                {checkout.length === 0 ? (
                    <p className="text-sm opacity-70">
                        Belum ada pengajuan check-out.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {checkout.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-box border-base-300 border p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                        Pengajuan check-out
                                    </span>
                                    <StatusBadge status={item.status} />
                                </div>
                                <p className="mt-2 text-sm opacity-70">
                                    Inspeksi GO:{' '}
                                    {item.inspection?.status ?? 'menunggu'}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
