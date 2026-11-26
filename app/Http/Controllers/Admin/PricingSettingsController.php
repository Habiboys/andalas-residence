<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\RolePageController;
use App\Models\Gedung;
use App\Models\ResidencePolicy;
use App\Models\ResidenceRate;
use App\Models\RoomType;
use App\Services\AuditLogService;
use App\Services\ResidencePolicyService;
use App\Services\RoomEligibility;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PricingSettingsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $role = $user->getRoleNames()->first() ?? 'staff_admin';
        $roomTypes = RoomType::where('active', true)->orderBy('name')->get(['code', 'name']);
        $buildings = Gedung::with('lantai.kamar')
            ->orderBy('kode_gedung')
            ->get()
            ->map(function (Gedung $building) use ($roomTypes): array {
                $existingTypes = $building->lantai->flatMap->kamar->pluck('tipe_kamar')->unique()->values();
                $allowedTypes = $roomTypes
                    ->filter(fn (RoomType $type): bool => RoomEligibility::allowsType($building, $type->code))
                    ->map(fn (RoomType $type): array => [
                        'code' => $type->code,
                        'name' => $type->name,
                        'has_rooms' => $existingTypes->contains($type->code),
                    ])
                    ->values()
                    ->all();

                return [
                    'id' => $building->id,
                    'kode_gedung' => $building->kode_gedung,
                    'nama_gedung' => $building->nama_gedung,
                    'gender' => RoomEligibility::buildingGender($building),
                    'room_types' => $allowedTypes,
                ];
            })
            ->values()
            ->all();

        $rates = ResidenceRate::query()
            ->join('gedung', 'gedung.id', '=', 'residence_rates.gedung_id')
            ->select('residence_rates.*', 'gedung.kode_gedung', 'gedung.nama_gedung')
            ->orderBy('gedung.kode_gedung')
            ->orderBy('residence_rates.category')
            ->orderBy('residence_rates.tipe_kamar')
            ->orderByRaw("CASE residence_rates.unit WHEN 'year' THEN 1 WHEN 'semester' THEN 2 WHEN 'month' THEN 3 WHEN 'day' THEN 4 ELSE 5 END")
            ->get()
            ->map(fn (ResidenceRate $rate): array => [
                'id' => $rate->id,
                'gedung_id' => $rate->gedung_id,
                'kode_gedung' => $rate->getAttribute('kode_gedung'),
                'nama_gedung' => $rate->getAttribute('nama_gedung'),
                'category' => $rate->category ?? ResidenceRate::DEFAULT_CATEGORY,
                'tipe_kamar' => $rate->tipe_kamar,
                'unit' => $rate->unit,
                'amount' => (int) round((float) $rate->amount),
                'room_amount' => $rate->room_amount !== null ? (int) round((float) $rate->room_amount) : null,
                'student_amount' => $rate->student_amount !== null ? (int) round((float) $rate->student_amount) : null,
            ])
            ->values()
            ->all();

        $publishedPolicies = ResidencePolicy::whereNotNull('published_at')
            ->orderByDesc('version')
            ->get()
            ->unique('category')
            ->map(fn (ResidencePolicy $policy): array => [
                'category' => $policy->category,
                'version' => $policy->version,
                'open' => (bool) ($policy->settings['open'] ?? false),
            ])
            ->values()
            ->all();

        return Inertia::render('admin/pricing-settings', [
            'role' => $role,
            'page' => 'pengaturan-harga',
            'initialUser' => app(RolePageController::class)->userPayload($request),
            'buildings' => $buildings,
            'roomTypes' => $roomTypes->all(),
            'rates' => $rates,
            'categories' => [
                ['value' => ResidenceRate::DEFAULT_CATEGORY, 'label' => 'Default (Semua Kategori)'],
                ['value' => 'local_non_kipk', 'label' => 'Mahasiswa Lokal (S1 / Non-KIP-K)'],
                ['value' => 'local_kipk', 'label' => 'Mahasiswa KIP-K'],
                ['value' => 'international', 'label' => 'Mahasiswa Internasional & S2/S3'],
                ['value' => 'asn', 'label' => 'ASN / Dosen (Rusun ASN)'],
                ['value' => 'non_student', 'label' => 'Sewa Umum / Non-Mahasiswa'],
                ['value' => 'summer_course', 'label' => 'Summer Course / Kegiatan'],
            ],
            'publishedPolicies' => $publishedPolicies,
        ]);
    }

    public function store(Request $request, ResidencePolicyService $policyService): RedirectResponse
    {
        $this->authorizeAnyPermission($request, ['gedung.manage', 'registration.review']);

        $data = $request->validate([
            'gedung_id' => ['required', 'uuid', 'exists:gedung,id'],
            'category' => ['required', Rule::in([ResidenceRate::DEFAULT_CATEGORY, ...ResidencePolicyService::CATEGORIES])],
            'tipe_kamar' => ['required', Rule::exists('room_types', 'code')],
            'unit' => ['required', Rule::in(ResidencePolicyService::RATE_UNITS)],
            'amount' => ['required', 'integer', 'min:0'],
            'room_amount' => ['nullable', 'integer', 'min:0'],
            'student_amount' => ['nullable', 'integer', 'min:0'],
            'auto_fill_semester' => ['sometimes', 'boolean'],
            'sync_policies' => ['sometimes', 'boolean'],
        ]);

        $building = Gedung::whereKey($data['gedung_id'])->firstOrFail();
        if (! RoomEligibility::allowsType($building, $data['tipe_kamar'])) {
            throw ValidationException::withMessages([
                'tipe_kamar' => 'Aktifkan tipe kamar tersebut pada master gedung sebelum menetapkan harga.',
            ]);
        }
        if ($data['category'] === 'asn' && strtoupper(trim($building->kode_gedung)) !== 'ASN') {
            throw ValidationException::withMessages([
                'gedung_id' => 'Kategori ASN hanya berlaku untuk gedung Rusun ASN.',
            ]);
        }

        $facilities = $building->room_types !== null
            ? (collect($building->room_types)->firstWhere('type', $data['tipe_kamar'])['facilities'] ?? null)
            : null;

        DB::transaction(function () use ($request, $data, $facilities, $policyService): void {
            $rate = ResidenceRate::updateOrCreate(
                [
                    'gedung_id' => $data['gedung_id'],
                    'category' => $data['category'],
                    'tipe_kamar' => $data['tipe_kamar'],
                    'unit' => $data['unit'],
                ],
                [
                    'amount' => $data['amount'],
                    'room_amount' => $data['room_amount'] ?? null,
                    'student_amount' => $data['unit'] === 'day' ? ($data['student_amount'] ?? null) : null,
                    'facilities' => $facilities,
                ],
            );

            if ($data['unit'] === 'year' && filter_var($data['auto_fill_semester'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                ResidenceRate::updateOrCreate(
                    [
                        'gedung_id' => $data['gedung_id'],
                        'category' => $data['category'],
                        'tipe_kamar' => $data['tipe_kamar'],
                        'unit' => 'semester',
                    ],
                    [
                        'amount' => (int) round(((int) $data['amount']) / 2),
                        'room_amount' => isset($data['room_amount']) && (int) $data['room_amount'] > 0
                            ? (int) round(((int) $data['room_amount']) / 2)
                            : null,
                        'student_amount' => null,
                        'facilities' => $facilities,
                    ],
                );
            }

            if (filter_var($data['sync_policies'] ?? true, FILTER_VALIDATE_BOOLEAN)) {
                $policyService->syncPublishedPolicyRates($data['category'], $request->user()->id);
            }

            AuditLogService::log($request->user(), 'residence_pricing_saved', $rate, null, $data, $request);
        });

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Pengaturan harga tersimpan dan disinkronkan ke kebijakan aktif.',
        ]);
    }

    public function storeBatch(Request $request, ResidencePolicyService $policyService): RedirectResponse
    {
        $this->authorizeAnyPermission($request, ['gedung.manage', 'registration.review']);

        $data = $request->validate([
            'gedung_id' => ['required', 'uuid', 'exists:gedung,id'],
            'category' => ['required', Rule::in([ResidenceRate::DEFAULT_CATEGORY, ...ResidencePolicyService::CATEGORIES])],
            'tipe_kamar' => ['required', Rule::exists('room_types', 'code')],
            'day_amount' => ['nullable', 'integer', 'min:0'],
            'day_student_amount' => ['nullable', 'integer', 'min:0'],
            'day_room_amount' => ['nullable', 'integer', 'min:0'],
            'month_amount' => ['nullable', 'integer', 'min:0'],
            'month_room_amount' => ['nullable', 'integer', 'min:0'],
            'semester_amount' => ['nullable', 'integer', 'min:0'],
            'semester_room_amount' => ['nullable', 'integer', 'min:0'],
            'year_amount' => ['nullable', 'integer', 'min:0'],
            'year_room_amount' => ['nullable', 'integer', 'min:0'],
            'auto_fill_semester' => ['sometimes', 'boolean'],
            'sync_policies' => ['sometimes', 'boolean'],
        ]);

        $building = Gedung::whereKey($data['gedung_id'])->firstOrFail();
        if (! RoomEligibility::allowsType($building, $data['tipe_kamar'])) {
            throw ValidationException::withMessages([
                'tipe_kamar' => 'Aktifkan tipe kamar tersebut pada master gedung sebelum menetapkan harga.',
            ]);
        }
        if ($data['category'] === 'asn' && strtoupper(trim($building->kode_gedung)) !== 'ASN') {
            throw ValidationException::withMessages([
                'gedung_id' => 'Kategori ASN hanya berlaku untuk gedung Rusun ASN.',
            ]);
        }

        $hasAnyAmount = collect([
            $data['day_amount'] ?? null,
            $data['month_amount'] ?? null,
            $data['semester_amount'] ?? null,
            $data['year_amount'] ?? null,
        ])->contains(fn ($value): bool => $value !== null && $value !== '');

        if (! $hasAnyAmount) {
            throw ValidationException::withMessages([
                'year_amount' => 'Isi minimal satu tarif (Harian, Bulanan, Per 6 Bulan, atau Tahunan).',
            ]);
        }

        $facilities = $building->room_types !== null
            ? (collect($building->room_types)->firstWhere('type', $data['tipe_kamar'])['facilities'] ?? null)
            : null;

        DB::transaction(function () use ($request, $data, $facilities, $policyService): void {
            $autoFillSemester = filter_var($data['auto_fill_semester'] ?? true, FILTER_VALIDATE_BOOLEAN);

            $unitPayloads = [
                'day' => [
                    'amount' => $data['day_amount'] ?? null,
                    'room_amount' => $data['day_room_amount'] ?? null,
                    'student_amount' => $data['day_student_amount'] ?? null,
                ],
                'month' => [
                    'amount' => $data['month_amount'] ?? null,
                    'room_amount' => $data['month_room_amount'] ?? null,
                    'student_amount' => null,
                ],
                'semester' => [
                    'amount' => $data['semester_amount'] ?? null,
                    'room_amount' => $data['semester_room_amount'] ?? null,
                    'student_amount' => null,
                ],
                'year' => [
                    'amount' => $data['year_amount'] ?? null,
                    'room_amount' => $data['year_room_amount'] ?? null,
                    'student_amount' => null,
                ],
            ];

            if (
                $autoFillSemester
                && $unitPayloads['year']['amount'] !== null
                && $unitPayloads['semester']['amount'] === null
            ) {
                $unitPayloads['semester']['amount'] = (int) round(((int) $unitPayloads['year']['amount']) / 2);
                $unitPayloads['semester']['room_amount'] = isset($unitPayloads['year']['room_amount']) && (int) $unitPayloads['year']['room_amount'] > 0
                    ? (int) round(((int) $unitPayloads['year']['room_amount']) / 2)
                    : null;
            }

            $savedRates = [];
            foreach ($unitPayloads as $unit => $payload) {
                if ($payload['amount'] === null) {
                    continue;
                }
                $savedRates[$unit] = ResidenceRate::updateOrCreate(
                    [
                        'gedung_id' => $data['gedung_id'],
                        'category' => $data['category'],
                        'tipe_kamar' => $data['tipe_kamar'],
                        'unit' => $unit,
                    ],
                    [
                        'amount' => (int) $payload['amount'],
                        'room_amount' => $payload['room_amount'] !== null ? (int) $payload['room_amount'] : null,
                        'student_amount' => $unit === 'day' && $payload['student_amount'] !== null ? (int) $payload['student_amount'] : null,
                        'facilities' => $facilities,
                    ],
                );
            }

            if (filter_var($data['sync_policies'] ?? true, FILTER_VALIDATE_BOOLEAN)) {
                $policyService->syncPublishedPolicyRates($data['category'], $request->user()->id);
            }

            $firstSaved = reset($savedRates);
            if ($firstSaved instanceof ResidenceRate) {
                AuditLogService::log($request->user(), 'residence_pricing_batch_saved', $firstSaved, null, $data, $request);
            }
        });

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Semua tarif gedung (Harian, Bulanan, 6 Bulan, Tahunan) berhasil disimpan dan disinkronkan.',
        ]);
    }

    public function destroy(Request $request, ResidenceRate $rate, ResidencePolicyService $policyService): RedirectResponse
    {
        $this->authorizeAnyPermission($request, ['gedung.manage', 'registration.review']);

        DB::transaction(function () use ($request, $rate, $policyService): void {
            $category = $rate->category ?? ResidenceRate::DEFAULT_CATEGORY;
            $snapshot = $rate->toArray();
            $rate->delete();
            $policyService->syncPublishedPolicyRates($category, $request->user()->id);
            AuditLogService::log($request->user(), 'residence_pricing_deleted', $rate, $snapshot, null, $request);
        });

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Tarif berhasil dihapus.',
        ]);
    }
}
