import type { ReactNode } from 'react';
import { processTableRows, type TableColumn } from '../lib/table-data';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Eye,
    Filter,
    Inbox,
    Pencil,
    Search,
    Star,
    Trash2,
    X,
    type LucideIcon,
} from 'lucide-react';

/*
 * Andalas Residen primitives.
 *
 * Rule of thumb used throughout this file: daisyUI's component class is used
 * wherever it maps one-to-one onto a real control (button, modal, table, badge,
 * tabs, input, select, textarea, skeleton). Where the app has a bespoke
 * composite that daisyUI has no counterpart for (stat card, page header), the
 * composite is built from daisyUI colour and radius tokens instead of a new
 * palette. Either way the colour comes from the two themes in app.css.
 *
 * Identifiers (NIM, barcode, room number) use the `.text-identifier` utility so
 * they line up in columns. Labels use the body face: a fixed-width font on a
 * label reads as costume, not information.
 */

// ─── BADGE ──────────────────────────────────────────────────────────────────

type BadgeColor = 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'orange';

interface BadgeProps {
    color?: BadgeColor;
    children: ReactNode;
}

/*
 * Six tinted hues were reduced to five semantic tones. `orange` and `yellow`
 * both meant "in progress" and rendered as two nearly identical amber chips, so
 * they now share `warning`. A hue that carries no distinct meaning is noise.
 */
const badgeTone: Record<BadgeColor, string> = {
    green: 'badge-success',
    yellow: 'badge-warning',
    red: 'badge-error',
    gray: 'badge-neutral',
    blue: 'badge-info',
    orange: 'badge-warning',
};

export function Badge({ color = 'gray', children }: BadgeProps) {
    return (
        <span className={`badge badge-sm font-medium ${badgeTone[color]}`}>
            {children}
        </span>
    );
}

// ─── STATUS BADGE ───────────────────────────────────────────────────────────

type Status =
    | 'pending'
    | 'terverifikasi'
    | 'ditolak'
    | 'disetujui'
    | 'baru'
    | 'diproses'
    | 'selesai'
    | 'baik'
    | 'rusak_ringan'
    | 'rusak_berat'
    | 'hilang'
    | 'kosong'
    | 'terisi'
    | 'penuh'
    | 'maintenance'
    | 'aktif'
    | 'nonaktif';

const statusMap: Record<Status, { label: string; color: BadgeColor }> = {
    pending: { label: 'Pending', color: 'yellow' },
    terverifikasi: { label: 'Terverifikasi', color: 'green' },
    ditolak: { label: 'Ditolak', color: 'red' },
    disetujui: { label: 'Disetujui', color: 'green' },
    baru: { label: 'Baru', color: 'blue' },
    diproses: { label: 'Diproses', color: 'yellow' },
    selesai: { label: 'Selesai', color: 'green' },
    baik: { label: 'Baik', color: 'green' },
    rusak_ringan: { label: 'Rusak Ringan', color: 'yellow' },
    rusak_berat: { label: 'Rusak Berat', color: 'red' },
    hilang: { label: 'Hilang', color: 'gray' },
    kosong: { label: 'Kosong', color: 'green' },
    terisi: { label: 'Terisi', color: 'yellow' },
    penuh: { label: 'Penuh', color: 'red' },
    maintenance: { label: 'Maintenance', color: 'gray' },
    aktif: { label: 'Aktif', color: 'green' },
    nonaktif: { label: 'Nonaktif', color: 'gray' },
};

export function StatusBadge({ status }: { status: string }) {
    const s = statusMap[status as Status] ?? {
        label: status,
        color: 'gray' as BadgeColor,
    };
    return <Badge color={s.color}>{s.label}</Badge>;
}

// ─── CARD ───────────────────────────────────────────────────────────────────

export function Card({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`card rounded-box bg-base-100 shadow-xs ${className}`}>
            {children}
        </div>
    );
}

