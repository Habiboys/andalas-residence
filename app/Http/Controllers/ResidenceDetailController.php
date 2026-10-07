<?php

namespace App\Http\Controllers;

use App\Models\Aset;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\ResidenceRate;
use App\Services\ResidenceBuildingAccess;
use App\Services\RoomReservations;
use App\Services\UserProfileSummary;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ResidenceDetailController extends Controller
{
    public function building(Request $request, Gedung $gedung): Response
    {
        $this->locationAccess($request, $gedung->id);
        $gedung->load(['lantai.kamar' => fn ($query) => $query->withCount(['penempatanKamar as occupants_count' => fn ($query) => $query->where('status', 'aktif'), 'aset'])->orderBy('nomor_kamar'), 'fasilitasUmum']);

        return $this->render($request, 'building', ['building' => $gedung, 'rates' => ResidenceRate::where('gedung_id', $gedung->id)->get()]);
    }

    public function floor(Request $request, Lantai $lantai): Response
    {
        $this->locationAccess($request, $lantai->gedung_id);
        $lantai->load(['gedung', 'kamar' => fn ($query) => $query->withCount(['penempatanKamar as occupants_count' => fn ($query) => $query->where('status', 'aktif'), 'aset'])->orderBy('nomor_kamar')]);

        return $this->render($request, 'floor', ['floor' => $lantai, 'building' => $lantai->gedung, 'facilities' => $lantai->gedung->fasilitasUmum()->where('lantai_id', $lantai->id)->get()]);
    }

    public function room(Request $request, Kamar $kamar): Response
    {
        $kamar->load('lantai.gedung');
        $this->locationAccess($request, $kamar->lantai->gedung_id);
        $kamar->load(['aset.stokAset', 'penempatanKamar' => fn ($query) => $query->with(['mahasiswa:id,user_id,prodi_id', 'mahasiswa.user:id,nama,nim_nip', 'mahasiswa.prodi:id,name', 'periode'])->orderByDesc('tanggal_mulai')]);

        return $this->render($request, 'room', [
            'room' => $kamar, 'building' => $kamar->lantai->gedung, 'floor' => $kamar->lantai,
            'reservations_count' => app(RoomReservations::class)->count($kamar),
            'type_definition' => collect($kamar->lantai->gedung->room_types ?? [])->firstWhere('type', $kamar->tipe_kamar),
            'rates' => ResidenceRate::where('gedung_id', $kamar->lantai->gedung_id)->whereIn('tipe_kamar', [$kamar->tipe_kamar, 'umum'])->get(),
        ]);
    }

    public function asset(Request $request, Aset $aset): Response
    {
        $this->authorizePermission($request, 'aset.view');
        $aset->load(['kamar.lantai.gedung', 'fasilitasUmum.gedung', 'stokAset', 'laporanKerusakan']);
        $buildingId = $aset->kamar?->lantai->gedung_id ?? $aset->fasilitasUmum?->gedung_id;
        if ($request->user()->hasRole('fasilitator') && ! $request->user()->hasRole('superadmin')) {
            abort_unless(ResidenceBuildingAccess::allows($request->user(), $buildingId), 403);
        }

        return $this->render($request, 'asset', ['asset' => $aset, 'building' => $aset->kamar?->lantai->gedung ?? $aset->fasilitasUmum?->gedung]);
    }

    public function resident(Request $request, MahasiswaProfil $mahasiswa): Response
    {
        $this->authorizeAnyPermission($request, ['mahasiswa.view', 'penempatan.view']);
        $mahasiswa->load(['user', 'prodi', 'penempatanKamar.kamar.lantai.gedung', 'penempatanKamar.periode']);
        if ($request->user()->hasRole('fasilitator') && ! $request->user()->hasRole('superadmin')) {
            abort_unless($mahasiswa->penempatanKamar->contains(fn ($placement) => ResidenceBuildingAccess::allows($request->user(), $placement->kamar->lantai->gedung_id)), 403);
        }
        $fullProfile = $request->user()->can('mahasiswa.view');
        $placements = $mahasiswa->penempatanKamar;
        if ($request->user()->hasRole('fasilitator') && ! $request->user()->hasRole('superadmin')) {
            $placements = $placements->filter(fn ($placement) => ResidenceBuildingAccess::allows($request->user(), $placement->kamar->lantai->gedung_id))->values();
        }

        return $this->render($request, 'resident', [
            'resident' => ['id' => $mahasiswa->id, 'nama' => $mahasiswa->user->nama, 'nim_nip' => $mahasiswa->user->nim_nip, 'prodi' => $mahasiswa->prodi?->name, 'angkatan' => $mahasiswa->angkatan, 'placements' => $placements],
            'profile_summary' => $fullProfile ? app(UserProfileSummary::class)->forUser($mahasiswa->user) : null,
        ]);
    }

    private function locationAccess(Request $request, string $buildingId): void
    {
        $this->authorizeAnyPermission($request, ['gedung.view', 'aset.view', 'penempatan.view', 'inspection.manage']);
        if ($request->user()->hasRole('fasilitator') && ! $request->user()->hasRole('superadmin')) {
            abort_unless(ResidenceBuildingAccess::allows($request->user(), $buildingId), 403);
        }
    }

    private function render(Request $request, string $kind, array $data): Response
    {
        $user = app(RolePageController::class)->userPayload($request);

        return Inertia::render('admin/residence-detail', [
            'initialUser' => $user, 'role' => $user['role'], 'page' => $kind === 'asset' ? 'kelola-aset' : ($kind === 'resident' ? 'data-mahasiswa' : 'kelola-bangunan'),
            'kind' => $kind, 'can_manage' => $request->user()->can('gedung.manage'),
            'can_view_assets' => $request->user()->can('aset.view'),
            'can_view_residents' => $request->user()->hasAnyPermission(['mahasiswa.view', 'penempatan.view']),
            ...$data,
        ]);
    }
}
