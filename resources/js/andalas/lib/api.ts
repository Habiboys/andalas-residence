const csrfToken = (): string =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(options.headers as Record<string, string> | undefined),
    };

    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message ?? 'Permintaan gagal');
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

export const andalasApi = {
    get: <T>(url: string) => request<T>(url),
    post: <T>(url: string, body?: unknown) =>
        request<T>(url, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
            headers: body instanceof FormData ? { 'X-CSRF-TOKEN': csrfToken() } : { 'X-CSRF-TOKEN': csrfToken() },
        }),
    put: <T>(url: string, body?: unknown) =>
        request<T>(url, {
            method: 'PUT',
            body: JSON.stringify(body ?? {}),
            headers: { 'X-CSRF-TOKEN': csrfToken() },
        }),
    delete: <T>(url: string) =>
        request<T>(url, {
            method: 'DELETE',
            headers: { 'X-CSRF-TOKEN': csrfToken() },
        }),
};

export type DashboardStats = {
    okupansi: { total_kamar: number; penuh: number; kosong: number };
    pembayaran_pending: number;
    tiket_aktif: number;
    pengajuan_pending: number;
    penghuni_aktif: number;
};
