<?php

namespace App\Http\Controllers;

use App\Actions\Registration\CreateResidenceBilling;
use App\Models\CheckoutRequest;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\PenempatanKamar;
use App\Models\ResidenceRegistration;
use App\Models\RoomContract;
use App\Models\Tagihan;
use App\Services\ResidencePolicyService;
use App\Services\ResidenceWorkflow;
use App\Services\ResidenceWorkflowAccess;
use App\Services\RoomEligibility;
use App\Services\RoomReservations;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ResidenceAmendmentController extends Controller
{
    private function adjust(Tagihan $invoice, float $target, string $reason, string $reference): void
    {
        $delta = round($target - (float) $invoice->total, 2);
        if ($delta !== 0.0) {
            $invoice->penyesuaian()->create(['sumber' => 'manual', 'deskripsi' => $reason, 'jumlah' => $delta, 'metadata' => ['amendment_id' => $reference]]);
        }
        if ($delta !== 0.0 && $invoice->registration) {
            $registration = $invoice->registration;
            $replacementCreated = false;
            foreach ($registration->decisions()->whereIn('kind', ['monthly', 'installment', 'defer'])->whereIn('status', ['pending', 'approved'])->latest('created_at')->lockForUpdate()->get() as $decision) {
                $decision->update(['status' => 'superseded', 'terms' => [...($decision->terms ?? []), 'superseded_by_amendment' => $reference]]);
                $invoice->jadwalCicilan()->where('status', '!=', 'diganti')->update(['status' => 'diganti']);
                if (! $replacementCreated && $target > (float) $invoice->total_dibayar) {
                    $registration->decisions()->create(['kind' => $decision->kind, 'status' => 'pending', 'reason' => 'Koreksi skema: '.$reason, 'requested_by' => auth()->id(), 'terms' => ['amendment_id' => $reference, 'replaces_decision_id' => $decision->id]]);
                    $replacementCreated = true;
                }
            }
            $registration->update(['ready_at' => null]);
        }
        $invoice->update(['total' => $target, 'total_penyesuaian' => (float) $invoice->penyesuaian()->sum('jumlah'), 'amount_due_now' => max(0, $target - (float) $invoice->total_dibayar), 'status' => (float) $invoice->total_dibayar >= $target ? 'lunas' : ((float) $invoice->total_dibayar > 0 ? 'sebagian' : 'terbit')]);
    }

    public function move(Request $request, ResidenceRegistration $registration): RedirectResponse
    {
        $data = $request->validate(['reference' => ['required', 'uuid'], 'room_id' => ['required', 'uuid', 'exists:kamar,id'], 'reason' => ['required', 'string', 'max:2000'], 'keys_exchanged' => ['accepted'], 'room_condition' => ['required', 'in:ready,damaged']]);
        DB::transaction(function () use ($request, $registration, $data): void {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            abort_unless(ResidenceWorkflowAccess::officer($request->user(), $r), 403);
            $previous = DB::table('residence_amendments')->where('id', $data['reference'])->first();
            if ($previous) {
                abort_unless($previous->subject_id === $r->id && $previous->kind === 'move' && json_decode($previous->after, true)['room_id'] === $data['room_id'], 422);

                return;
            }
            if ($r->workflow_version !== 2 || ! $r->checked_in_at || $r->keys_returned_at || $r->ends_at->isBefore(today())) {
                throw ValidationException::withMessages(['move' => 'Mutasi individual memerlukan hunian aktif dengan tarif per orang. Perpindahan individual tidak berlaku untuk kontrak satu kamar bersama.']);
            }
            $from = Kamar::with('lantai.gedung')->findOrFail($r->placement->kamar_id);
            $to = Kamar::with('lantai.gedung')->whereKey($data['room_id'])->firstOrFail();
            abort_unless(ResidenceWorkflowAccess::manager($request->user()) || $from->lantai->gedung_id === $to->lantai->gedung_id, 403);
            Gedung::whereIn('id', [$from->lantai->gedung_id, $to->lantai->gedung_id])->orderBy('id')->lockForUpdate()->get();
            Kamar::whereIn('id', [$from->id, $to->id])->orderBy('id')->lockForUpdate()->get();
            $to->refresh();
            app(ResidencePolicyService::class)->validateRoom($r->policy, $to, $r->studentProfile);
            if ($to->id === $from->id || $to->status === 'maintenance' || ! $to->lantai->booking_open || ! RoomEligibility::allowsType($to->lantai->gedung, $to->tipe_kamar, $to->kapasitas) || count($to->penempatanKamar()->where('status', 'aktif')->lockForUpdate()->get(['id'])->all()) + app(RoomReservations::class)->count($to, $r->id) >= $to->kapasitas) {
                throw ValidationException::withMessages(['room_id' => 'Kamar tujuan tidak tersedia.']);
            }
            $contractChanges = [];
            $contractBefore = null;
            if ($r->room_contract_id) {
                abort_unless(ResidenceWorkflowAccess::manager($request->user()), 403);
                $request->validate(['consent' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120']]);
                $contract = RoomContract::whereKey($r->room_contract_id)->lockForUpdate()->firstOrFail();
                $remainingIds = array_values(array_diff($contract->members, [$r->id]));
                $contractBefore = $contract->toArray();
                $members = ResidenceRegistration::whereIn('id', $remainingIds)->orderBy('id')->lockForUpdate()->get();
                $cents = (int) round((float) $contract->total * 100);
                foreach ($members as $i => $member) {
                    $bill = $member->tagihan()->lockForUpdate()->firstOrFail();
                    $targetShare = (intdiv($cents, count($remainingIds)) + ($i < $cents % count($remainingIds) ? 1 : 0)) / 100;
                    $contractChanges[] = ['registration_id' => $member->id, 'invoice' => $bill->nomor, 'before' => $bill->total, 'after' => $targetShare, 'paid' => $bill->total_dibayar];
                    $this->adjust($bill, $targetShare, $data['reason'], $data['reference']);
                    app(ResidenceWorkflow::class)->evaluate($member->fresh());
                    app(ResidenceWorkflow::class)->notify($member->fresh(), 'Kontrak kamar direvisi', 'Anggota pindah kamar; periksa pembagian biaya dan persetujuan pembiayaan terbaru.');
                }
                $contract->update(['members' => $remainingIds, 'occupants' => count($remainingIds), 'total' => $remainingIds === [] ? 0 : $contract->total]);
                $r->update(['room_contract_id' => null, 'billing_basis' => 'person']);
                $data['consent_path'] = $request->file('consent')->store('documents/contract-amendments', 'local');
            }
            $invoice = $r->tagihan()->lockForUpdate()->firstOrFail();
            if (CheckoutRequest::where('penempatan_kamar_id', $r->penempatan_kamar_id)->where('status', '!=', 'ditolak')->exists()) {
                throw ValidationException::withMessages(['move' => 'Selesaikan atau batalkan pemeriksaan keluar sebelum mutasi kamar.']);
            }
            $newRate = app(ResidencePolicyService::class)->rate($r, $to);
            $quantity = (float) $invoice->items()->sum('kuantitas');
            $gross = (float) $newRate['amount'] * $quantity;
            if ($gross < (float) $invoice->sponsor_total) {
                throw ValidationException::withMessages(['room_id' => 'Tarif tujuan di bawah komitmen sponsor. Koreksi komitmen sponsor sebelum mutasi.']);
            }
            $target = max(0, round($gross - (float) $invoice->sponsor_total, 2));
            $before = ['room_id' => $from->id, 'room_label' => $from->lantai->gedung->nama_gedung.' / '.$from->nomor_kamar, 'placement_id' => $r->penempatan_kamar_id, 'total' => $invoice->total, 'paid' => $invoice->total_dibayar, 'contract' => $contractBefore];
            $this->adjust($invoice, $target, 'Mutasi kamar: '.$data['reason'], $data['reference']);
            $r->placement->update(['status' => 'berakhir', 'relocated_at' => now(), 'tanggal_selesai' => today()]);
            $placement = PenempatanKamar::create(['mahasiswa_id' => $r->student_profile_id, 'kamar_id' => $to->id, 'periode_id' => $r->periode_id, 'tanggal_mulai' => today(), 'tanggal_selesai' => $r->ends_at, 'status' => 'aktif', 'diproses_oleh' => $request->user()->id, 'catatan' => $data['reason']]);
            $r->update(['reserved_room_id' => $to->id, 'penempatan_kamar_id' => $placement->id]);
            foreach ([$from, $to] as $room) {
                $n = $room->penempatanKamar()->where('status', 'aktif')->count() + app(RoomReservations::class)->count($room);
                $room->update(['status' => ($room->status === 'maintenance' || ($room->id === $from->id && $data['room_condition'] === 'damaged')) ? 'maintenance' : ($n >= $room->kapasitas ? 'penuh' : ($n ? 'terisi_sebagian' : 'kosong'))]);
            }
            DB::table('residence_amendments')->insert(['id' => $data['reference'], 'kind' => 'move', 'subject_id' => $r->id, 'before' => json_encode($before), 'after' => json_encode(['room_id' => $to->id, 'room_label' => $to->lantai->gedung->nama_gedung.' / '.$to->nomor_kamar, 'placement_id' => $placement->id, 'total' => $target, 'billing_basis' => 'full_contract_tariff', 'sponsor_total' => $invoice->sponsor_total, 'paid' => $invoice->total_dibayar, 'effective_at' => today()->toDateString(), 'contract_changes' => $contractChanges, 'consent_path' => $data['consent_path'] ?? null]), 'reason' => $data['reason'], 'officer_id' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            app(ResidenceWorkflow::class)->notify($r->fresh(), 'Mutasi kamar selesai', 'Kamar dan penyesuaian kewajiban sudah diperbarui. Riwayat pembayaran tetap tersimpan.');
        }, 3);

        return back();
    }

    public function contract(Request $request, RoomContract $contract): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()), 403);
        $data = $request->validate(['reference' => ['required', 'uuid'], 'members' => ['required', 'array', 'min:1'], 'members.*' => ['required', 'uuid', 'distinct', 'exists:residence_registrations,id'], 'reason' => ['required', 'string', 'max:2000'], 'consent' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120']]);
        DB::transaction(function () use ($request, $contract, $data): void {
            $contract = RoomContract::whereKey($contract->id)->lockForUpdate()->firstOrFail();
            $previous = DB::table('residence_amendments')->where('id', $data['reference'])->first();
            $ids = $data['members'];
            sort($ids);
            if ($previous) {
                abort_unless($previous->subject_id === $contract->id && $previous->kind === 'contract' && json_decode($previous->after, true)['members'] === $ids, 422);

                return;
            }
            $room = Kamar::with('lantai.gedung')->findOrFail($contract->kamar_id);
            Gedung::whereKey($room->lantai->gedung_id)->lockForUpdate()->firstOrFail();
            $room = Kamar::whereKey($room->id)->lockForUpdate()->firstOrFail();
            $all = ResidenceRegistration::whereIn('id', array_unique([...$contract->members, ...$ids]))->orderBy('id')->lockForUpdate()->get();
            if (count($ids) > $room->kapasitas) {
                throw ValidationException::withMessages(['members' => 'Jumlah anggota melebihi kapasitas.']);
            }
            $anchor = $all->firstWhere('room_contract_id', $contract->id);
            foreach ($all as $r) {
                if (! in_array($r->id, $ids, true)) {
                    if ($r->checked_in_at && ! $r->keys_returned_at) {
                        throw ValidationException::withMessages(['members' => 'Anggota yang keluar harus menyelesaikan pengembalian kunci terlebih dahulu.']);
                    }
                } elseif ($r->residence_policy_id !== $anchor->residence_policy_id || ! $r->starts_at->equalTo($anchor->starts_at) || ! $r->ends_at->equalTo($anchor->ends_at) || $r->funding !== 'personal' || $r->billing_basis !== 'room' || ($r->room_contract_id && $r->room_contract_id !== $contract->id) || $r->status->value === 'rejected' || $r->keys_returned_at || $r->reserved_room_id !== $room->id || (! $r->room_contract_id && ($r->tagihan_id || $r->completed_at))) {
                    throw ValidationException::withMessages(['members' => 'Anggota harus memiliki kebijakan, masa tinggal, alokasi dan tarif kamar yang sama; anggota baru belum ditagih atau menghuni.']);
                }
            }
            if ($room->status === 'maintenance' || ! $room->lantai->booking_open) {
                throw ValidationException::withMessages(['members' => 'Kamar tidak tersedia untuk revisi anggota.']);
            }
            if ($anchor->ends_at->isBefore(today())) {
                throw ValidationException::withMessages(['members' => 'Kontrak sudah berakhir.']);
            }
            foreach ($all as $member) {
                if (in_array($member->id, $ids, true)) {
                    app(ResidencePolicyService::class)->validateRoom($member->policy, $room, $member->studentProfile);
                }
            }
            $before = $contract->toArray();
            $contract->update(['members' => $ids, 'occupants' => count($ids)]);
            $changes = [];
            $cents = (int) round((float) $contract->total * 100);
            $index = 0;
            foreach ($all as $r) {
                $retained = in_array($r->id, $ids, true);
                $target = $retained ? (intdiv($cents, count($ids)) + ($index++ < $cents % count($ids) ? 1 : 0)) / 100 : 0;
                if ($retained && ! $r->room_contract_id) {
                    $r->update(['room_contract_id' => $contract->id]);
                    app(CreateResidenceBilling::class)->handle($r->fresh());
                    $r->refresh();
                }
                $invoice = $r->tagihan()->lockForUpdate()->firstOrFail();
                $changes[] = ['registration_id' => $r->id, 'invoice' => $invoice->nomor, 'before' => $invoice->total, 'after' => $target, 'paid' => $invoice->total_dibayar];
                $this->adjust($invoice, $target, 'Revisi kontrak: '.$data['reason'], $data['reference']);
                if (! $retained) {
                    $r->update(['status' => $r->completed_at ? $r->status : 'rejected', 'allocation_status' => 'released', 'reserved_room_id' => null, 'ready_at' => null]);
                }
            }
            foreach ($all as $r) {
                app(ResidenceWorkflow::class)->evaluate($r->fresh());
                app(ResidenceWorkflow::class)->notify($r->fresh(), 'Kontrak kamar direvisi', 'Pembagian kewajiban telah diperbarui sesuai persetujuan. Pembayaran lama tetap tercatat; periksa saldo terbaru dan lampiran revisi.');
            }
            $evidence = $request->file('consent')->store('documents/contract-amendments', 'local');
            DB::table('residence_amendments')->insert(['id' => $data['reference'], 'kind' => 'contract', 'subject_id' => $contract->id, 'before' => json_encode($before), 'after' => json_encode(['members' => $ids, 'total' => $contract->total, 'consent_path' => $evidence, 'effective_at' => today()->toDateString(), 'invoices' => $changes]), 'reason' => $data['reason'], 'officer_id' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        }, 3);

        return back();
    }

    public function document(Request $request, string $amendment): Response
    {
        $record = DB::table('residence_amendments')->where('id', $amendment)->first();
        abort_unless($record !== null, 404);
        if ($record->kind === 'move') {
            $registration = ResidenceRegistration::whereKey($record->subject_id)->firstOrFail();
            abort_unless(ResidenceWorkflowAccess::view($request->user(), $registration), 403);
        } else {
            $registrations = ResidenceRegistration::where('room_contract_id', $record->subject_id)->get();
            abort_unless($registrations->contains(fn ($r) => ResidenceWorkflowAccess::view($request->user(), $r)), 403);
        }

        return Pdf::loadView('pdf.residence-amendment', ['record' => $record, 'before' => json_decode($record->before, true), 'after' => $this->visibleAmendment($request, $record)])->download('addendum-'.$record->id.'.pdf');
    }

    /** @return array<string, mixed> */
    private function visibleAmendment(Request $request, \stdClass $record): array
    {
        $after = json_decode($record->after, true);
        if ($record->kind === 'contract' && $request->user()->hasRole('mahasiswa') && ! ResidenceWorkflowAccess::manager($request->user()) && ! $request->user()->can('pembayaran.verify') && ! $request->user()->hasRole('pimpinan')) {
            $ownIds = ResidenceRegistration::where('student_profile_id', $request->user()->mahasiswaProfil?->id)->pluck('id')->all();
            $after['invoices'] = array_values(array_filter($after['invoices'], fn ($row) => in_array($row['registration_id'], $ownIds, true)));
        }

        return $after;
    }

    public function evidence(Request $request, string $amendment): StreamedResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()), 403);
        $record = DB::table('residence_amendments')->where('id', $amendment)->first();
        abort_unless($record && ! empty(json_decode($record->after, true)['consent_path']), 404);

        return Storage::disk('local')->download(json_decode($record->after, true)['consent_path']);
    }
}
