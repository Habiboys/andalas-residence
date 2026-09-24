import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { NAV_MAP, type NavItem, type UserRole } from './Sidebar';

type SearchEntry = { label: string; page: string; group: string | null };

const buildIndex = (role: UserRole): SearchEntry[] => {
    const entries: SearchEntry[] = [];
    const groups = NAV_MAP[role] ?? [];

    groups.forEach((group) => {
        group.items.forEach((item: NavItem) => {
            entries.push({
                label: item.label,
                page: item.page,
                group: group.group ?? null,
            });
        });
    });

    return entries;
};

type Props = {
    open: boolean;
    onClose: () => void;
    role: UserRole;
    attendanceEligible?: boolean;
    activeResident?: boolean;
    onNavigate: (page: string) => void;
};

/*
 * Pencarian menu di navbar, ala MyUNAND: dialog asli `<dialog>` yang menyaring
 * semua halaman navigasi berdasarkan label/kelompok. Shortcut `/` di buka dari
 * navbar.
 */
export function NavSearchModal({
    open,
    onClose,
    role,
    attendanceEligible = false,
    activeResident = false,
    onNavigate,
}: Props) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const closedByProp = useRef(false);
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (open && !dialogRef.current?.open) {
            dialogRef.current?.showModal();
            const reset = () => {
                setQuery('');
                inputRef.current?.focus();
            };
            requestAnimationFrame(reset);
        } else if (!open && dialogRef.current?.open) {
            closedByProp.current = true;
            dialogRef.current.close();
        }
    }, [open]);

    const handleClose = () => {
        if (closedByProp.current) {
            closedByProp.current = false;
            return;
        }
        onClose();
    };

    const index = useMemo(
        () =>
            buildIndex(role).filter(
                (item) =>
                    role !== 'mahasiswa' ||
                    ((item.page !== 'absensi' || attendanceEligible || activeResident) &&
                        (!['lapor-kerusakan', 'checkout'].includes(item.page) ||
                            activeResident)),
            ),
        [role, attendanceEligible, activeResident],
    );

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return index;
        return index.filter(
            (item) =>
                item.label.toLowerCase().includes(q) ||
                (item.group?.toLowerCase().includes(q) ?? false),
        );
    }, [query, index]);

    const handleSelect = (page: string) => {
        onNavigate(page);
        onClose();
    };

    return (
        <dialog ref={dialogRef} className="modal" onClose={handleClose}>
            <div className="modal-box max-w-lg p-0 shadow-2xl">
                <div className="border-base-200 flex items-center gap-3 border-b px-5 py-4">
                    <Search
                        className="text-base-content/40 size-4 shrink-0"
                        aria-hidden="true"
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && results.length > 0) {
                                handleSelect(results[0].page);
                            }
                        }}
                        placeholder="Cari menu atau halaman..."
                        className="placeholder:text-base-content/40 w-full bg-transparent text-sm outline-hidden"
                        aria-label="Cari menu atau halaman"
                    />
                    <button
                        type="button"
                        className="btn btn-ghost btn-circle btn-xs shrink-0"
                        onClick={onClose}
                        aria-label="Tutup"
                    >
                        <X className="size-4" aria-hidden="true" />
                    </button>
                </div>

                <div className="max-h-80 overflow-y-auto p-2">
                    {results.length === 0 ? (
                        <p className="text-base-content/50 px-4 py-8 text-center text-sm">
                            Tidak ada hasil untuk &ldquo;{query}&rdquo;
                        </p>
                    ) : (
                        <ul className="space-y-0.5">
                            {results.map((item, idx) => (
                                <li key={`${item.page}-${idx}`}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(item.page)}
                                        className="text-base-content hover:bg-base-200 flex w-full items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-left text-sm transition-colors"
                                    >
                                        <span className="font-medium">
                                            {item.label}
                                        </span>
                                        {item.group && (
                                            <span className="text-base-content/50 text-[11px]">
                                                {item.group}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button aria-label="Tutup dialog">close</button>
            </form>
        </dialog>
    );
}
