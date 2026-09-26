<?php

namespace App\Http\Controllers;

use App\Actions\Registration\CreateTemporaryStay;
use App\Models\Kamar;
use App\Models\ResidenceRegistration;
use App\Notifications\TemporaryStayEnded;
use App\Services\ResidenceBuildingAccess;
use App\Services\RoomEligibility;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TemporaryStayController extends Controller
{
    /** @return array<string, mixed> */
    public function payload(Request $request): array
    {
        $facilitator = $request->user()->hasRole('fasilitator');
        $buildings = ResidenceBuildingAccess::ids($request->user());

        return [
            'facilitator' => $facilitator,
            'rooms' => RoomEligibility::available()->when($facilitator, fn ($query) => $query->whereHas('lantai', fn ($floors) => $floors->whereIn('gedung_id', $buildings)))->get(),
            'stays' => ResidenceRegistration::with(['studentProfile.user', 'placement.kamar.lantai.gedung', 'tagihan'])
                ->whereIn('stay_kind', ['summer_course', 'non_student'])
                ->when($facilitator, fn ($query) => $query->whereHas('placement.kamar.lantai', fn ($floors) => $floors->whereIn('gedung_id', $buildings)))
                ->latest()->get(),
            'notifications' => $request->user()->notifications()->where('type', TemporaryStayEnded::class)->latest()->limit(20)->get(['id', 'data']),
        ];
    }

    public function store(Request $request, CreateTemporaryStay $create): RedirectResponse
    {
        $data = $request->validate([
            'nama' => ['required', 'string', 'max:150'], 'nim_nip' => ['required', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255'], 'gender' => ['required', 'in:laki_laki,perempuan'],
            'stay_kind' => ['required', 'in:summer_course,non_student'],
            'client_profile_category' => ['required', 'in:local_non_kipk,international_student,non_student'],
            'kamar_id' => ['required', 'uuid', 'exists:kamar,id'],
            'starts_at' => ['required', 'date', 'after_or_equal:today'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
        ]);
        if ($request->user()->hasRole('fasilitator')) {
            abort_unless($data['stay_kind'] === 'non_student', 403);
            $room = Kamar::with('lantai')->whereKey($data['kamar_id'])->firstOrFail();
            abort_unless(ResidenceBuildingAccess::allows($request->user(), $room->lantai->gedung_id), 403);
        }
        if ($data['stay_kind'] === 'non_student') {
            $data['client_profile_category'] = 'non_student';
        }
        $create->handle($data, $request->user());

        return back()->with('toast', ['type' => 'success', 'message' => 'Hunian sementara dan invoice berhasil dicatat.']);
    }
}
