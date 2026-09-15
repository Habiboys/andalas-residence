<?php

namespace App\Models;

use App\Enums\KondisiAset;
use App\Enums\StatusSiklusHidupAset;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Aset extends BaseModel
{
    protected $table = 'aset';

    protected $fillable = [
        'kamar_id', 'fasilitas_umum_id', 'kode_inventaris', 'kode_gudang',
        'nama_aset', 'kategori_aset_id', 'kategori', 'kondisi', 'status_siklus_hidup',
        'nilai_aset', 'tanggal_pengadaan', 'garansi_sampai', 'dihapuskan_pada',
    ];

    protected function casts(): array
    {
        return [
            'kondisi' => KondisiAset::class,
            'status_siklus_hidup' => StatusSiklusHidupAset::class,
            'nilai_aset' => 'decimal:2',
            'tanggal_pengadaan' => 'date',
            'garansi_sampai' => 'date',
            'dihapuskan_pada' => 'datetime',
        ];
    }

    /** @return BelongsTo<Kamar, $this> */
    public function kamar(): BelongsTo
    {
        return $this->belongsTo(Kamar::class);
    }

    /** @return BelongsTo<FasilitasUmum, $this> */
    public function fasilitasUmum(): BelongsTo
    {
        return $this->belongsTo(FasilitasUmum::class);
    }

    /** @return BelongsTo<KategoriAset, $this> */
    public function kategoriAset(): BelongsTo
    {
        return $this->belongsTo(KategoriAset::class);
    }

    /** @return HasMany<LaporanKerusakan, $this> */
    public function laporanKerusakan(): HasMany
    {
        return $this->hasMany(LaporanKerusakan::class);
    }

    /** @return HasMany<LokasiAset, $this> */
    public function lokasi(): HasMany
    {
        return $this->hasMany(LokasiAset::class);
    }

    /** @return HasMany<PergerakanAset, $this> */
    public function pergerakan(): HasMany
    {
        return $this->hasMany(PergerakanAset::class);
    }

    /** @return HasMany<PenanggungJawabAset, $this> */
    public function penanggungJawab(): HasMany
    {
        return $this->hasMany(PenanggungJawabAset::class);
    }

    /** @return HasMany<InspeksiAset, $this> */
    public function inspeksi(): HasMany
    {
        return $this->hasMany(InspeksiAset::class);
    }

    /** @return HasMany<PemeliharaanAset, $this> */
    public function pemeliharaan(): HasMany
    {
        return $this->hasMany(PemeliharaanAset::class);
    }

    /** @return HasOne<PenghapusanAset, $this> */
    public function penghapusan(): HasOne
    {
        return $this->hasOne(PenghapusanAset::class);
    }
}
