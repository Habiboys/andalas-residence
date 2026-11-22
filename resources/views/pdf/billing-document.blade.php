@php
    $letterhead = app(\App\Services\LetterheadTemplateService::class)->data();
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $title }} - {{ $number }}</title>
    <style>
        @page { margin: {{ $letterhead['margins']['top_pt'] }}pt {{ $letterhead['margins']['right_pt'] }}pt 48pt {{ $letterhead['margins']['left_pt'] }}pt; }
        body { font-family: {!! $letterhead['font_css'] !!}; font-size: 11pt; line-height: 1.45; color: #000; }
        @include('pdf.partials.letterhead-styles', ['letterhead' => $letterhead])
        h1 { text-align: center; font-size: 12pt; font-weight: bold; margin: 14pt 0 2pt; text-decoration: underline; }
        .doc-number { text-align: center; font-size: 10.5pt; margin-bottom: 18pt; }
        .meta { margin-bottom: 14pt; }
        .meta table { border-collapse: collapse; width: 100%; }
        .meta td { border: 0; padding: 2pt 0; vertical-align: top; }
        .meta .label { width: 92pt; }
        .meta .colon { width: 12pt; }
        .details { width: 100%; border-collapse: collapse; margin-top: 8pt; }
        .details th, .details td { border: .7pt solid #000; padding: 6pt 9pt; text-align: left; vertical-align: top; font-size: 11pt; }
        .details th { width: 36%; background-color: #f4f4f4; font-weight: bold; }
        .details td.amount { font-weight: bold; white-space: nowrap; }
        .footnote { margin-top: 18pt; font-size: 9.5pt; font-style: italic; color: #222; }
    </style>
</head>
<body>
    @include('pdf.partials.letterhead', ['letterhead' => $letterhead])
    <h1>{{ $title }}</h1>
    <div class="doc-number">Nomor: {{ $number }}</div>
    <div class="meta">
        <table>
            <tr>
                <td class="label">Mahasiswa</td>
                <td class="colon">:</td>
                <td><strong>{{ $student->user->nama }}</strong> ({{ $student->user->nim_nip }})</td>
            </tr>
            <tr>
                <td class="label">Nomor Tagihan</td>
                <td class="colon">:</td>
                <td>{{ $invoice->nomor }}</td>
            </tr>
        </table>
    </div>
    <table class="details">
        <tr><th>Total tagihan</th><td class="amount">Rp {{ number_format((float) $invoice->total, 0, ',', '.') }}</td></tr>
        @if ($invoice->residence_snapshot)
            <tr><th>Hunian ditagihkan</th><td>{{ $invoice->residence_snapshot['building'] ?? '-' }} / {{ $invoice->residence_snapshot['room'] ?? '-' }} / {{ $invoice->residence_snapshot['type'] ?? '-' }}</td></tr>
            <tr><th>Durasi dan tarif</th><td>{{ $invoice->residence_snapshot['quantity'] ?? 1 }} {{ ($invoice->residence_snapshot['unit'] ?? '') === 'day' ? 'hari' : 'periode' }} x Rp {{ number_format((float) ($invoice->residence_snapshot['amount'] ?? 0), 0, ',', '.') }}</td></tr>
        @endif
        @if ($registration && $placement)
            <tr><th>Gedung / kamar</th><td>{{ $placement->kamar->lantai->gedung->nama_gedung }} / {{ $placement->kamar->nomor_kamar }}</td></tr>
            <tr><th>Tipe kamar</th><td>{{ $placement->kamar->tipe_kamar }}</td></tr>
            <tr><th>Masa tinggal</th><td>{{ $placement->tanggal_mulai }} sampai {{ $registration->ends_at ?? $registration->periode->tanggal_selesai }}</td></tr>
        @elseif (! empty($invoice->residence_snapshot['building']))
            <tr><th>Gedung / kamar</th><td>{{ $invoice->residence_snapshot['building'] }} / {{ $invoice->residence_snapshot['room'] ?? '-' }}</td></tr>
            <tr><th>Tipe kamar</th><td>{{ $invoice->residence_snapshot['type'] ?? '-' }}</td></tr>
        @endif
        <tr><th>Total dibayar</th><td class="amount">Rp {{ number_format((float) $invoice->total_dibayar, 0, ',', '.') }}</td></tr>
        @if ($payment)
            <tr><th>Referensi pembayaran</th><td>{{ $payment->referensi }}</td></tr>
            <tr><th>Jumlah pembayaran</th><td class="amount">Rp {{ number_format((float) $payment->jumlah, 0, ',', '.') }}</td></tr>
        @endif
    </table>
    <p class="footnote">Dokumen ini diterbitkan secara elektronik oleh sistem Andalas Residence Universitas Andalas.</p>
</body>
</html>
