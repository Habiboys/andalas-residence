<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
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
        h1 { text-align: center; font-size: 12pt; margin: 0 0 12pt; text-decoration: underline; }
        p { margin: 6pt 0 10pt; }
        table.changes { width: 100%; border-collapse: collapse; margin: 12pt 0; }
        table.changes td, table.changes th { border: .7pt solid #000; padding: 6pt 7pt; }
        table.changes th { background-color: #f4f4f4; text-align: left; }
        .note { font-size: 9.5pt; margin-top: 12pt; }
    </style>
</head>
<body>
    @include('pdf.partials.letterhead')
    <h1>Addendum Hunian Andalas Residence</h1>
    <p>Referensi: {{ $record->id }}<br>Jenis: {{ $record->kind }}<br>Berlaku: {{ $after['effective_at'] }}<br>Dicatat: {{ $record->created_at }}</p>
    <p>Dasar perubahan: {{ $record->reason }}</p>
    @if($record->kind === 'move')
        <p>Kamar asal: {{ $before['room_label'] ?? $before['room_id'] }}<br>Kamar tujuan: {{ $after['room_label'] ?? $after['room_id'] }}</p>
        <p>Tarif mengikuti kamar tujuan untuk seluruh masa kontrak. Komitmen sponsor tetap; selisih menjadi tanggungan pribadi.</p>
    @endif
    <table class="changes">
        <tr><th>Tagihan</th><th>Sebelum</th><th>Sesudah</th><th>Sudah dibayar</th><th>Kredit lebih bayar</th></tr>
        @foreach($after['invoices'] ?? [['invoice'=>$record->subject_id,'before'=>$before['total'],'after'=>$after['total'],'paid'=>$after['paid']]] as $row)
            <tr>
                <td>{{ $row['invoice'] }}</td>
                <td>{{ number_format($row['before'], 2, ',', '.') }}</td>
                <td>{{ number_format($row['after'], 2, ',', '.') }}</td>
                <td>{{ number_format($row['paid'], 2, ',', '.') }}</td>
                <td>{{ number_format(max(0, $row['paid'] - $row['after']), 2, ',', '.') }}</td>
            </tr>
        @endforeach
    </table>
    <p class="note">Lampiran ini melengkapi invoice awal. Pembayaran terdahulu tidak dihapus. Kredit lebih bayar memerlukan penyelesaian keuangan dan bukan pengembalian dana otomatis.</p>
</body>
</html>
