<?php

namespace App\Http\Controllers;

use App\Models\Kuesioner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KuesionerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'kuesioner.view');

        return response()->json(Kuesioner::with('pertanyaan.opsi')->get());
    }
}
