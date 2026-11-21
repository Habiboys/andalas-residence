<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $title }} — {{ $number }}</title>
    <style>
        @page { margin: 40pt 52pt; }
        body { font-family: "Times New Roman", "DejaVu Serif", Times, serif; font-size: 10.5pt; line-height: 1.4; color: #000; }
        .letterhead { width: 100%; table-layout: fixed; border-collapse: collapse; border-bottom: 2pt solid #000; margin-bottom: 16pt; }
        .letterhead td { border: 0; vertical-align: middle; padding-bottom: 8pt; }
        .logo { width: 15%; text-align: center; }
        .logo img { width: 58pt; height: auto; }
        .institution { width: 70%; text-align: center; line-height: 1.25; }
        .institution .ministry { font-size: 10pt; }
        .institution .university { font-size: 10.5pt; }
        .institution .unit { font-size: 12pt; margin-top: 1pt; }
        .spacer { width: 15%; }
        .address { margin-top: 3pt; font-size: 7.5pt; line-height: 1.35; }
        h1 { text-align: center; font-size: 12pt; margin: 0 0 4pt; text-decoration: underline; }
        .doc-number { text-align: center; font-size: 9.5pt; margin-bottom: 16pt; }
        .meta { margin-bottom: 14pt; }
        .meta p { margin: 2pt 0; }
        .details { width: 100%; border-collapse: collapse; margin-top: 10pt; }
        .details th, .details td { border: .7pt solid #000; padding: 6pt 8pt; text-align: left; vertical-align: top; }
        .details th { width: 34%; background-color: #f4f4f4; }
    </style>
</head>
<body>
    @include('pdf.partials.letterhead')
    <h1>{{ $title }}</h1>
    <div class="doc-number">Nomor: {{ $number }}</div>
    <div class="meta">
        <p>Mahasiswa: <strong>{{ $student->user->nama }}</strong> ({{ $student->user->nim_nip }})</p>
        <p>Tagihan: {{ $invoice->nomor }}</p>
    </div>
    <table class="details">
        <tr><th>Total tagihan</th><td>Rp {{ number_format((float) $invoice->total, 0, ',', '.') }}</td></tr>
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
        <tr><th>Total dibayar</th><td>Rp {{ number_format((float) $invoice->total_dibayar, 0, ',', '.') }}</td></tr>
        @if ($payment)
            <tr><th>Referensi pembayaran</th><td>{{ $payment->referensi }}</td></tr>
            <tr><th>Jumlah pembayaran</th><td>Rp {{ number_format((float) $payment->jumlah, 0, ',', '.') }}</td></tr>
        @endif
    </table>
</body>
</html>
