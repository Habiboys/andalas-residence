<?php

namespace App\Http\Controllers;

use App\Actions\Checkout\CompleteCheckout;
use App\Actions\Checkout\CreateCheckoutRequest;
use App\Actions\Checkout\CreateDamageReportFromFinding;
use App\Enums\CheckoutRequestStatus;
use App\Enums\RoomInspectionStatus;
use App\Models\Aset;
use App\Models\CheckoutRequest;
use App\Models\RoomInspectionFinding;
use App\Services\ResidenceBuildingAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CheckoutController extends Controller
{
    public function store(Request $request, CreateCheckoutRequest $createCheckoutRequest): RedirectResponse
    {
        $this->authorizePermission($request, 'checkout.submit');

        $student = $request->user()->mahasiswaProfil;
        abort_unless($student, 403);

        $validated = $request->validate(['alasan' => 'nullable|string|max:1000']);
        $createCheckoutRequest->handle($student, $validated['alasan'] ?? null);

        return back()->with('toast', ['type' => 'success', 'message' => 'Pengajuan checkout berhasil dikirim.']);
    }

    public function inspect(Request $request, CheckoutRequest $checkoutRequest, CreateDamageReportFromFinding $create): RedirectResponse
    {
        $this->authorizePermission($request, 'inspection.manage');

        $validated = $request->validate([
            'status' => 'required|in:menunggu,berlangsung,selesai',
            'catatan' => 'nullable|string|max:2000',
            'asset_checks' => ['nullable', 'array'],
            'asset_checks.*.aset_id' => ['required', 'uuid', 'distinct', Rule::exists('aset', 'id')->where('kamar_id', $checkoutRequest->placement->kamar_id)],
            'asset_checks.*.actual_quantity' => ['required', 'integer', 'min:0', 'max:1000000'],
            'asset_checks.*.condition' => ['required', 'in:baik,rusak_ringan,rusak_berat,hilang'],
            'asset_checks.*.note' => ['nullable', 'string', 'max:2000'],
        ]);

        $roomAssets = Aset::query()->where('kamar_id', $checkoutRequest->placement->kamar_id)->get();
        $assetChecks = collect($validated['asset_checks'] ?? []);
        if ($validated['status'] === RoomInspectionStatus::Selesai->value) {
            $expectedIds = $roomAssets->pluck('id')->sort()->values()->all();
            $checkedIds = $assetChecks->pluck('aset_id')->sort()->values()->all();
            if ($expectedIds !== $checkedIds) {
                throw ValidationException::withMessages(['asset_checks' => 'Semua aset kamar harus dihitung sebelum inspeksi diselesaikan.']);
            }
        }

        $assetChecks = $assetChecks->map(function (array $check) use ($roomAssets): array {
            $asset = $roomAssets->firstWhere('id', $check['aset_id']);
            $expected = (int) $asset->jumlah;
            if ($check['actual_quantity'] > $expected) {
                throw ValidationException::withMessages(['asset_checks' => 'Jumlah fisik '.$asset->nama_aset.' tidak boleh melebihi jumlah tercatat ('.$expected.').']);
            }
            if (($check['actual_quantity'] < $expected || $check['condition'] !== 'baik') && blank($check['note'] ?? null)) {
                throw ValidationException::withMessages(['asset_checks' => 'Catatan wajib diisi untuk aset yang kurang, rusak, atau hilang.']);
            }

            return [...$check, 'expected_quantity' => $expected, 'name' => $asset->nama_aset, 'inventory_code' => $asset->kode_inventaris];
        })->values()->all();

        $findings = $request->validate([
            'findings' => ['nullable', 'array'],
            'findings.*.aset_id' => ['required', 'uuid', 'distinct', Rule::exists('aset', 'id')->where('kamar_id', $checkoutRequest->placement->kamar_id)],
            'findings.*.description' => ['required', 'string', 'max:2000'],
            'findings.*.severity' => ['required', 'in:rusak_ringan,rusak_berat,hilang'],
        ])['findings'] ?? [];

        DB::transaction(function () use ($request, $checkoutRequest, $validated, $findings, $assetChecks, $create): void {
            $checkoutRequest = CheckoutRequest::query()->lockForUpdate()->findOrFail($checkoutRequest->id);
            if (in_array($checkoutRequest->status, [CheckoutRequestStatus::Selesai, CheckoutRequestStatus::Ditolak], true)
                || $checkoutRequest->inspection?->status === RoomInspectionStatus::Selesai) {
                throw ValidationException::withMessages(['status' => 'Inspeksi yang sudah selesai tidak dapat diubah.']);
            }
            $inspection = $checkoutRequest->inspection()->updateOrCreate([], [
                'inspector_id' => $request->user()->id,
                'status' => RoomInspectionStatus::from($validated['status']),
                'catatan' => $validated['catatan'] ?? null,
                'asset_checks' => $assetChecks,
                'inspected_at' => $validated['status'] === RoomInspectionStatus::Selesai->value ? now() : null,
            ]);
            foreach ($assetChecks as $check) {
                $condition = $check['actual_quantity'] < $check['expected_quantity'] ? 'hilang' : $check['condition'];
                Aset::whereKey($check['aset_id'])->update(['kondisi' => $condition]);
                if ($condition !== 'baik') {
                    $missing = $check['expected_quantity'] - $check['actual_quantity'];
                    $description = $missing > 0
                        ? $check['note'].' (Selisih '.$missing.' dari '.$check['expected_quantity'].' '.$check['name'].')'
                        : $check['note'];
                    $finding = $inspection->findings()->updateOrCreate(['aset_id' => $check['aset_id']], [
                        'description' => $description,
                        'severity' => $condition,
                    ]);
                    $create->handle($finding, $request->user()->id);
                }
            }
            foreach ($findings as $data) {
                $finding = $inspection->findings()->updateOrCreate(['aset_id' => $data['aset_id']], $data);
                Aset::whereKey($data['aset_id'])->update(['kondisi' => $data['severity']]);
                $create->handle($finding, $request->user()->id);
            }
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Inspeksi kamar diperbarui.']);
    }

    public function createDamageReport(Request $request, RoomInspectionFinding $finding, CreateDamageReportFromFinding $create): RedirectResponse
    {
        $this->authorizePermission($request, 'inspection.manage');
        $create->handle($finding, $request->user()->id);

        return back()->with('toast', ['type' => 'success', 'message' => 'Laporan kerusakan dari temuan inspeksi dibuat.']);
    }

    public function complete(Request $request, CheckoutRequest $checkoutRequest, CompleteCheckout $completeCheckout): RedirectResponse
    {
        $this->authorizePermission($request, 'checkout.manage');
        $buildingId = $checkoutRequest->placement->kamar->lantai->gedung_id;
        abort_unless(ResidenceBuildingAccess::allows($request->user(), $buildingId), 403);
        $completeCheckout->handle($checkoutRequest, $request->user()->id);

        return back()->with('toast', ['type' => 'success', 'message' => 'Checkout berhasil diselesaikan dan kamar siap dihuni kembali.']);
    }
}
