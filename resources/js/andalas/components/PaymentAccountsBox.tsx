import { useState } from 'react';
import { AlertCircle, Building2, Check, Copy, Landmark } from 'lucide-react';

export type PaymentBankAccountItem = {
    id: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    instructions?: string | null;
    is_active?: boolean;
};

export type VirtualAccountItem = {
    id?: string;
    bank: string;
    nomor: string;
    atas_nama: string;
};

export function PaymentAccountsBox({
    paymentAccounts = [],
    virtualAccounts = [],
    compact = false,
}: {
    paymentAccounts?: PaymentBankAccountItem[];
    virtualAccounts?: VirtualAccountItem[];
    compact?: boolean;
}) {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const copyNumber = (key: string, value: string) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            void navigator.clipboard.writeText(value);
        }
        setCopiedKey(key);
        window.setTimeout(() => {
            setCopiedKey((current) => (current === key ? null : current));
        }, 1800);
    };

    const activeAccounts = paymentAccounts.filter(
        (account) => account.is_active !== false,
    );

    if (activeAccounts.length === 0 && virtualAccounts.length === 0) {
        return (
            <div role="alert" className="alert alert-error text-sm">
                <AlertCircle className="size-4 shrink-0" />
                <div>
                    <p className="font-semibold">
                        Rekening tujuan pembayaran belum diisi oleh admin.
                    </p>
                    <p className="mt-0.5 text-xs opacity-90">
                        Pembayaran belum dapat diproses karena admin atau
                        pengelola asrama belum mengonfigurasi rekening tujuan
                        transfer resmi. Hubungi pengelola asrama terlebih
                        dahulu.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {activeAccounts.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/65">
                        <Landmark className="size-3.5 shrink-0" />
                        <span>Rekening Tujuan Transfer Resmi</span>
                    </div>
                    <div
                        className={`grid gap-3 ${
                            compact || activeAccounts.length === 1
                                ? 'grid-cols-1'
                                : 'md:grid-cols-2'
                        }`}
                    >
                        {activeAccounts.map((account) => {
                            const key = `bank-${account.id}`;
                            return (
                                <div
                                    key={account.id}
                                    className="border-base-300 bg-base-100 rounded-xl border p-3.5"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="text-primary text-xs font-semibold uppercase tracking-wide">
                                                {account.bank_name}
                                            </div>
                                            <div className="mt-1 font-mono text-base font-bold tracking-tight break-all">
                                                {account.account_number}
                                            </div>
                                            <div className="text-base-content/70 mt-0.5 text-xs break-words">
                                                a.n. {account.account_name}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs shrink-0 gap-1"
                                            onClick={() =>
                                                copyNumber(
                                                    key,
                                                    account.account_number,
                                                )
                                            }
                                            aria-label={`Salin nomor rekening ${account.bank_name}`}
                                        >
                                            {copiedKey === key ? (
                                                <>
                                                    <Check className="text-primary size-3.5" />
                                                    <span>Tersalin</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="size-3.5" />
                                                    <span>Salin</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    {account.instructions && (
                                        <p className="text-base-content/70 border-base-200 mt-2 border-t pt-2 text-xs">
                                            {account.instructions}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {virtualAccounts.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/65">
                        <Building2 className="size-3.5 shrink-0" />
                        <span>Virtual Account</span>
                    </div>
                    <div
                        className={`grid gap-3 ${
                            compact || virtualAccounts.length === 1
                                ? 'grid-cols-1'
                                : 'md:grid-cols-2'
                        }`}
                    >
                        {virtualAccounts.map((va) => {
                            const key = `va-${va.bank}-${va.nomor}`;
                            return (
                                <div
                                    key={key}
                                    className="border-base-300 bg-base-100 flex items-start justify-between gap-2 rounded-xl border p-3.5"
                                >
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-base-content/70">
                                            VA {va.bank}
                                        </div>
                                        <div className="mt-1 font-mono text-base font-bold tracking-tight break-all">
                                            {va.nomor}
                                        </div>
                                        <div className="text-base-content/70 mt-0.5 text-xs">
                                            a.n. {va.atas_nama}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-xs shrink-0 gap-1"
                                        onClick={() => copyNumber(key, va.nomor)}
                                        aria-label={`Salin VA ${va.bank}`}
                                    >
                                        {copiedKey === key ? (
                                            <>
                                                <Check className="text-primary size-3.5" />
                                                <span>Tersalin</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="size-3.5" />
                                                <span>Salin</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
