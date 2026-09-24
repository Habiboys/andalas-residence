<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class StudentCohort
{
    public static function fromNim(string $nim): string
    {
        if (! preg_match('/^\d{4,50}$/D', $nim)) {
            throw ValidationException::withMessages(['nim_nip' => 'NIM mahasiswa harus berupa angka; dua digit awal menunjukkan tahun masuk.']);
        }

        $prefix = (int) substr($nim, 0, 2);
        $year = ($prefix >= 50 ? 1900 : 2000) + $prefix;
        if ($year > now()->year) {
            throw ValidationException::withMessages(['nim_nip' => 'Tahun masuk pada NIM tidak boleh melewati tahun sekarang.']);
        }

        return (string) $year;
    }
}
