import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

function formatRemaining(targetIso: string): {
    expired: boolean;
    label: string;
    totalSeconds: number;
} {
    const targetMs = new Date(targetIso).getTime();
    if (Number.isNaN(targetMs)) {
        return { expired: false, label: '-', totalSeconds: 0 };
    }
    const diffSeconds = Math.floor((targetMs - Date.now()) / 1000);
    if (diffSeconds <= 0) {
        return { expired: true, label: '00:00:00', totalSeconds: 0 };
    }

    const days = Math.floor(diffSeconds / 86400);
    const hours = Math.floor((diffSeconds % 86400) / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;
    const pad = (value: number) => String(value).padStart(2, '0');

    const timePart = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    return {
        expired: false,
        label: days > 0 ? `${days} hari ${timePart}` : timePart,
        totalSeconds: diffSeconds,
    };
}

export function ReservationCountdown({
    targetIso,
    label = 'Batas waktu penyelesaian pembayaran',
}: {
    targetIso?: string | null;
    label?: string;
}) {
    const [remaining, setRemaining] = useState(() =>
        targetIso ? formatRemaining(targetIso) : null,
    );

    useEffect(() => {
        if (!targetIso) {
            setRemaining(null);
            return;
        }
        setRemaining(formatRemaining(targetIso));
        const timer = window.setInterval(() => {
            setRemaining(formatRemaining(targetIso));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [targetIso]);

    if (!targetIso || !remaining) {
        return null;
    }

    const formattedDeadline = new Date(targetIso).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    return (
        <div
            className={`rounded-xl border border-base-300 border-l-4 bg-base-200/50 px-4 py-3 ${
                remaining.expired
                    ? 'border-l-error text-error'
                    : 'border-l-warning'
            }`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium">
                    <Clock className="size-4 shrink-0" />
                    <span>{label}</span>
                </div>
                <span className="font-mono text-base font-bold tabular-nums">
                    {remaining.expired
                        ? 'Batas waktu berakhir'
                        : remaining.label}
                </span>
            </div>
            <p className="text-base-content/70 mt-1 text-xs">
                Jatuh tempo: {formattedDeadline} WIB
            </p>
        </div>
    );
}
