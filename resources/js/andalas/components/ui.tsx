import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Star,
  X,
} from "lucide-react";

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

type BadgeColor = "green" | "yellow" | "red" | "gray" | "blue" | "orange";

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
  green: "badge-success",
  yellow: "badge-warning",
  red: "badge-error",
  gray: "badge-neutral",
  blue: "badge-info",
  orange: "badge-warning",
};

export function Badge({ color = "gray", children }: BadgeProps) {
  return <span className={`badge badge-sm ${badgeTone[color]}`}>{children}</span>;
}

// ─── STATUS BADGE ───────────────────────────────────────────────────────────

type Status =
  | "pending" | "terverifikasi" | "ditolak" | "disetujui"
  | "baru" | "diproses" | "selesai"
  | "baik" | "rusak_ringan" | "rusak_berat" | "hilang"
  | "kosong" | "terisi" | "penuh" | "maintenance"
  | "aktif" | "nonaktif";

const statusMap: Record<Status, { label: string; color: BadgeColor }> = {
  pending: { label: "Pending", color: "yellow" },
  terverifikasi: { label: "Terverifikasi", color: "green" },
  ditolak: { label: "Ditolak", color: "red" },
  disetujui: { label: "Disetujui", color: "green" },
  baru: { label: "Baru", color: "blue" },
  diproses: { label: "Diproses", color: "yellow" },
  selesai: { label: "Selesai", color: "green" },
  baik: { label: "Baik", color: "green" },
  rusak_ringan: { label: "Rusak Ringan", color: "yellow" },
  rusak_berat: { label: "Rusak Berat", color: "red" },
  hilang: { label: "Hilang", color: "gray" },
  kosong: { label: "Kosong", color: "green" },
  terisi: { label: "Terisi", color: "yellow" },
  penuh: { label: "Penuh", color: "red" },
  maintenance: { label: "Maintenance", color: "gray" },
  aktif: { label: "Aktif", color: "green" },
  nonaktif: { label: "Nonaktif", color: "gray" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusMap[status as Status] ?? { label: status, color: "gray" as BadgeColor };
  return <Badge color={s.color}>{s.label}</Badge>;
}

// ─── CARD ───────────────────────────────────────────────────────────────────

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`card rounded-box border border-base-300 bg-base-100 ${className}`}>
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
        {/* The serif face is the one piece of display type in the system. It is
            what makes a screen read as this institution rather than a generic
            admin panel. */}
        <h1 className="font-serif text-xl text-base-content">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── STAT CARD ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: "green" | "gold" | "red" | "gray";
}

/*
 * A previous `trend` prop rendered a ▲/▼ delta. Nothing ever passed it, and a
 * delta with no comparison period behind it is a claim the app cannot support,
 * so the prop is gone rather than left as an invitation to invent one.
 */
export function StatCard({ label, value, icon, color = "green" }: StatCardProps) {
  const tone = {
    green: "text-primary",
    gold: "text-accent",
    red: "text-error",
    gray: "text-muted",
  }[color];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className={`mt-1 font-serif text-2xl ${tone}`}>{value}</p>
        </div>
        {icon && (
          <div className="shrink-0 rounded-field bg-base-200 p-2 text-primary">{icon}</div>
        )}
      </div>
    </Card>
  );
}

// ─── TABLE ──────────────────────────────────────────────────────────────────

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  width?: string;
}

