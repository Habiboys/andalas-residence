<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $title }} — {{ $number }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; }
        h1 { text-align: center; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #333; padding: 6px; text-align: left; }
    </style>
</head>
<body>
    <h1>{{ $title }}</h1>
    <p>Nomor: {{ $number }}</p>
    <p>Mahasiswa: {{ $student->user->nama }} ({{ $student->user->nim_nip }})</p>
    <p>Tagihan: {{ $invoice->nomor }}</p>
    <table>
        <tr><th>Total tagihan</th><td>Rp {{ number_format((float) $invoice->total, 0, ',', '.') }}</td></tr>
        @if ($registration && $placement)
            <tr><th>Gedung / kamar</th><td>{{ $placement->kamar->lantai->gedung->nama_gedung }} / {{ $placement->kamar->nomor_kamar }}</td></tr>
            <tr><th>Tipe kamar</th><td>{{ $placement->kamar->tipe_kamar }}</td></tr>
            <tr><th>Masa tinggal</th><td>{{ $placement->tanggal_mulai }} sampai {{ $registration->periode->tanggal_selesai }}</td></tr>
            <tr><th>Total dibayar</th><td>Rp {{ number_format((float) $invoice->total_dibayar, 0, ',', '.') }}</td></tr>
        @endif
        @if ($payment)
            <tr><th>Referensi pembayaran</th><td>{{ $payment->referensi }}</td></tr>
            <tr><th>Jumlah pembayaran</th><td>Rp {{ number_format((float) $payment->jumlah, 0, ',', '.') }}</td></tr>
        @endif
    </table>
</body>
</html>
