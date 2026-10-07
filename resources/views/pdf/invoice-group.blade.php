<!doctype html>
<html lang="id">
<head><meta charset="utf-8"><style>
@page { margin: 42pt 48pt; }
body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.35; color: #000; }
table { width: 100%; border-collapse: collapse; }
.letterhead { border-bottom: 1.5pt solid #000; margin-bottom: 18pt; }
.letterhead td { border: 0; text-align: center; vertical-align: middle; padding-bottom: 10pt; }
.logo { width: 16%; } .logo img { width: 56pt; } .institution { width: 68%; font-size: 11pt; }
.address { font-size: 8pt; } h1 { text-align: center; font-size: 12pt; margin: 0 0 16pt; }
.metadata td { border: 0; } .date { text-align: right; } p { margin: 12pt 0; }
.items { table-layout: fixed; margin: 14pt 0; } .items th, .items td { border: .7pt solid #000; padding: 7pt; vertical-align: top; overflow-wrap: break-word; }
.items thead { display: table-header-group; } .items tr { page-break-inside: avoid; }
.amount { text-align: right; white-space: nowrap; } .number { text-align: center; } .detail { font-size: 9pt; }
.signatures { margin-top: 24pt; table-layout: fixed; page-break-inside: avoid; } .signatures td { border: 0; text-align: center; vertical-align: top; width: 50%; }
.signature-space { height: 65pt; } .signature-space img { max-height: 60pt; max-width: 120pt; }
</style></head>
<body>
<table class="letterhead"><tr>
<td class="logo"><img src="{{ public_path('images/unand.png') }}" alt="Universitas Andalas"></td>
<td class="institution">KEMENTERIAN PENDIDIKAN TINGGI, SAINS<br>DAN TEKNOLOGI<br>UNIVERSITAS ANDALAS<br><strong>ANDALAS RESIDENCE</strong>
<div class="address">Alamat: Gedung Asrama Roesma/M.Syaff, Limau Manis Padang - 25163<br>Laman: www.unand.ac.id &nbsp; Email: andalasresidence@unand.ac.id</div></td>
<td class="logo"></td></tr></table>
<h1>INVOICE / SURAT PERMINTAAN PEMBAYARAN</h1>
<table class="metadata"><tr><td>Nomor: {{ $invoice['nomor'] }}</td><td class="date">Padang, {{ \Illuminate\Support\Carbon::parse($invoice['date'])->locale('id')->translatedFormat('d F Y') }}</td></tr></table>
<p>Kepada Yth. {{ $invoice['recipient'] }}<br>Nama Mitra / Instansi: {{ $invoice['institution'] }}</p>
<p>Perihal: {{ $invoice['subject'] }}</p>
<table class="items"><colgroup><col style="width:7%"><col style="width:68%"><col style="width:25%"></colgroup>
<thead><tr><th>No.</th><th>Uraian Kegiatan / Layanan</th><th>Jumlah (Rp)</th></tr></thead><tbody>
@foreach ($invoice['rows'] as $row)
<tr><td class="number">{{ $loop->iteration }}</td><td>{{ $row['nama'] }} ({{ $row['nim'] }})<br><span class="detail">
@if (!empty($row['residence']['building']))
{{ $row['residence']['building'] }} / {{ $row['residence']['room'] ?? '' }} / {{ $row['residence']['type'] ?? '' }}<br>
@if (!empty($row['residence']['starts_at']) && !empty($row['residence']['ends_at'])){{ $row['residence']['starts_at'] }} sampai {{ $row['residence']['ends_at'] }}<br>@endif
{{ $row['residence']['quantity'] ?? 1 }} {{ match ($row['residence']['unit'] ?? '') { 'day' => 'hari', 'month' => 'bulan', 'year' => 'tahun', default => 'periode' } }} x Rp {{ number_format((float) ($row['residence']['amount'] ?? $row['amount']), 0, ',', '.') }}<br>
@endif
{{ $row['nomor'] }}</span></td><td class="amount">{{ number_format($row['amount'], 0, ',', '.') }}</td></tr>
@endforeach
<tr><th colspan="2">Total Tagihan</th><th class="amount">{{ number_format($invoice['total'], 0, ',', '.') }}</th></tr></tbody></table>
<p>Pembayaran melalui:<br>Bank: {{ $invoice['bank'] }}<br>No. Rekening: {{ $invoice['account_number'] }}<br>Atas Nama: {{ $invoice['account_name'] }}<br>Batas Waktu Pembayaran: {{ $invoice['due_date'] }}</p>
<p>Demikian kami sampaikan tagihan dapat diselesaikan sesuai kesepakatan. Atas perhatian dan kerja samanya diucapkan terimakasih.</p>
<table class="signatures"><tr><td>Mengetahui,<br>Pimpinan Andalas Residence</td><td>Administrasi Andalas Residence</td></tr>
<tr><td class="signature-space">@if (!empty($invoice['signature_path']))<img src="{{ Storage::disk('local')->path($invoice['signature_path']) }}" alt="Tanda tangan pimpinan">@endif</td><td class="signature-space">@if (!empty($invoice['administration_signature_path']))<img src="{{ Storage::disk('local')->path($invoice['administration_signature_path']) }}" alt="Tanda tangan administrasi">@endif</td></tr>
<tr><td>{{ $invoice['signer'] }}</td><td>{{ $invoice['administration_signer'] ?? '' }}</td></tr></table>
</body></html>
