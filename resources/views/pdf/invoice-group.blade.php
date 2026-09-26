<!doctype html>
<html lang="id"><head><meta charset="utf-8"><style>
@page { margin: 30pt; } body { font-family: DejaVu Sans,sans-serif; font-size:9pt; } h1,h2 { text-align:center;font-size:12pt; } table {width:100%;border-collapse:collapse;margin:12pt 0;} th,td {border:1px solid #555;padding:5pt;} .amount {text-align:right;} .signature {margin-left:60%;margin-top:25pt;page-break-inside:avoid;} img {max-height:65pt;} .header {text-align:center;border-bottom:2px solid #222;padding-bottom:10pt;}
</style></head><body>
<div class="header"><img src="{{ public_path('images/unand.png') }}" alt="Universitas Andalas"><br>KEMENTERIAN PENDIDIKAN TINGGI, SAINS DAN TEKNOLOGI<br><strong>UNIVERSITAS ANDALAS<br>ANDALAS RESIDENCE</strong></div>
<h1>INVOICE / SURAT PERMINTAAN PEMBAYARAN</h1>
<p>Nomor: {{ $invoice['nomor'] }} &nbsp; Tanggal: {{ $invoice['date'] }}</p>
<p>Kepada Yth: {{ $invoice['recipient'] }}<br>Nama Mitra / Instansi: {{ $invoice['institution'] }}</p>
<p>Perihal: {{ $invoice['subject'] }}</p>
<table><thead><tr><th>No.</th><th>Uraian Kegiatan / Layanan</th><th>Jumlah (Rp)</th></tr></thead><tbody>
@foreach ($invoice['rows'] as $row)
<tr><td>{{ $loop->iteration }}</td><td>{{ $row['nama'] }} ({{ $row['nim'] }})<br>{{ $row['residence']['building'] ?? '-' }} / {{ $row['residence']['room'] ?? '-' }} / {{ $row['residence']['type'] ?? '-' }}<br>{{ $row['residence']['starts_at'] ?? '-' }} ? {{ $row['residence']['ends_at'] ?? '-' }}; {{ $row['residence']['quantity'] ?? 1 }} {{ ($row['residence']['unit'] ?? '') === 'day' ? 'hari' : 'periode' }} ? Rp {{ number_format((float) ($row['residence']['amount'] ?? $row['amount']),0,',','.') }}<br>{{ $row['nomor'] }}</td><td class="amount">{{ number_format($row['amount'],0,',','.') }}</td></tr>
@endforeach
<tr><th colspan="2">Total Tagihan</th><th class="amount">{{ number_format($invoice['total'],0,',','.') }}</th></tr></tbody></table>
<p>Pembayaran melalui:<br>Bank: {{ $invoice['bank'] }}<br>No. Rekening: {{ $invoice['account_number'] }}<br>Atas Nama: {{ $invoice['account_name'] }}<br>Batas Waktu Pembayaran: {{ $invoice['due_date'] }}</p>
<div class="signature">Mengetahui,<br>Pimpinan Andalas Residence<br>@if (!empty($invoice['signature_path']))<img src="{{ Storage::disk('local')->path($invoice['signature_path']) }}" alt="Tanda tangan">@else<br><br><br>@endif<br>{{ $invoice['signer'] }}</div>
</body></html>
