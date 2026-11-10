<!doctype html><html lang="id"><head><meta charset="utf-8"><style>body{font-family:DejaVu Sans,sans-serif;font-size:11px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px}h1{font-size:18px}</style></head><body>
<h1>Addendum Hunian Andalas Residence</h1>
<p>Referensi: {{ $record->id }}<br>Jenis: {{ $record->kind }}<br>Berlaku: {{ $after['effective_at'] }}<br>Dicatat: {{ $record->created_at }}</p>
<p>Dasar perubahan: {{ $record->reason }}</p>
@if($record->kind === 'move')
<p>Kamar asal: {{ $before['room_label'] ?? $before['room_id'] }}<br>Kamar tujuan: {{ $after['room_label'] ?? $after['room_id'] }}</p>
<p>Tarif mengikuti kamar tujuan untuk seluruh masa kontrak. Komitmen sponsor tetap; selisih menjadi tanggungan pribadi.</p>
@endif
<table><tr><th>Tagihan</th><th>Sebelum</th><th>Sesudah</th><th>Sudah dibayar</th><th>Kredit lebih bayar</th></tr>
@foreach($after['invoices'] ?? [['invoice'=>$record->subject_id,'before'=>$before['total'],'after'=>$after['total'],'paid'=>$after['paid']]] as $row)
<tr><td>{{ $row['invoice'] }}</td><td>{{ number_format($row['before'],2,',','.') }}</td><td>{{ number_format($row['after'],2,',','.') }}</td><td>{{ number_format($row['paid'],2,',','.') }}</td><td>{{ number_format(max(0,$row['paid']-$row['after']),2,',','.') }}</td></tr>
@endforeach
</table><p>Lampiran ini melengkapi invoice awal. Pembayaran terdahulu tidak dihapus. Kredit lebih bayar memerlukan penyelesaian keuangan dan bukan pengembalian dana otomatis.</p></body></html>
