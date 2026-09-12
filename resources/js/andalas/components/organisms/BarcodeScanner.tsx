import { useEffect, useRef, useState } from 'react';
import { atomInputClass } from '../atoms/Input';

type Props = {
    onScan: (code: string) => void;
    placeholder?: string;
};

export function BarcodeScanner({ onScan, placeholder = 'Scan barcode atau ketik kode...' }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState('');

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const code = value.trim();
        if (!code) return;
        onScan(code);
        setValue('');
        inputRef.current?.focus();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                autoComplete="off"
                className={atomInputClass}
            />
            <p className="text-xs text-muted">
                Gunakan scanner USB/barcode reader atau ketik kode manual. Tekan Enter untuk mencatat.
            </p>
        </form>
    );
}