interface TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage,
}: TableProps<T>) {
  if (data.length === 0) {
    return <EmptyState title={emptyMessage ?? "Belum ada data"} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`text-xs font-semibold text-muted ${col.width ?? ""}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              className={onRowClick ? "cursor-pointer" : undefined}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row) : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── DATA TABLE ─────────────────────────────────────────────────────────────

export interface DataColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: DataColumn<T>[];
  data: T[];
  searchKeys?: string[];
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  onRowClick?: (row: T) => void;
  defaultPerPage?: number;
  emptyMessage?: string;
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) {
    return <ArrowUpDown className="size-3 opacity-40" aria-hidden="true" />;
  }
  return dir === "asc" ? (
    <ArrowUp className="size-3" aria-hidden="true" />
  ) : (
    <ArrowDown className="size-3" aria-hidden="true" />
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
      aria-current={active ? "page" : undefined}
      className={`btn btn-sm ${active ? "btn-active" : "btn-ghost"}`}
    >
      {children}
    </button>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchKeys = [],
  searchPlaceholder = "Cari…",
  filters,
  actions,
  onRowClick,
  defaultPerPage = 10,
  emptyMessage = "Belum ada data di sini",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);

  useEffect(() => {
    setPage(1);
  }, [data.length, search]);

  const processed = useMemo(() => {
    let rows = data;

    if (search.trim() && searchKeys.length > 0) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q)),
      );
    }

    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const numA = Number(a[sortKey]);
        const numB = Number(b[sortKey]);
        const isNumeric = !Number.isNaN(numA) && !Number.isNaN(numB);

        const cmp = isNumeric
          ? numA - numB
          : String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), "id");

        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return rows;
  }, [data, search, searchKeys, sortKey, sortDir]);

  const totalRows = processed.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = processed.slice((safePage - 1) * perPage, safePage * perPage);
  const from = totalRows === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, totalRows);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const pageNumbers = (): (number | "gap")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const nums: (number | "gap")[] = [1];

    if (safePage > 3) {
      nums.push("gap");
    }

    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
      nums.push(i);
    }

    if (safePage < totalPages - 2) {
      nums.push("gap");
    }

    nums.push(totalPages);

    return nums;
  };

  const isFiltered = search.trim().length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {searchKeys.length > 0 && (
          <label className="input input-sm max-w-xs flex-1 sm:min-w-52">
            <Search className="size-3.5 opacity-50" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
          </label>
        )}

        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.width ?? ""}>
                  {col.sortable ? (
                    /*
                     * Sorting lives on a real button so it is reachable by Tab
                     * and fired with Enter or Space. A click handler on the
                     * header cell itself is invisible to the keyboard.
                     */
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-base-content"
                      aria-label={`Urutkan berdasarkan ${col.label}`}
                    >
                      {col.label}
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-muted">{col.label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <p className="text-sm text-muted">
                      {isFiltered
                        ? `Tidak ada baris yang cocok dengan "${search}".`
                        : emptyMessage}
                    </p>
                    {isFiltered && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="btn btn-sm btn-outline"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                        Hapus pencarian
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  className={onRowClick ? "cursor-pointer" : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span className="text-xs text-muted">
          {totalRows === 0
            ? "Tidak ada baris untuk ditampilkan"
            : `Menampilkan ${from} sampai ${to} dari ${totalRows} baris`}
        </span>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            Baris per halaman
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="select select-sm w-20"
              aria-label="Baris per halaman"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>

          {totalPages > 1 && (
            <nav className="flex items-center gap-1" aria-label="Navigasi halaman">
              <PageButton onClick={() => setPage(1)} disabled={safePage === 1} label="Halaman pertama">
                <ChevronsLeft className="size-3.5" aria-hidden="true" />
              </PageButton>
              <PageButton
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                label="Halaman sebelumnya"
              >
                <ChevronLeft className="size-3.5" aria-hidden="true" />
              </PageButton>

              {pageNumbers().map((n, i) =>
                n === "gap" ? (
                  <span key={`gap-${i}`} className="px-1 text-xs text-muted" aria-hidden="true">
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                label="Halaman berikutnya"
              >
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </PageButton>
              <PageButton
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
                label="Halaman terakhir"
              >
                <ChevronsRight className="size-3.5" aria-hidden="true" />
              </PageButton>
            </nav>
          )}
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
      <p className="text-sm font-medium text-base-content">{title}</p>
      {desc && <p className="max-w-sm text-sm text-muted">{desc}</p>}
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
export function Modal({ open, onClose, title, children, width = "max-w-lg" }: ModalProps) {
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
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className={`modal-box ${width}`}>
        {title && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="font-serif text-base">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              aria-label="Tutup"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
        {children}
      </div>
      <button
        type="button"
        className="modal-backdrop"
        onClick={onClose}
        aria-label="Tutup dialog"
      />
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
  title = "Konfirmasi Hapus",
  message = "Data ini akan dihapus. Tindakan ini tidak bisa dibatalkan.",
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <div className="text-sm leading-relaxed text-muted">{message}</div>
      <div className="modal-action">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? "Memproses…" : confirmLabel}
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
  width = "max-w-md",
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
      <div className={`modal-box ${width} mr-0 flex h-full max-h-screen flex-col rounded-box`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h2 className="font-serif text-base">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Tutup panel"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="-mx-3 min-h-0 flex-1 overflow-y-auto px-3">{children}</div>

        {footer && <div className="modal-action mt-4">{footer}</div>}
      </div>
      <button
        type="button"
        className="modal-backdrop"
        onClick={onClose}
        aria-label="Tutup panel"
      />
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
      <legend className="fieldset-legend text-xs font-medium text-muted">{label}</legend>
      {children}
      {hint && <p className="fieldset-label text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}

export const inputClass = "input w-full";
export const selectClass = "select w-full";
export const textareaClass = "textarea w-full";

// ─── STARS ──────────────────────────────────────────────────────────────────

export function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} dari ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < value ? "fill-accent text-accent" : "text-base-300"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

// ─── BUTTON ─────────────────────────────────────────────────────────────────

type BtnVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps {
  variant?: BtnVariant;
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  form?: string;
}

const btnTone: Record<BtnVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-outline",
  danger: "btn-error",
  ghost: "btn-ghost",
};

export function Button({
  variant = "primary",
  children,
  onClick,
  type = "button",
  disabled,
  className = "",
  size = "md",
  form,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      form={form}
      className={`btn ${size === "sm" ? "btn-sm" : ""} ${btnTone[variant]} ${className}`}
    >
      {children}
    </button>
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
    <div role="tablist" className="tabs tabs-box mb-6 w-fit">
      {tabs.map((t, i) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={active === i}
          onClick={() => onChange(i)}
          className={`tab ${active === i ? "tab-active" : ""}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ─── SKELETON ───────────────────────────────────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
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
        <div key={i} className="space-y-3 rounded-box border border-base-300 bg-base-100 p-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