// ─── PAGE HEADER ────────────────────────────────────────────────────────────

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    return (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
                {/* Titles are bold DM Sans, matching MyUNAND's page headers. */}
                <h1 className="text-base-content text-xl font-bold tracking-tight md:text-2xl">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-base-content/70 mt-0.5 text-xs md:text-sm">
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex shrink-0 items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}

// ─── STAT CARD ──────────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: string | number;
    icon?: ReactNode;
    color?: 'green' | 'gold' | 'red' | 'gray';
}

/*
 * A previous `trend` prop rendered a ▲/▼ delta. Nothing ever passed it, and a
 * delta with no comparison period behind it is a claim the app cannot support,
 * so the prop is gone rather than left as an invitation to invent one.
 */
export function StatCard({
    label,
    value,
    icon,
    color = 'green',
}: StatCardProps) {
    const tone = {
        green: 'text-success',
        gold: 'text-warning',
        red: 'text-error',
        gray: 'text-base-content',
    }[color];

    return (
        <Card className="shadow-xs">
            <div className="card-body flex-row items-center gap-4 p-4 md:p-5">
                {icon && (
                    <div className="bg-base-200 text-base-content/60 flex size-10 shrink-0 items-center justify-center rounded-full">
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-base-content/60 text-xs font-medium tracking-wider uppercase">
                        {label}
                    </p>
                    <p
                        className={`text-base-content mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl ${tone}`}
                    >
                        {value}
                    </p>
                </div>
            </div>
        </Card>
    );
}

// ─── TABLE ──────────────────────────────────────────────────────────────────

export interface DataColumn<T> extends TableColumn<T> {
    width?: string;
    render?: (row: T) => ReactNode;
}

export function Table<T extends Record<string, unknown>>(
    props: DataTableProps<T>,
) {
    return <DataTable {...props} />;
}

interface DataTableProps<T extends Record<string, unknown>> {
    columns: DataColumn<T>[];
    data: T[];
    searchKeys?: string[];
    searchPlaceholder?: string;
    filters?: ReactNode;
    /** Aksi toolbar (mis. tombol "Tambah"), ditampilkan di kanan. */
    actions?: ReactNode;
    onRowClick?: (row: T) => void;
    defaultPerPage?: number;
    emptyMessage?: string;
}

function ToolbarFilter<T extends Record<string, unknown>>({
    col,
    value,
    onChange,
}: {
    col: DataColumn<T>;
    value: string;
    onChange: (value: string) => void;
}) {
    if (!col.filter || col.filter.type !== 'select') {
        return null;
    }

    return (
        <select
            className="select select-sm max-w-48"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={`Filter ${col.label}`}
        >
            <option value="">Semua {col.label}</option>
            {(col.filter.options ?? []).map((option) => {
                const optionValue =
                    typeof option === 'string' ? option : option.value;
                const optionLabel =
                    typeof option === 'string' ? option : option.label;

                return (
                    <option key={optionValue} value={optionValue}>
                        {optionLabel}
                    </option>
                );
            })}
        </select>
    );
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
    if (!active) {
        return <ArrowUpDown className="size-3 opacity-40" aria-hidden="true" />;
    }
    return dir === 'asc' ? (
        <ArrowUp className="size-3" aria-hidden="true" />
    ) : (
        <ArrowDown className="size-3" aria-hidden="true" />
    );
}

/*
 * Column filter lives directly under the sortable header, one control per
 * column, exactly like MyUNAND's filter row. Selects match the raw value
 * exactly; text inputs are LIKE.
 */
function ColumnFilter<T extends Record<string, unknown>>({
    col,
    value,
    onChange,
}: {
    col: DataColumn<T>;
    value: string;
    onChange: (v: string) => void;
}) {
    const f = col.filter;
    if (!f) return null;

    if (f.type === 'select') {
        const options = f.options ?? [];
        return (
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="select select-xs w-full"
                aria-label={`Filter ${col.label}`}
            >
                <option value="">
                    {f.placeholder ?? `Semua ${col.label.toLowerCase()}`}
                </option>
                {options.map((opt) => {
                    const optValue = typeof opt === 'string' ? opt : opt.value;
                    const optLabel = typeof opt === 'string' ? opt : opt.label;
                    return (
                        <option key={optValue} value={optValue}>
                            {optLabel}
                        </option>
                    );
                })}
            </select>
        );
    }

    return (
        <label className="input input-xs w-full">
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={
                    f.placeholder ?? `Filter ${col.label.toLowerCase()}`
                }
                aria-label={`Filter ${col.label}`}
            />
        </label>
    );
}

function PageButton({
    onClick,
    disabled,
    active,
    children,
    label,
}: {
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    children: ReactNode;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={`btn btn-sm join-item ${active ? 'btn-primary' : 'btn-ghost'}`}
        >
            {children}
        </button>
    );
}

export function DataTable<T extends Record<string, unknown>>({
    columns: inputColumns,
    data,
    searchKeys = [],
    searchPlaceholder = 'Cari…',
    filters,
    actions,
    onRowClick,
    defaultPerPage = 10,
    emptyMessage = 'Belum ada data di sini',
}: DataTableProps<T>) {
    const visibleColumns: DataColumn<T>[] =
        onRowClick &&
        !inputColumns.some(
            (column) =>
                column.action || /^(aksi|action|actions)$/i.test(column.key),
        )
            ? [
                  ...inputColumns,
                  {
                      key: 'actions',
                      label: 'Aksi',
                      action: true,
                      render: (row: T) => (
                          <IconButton
                              label="Lihat detail"
                              icon={Eye}
                              tone="text-info hover:bg-info/10"
                              onClick={() => onRowClick(row)}
                          />
                      ),
                  },
              ]
            : inputColumns;
    const columns = visibleColumns.map((column) => {
        const action =
            column.action ?? /^(aksi|action|actions)$/i.test(column.key);
        return {
            ...column,
            label: action ? column.label.trim() || 'Aksi' : column.label,
            action,
            sortable: action ? false : (column.sortable ?? true),
            filter: action ? undefined : column.filter,
        };
    });
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(defaultPerPage);
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
        {},
    );

    const filterable = columns.filter((c) => c.filter?.type === 'select');
    const activeFilterCount =
        Object.values(columnFilters).filter(Boolean).length;

    useEffect(() => {
        setPage(1);
    }, [data.length, search, columnFilters]);

    const setFilter = (key: string, value: string) => {
        setColumnFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const clearFilters = () => {
        setColumnFilters({});
        setSearch('');
        setPage(1);
    };

    const processed = useMemo(
        () =>
            processTableRows(data, columns, {
                search,
                searchKeys,
                sortKey,
                sortDir,
                columnFilters,
            }),
        [data, columns, search, searchKeys, sortKey, sortDir, columnFilters],
    );

    const totalRows = processed.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / perPage));
    const safePage = Math.min(page, totalPages);
    const paginated = processed.slice(
        (safePage - 1) * perPage,
        safePage * perPage,
    );
    const from = totalRows === 0 ? 0 : (safePage - 1) * perPage + 1;
    const to = Math.min(safePage * perPage, totalRows);

    const toggleSort = (key: string) => {
        if (sortKey !== key) {
            setSortKey(key);
            setSortDir('asc');
        } else if (sortDir === 'asc') {
            setSortDir('desc');
        } else {
            setSortKey(null);
        }
        setPage(1);
    };

    const pageNumbers = (): (number | 'gap')[] => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const nums: (number | 'gap')[] = [1];

        if (safePage > 3) {
            nums.push('gap');
        }

        for (
            let i = Math.max(2, safePage - 1);
            i <= Math.min(totalPages - 1, safePage + 1);
            i++
        ) {
            nums.push(i);
        }

        if (safePage < totalPages - 2) {
            nums.push('gap');
        }

        nums.push(totalPages);

        return nums;
    };

    const isFiltered = search.trim().length > 0 || activeFilterCount > 0;

    return (
        <div className="rounded-box border-base-200 bg-base-100 min-w-0 overflow-hidden border">
            <div className="flex items-center justify-between gap-4 overflow-x-auto px-4 pt-4 pb-3">
                <div className="w-56 shrink-0 sm:w-64">
                    <label className="input input-sm w-full">
                        <Search
                            className="size-3.5 opacity-50"
                            aria-hidden="true"
                        />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            aria-label={searchPlaceholder}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="btn btn-circle btn-ghost btn-xs"
                                aria-label="Hapus pencarian"
                            >
                                <X className="size-3.5" aria-hidden="true" />
                            </button>
                        )}
                    </label>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                    {filterable.map((col) => (
                        <ToolbarFilter
                            key={col.key}
                            col={col}
                            value={columnFilters[col.key] ?? ''}
                            onChange={(value) => setFilter(col.key, value)}
                        />
                    ))}
                    {filters}
                    {actions && (
                        <div className="ml-auto flex items-center gap-2">
                            {actions}
                        </div>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="table-sm table w-full table-auto">
                    <thead>
                        <tr>
                            <th className="bg-base-200/60 text-base-content/60 w-14 text-center text-xs font-semibold">
                                No.
                            </th>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={
                                        (col.width ?? '') +
                                        (col.action
                                            ? ' bg-base-200 sticky right-0 z-10 w-px text-center whitespace-nowrap shadow-sm'
                                            : ' bg-base-200/60')
                                    }
                                    aria-sort={
                                        sortKey === col.key
                                            ? sortDir === 'asc'
                                                ? 'ascending'
                                                : 'descending'
                                            : undefined
                                    }
                                >
                                    {col.sortable ? (
                                        <button
                                            type="button"
                                            onClick={() => toggleSort(col.key)}
                                            className="text-base-content/60 hover:text-base-content flex items-center gap-1 text-xs font-semibold uppercase"
                                            aria-label={`Urutkan berdasarkan ${col.label}`}
                                        >
                                            {col.label}
                                            <SortIcon
                                                active={sortKey === col.key}
                                                dir={sortDir}
                                            />
                                        </button>
                                    ) : (
                                        <span className="text-base-content/60 text-xs font-semibold uppercase">
                                            {col.label}
                                        </span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1}>
                                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                                        <Inbox
                                            className="text-base-content/30 size-7"
                                            aria-hidden="true"
                                        />
                                        <p className="text-muted text-sm">
                                            {isFiltered
                                                ? `Tidak ada data yang cocok dengan pencarian atau filter saat ini.`
                                                : emptyMessage}
                                        </p>
                                        {isFiltered && (
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className="btn btn-ghost btn-xs text-base-content/60 gap-1.5"
                                            >
                                                <X
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                Bersihkan pencarian &amp; filter
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginated.map((row, i) => (
                                <tr
                                    key={String(row.id ?? i)}
                                    onClick={
                                        onRowClick
                                            ? () => onRowClick(row)
                                            : undefined
                                    }
                                    onKeyDown={
                                        onRowClick
                                            ? (e) => {
                                                  if (
                                                      e.target ===
                                                          e.currentTarget &&
                                                      (e.key === 'Enter' ||
                                                          e.key === ' ')
                                                  ) {
                                                      e.preventDefault();
                                                      onRowClick(row);
                                                  }
                                              }
                                            : undefined
                                    }
                                    tabIndex={onRowClick ? 0 : undefined}
                                    className={
                                        'hover:bg-base-300 ' +
                                        (i % 2 === 0 ? 'bg-base-100 ' : 'bg-base-200 ') +
                                        (onRowClick ? 'cursor-pointer' : '')
                                    }
                                >
                                    <td className="text-base-content/50 w-14 text-center text-xs font-medium">
                                        {from + i}
                                    </td>
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={
                                                col.action
                                                    ? 'bg-inherit sticky right-0 z-[1] w-px whitespace-nowrap shadow-sm'
                                                    : ''
                                            }
                                            onClick={
                                                col.action
                                                    ? (event) =>
                                                          event.stopPropagation()
                                                    : undefined
                                            }
                                        >
                                            {col.render
                                                ? col.render(row)
                                                : String(row[col.key] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="border-base-200 mt-0 flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-base-content/60 text-xs">
                    {totalRows === 0
                        ? 'Tidak ada baris untuk ditampilkan'
                        : `Menampilkan ${from}-${to} dari ${totalRows} data`}
                </span>

                <div className="flex items-center gap-4">
                    <label className="text-base-content/60 flex items-center gap-1.5 text-xs">
                        Tampil
                        <select
                            value={perPage}
                            onChange={(e) => {
                                setPerPage(Number(e.target.value));
                                setPage(1);
                            }}
                            className="select select-xs w-18"
                            aria-label="Baris per halaman"
                        >
                            {[...new Set([defaultPerPage, 10, 25, 50, 100])]
                                .sort((a, b) => a - b)
                                .map((n) => (
                                    <option key={n}>{n}</option>
                                ))}
                        </select>
                    </label>

                    {
                        <div className="join" aria-label="Navigasi halaman">
                            <PageButton
                                onClick={() => setPage(1)}
                                disabled={safePage === 1}
                                label="Halaman pertama"
                            >
                                <ChevronsLeft
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                            </PageButton>
                            <PageButton
                                onClick={() =>
                                    setPage((p) => Math.max(1, p - 1))
                                }
                                disabled={safePage === 1}
                                label="Halaman sebelumnya"
                            >
                                <ChevronLeft
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                            </PageButton>

                            {pageNumbers().map((n, i) =>
                                n === 'gap' ? (
                                    <span
                                        key={`gap-${i}`}
                                        className="join-item px-1 text-xs"
                                        aria-hidden="true"
                                    >
                                        …
                                    </span>
                                ) : (
                                    <PageButton
                                        key={n}
                                        active={n === safePage}
                                        onClick={() => setPage(n)}
                                        label={`Halaman ${n}`}
                                    >
                                        {n}
                                    </PageButton>
                                ),
                            )}

                            <PageButton
                                onClick={() =>
                                    setPage((p) => Math.min(totalPages, p + 1))
                                }
                                disabled={safePage === totalPages}
                                label="Halaman berikutnya"
                            >
                                <ChevronRight
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                            </PageButton>
                            <PageButton
                                onClick={() => setPage(totalPages)}
                                disabled={safePage === totalPages}
                                label="Halaman terakhir"
                            >
                                <ChevronsRight
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                            </PageButton>
                        </div>
                    }
                </div>
            </div>
        </div>
    );
}

// ─── EMPTY STATE ────────────────────────────────────────────────────────────

export function EmptyState({
    title,
    desc,
    action,
}: {
    title: string;
    desc?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
            <p className="text-base-content text-sm font-medium">{title}</p>
            {desc && <p className="text-muted max-w-sm text-sm">{desc}</p>}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}

// ─── MODAL ──────────────────────────────────────────────────────────────────

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    width?: string;
}

/*
 * Built on the native <dialog> element, which gives Escape-to-close, a focus
 * trap and inert background content from the platform instead of from
 * hand-rolled key handlers. daisyUI styles it through `modal` / `modal-box`.
 */
export function Modal({
    open,
    onClose,
    title,
    children,
    width = 'max-w-lg',
}: ModalProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;

        if (!dialog) {
            return;
        }

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={ref}
            className="modal modal-bottom sm:modal-middle"
            onClose={onClose}
        >
            <div
                className={`modal-box flex max-h-[calc(100vh-5em)] flex-col overflow-hidden p-0 ${width}`}
            >
                {title && (
                    <div className="border-base-200 flex shrink-0 items-start justify-between gap-3 border-b px-5 py-3">
                        <h2 className="text-base-content text-base font-semibold">
                            {title}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-ghost btn-xs btn-square"
                            aria-label="Tutup"
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {children}
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button aria-label="Tutup dialog" onClick={onClose} />
            </form>
        </dialog>
    );
}

// ─── CONFIRM DIALOG ─────────────────────────────────────────────────────────

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title = 'Konfirmasi Hapus',
    message = 'Data ini akan dihapus. Tindakan ini tidak bisa dibatalkan.',
    confirmLabel = 'Hapus',
    cancelLabel = 'Batal',
    loading = false,
}: ConfirmDialogProps) {
    return (
        <Modal open={open} onClose={onClose} title={title} width="max-w-md">
            <div className="text-muted text-sm leading-relaxed">{message}</div>
            <div className="modal-action">
                <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={loading}
                >
                    {cancelLabel}
                </Button>
                <Button variant="danger" onClick={onConfirm} disabled={loading}>
                    {loading ? 'Memproses…' : confirmLabel}
                </Button>
            </div>
        </Modal>
    );
}

// ─── DRAWER ─────────────────────────────────────────────────────────────────

interface DrawerProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    children: ReactNode;
    width?: string;
    footer?: ReactNode;
}

/*
 * A right-anchored sheet. `modal-end` is daisyUI's own side-aligned modal, so
 * this reuses the modal surface and its platform accessibility rather than the
 * checkbox-toggle drawer, which cannot be opened from arbitrary state.
 */
export function Drawer({
    open,
    onClose,
    title,
    subtitle,
    children,
    width = 'max-w-md',
    footer,
}: DrawerProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;

        if (!dialog) {
            return;
        }

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog ref={ref} className="modal modal-end" onClose={onClose}>
            <div
                className={`modal-box ${width} rounded-box mr-0 flex h-full max-h-screen flex-col overflow-hidden p-0`}
            >
                <div className="border-base-200 flex shrink-0 items-start justify-between gap-3 border-b px-5 py-3">
                    <div className="min-w-0">
                        {title && (
                            <h2 className="text-base-content text-base font-semibold">
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className="text-base-content/60 mt-0.5 text-xs">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-ghost btn-xs btn-square"
                        aria-label="Tutup panel"
                    >
                        <X className="size-4" aria-hidden="true" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {children}
                </div>

                {footer && (
                    <div className="modal-action border-base-200 mt-0 shrink-0 border-t px-5 py-3">
                        {footer}
                    </div>
                )}
            </div>
            <form method="dialog" className="modal-backdrop">
                <button aria-label="Tutup panel" onClick={onClose} />
            </form>
        </dialog>
    );
}

// ─── FORM FIELD ─────────────────────────────────────────────────────────────

/*
 * daisyUI 5 dropped the old `form-control` / `label-text` pair; the replacement
 * is `fieldset` with a `fieldset-legend`, which is what an accessible grouping
 * of label plus control actually is.
 */
export function FormField({
    label,
    children,
    hint,
}: {
    label: string;
    children: ReactNode;
    hint?: string;
}) {
    return (
        <fieldset className="fieldset">
            <legend className="fieldset-legend text-muted text-xs font-medium">
                {label}
            </legend>
            {children}
            {hint && (
                <p className="fieldset-label text-muted text-xs">{hint}</p>
            )}
        </fieldset>
    );
}

export const inputClass = 'input w-full';
export const selectClass = 'select w-full';
export const textareaClass = 'textarea w-full';

// ─── STARS ──────────────────────────────────────────────────────────────────

export function Stars({ value, max = 5 }: { value: number; max?: number }) {
    return (
        <span
            className="inline-flex items-center gap-0.5"
            aria-label={`${value} dari ${max}`}
        >
            {Array.from({ length: max }, (_, i) => (
                <Star
                    key={i}
                    className={`size-3.5 ${i < value ? 'fill-accent text-accent' : 'text-base-300'}`}
                    aria-hidden="true"
                />
            ))}
        </span>
    );
}

// ─── BUTTON ─────────────────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
    variant?: BtnVariant;
    children: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit';
    disabled?: boolean;
    className?: string;
    size?: 'sm' | 'md';
    form?: string;
}

const btnTone: Record<BtnVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-outline',
    danger: 'btn-error',
    ghost: 'btn-ghost',
};

export function Button({
    variant = 'primary',
    children,
    onClick,
    type = 'button',
    disabled,
    className = '',
    size = 'md',
    form,
}: ButtonProps) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            form={form}
            className={`btn ${size === 'sm' ? 'btn-sm' : ''} ${btnTone[variant]} ${className}`}
        >
            {children}
        </button>
    );
}

// ─── ICON BUTTON & ROW ACTIONS ──────────────────────────────────────────────

const iconBtnSize = { xs: 'btn-xs', sm: 'btn-sm', md: 'btn-md' } as const;
const iconBtnIconSize = { xs: 14, sm: 16, md: 18 } as const;

/*
 * Row-level action buttons, copied from MyUNAND-Akademik's IconButton: a small
 * square ghost button with a semantic tone and a tooltip. Tooltips carry the
 * human label while the button itself stays icon-only, so the grid column
 * stays narrow and the row stays readable.
 */
export function IconButton({
    label,
    icon: Icon,
    onClick,
    tone = '',
    size = 'xs',
    tooltipPosition = 'tooltip-top',
    disabled = false,
    className = '',
}: {
    label: string;
    icon: LucideIcon;
    onClick?: () => void;
    tone?: string;
    size?: keyof typeof iconBtnSize;
    tooltipPosition?: string;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={onClick}
                        disabled={disabled}
                        aria-label={label}
                        className={`btn btn-ghost btn-square border border-current ${iconBtnSize[size]} ${tone} ${className}`}
                    >
                        <Icon size={iconBtnIconSize[size]} aria-hidden="true" />
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    side={
                        tooltipPosition === 'tooltip-bottom' ? 'bottom' : 'top'
                    }
                    className="z-[100]"
                >
                    {label}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function RowActions({
    onDetail,
    onEdit,
    onDelete,
    extra,
}: {
    onDetail?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    extra?: ReactNode;
}) {
    return (
        <div
            className="flex items-center justify-end gap-0.5"
            onClick={(event) => event.stopPropagation()}
        >
            {onDetail && (
                <IconButton
                    label="Lihat detail"
                    icon={Eye}
                    tone="text-info hover:bg-info/10"
                    onClick={onDetail}
                />
            )}
            {onEdit && (
                <IconButton
                    label="Ubah data"
                    icon={Pencil}
                    tone="text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                    onClick={onEdit}
                />
            )}
            {onDelete && (
                <IconButton
                    label="Hapus data"
                    icon={Trash2}
                    tone="text-error hover:bg-error/10"
                    onClick={onDelete}
                />
            )}
            {extra}
        </div>
    );
}

// ─── TABS ───────────────────────────────────────────────────────────────────

interface TabsProps {
    tabs: string[];
    active: number;
    onChange: (i: number) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
    return (
        <div role="tablist" className="tabs tabs-box mb-4 w-fit">
            {tabs.map((t, i) => (
                <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={active === i}
                    onClick={() => onChange(i)}
                    className={`tab ${active === i ? 'tab-active' : ''}`}
                >
                    {t}
                </button>
            ))}
        </div>
    );
}

// ─── SKELETON ───────────────────────────────────────────────────────────────

export function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`skeleton ${className}`} />;
}

export function TableSkeleton({
    rows = 5,
    cols = 4,
}: {
    rows?: number;
    cols?: number;
}) {
    return (
        <div className="space-y-3 p-2" aria-hidden="true">
            <div className="flex gap-3">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className="h-3 flex-1" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-3">
                    {Array.from({ length: cols }).map((_, c) => (
                        <Skeleton key={c} className="h-3 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function CardSkeleton({ items = 3 }: { items?: number }) {
    return (
        <div className="grid gap-4" aria-hidden="true">
            {Array.from({ length: items }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-box border-base-300 bg-base-100 space-y-3 border p-5"
                >
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                </div>
            ))}
        </div>
    );
}
