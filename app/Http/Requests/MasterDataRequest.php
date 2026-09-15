<?php

namespace App\Http\Requests;

use App\Http\Controllers\DepartemenController;
use App\Http\Controllers\FakultasController;
use App\Http\Controllers\KategoriTransaksiController;
use App\Http\Controllers\KotaController;
use App\Http\Controllers\PeriodeController;
use App\Http\Controllers\ProdiController;
use App\Http\Controllers\ProvinsiController;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MasterDataRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('master.manage') ?? false;
    }

    public function rules(): array
    {
        $isUpdate = $this->isMethod('PUT') || $this->isMethod('PATCH');
        $required = $isUpdate ? 'sometimes' : 'required';

        return match ($this->route()->getControllerClass()) {
            FakultasController::class => [
                'name' => [$required, 'string', 'max:150', Rule::unique('faculty', 'name')->ignore($this->route('faculty'))],
            ],
            DepartemenController::class => [
                'faculty_id' => [$required, 'uuid', 'exists:faculty,id'],
                'name' => [$required, 'string', 'max:150'],
            ],
            ProdiController::class => [
                'departemen_id' => [$required, 'uuid', 'exists:departemen,id'],
                'name' => [$required, 'string', 'max:150'],
                'jenjang' => [$required, Rule::in(['D3', 'D4', 'S1', 'S2', 'S3'])],
            ],
            PeriodeController::class => [
                'nama_periode' => [$required, 'string', 'max:150'],
                'status' => [$required, Rule::in(['aktif', 'nonaktif'])],
                'tanggal_mulai' => [$required, 'date'],
                'tanggal_selesai' => [$required, 'date', 'after_or_equal:tanggal_mulai'],
            ],
            ProvinsiController::class => [
                'name' => [$required, 'string', 'max:150', Rule::unique('provinces', 'name')->ignore($this->route('province'))],
            ],
            KotaController::class => [
                'province_id' => [$required, 'uuid', 'exists:provinces,id'],
                'name' => [$required, 'string', 'max:150'],
            ],
            KategoriTransaksiController::class => [
                'nama_kategori' => [$required, 'string', 'max:150'],
                'tipe' => [$required, Rule::in(['pemasukan', 'pengeluaran'])],
                'kode_rekening' => ['nullable', 'string', 'max:50'],
            ],
            default => [],
        };
    }
}
