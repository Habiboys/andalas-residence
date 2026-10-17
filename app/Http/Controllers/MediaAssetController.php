<?php

namespace App\Http\Controllers;

use App\Models\MediaAsset;
use App\Services\LandingMedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class MediaAssetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'landing.manage');
        $data = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'type' => ['nullable', 'in:image,document']]);
        $media = MediaAsset::query()
            ->when($data['search'] ?? '', fn ($query, $search) => $query->where('name', 'like', '%'.$search.'%'))
            ->when(($data['type'] ?? '') === 'image', fn ($query) => $query->where('mime_type', 'like', 'image/%'))
            ->when(($data['type'] ?? '') === 'document', fn ($query) => $query->where('mime_type', 'not like', 'image/%'))
            ->latest()->orderBy('id')->paginate(24)->through(fn ($asset) => [...$asset->toArray(), 'url' => Storage::disk('public')->url($asset->path)]);

        return response()->json($media);
    }

    public function store(Request $request, LandingMedia $media): JsonResponse
    {
        $this->authorizePermission($request, 'landing.manage');
        $request->validate(['file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf,doc,docx', 'max:10240']]);
        $asset = $media->store($request->file('file'));

        return response()->json([...$asset->toArray(), 'url' => Storage::disk('public')->url($asset->path)], 201);
    }

    public function destroy(Request $request, MediaAsset $asset, LandingMedia $media): JsonResponse
    {
        $this->authorizePermission($request, 'landing.manage');
        if ($media->referenced($asset)) {
            throw ValidationException::withMessages(['media' => 'Media masih dipakai konten. Lepaskan dari konten sebelum menghapus.']);
        }
        if (! Storage::disk('public')->delete($asset->path)) {
            throw ValidationException::withMessages(['media' => 'File belum dapat dihapus. Coba kembali.']);
        }
        $asset->delete();

        return response()->json(['message' => 'Media dihapus.']);
    }
}
