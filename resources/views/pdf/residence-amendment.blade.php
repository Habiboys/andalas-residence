@php
    $letterhead = app(\App\Services\LetterheadTemplateService::class)->data();
@endphp
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: {{ $letterhead['margins']['top_pt'] }}pt {{ $letterhead['margins']['right_pt'] }}pt 48pt {{ $letterhead['margins']['left_pt'] }}pt; }
        body { font-family: {!! $letterhead['font_css'] !!}; font-size: 11pt; line-height: 1.45; color: #000; }
        @include('pdf.partials.letterhead-styles', ['letterhead' => $letterhead])
        h1 { text-align: center; font-size: 12pt; font-weight: bold; margin: 14pt 0 12pt; text-decoration: underline; }
        p { margin: 6pt 0 10pt; text-align: justify; }
        table.meta { width: 100%; border-collapse: collapse; margin-bottom: 10pt; }
        table.meta td { border: 0; padding: 2pt 0; vertical-align: top; }
        table.meta .label { width: 108pt; }
        table.meta .colon { width: 12pt; }
        table.changes { width: 100%; border-collapse: collapse; margin: 12pt 0; }
        table.changes td, table.changes th { border: .7pt solid #000; padding: 6pt 7pt; font-size: 10.5pt; }
        table.changes th { background-color: #f4f4f4; text-align: left; font-weight: bold; }
        table.changes td.amount, table.changes th.amount { text-align: right; white-space: nowrap; }
        .note { font-size: 10pt; font-style: italic; margin-top: 12pt; }
    </style>
</head>
<body>
    @include('pdf.partials.letterhead', ['letterhead' => $letterhead])
    <h1>ADDENDUM HUNIAN ANDALAS RESIDENCE</h1>
    <table class="meta">
        <tr><td class="label">Referensi</td><td class="colon">:</td><td>{{ $record->id }}</td></tr>
        <tr><td class="label">Jenis</td><td class="colon">:</td><td>{{ $record->kind }}</td></tr>
        <tr><td class="label">Berlaku</td><td class="colon">:</td><td>{{ $after['effective_at'] }}</td></tr>
        <tr><td class="label">Dicatat</td><td class="colon">:</td><td>{{ $record->created_at }}</td></tr>
        <tr><td class="label">Dasar perubahan</td><td class="colon">:</td><td>{{ $record->reason }}</td></tr>
    </table>
    @if($record->kind === 'move')
        <p>Kamar asal: <strong>{{ $before['room_label'] ?? $before['room_id'] }}</strong><br>Kamar tujuan: <strong>{{ $after['room_label'] ?? $after['room_id'] }}</strong></p>
        <p>Tarif mengikuti kamar tujuan untuk seluruh masa kontrak. Komitmen sponsor tetap; selisih menjadi tanggungan pribadi.</p>
    @endif
    <table class="changes">
        <tr>
            <th>Tagihan</th>
            <th class="amount">Sebelum</th>
            <th class="amount">Sesudah</th>
            <th class="amount">Sudah dibayar</th>
            <th class="amount">Kredit lebih bayar</th>
        </tr>
        @foreach($after['invoices'] ?? [['invoice'=>$record->subject_id,'before'=>$before['total'],'after'=>$after['total'],'paid'=>$after['paid']]] as $row)
            <tr>
                <td>{{ $row['invoice'] }}</td>
                <td class="amount">{{ number_format($row['before'], 2, ',', '.') }}</td>
                <td class="amount">{{ number_format($row['after'], 2, ',', '.') }}</td>
                <td class="amount">{{ number_format($row['paid'], 2, ',', '.') }}</td>
                <td class="amount">{{ number_format(max(0, $row['paid'] - $row['after']), 2, ',', '.') }}</td>
            </tr>
        @endforeach
    </table>
    <p class="note">Lampiran ini melengkapi invoice awal. Pembayaran terdahulu tidak dihapus. Kredit lebih bayar memerlukan penyelesaian keuangan dan bukan pengembalian dana otomatis.</p>
</body>
</html>
