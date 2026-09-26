<?php

namespace App\Http\Controllers;

use App\Actions\Billing\PostPayment;
use App\Models\InvoiceGroup;
use App\Models\SponsorPayment;
use App\Models\Tagihan;
use App\Models\VirtualAccount;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InvoiceController extends Controller
{
    public function paymentSettings(Request $request, Tagihan $tagihan): RedirectResponse
    {
        $this->authorizePermission($request, 'pembayaran.verify');
        $data = $request->validate([
            'amount_due_now' => ['required', 'numeric', 'min:1'], 'bank' => ['required', 'string', 'max:50'],
            'nomor' => ['required', 'string', 'max:100'], 'atas_nama' => ['required', 'string', 'max:255'],
        ]);
        DB::transaction(function () use ($tagihan, $data): void {
            $invoice = Tagihan::query()->lockForUpdate()->findOrFail($tagihan->id);
            if ($invoice->status->value === 'batal' || (float) $data['amount_due_now'] > (float) $invoice->total - (float) $invoice->total_dibayar) {
                throw ValidationException::withMessages(['amount_due_now' => 'Nominal harus sesuai sisa tagihan pribadi.']);
            }
            $account = VirtualAccount::where('nomor', $data['nomor'])->first();
            if ($account && $account->mahasiswa_id !== $invoice->mahasiswa_id) {
                throw ValidationException::withMessages(['nomor' => 'VA sudah digunakan akun lain.']);
            }
            VirtualAccount::where('mahasiswa_id', $invoice->mahasiswa_id)->update(['aktif' => false]);
            VirtualAccount::updateOrCreate(['nomor' => $data['nomor']], ['mahasiswa_id' => $invoice->mahasiswa_id, 'bank' => $data['bank'], 'atas_nama' => $data['atas_nama'], 'aktif' => true]);
            $invoice->update(['amount_due_now' => $data['amount_due_now']]);
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Nominal pembayaran berikutnya dan VA disimpan. Perubahan nominal bank dilakukan di layanan bank.']);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'pembayaran.verify');
        $data = $request->validate([
            'nomor' => ['required', 'string', 'max:100', 'unique:invoice_groups,nomor'],
            'payer_type' => ['required', 'in:personal,sponsor'],
            'invoice_ids' => ['required', 'array', 'min:1', 'max:200'], 'invoice_ids.*' => ['required', 'uuid', 'distinct', 'exists:tagihan,id'],
            'recipient' => ['required', 'string', 'max:255'], 'institution' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:2000'], 'bank' => ['required', 'string', 'max:100'],
            'account_number' => ['required', 'string', 'max:100'], 'account_name' => ['required', 'string', 'max:255'],
            'due_date' => ['required', 'date', 'after_or_equal:today'], 'signer' => ['required', 'string', 'max:255'],
            'signature' => ['nullable', 'image', 'mimes:png,jpg,jpeg', 'max:2048'],
        ]);
        DB::transaction(function () use ($request, $data): void {
            $invoices = Tagihan::with('mahasiswa.user')->whereIn('id', $data['invoice_ids'])->orderBy('id')->lockForUpdate()->get();
            $rows = [];
            foreach ($invoices as $invoice) {
                $remaining = $data['payer_type'] === 'sponsor' ? (float) $invoice->sponsor_total - (float) $invoice->sponsor_paid : (float) $invoice->total - (float) $invoice->total_dibayar;
                if ($invoice->status->value === 'batal' || $remaining <= 0) {
                    throw ValidationException::withMessages(['invoice_ids' => 'Pilih hanya invoice dengan sisa tagihan untuk pembayar yang dipilih.']);
                }
                $rows[] = ['id' => $invoice->id, 'nomor' => $invoice->nomor, 'nama' => $invoice->mahasiswa->user->nama, 'nim' => $invoice->mahasiswa->user->nim_nip, 'residence' => $invoice->residence_snapshot, 'amount' => $remaining];
            }
            $snapshot = [...array_diff_key($data, array_flip(['invoice_ids', 'signature'])), 'date' => now()->timezone('Asia/Jakarta')->toDateString(), 'rows' => $rows, 'total' => array_sum(array_column($rows, 'amount'))];
            if ($request->hasFile('signature')) {
                $snapshot['signature_path'] = $request->file('signature')->store('documents/invoice-signatures', 'local');
            }
            $group = InvoiceGroup::create(['nomor' => $data['nomor'], 'payer_type' => $data['payer_type'], 'invoice_ids' => $data['invoice_ids'], 'snapshot' => $snapshot, 'created_by' => $request->user()->id]);
            $path = 'documents/invoice-groups/'.$group->id.'.pdf';
            if (! Storage::disk('local')->put($path, Pdf::loadView('pdf.invoice-group', ['invoice' => $snapshot])->setPaper('a4')->output())) {
                throw new \RuntimeException('PDF gagal disimpan.');
            }
            $group->update(['path' => $path]);
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Invoice gabungan diterbitkan.']);
    }

    public function download(Request $request, InvoiceGroup $group): StreamedResponse
    {
        $this->authorizePermission($request, 'pembayaran.verify');
        abort_unless($group->path && Storage::disk('local')->exists($group->path), 404);

        return Storage::disk('local')->download($group->path, 'invoice-'.$group->id.'.pdf');
    }

    public function pay(Request $request, InvoiceGroup $group): RedirectResponse
    {
        $this->authorizePermission($request, 'pembayaran.verify');
        $data = $request->validate(['reference' => ['required', 'string', 'max:100'], 'allocations' => ['required', 'array', 'min:1'], 'allocations.*.tagihan_id' => ['required', 'uuid', 'distinct', Rule::in($group->invoice_ids)], 'allocations.*.jumlah' => ['required', 'numeric', 'min:1']]);
        DB::transaction(function () use ($request, $group, $data): void {
            $group = InvoiceGroup::query()->lockForUpdate()->findOrFail($group->id);
            $existing = SponsorPayment::where('reference', $data['reference'])->first();
            if ($existing) {
                if ($existing->invoice_group_id !== $group->id || $existing->allocations !== $data['allocations']) {
                    throw ValidationException::withMessages(['reference' => 'Referensi telah digunakan untuk pembayaran lain.']);
                }

                return;
            }
            $allocations = $data['allocations'];
            if (! is_array($allocations)) {
                throw ValidationException::withMessages(['allocations' => 'Alokasi pembayaran tidak valid.']);
            }
            foreach ($allocations as $allocation) {
                if (! is_array($allocation) || ! isset($allocation['tagihan_id'], $allocation['jumlah'])) {
                    throw ValidationException::withMessages(['allocations' => 'Alokasi pembayaran tidak valid.']);
                }
                $invoice = Tagihan::query()->lockForUpdate()->whereKey($allocation['tagihan_id'])->firstOrFail();
                $remaining = $group->payer_type === 'sponsor' ? (float) $invoice->sponsor_total - (float) $invoice->sponsor_paid : (float) $invoice->total - (float) $invoice->total_dibayar;
                if ($invoice->status->value === 'batal' || (float) $allocation['jumlah'] > $remaining) {
                    throw ValidationException::withMessages(['allocations' => 'Alokasi melebihi sisa tagihan.']);
                }
                if ($group->payer_type === 'sponsor') {
                    $invoice->update(['sponsor_paid' => (float) $invoice->sponsor_paid + (float) $allocation['jumlah']]);
                } else {
                    app(PostPayment::class)->handle('GROUP-'.hash('sha256', $data['reference'].$invoice->id), $invoice->mahasiswa_id, now()->toDateTimeString(), [$allocation]);
                }
            }
            SponsorPayment::create(['reference' => $data['reference'], 'invoice_group_id' => $group->id, 'allocations' => $data['allocations'], 'payer_type' => $group->payer_type, 'recorded_by' => $request->user()->id]);
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Pembayaran dialokasikan ke tagihan asal.']);
    }
}
