<?php

use App\Actions\Billing\CreateTagihan;
use App\Actions\Billing\PostPayment;
use App\Enums\SumberPenyesuaianTagihan;
use App\Enums\TagihanStatus;
use App\Models\MahasiswaProfil;
use App\Models\Tagihan;
use App\Models\User;
use App\Models\VirtualAccount;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;

function billingStudent(): MahasiswaProfil
{
    return MahasiswaProfil::create([
        'user_id' => User::factory()->create()->id,
        'angkatan' => 2026,
        'barcode_code' => Str::uuid()->toString(),
    ]);
}

it('creates a zero invoice from an explicit international subsidy', function () {
    $tagihan = app(CreateTagihan::class)->handle(
        billingStudent(),
        'INV-ZERO-001',
        [['deskripsi' => 'Sewa asrama', 'kuantitas' => 1, 'harga_satuan' => 3000000]],
        [['sumber' => SumberPenyesuaianTagihan::SubsidiInternasionalGratis->value, 'deskripsi' => 'Subsidi penuh', 'jumlah' => -3000000]],
    );

    expect($tagihan->subtotal)->toBe('3000000.00')
        ->and($tagihan->total_penyesuaian)->toBe('-3000000.00')
        ->and($tagihan->total)->toBe('0.00')
        ->and($tagihan->penyesuaian->first()->sumber)->toBe(SumberPenyesuaianTagihan::SubsidiInternasionalGratis);
});

it('requires installment amounts to equal the invoice total', function () {
    app(CreateTagihan::class)->handle(
        billingStudent(),
        'INV-INSTALLMENT-INVALID',
        [['deskripsi' => 'Sewa asrama', 'kuantitas' => 1, 'harga_satuan' => 1000000]],
        [],
        [['jatuh_tempo' => '2026-10-01', 'jumlah' => 400000]],
    );
})->throws(InvalidArgumentException::class, 'Total cicilan harus sama dengan total tagihan.');

it('posts a payment idempotently and marks the invoice paid', function () {
    $student = billingStudent();
    $tagihan = app(CreateTagihan::class)->handle(
        $student,
        'INV-PAID-001',
        [['deskripsi' => 'Sewa asrama', 'kuantitas' => 1, 'harga_satuan' => 750000]],
    );
    $action = app(PostPayment::class);
    $allocations = [['tagihan_id' => $tagihan->id, 'jumlah' => 750000]];

    $first = $action->handle('MANUAL-TRANSFER-001', $student->id, '2026-09-15 09:00:00', $allocations);
    $second = $action->handle('MANUAL-TRANSFER-001', $student->id, '2026-09-15 09:00:00', $allocations);

    expect($second->id)->toBe($first->id)
        ->and($first->alokasi)->toHaveCount(1)
        ->and(Tagihan::findOrFail($tagihan->id)->status)->toBe(TagihanStatus::Lunas)
        ->and(Tagihan::findOrFail($tagihan->id)->total_dibayar)->toBe('750000.00');
    $this->assertDatabaseCount('pembayaran_tagihan', 1);
    $this->assertDatabaseCount('alokasi_pembayaran', 1);
});

it('enforces unique manually managed virtual account numbers', function () {
    $student = billingStudent();
    $attributes = ['mahasiswa_id' => $student->id, 'bank' => 'BNI', 'nomor' => '9880012345', 'atas_nama' => 'Mahasiswa'];

    VirtualAccount::create($attributes);
    VirtualAccount::create($attributes);
})->throws(QueryException::class);
