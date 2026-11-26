<?php

namespace App\Services;

use App\Enums\ClientProfileCategory;
use App\Enums\TagihanStatus;
use App\Models\DokumenTagihan;
use App\Models\MahasiswaProfil;
use App\Models\PaymentBankAccount;
use App\Models\PembayaranTagihan;
use App\Models\PenempatanKamar;
use App\Models\ResidenceRegistration;
use App\Models\Tagihan;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BillingDocumentRenderer
{
    public const VERSION = 'billing-v2';

    public function renderPdf(
        Tagihan $invoice,
        string $jenis,
        string $number,
        ?PembayaranTagihan $payment = null,
    ): string {
        return Pdf::loadView('pdf.billing-document', $this->viewData(
            invoice: $invoice,
            title: $jenis === 'invoice' ? 'INVOICE TAGIHAN' : 'KWITANSI PEMBAYARAN',
            number: $number,
            payment: $payment,
            jenis: $jenis,
        ))->setPaper('a4')->output();
    }

    public function ensureLatest(DokumenTagihan $document): void
    {
        if (
            $document->template_version === self::VERSION
            && ! empty($document->path)
            && Storage::disk('local')->exists($document->path)
        ) {
            return;
        }

        $document->loadMissing([
            'tagihan.mahasiswa.user',
            'tagihan.mahasiswa.prodi',
            'tagihan.items',
            'tagihan.penyesuaian',
            'tagihan.pembayaran',
            'tagihan.registration.periode',
            'tagihan.registration.placement.kamar.lantai.gedung',
            'pembayaran',
        ]);

        $invoice = $document->tagihan;
        if ($invoice === null || $invoice->mahasiswa === null || empty($document->path)) {
            return;
        }

        $contents = $this->renderPdf(
            invoice: $invoice,
            jenis: (string) $document->jenis,
            number: (string) $document->nomor,
            payment: $document->pembayaran,
        );

        Storage::disk('local')->put($document->path, $contents);
        DB::table('dokumen_tagihan')
            ->where('id', $document->id)
            ->update([
                'checksum_sha256' => hash('sha256', $contents),
                'template_version' => self::VERSION,
            ]);
    }

    /**
     * Build a complete, DB-query-free view payload for pdf.billing-document.
     *
     * @return array<string, mixed>
     */
    public function viewData(
        Tagihan $invoice,
        string $title,
        string $number,
        ?PembayaranTagihan $payment = null,
        ?MahasiswaProfil $student = null,
        ?ResidenceRegistration $registration = null,
        ?PenempatanKamar $placement = null,
        ?string $jenis = null,
    ): array {
        $invoice->loadMissing([
            'mahasiswa.user',
            'mahasiswa.prodi',
            'items',
            'penyesuaian',
            'pembayaran',
            'registration.periode',
            'registration.placement.kamar.lantai.gedung',
        ]);

        $student ??= $invoice->mahasiswa;
        $registration ??= $invoice->registration;
        $placement ??= $registration?->placement;
        $resolvedJenis = $jenis ?? (str_contains(strtoupper($title), 'KWITANSI') ? 'receipt' : 'invoice');
        $isReceipt = $resolvedJenis !== 'invoice';

        $total = (float) $invoice->total;
        $paid = (float) $invoice->total_dibayar;
        $remaining = max(0.0, $total - $paid);
        $hasPendingProof = $invoice->pembayaran->contains(fn ($p): bool => (string) $p->status === 'menunggu_verifikasi');

        $statusBadge = $this->resolveStatusBadge($invoice, $isReceipt, $remaining, $paid, $hasPendingProof);
        $snapshot = is_array($invoice->residence_snapshot) ? $invoice->residence_snapshot : [];

        $buildingName = $placement !== null
            ? (string) $placement->kamar->lantai->gedung->nama_gedung
            : (string) ($snapshot['building'] ?? '');
        $roomNumber = $placement !== null
            ? (string) $placement->kamar->nomor_kamar
            : (string) ($snapshot['room'] ?? '');
        $roomType = $placement !== null
            ? (string) $placement->kamar->tipe_kamar
            : (string) ($snapshot['type'] ?? '');

        $startsAt = $placement !== null && filled($placement->tanggal_mulai)
            ? (string) $placement->tanggal_mulai
            : ($registration?->starts_at?->toDateString()
                ?? (isset($snapshot['starts_at']) ? (string) $snapshot['starts_at'] : null));
        $periodEnd = $registration?->periode?->tanggal_selesai;
        $endsAt = $registration?->ends_at?->toDateString()
            ?? (filled($periodEnd) ? (string) $periodEnd : null)
            ?? (isset($snapshot['ends_at']) ? (string) $snapshot['ends_at'] : null);

        $unitCode = isset($snapshot['unit'])
            ? (string) $snapshot['unit']
            : ($registration !== null ? (string) $registration->rate_unit : '');
        $quantity = max(1, (int) ($snapshot['quantity'] ?? 1));
        $unitRate = (float) ($snapshot['amount'] ?? 0);

        $lineItems = $this->buildLineItems(
            $invoice,
            $buildingName,
            $roomNumber,
            $roomType,
            $unitCode,
            $quantity,
            $unitRate,
            $startsAt,
            $endsAt,
        );

        $bankAccounts = PaymentBankAccount::query()
            ->where('is_active', true)
            ->orderBy('bank_name')
            ->orderBy('account_number')
            ->get(['bank_name', 'account_number', 'account_name']);

        $issuedAt = $invoice->tanggal_terbit ?? $invoice->created_at ?? now();
        $dueAt = $invoice->jatuh_tempo ?? $registration?->reservation_expires_at;
        $user = $student?->user;
        $categoryLabel = $this->categoryLabel($user?->client_profile_category, $student);
        $basisCode = $registration !== null && filled($registration->billing_basis)
            ? (string) $registration->billing_basis
            : (isset($snapshot['billing_basis']) ? (string) $snapshot['billing_basis'] : null);
        $billingBasisLabel = match ($basisCode) {
            'room' => 'Booking 1 Kamar (Eksklusif)',
            'group' => 'Grup / Bersama Teman',
            'person' => 'Per Orang (Sharing)',
            default => null,
        };

        $displayAmount = $isReceipt && $payment !== null
            ? (int) round((float) $payment->jumlah)
            : (int) round($total);

        return [
            'letterhead' => app(LetterheadTemplateService::class)->data(),
            'title' => $isReceipt ? 'KWITANSI PEMBAYARAN' : 'INVOICE TAGIHAN',
            'subtitle' => $isReceipt ? 'Bukti Pembayaran Resmi Hunian Asrama' : 'Surat Tagihan Resmi Hunian Asrama',
            'jenis' => $resolvedJenis,
            'isReceipt' => $isReceipt,
            'number' => $number,
            'invoice' => $invoice,
            'payment' => $payment,
            'student' => $student,
            'registration' => $registration,
            'placement' => $placement,
            'statusBadge' => $statusBadge,
            'categoryLabel' => $categoryLabel,
            'billingBasisLabel' => $billingBasisLabel,
            'buildingName' => $buildingName !== '' ? $buildingName : '-',
            'roomNumber' => $roomNumber !== '' ? $roomNumber : '-',
            'roomType' => $roomType !== '' ? ucfirst($roomType) : '-',
            'stayPeriod' => ($startsAt && $endsAt)
                ? self::formatDate($startsAt).' s.d. '.self::formatDate($endsAt)
                : ($registration !== null && filled($registration->periode->nama_periode)
                    ? (string) $registration->periode->nama_periode
                    : '-'),
            'durationSummary' => $unitRate > 0
                ? $quantity.' '.self::unitLabel($unitCode).' x Rp '.number_format($unitRate, 0, ',', '.')
                : null,
            'issuedDate' => self::formatDate($issuedAt),
            'dueDate' => $dueAt !== null ? self::formatDate($dueAt) : '-',
            'printedDate' => self::formatDate(now()),
            'lineItems' => $lineItems,
            'adjustments' => $invoice->penyesuaian,
            'total' => $total,
            'paid' => $paid,
            'remaining' => $remaining,
            'terbilang' => self::terbilang($displayAmount),
            'bankAccounts' => $bankAccounts,
        ];
    }

    public static function unitLabel(string $unit): string
    {
        return match ($unit) {
            'day' => 'hari',
            'month' => 'bulan',
            'semester' => 'periode (6 bulan)',
            'year' => 'tahun',
            default => 'periode',
        };
    }

    public static function formatDate(Carbon|string|null $value): string
    {
        if ($value === null || $value === '') {
            return '-';
        }

        $date = Carbon::parse($value);
        $date->locale('id');

        return $date->translatedFormat('d F Y');
    }

    public static function terbilang(int $amount): string
    {
        if ($amount <= 0) {
            return 'Nol Rupiah';
        }

        return trim(self::spellNumber($amount)).' Rupiah';
    }

    private static function spellNumber(int $number): string
    {
        $words = [
            '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
            'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas',
        ];

        if ($number < 12) {
            return $words[$number];
        }
        if ($number < 20) {
            return self::spellNumber($number - 10).' Belas';
        }
        if ($number < 100) {
            return trim(self::spellNumber(intdiv($number, 10)).' Puluh '.self::spellNumber($number % 10));
        }
        if ($number < 200) {
            return trim('Seratus '.self::spellNumber($number - 100));
        }
        if ($number < 1000) {
            return trim(self::spellNumber(intdiv($number, 100)).' Ratus '.self::spellNumber($number % 100));
        }
        if ($number < 2000) {
            return trim('Seribu '.self::spellNumber($number - 1000));
        }
        if ($number < 1000000) {
            return trim(self::spellNumber(intdiv($number, 1000)).' Ribu '.self::spellNumber($number % 1000));
        }
        if ($number < 1000000000) {
            return trim(self::spellNumber(intdiv($number, 1000000)).' Juta '.self::spellNumber($number % 1000000));
        }

        return trim(self::spellNumber(intdiv($number, 1000000000)).' Miliar '.self::spellNumber($number % 1000000000));
    }

    /**
     * @return array{label: string, bg: string, border: string, color: string}
     */
    private function resolveStatusBadge(
        Tagihan $invoice,
        bool $isReceipt,
        float $remaining,
        float $paid,
        bool $hasPendingProof,
    ): array {
        if ($isReceipt || $invoice->status === TagihanStatus::Lunas || ($remaining <= 0.0 && (float) $invoice->total > 0)) {
            return [
                'label' => 'LUNAS',
                'bg' => '#ecfdf5',
                'border' => '#15803d',
                'color' => '#14532d',
            ];
        }

        if ($invoice->status === TagihanStatus::Batal) {
            return [
                'label' => 'DIBATALKAN',
                'bg' => '#f3f4f6',
                'border' => '#6b7280',
                'color' => '#374151',
            ];
        }

        if ($hasPendingProof) {
            return [
                'label' => 'MENUNGGU VERIFIKASI',
                'bg' => '#fffbeb',
                'border' => '#b45309',
                'color' => '#92400e',
            ];
        }

        if ($paid > 0.0 || $invoice->status === TagihanStatus::Sebagian) {
            return [
                'label' => 'SEBAGIAN DIBAYAR',
                'bg' => '#fffbeb',
                'border' => '#b45309',
                'color' => '#92400e',
            ];
        }

        return [
            'label' => 'BELUM LUNAS',
            'bg' => '#fef2f2',
            'border' => '#b91c1c',
            'color' => '#991b1b',
        ];
    }

    /**
     * @return list<array{description: string, meta: string, qty: string, unit_price: float, subtotal: float}>
     */
    private function buildLineItems(
        Tagihan $invoice,
        string $buildingName,
        string $roomNumber,
        string $roomType,
        string $unitCode,
        int $quantity,
        float $unitRate,
        ?string $startsAt,
        ?string $endsAt,
    ): array {
        $unitText = self::unitLabel($unitCode);
        $housingParts = array_filter([
            $buildingName !== '' ? $buildingName : null,
            $roomNumber !== '' ? 'Kamar '.$roomNumber : null,
            $roomType !== '' ? 'Tipe '.ucfirst($roomType) : null,
        ]);
        $housingLine = implode(' / ', $housingParts);
        $periodLine = ($startsAt && $endsAt)
            ? 'Masa tinggal: '.self::formatDate($startsAt).' s.d. '.self::formatDate($endsAt)
            : '';

        if ($invoice->items->isNotEmpty()) {
            $rows = [];
            foreach ($invoice->items as $index => $item) {
                $qty = max(1, (int) $item->kuantitas);
                $qtyLabel = $index === 0 && $unitCode !== ''
                    ? $qty.' '.$unitText
                    : $qty.' unit';
                $metaParts = [];
                if ($index === 0 && $housingLine !== '') {
                    $metaParts[] = $housingLine;
                }
                if ($index === 0 && $periodLine !== '') {
                    $metaParts[] = $periodLine;
                }
                if ($index === 0 && $unitRate > 0) {
                    $metaParts[] = 'Perhitungan: '.$quantity.' '.$unitText.' x Rp '.number_format($unitRate, 0, ',', '.');
                }

                $rows[] = [
                    'description' => (string) $item->deskripsi,
                    'meta' => implode(' | ', $metaParts),
                    'qty' => $qtyLabel,
                    'unit_price' => (float) $item->harga_satuan,
                    'subtotal' => (float) $item->jumlah,
                ];
            }

            return $rows;
        }

        $fallbackMeta = array_filter([
            $housingLine !== '' ? $housingLine : null,
            $periodLine !== '' ? $periodLine : null,
            $unitRate > 0 ? 'Perhitungan: '.$quantity.' '.$unitText.' x Rp '.number_format($unitRate, 0, ',', '.') : null,
        ]);

        return [[
            'description' => 'Biaya Hunian Andalas Residence',
            'meta' => implode(' | ', $fallbackMeta),
            'qty' => $quantity.' '.$unitText,
            'unit_price' => $unitRate > 0 ? $unitRate : (float) $invoice->total,
            'subtotal' => (float) $invoice->total,
        ]];
    }

    private function categoryLabel(?ClientProfileCategory $category, ?MahasiswaProfil $student): string
    {
        $base = match ($category) {
            ClientProfileCategory::LocalKipk => 'Mahasiswa Lokal (KIP-K)',
            ClientProfileCategory::LocalNonKipk, ClientProfileCategory::Student => 'Mahasiswa Lokal (Non-KIP-K)',
            ClientProfileCategory::InternationalStudent, ClientProfileCategory::InternationalFreeFacility => 'Mahasiswa Internasional / S2 / S3',
            ClientProfileCategory::Asn => 'ASN / Dosen (Rusun ASN)',
            ClientProfileCategory::NonStudent => 'Penyewa Umum / Non-Mahasiswa',
            default => 'Penghuni Asrama',
        };

        if ($student?->is_external_campus && filled($student->external_campus_name)) {
            return $base.' - '.$student->external_campus_name;
        }
        if ($category === ClientProfileCategory::Asn && filled($student?->unit_kerja)) {
            return $base.' - '.$student->unit_kerja;
        }

        return $base;
    }
}
