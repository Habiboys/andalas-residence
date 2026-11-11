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

    protected $hidden = ['request_hash', 'completion_hash', 'request_key'];

    protected $fillable = [
        'nomor_tiket', 'aset_id', 'kamar_id', 'dilaporkan_oleh', 'teknisi_id',
        'deskripsi', 'status', 'tanggal_lapor', 'tanggal_selesai', 'catatan_penyelesaian',
        'gedung_id', 'fasilitas_umum_id', 'source', 'location_label', 'priority',
        'different_incident_reason', 'request_key', 'request_hash', 'completion_hash',
        'cancellation_reason', 'cancelled_by', 'is_blocked',
    ];

    protected function casts(): array
    {
        return [
            'status' => LaporanKerusakanStatus::class,
            'tanggal_lapor' => 'datetime',
            'tanggal_selesai' => 'datetime',
            'is_blocked' => 'boolean',
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

    public function progress(): HasMany
    {
        return $this->hasMany(DamageReportProgress::class, 'laporan_kerusakan_id')->orderBy('work_date')->orderBy('created_at');
    }

    public function gedung(): BelongsTo
    {
        return $this->belongsTo(Gedung::class);
    }

    public function fasilitasUmum(): BelongsTo
    {
        return $this->belongsTo(FasilitasUmum::class);
    }
}
