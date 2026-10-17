<?php

namespace App\Http\Controllers;

use App\Models\OrganizationPosition;
use App\Services\LandingMedia;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrganizationPositionController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        return $this->save($request, new OrganizationPosition);
    }

    public function update(Request $request, OrganizationPosition $position): RedirectResponse
    {
        return $this->save($request, $position);
    }

    private function save(Request $request, OrganizationPosition $position): RedirectResponse
    {
        $this->authorizePermission($request, 'landing.manage');
        $data = $request->validate([
            'title' => ['required', 'string', 'max:150'], 'name' => ['nullable', 'string', 'max:150'],
            'parent_id' => ['nullable', 'uuid', 'exists:organization_positions,id'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:10000'], 'published' => ['required', 'boolean'],
            'media_id' => ['nullable', 'uuid', 'exists:media_assets,id'], 'remove_photo' => ['sometimes', 'boolean'],
        ]);
        DB::transaction(function () use ($position, $data): void {
            $nodes = OrganizationPosition::query()->lockForUpdate()->get()->keyBy('id');
            $cursor = $data['parent_id'] ?? null;
            $seen = [];
            while ($cursor !== null) {
                if ($cursor === $position->id || isset($seen[$cursor])) {
                    throw ValidationException::withMessages(['parent_id' => 'Atasan tidak boleh dirinya sendiri atau bawahan dari jabatan ini.']);
                }
                $seen[$cursor] = true;
                $cursor = $nodes->get($cursor)?->parent_id;
            }
            if (! empty($data['media_id'])) {
                $position->photo = app(LandingMedia::class)->path($data['media_id'], true);
            } elseif ($data['remove_photo'] ?? false) {
                $position->photo = null;
            }
            unset($data['media_id'], $data['remove_photo']);
            $position->fill($data)->save();
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Jabatan dan letak bagan disimpan.']);
    }

    public function destroy(Request $request, OrganizationPosition $position): RedirectResponse
    {
        $this->authorizePermission($request, 'landing.manage');
        DB::transaction(function () use ($position): void {
            OrganizationPosition::query()->lockForUpdate()->get();
            if (OrganizationPosition::where('parent_id', $position->id)->exists()) {
                throw ValidationException::withMessages(['position' => 'Pindahkan jabatan bawahan sebelum menghapus atasannya.']);
            }
            $position->delete();
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Jabatan dihapus.']);
    }
}
