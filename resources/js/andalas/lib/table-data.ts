import { isValidElement, type ReactNode } from 'react';

export interface TableColumn<T> {
    key: string;
    label: string;
    render?: (row: T) => ReactNode;
    value?: (row: T) => string | number | null | undefined;
    sortable?: boolean;
    action?: boolean;
    filter?: {
        type: 'select' | 'text';
        options?: (string | { value: string; label: string })[];
        placeholder?: string;
    };
}

function textContent(node: ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number')
        return String(node);
    if (Array.isArray(node)) return node.map(textContent).join(' ');
    if (isValidElement<{ children?: ReactNode; status?: string }>(node)) {
        return textContent(node.props.children ?? node.props.status);
    }
    return '';
}

function pathValue(row: unknown, key: string): unknown {
    return key
        .split('.')
        .reduce<unknown>(
            (value, part) =>
                value !== null && typeof value === 'object'
                    ? (value as Record<string, unknown>)[part]
                    : undefined,
            row,
        );
}

export function columnValue<T>(
    row: T,
    column: TableColumn<T>,
): string | number {
    if (column.value) return column.value(row) ?? '';
    const raw = pathValue(row, column.key);
    if (typeof raw === 'number') return raw;
    const rendered = column.render ? textContent(column.render(row)) : '';
    return rendered || (typeof raw === 'string' ? raw : '');
}

export function processTableRows<T>(
    data: T[],
    columns: TableColumn<T>[],
    options: {
        search: string;
        searchKeys: string[];
        sortKey: string | null;
        sortDir: 'asc' | 'desc';
        columnFilters: Record<string, string>;
    },
): T[] {
    const searchable = columns.filter(
        (column) =>
            !column.action && !/^(aksi|action|actions)$/i.test(column.key),
    );
    const normalize = (value: unknown) =>
        String(value ?? '')
            .trim()
            .toLocaleLowerCase('id');
    const query = normalize(options.search);
    let rows = data.filter((row) => {
        if (
            query &&
            !searchable.some((column) =>
                normalize(columnValue(row, column)).includes(query),
            ) &&
            !options.searchKeys.some((key) =>
                normalize(pathValue(row, key)).includes(query),
            )
        )
            return false;
        return searchable.every((column) => {
            const filter = normalize(options.columnFilters[column.key]);
            if (!filter) return true;
            const value =
                column.filter?.type === 'select'
                    ? normalize(
                          column.value
                              ? column.value(row)
                              : pathValue(row, column.key),
                      )
                    : normalize(columnValue(row, column));
            return column.filter?.type === 'select'
                ? value === filter
                : value.includes(filter);
        });
    });
    const sort = searchable.find((column) => column.key === options.sortKey);
    if (sort) {
        rows = [...rows].sort((a, b) => {
            const sortValue = (row: T) => {
                const raw = pathValue(row, sort.key);
                return !sort.value &&
                    typeof raw === 'string' &&
                    /^\d{4}-\d{2}-\d{2}/.test(raw)
                    ? raw
                    : columnValue(row, sort);
            };
            const left = sortValue(a),
                right = sortValue(b);
            const result =
                typeof left === 'number' && typeof right === 'number'
                    ? left - right
                    : String(left).localeCompare(String(right), 'id', {
                          numeric: true,
                      });
            return options.sortDir === 'asc' ? result : -result;
        });
    }
    return rows;
}
