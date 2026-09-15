<?php

namespace App\Models;

use App\Enums\LaporanKerusakanStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property LaporanKerusakanStatus $status
 */
class LaporanKerusakan extends BaseModel
{
    protected $table = 'laporan_kerusakan';

    protected $fillable = [
        'nomor_tiket', 'aset_id', 'kamar_id', 'dilaporkan_oleh', 'teknisi_id',
        'deskripsi', 'foto_sebelum', 'foto_sesudah', 'metode_penanganan',
        'biaya_riil', 'status', 'tanggal_lapor', 'tanggal_selesai', 'catatan_penyelesaian',
    ];

    protected function casts(): array
    {
        return [
            'biaya_riil' => 'decimal:2',
            'status' => LaporanKerusakanStatus::class,
            'tanggal_lapor' => 'datetime',
            'tanggal_selesai' => 'datetime',
        ];
    }

    /** @return BelongsTo<Aset, $this> */
    public function aset(): BelongsTo
    {
        return $this->belongsTo(Aset::class);
    }

    /** @return BelongsTo<Kamar, $this> */
    public function kamar(): BelongsTo
    {
        return $this->belongsTo(Kamar::class);
    }

    /** @return BelongsTo<User, $this> */
    public function pelapor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dilaporkan_oleh');
    }

    /** @return BelongsTo<User, $this> */
    public function teknisi(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teknisi_id');
    }

    /** @return HasOne<PenilaianTeknisi, $this> */
    public function penilaian(): HasOne
    {
        return $this->hasOne(PenilaianTeknisi::class);
    }

    /** @return HasMany<LaporanKerusakanPhoto, $this> */
    public function photos(): HasMany
    {
        return $this->hasMany(LaporanKerusakanPhoto::class);
    }

    /** @return HasMany<LaporanKerusakanStatusHistory, $this> */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(LaporanKerusakanStatusHistory::class);
    }

    /** @return HasMany<LaporanKerusakanAssignment, $this> */
    public function assignments(): HasMany
    {
        return $this->hasMany(LaporanKerusakanAssignment::class);
    }

    /** @return HasOne<RoomInspectionFinding, $this> */
    public function checkoutFinding(): HasOne
    {
        return $this->hasOne(RoomInspectionFinding::class);
    }
}
