import { describe, expect, it } from 'vite-plus/test';
import { processTableRows, type TableColumn } from './table-data';

const rows = [
    { id: 'a', profile: { name: 'Zahra' }, nominal: 10000, status: 'pending', date: '2026-09-01' },
    { id: 'b', profile: { name: 'Andi' }, nominal: 2000, status: 'paid', date: '2026-08-30' },
    { id: 'c', profile: { name: 'Budi' }, nominal: 900, status: 'pending', date: '2026-10-02' },
];
const columns: TableColumn<(typeof rows)[number]>[] = [
    { key: 'name', label: 'Nama', render: (row) => <strong>{row.profile.name}</strong> },
    { key: 'nominal', label: 'Nominal', render: (row) => 'Rp ' + row.nominal },
    { key: 'status', label: 'Status', filter: { type: 'select' } },
    { key: 'date', label: 'Tanggal', render: (row) => row.date.split('-').reverse().join('/') },
    { key: 'actions', label: 'Aksi', render: () => <button>Hapus</button> },
];
const options = { search: '', searchKeys: [], sortKey: null as string | null, sortDir: 'asc' as const, columnFilters: {} };

describe('table search, filtering and ordering', () => {
    it('searches visible nested values without requiring search keys', () => {
        expect(processTableRows(rows, columns, { ...options, search: '  ANDI ' }).map((row) => row.id)).toEqual(['b']);
    });
    it('combines text and exact select filters before ordering', () => {
        expect(processTableRows(rows, columns, { ...options, columnFilters: { status: 'pending', name: 'budi' } }).map((row) => row.id)).toEqual(['c']);
    });
    it('sorts amounts numerically and preserves the original input order', () => {
        expect(processTableRows(rows, columns, { ...options, sortKey: 'nominal' }).map((row) => row.id)).toEqual(['c', 'b', 'a']);
        expect(rows.map((row) => row.id)).toEqual(['a', 'b', 'c']);
    });
    it('sorts rendered dates by their original chronological values', () => {
        expect(processTableRows(rows, columns, { ...options, sortKey: 'date' }).map((row) => row.id)).toEqual(['b', 'a', 'c']);
    });
    it('sorts nested names descending', () => {
        expect(processTableRows(rows, columns, { ...options, sortKey: 'name', sortDir: 'desc' }).map((row) => row.id)).toEqual(['a', 'c', 'b']);
    });
    it('does not match the action labels', () => {
        expect(processTableRows(rows, columns, { ...options, search: 'hapus' })).toEqual([]);
    });
    it('supports explicit computed values and empty data', () => {
        const computed = [{ key: 'double', label: 'Double', value: (row: (typeof rows)[number]) => row.nominal * 2 }];
        expect(processTableRows(rows, computed, { ...options, columnFilters: { double: '1800' } }).map((row) => row.id)).toEqual(['c']);
        expect(processTableRows([], columns, options)).toEqual([]);
    });
});
