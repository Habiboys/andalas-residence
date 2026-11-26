@php
    if (! isset($statusBadge, $lineItems, $letterhead)) {
        extract(app(\App\Services\BillingDocumentRenderer::class)->viewData(
            invoice: $invoice,
            title: $title ?? 'INVOICE TAGIHAN',
            number: $number ?? $invoice->nomor,
            payment: $payment ?? null,
            student: $student ?? null,
            registration: $registration ?? null,
            placement: $placement ?? null,
            jenis: $jenis ?? null,
        ));
    }
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $title }} - {{ $number }}</title>
    <style>
        @page { margin: {{ $letterhead['margins']['top_pt'] }}pt {{ $letterhead['margins']['right_pt'] }}pt 40pt {{ $letterhead['margins']['left_pt'] }}pt; }
        body { font-family: {!! $letterhead['font_css'] !!}; font-size: 10pt; line-height: 1.38; color: #111827; margin: 0; }
        @include('pdf.partials.letterhead-styles', ['letterhead' => $letterhead])

        table { width: 100%; border-collapse: collapse; }
        .doc-banner { width: 100%; margin: 10pt 0 12pt; border-bottom: 1.2pt solid #14532d; padding-bottom: 8pt; }
        .doc-banner td { border: 0; vertical-align: middle; padding: 0; }
        .doc-title { font-size: 14pt; font-weight: bold; letter-spacing: 0.6pt; color: #14532d; margin: 0; }
        .doc-subtitle { font-size: 9pt; color: #4b5563; margin: 2pt 0 0; }
        .doc-number { font-size: 9.5pt; font-weight: bold; color: #111827; margin: 3pt 0 0; }
        .status-cell { text-align: right; width: 34%; }
        .status-badge {
            display: inline-block;
            padding: 4pt 10pt;
            font-size: 9pt;
            font-weight: bold;
            letter-spacing: 0.5pt;
            border: 1.2pt solid {{ $statusBadge['border'] }};
            background-color: {{ $statusBadge['bg'] }};
            color: {{ $statusBadge['color'] }};
        }

        .info-grid { width: 100%; margin-bottom: 12pt; table-layout: fixed; }
        .info-grid > tbody > tr > td { vertical-align: top; width: 50%; padding: 0; }
        .info-col-left { padding-right: 7pt !important; }
        .info-col-right { padding-left: 7pt !important; }
        .info-box {
            border: 0.7pt solid #cbd5e1;
            background-color: #fafafa;
            padding: 7pt 9pt;
        }
        .info-box-title {
            font-size: 8.5pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
            color: #14532d;
            border-bottom: 0.6pt solid #d1d5db;
            padding-bottom: 3pt;
            margin: 0 0 5pt;
        }
        .meta-table td { border: 0; padding: 1.6pt 0; vertical-align: top; font-size: 9.3pt; }
        .meta-label { width: 36%; color: #4b5563; }
        .meta-colon { width: 5%; color: #4b5563; }
        .meta-val { width: 59%; color: #111827; }

        .items-table { width: 100%; margin-bottom: 10pt; table-layout: fixed; }
        .items-table th {
            background-color: #14532d;
            color: #ffffff;
            font-size: 9pt;
            font-weight: bold;
            text-align: left;
            padding: 6pt 7pt;
            border: 0.7pt solid #14532d;
        }
        .items-table td {
            border: 0.6pt solid #cbd5e1;
            padding: 6.5pt 7pt;
            vertical-align: top;
            font-size: 9.5pt;
        }
        .items-table tr.alt td { background-color: #f8fafc; }
        .item-desc { font-weight: bold; color: #111827; }
        .item-meta { font-size: 8.6pt; color: #4b5563; margin-top: 2pt; }
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }
        .nowrap { white-space: nowrap; }

        .summary-wrap { width: 100%; margin-bottom: 12pt; table-layout: fixed; }
        .summary-wrap > tbody > tr > td { vertical-align: top; padding: 0; }
        .terbilang-cell { width: 52%; padding-right: 10pt !important; }
        .totals-cell { width: 48%; }
        .terbilang-box {
            border: 0.7pt dashed #94a3b8;
            background-color: #f8fafc;
            padding: 7pt 9pt;
        }
        .terbilang-label { font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 2pt; }
        .terbilang-text { font-size: 9.5pt; font-style: italic; font-weight: bold; color: #111827; }

        .totals-table td { padding: 4pt 7pt; font-size: 9.5pt; border: 0.6pt solid #cbd5e1; }
        .totals-label { background-color: #f8fafc; color: #374151; width: 54%; }
        .totals-amount { text-align: right; font-weight: bold; white-space: nowrap; width: 46%; }
        .totals-grand td {
            background-color: #ecfdf5;
            border-top: 1.2pt solid #14532d;
            border-bottom: 1.2pt solid #14532d;
            color: #14532d;
            font-size: 10pt;
            font-weight: bold;
        }

        .payment-box {
            border: 0.7pt solid #cbd5e1;
            border-left: 3pt solid #14532d;
            background-color: #f8fafc;
            padding: 8pt 10pt;
            margin-bottom: 12pt;
            page-break-inside: avoid;
        }
        .payment-box-title {
            font-size: 9pt;
            font-weight: bold;
            text-transform: uppercase;
            color: #14532d;
            margin: 0 0 5pt;
        }
        .bank-table td { border: 0; padding: 2pt 0; font-size: 9.2pt; vertical-align: top; }
        .bank-name { font-weight: bold; color: #111827; width: 28%; }
        .bank-number { font-weight: bold; color: #14532d; width: 32%; }
        .bank-holder { color: #374151; width: 40%; }
        .payment-note { margin: 5pt 0 0; font-size: 8.6pt; color: #374151; }

        .footer-grid { width: 100%; margin-top: 10pt; table-layout: fixed; page-break-inside: avoid; }
        .footer-grid td { border: 0; vertical-align: top; padding: 0; }
        .footer-note { width: 60%; padding-right: 14pt !important; font-size: 8.4pt; color: #4b5563; }
        .footer-sign { width: 40%; text-align: center; font-size: 9.2pt; }
        .sign-spacer { height: 28pt; }
        .sign-line { border-top: 0.7pt solid #111827; display: inline-block; padding-top: 2pt; min-width: 135pt; font-weight: bold; }
    </style>
</head>
<body>
    @include('pdf.partials.letterhead', ['letterhead' => $letterhead])

    <table class="doc-banner">
        <tr>
            <td>
                <div class="doc-title">{{ $title }}</div>
                <div class="doc-subtitle">{{ $subtitle }}</div>
                <div class="doc-number">Nomor Dokumen: {{ $number }}</div>
            </td>
            <td class="status-cell">
                <span class="status-badge">{{ $statusBadge['label'] }}</span>
            </td>
        </tr>
    </table>

    <table class="info-grid">
        <tr>
            <td class="info-col-left">
                <div class="info-box">
                    <div class="info-box-title">Ditagihkan Kepada</div>
                    <table class="meta-table">
                        <tr>
                            <td class="meta-label">Nama</td>
                            <td class="meta-colon">:</td>
                            <td class="meta-val"><strong>{{ $student->user->nama }}</strong></td>
                        </tr>
                        <tr>
                            <td class="meta-label">NIM / NIP</td>
                            <td class="meta-colon">:</td>
                            <td class="meta-val">{{ $student->user->nim_nip }}</td>
                        </tr>
                        <tr>
                            <td class="meta-label">Kategori</td>
                            <td class="meta-colon">:</td>
                            <td class="meta-val">{{ $categoryLabel }}</td>
                        </tr>
                        @if (! empty($student->user->email))
                            <tr>
                                <td class="meta-label">Email</td>
                                <td class="meta-colon">:</td>
                                <td class="meta-val">{{ $student->user->email }}</td>
                            </tr>
                        @endif
                        @if (! empty($student->user->no_hp))
                            <tr>
                                <td class="meta-label">No. HP</td>
                                <td class="meta-colon">:</td>
                                <td class="meta-val">{{ $student->user->no_hp }}</td>
                            </tr>
                        @endif
                    </table>
                </div>
            </td>
            <td class="info-col-right">
                <div class="info-box">
                    <div class="info-box-title">Informasi Tagihan &amp; Hunian</div>
                    <table class="meta-table">
                        <tr>
                            <td class="meta-label">No. Tagihan</td>
                            <td class="meta-colon">:</td>
                            <td class="meta-val"><strong>{{ $invoice->nomor }}</strong></td>
                        </tr>
                        <tr>
                            <td class="meta-label">Tanggal Terbit</td>
                            <td class="meta-colon">:</td>
                            <td class="meta-val">{{ $issuedDate }}</td>
                        </tr>
                        <tr>
                            <td class="meta-label">Jatuh Tempo</td>
                            <td class="meta-colon">:</td>
                            <td class="meta-val">{{ $dueDate }}</td>
                        </tr>
                        <tr>
                            <td class="meta-label">Gedung / Kamar</td>
                            <td class="meta-colon">:</td>
                            <td class="meta-val">{{ $buildingName }} / {{ $roomNumber }} ({{ $roomType }})</td>
                        </tr>
                        <tr>
                            <td class="meta-label">Masa Tinggal</td>
                            <td class="meta-colon">:</td>
                            <td class="meta-val">{{ $stayPeriod }}</td>
                        </tr>
                        @if (! empty($billingBasisLabel))
                            <tr>
                                <td class="meta-label">Skema Hunian</td>
                                <td class="meta-colon">:</td>
                                <td class="meta-val">{{ $billingBasisLabel }}</td>
                            </tr>
                        @endif
                    </table>
                </div>
            </td>
        </tr>
    </table>

    <table class="items-table">
        <colgroup>
            <col style="width: 6%">
            <col style="width: 46%">
            <col style="width: 14%">
            <col style="width: 17%">
            <col style="width: 17%">
        </colgroup>
        <thead>
            <tr>
                <th class="text-center">No</th>
                <th>Uraian Layanan / Hunian</th>
                <th class="text-center">Durasi / Qty</th>
                <th class="text-right">Tarif Satuan</th>
                <th class="text-right">Jumlah</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($lineItems as $index => $item)
                <tr class="{{ $index % 2 === 1 ? 'alt' : '' }}">
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>
                        <div class="item-desc">{{ $item['description'] }}</div>
                        @if ($item['meta'] !== '')
                            <div class="item-meta">{{ $item['meta'] }}</div>
                        @endif
                    </td>
                    <td class="text-center nowrap">{{ $item['qty'] }}</td>
                    <td class="text-right nowrap">Rp {{ number_format($item['unit_price'], 0, ',', '.') }}</td>
                    <td class="text-right nowrap"><strong>Rp {{ number_format($item['subtotal'], 0, ',', '.') }}</strong></td>
                </tr>
            @endforeach
            @if ($adjustments->isNotEmpty())
                @foreach ($adjustments as $adj)
                    <tr>
                        <td class="text-center">-</td>
                        <td colspan="3">
                            <div class="item-desc">Penyesuaian: {{ $adj->alasan ?? $adj->jenis }}</div>
                        </td>
                        <td class="text-right nowrap">Rp {{ number_format((float) $adj->jumlah, 0, ',', '.') }}</td>
                    </tr>
                @endforeach
            @endif
        </tbody>
    </table>

    <table class="summary-wrap">
        <tr>
            <td class="terbilang-cell">
                <div class="terbilang-box">
                    <div class="terbilang-label">{{ $isReceipt && $payment ? 'Terbilang Pembayaran' : 'Terbilang Total Tagihan' }}</div>
                    <div class="terbilang-text">{{ $terbilang }}</div>
                </div>
            </td>
            <td class="totals-cell">
                <table class="totals-table">
                    <tr>
                        <td class="totals-label">Total Tagihan</td>
                        <td class="totals-amount">Rp {{ number_format($total, 0, ',', '.') }}</td>
                    </tr>
                    <tr>
                        <td class="totals-label">Total Dibayar (Terverifikasi)</td>
                        <td class="totals-amount">Rp {{ number_format($paid, 0, ',', '.') }}</td>
                    </tr>
                    <tr class="totals-grand">
                        <td>{{ $remaining > 0 ? 'Sisa Tagihan' : 'Status Pembayaran' }}</td>
                        <td class="totals-amount">
                            @if ($remaining > 0)
                                Rp {{ number_format($remaining, 0, ',', '.') }}
                            @else
                                LUNAS (Rp 0)
                            @endif
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    @if ($payment)
        <div class="payment-box">
            <div class="payment-box-title">Rincian Pembayaran Diterima</div>
            <table class="meta-table">
                <tr>
                    <td class="meta-label">Referensi Pembayaran</td>
                    <td class="meta-colon">:</td>
                    <td class="meta-val"><strong>{{ $payment->referensi }}</strong></td>
                </tr>
                <tr>
                    <td class="meta-label">Tanggal Pembayaran</td>
                    <td class="meta-colon">:</td>
                    <td class="meta-val">{{ \App\Services\BillingDocumentRenderer::formatDate($payment->dibayar_pada) }}</td>
                </tr>
                <tr>
                    <td class="meta-label">Jumlah Dibayarkan</td>
                    <td class="meta-colon">:</td>
                    <td class="meta-val"><strong>Rp {{ number_format((float) $payment->jumlah, 0, ',', '.') }}</strong></td>
                </tr>
            </table>
        </div>
    @elseif ($remaining > 0)
        <div class="payment-box">
            <div class="payment-box-title">Informasi Pembayaran Resmi</div>
            @if ($bankAccounts->isNotEmpty())
                <table class="bank-table">
                    @foreach ($bankAccounts as $account)
                        <tr>
                            <td class="bank-name">{{ $account->bank_name }}</td>
                            <td class="bank-number">{{ $account->account_number }}</td>
                            <td class="bank-holder">a.n. {{ $account->account_name }}</td>
                        </tr>
                    @endforeach
                </table>
            @else
                <p class="payment-note">Silakan lakukan transfer ke rekening resmi Universitas Andalas / Andalas Residence yang tertera pada menu Tagihan di portal.</p>
            @endif
            <p class="payment-note">
                Mohon cantumkan nomor tagihan <strong>{{ $invoice->nomor }}</strong> pada berita transfer, lalu unggah bukti transfer melalui portal Andalas Residence untuk pengamanan penempatan kamar dan verifikasi keuangan.
            </p>
        </div>
    @endif

    <table class="footer-grid">
        <tr>
            <td class="footer-note">
                <strong>Catatan Penting:</strong><br>
                1. Dokumen ini diterbitkan secara elektronik oleh Sistem Informasi Andalas Residence Universitas Andalas.<br>
                2. Pembayaran dinyatakan lunas setelah dana terverifikasi oleh Bagian Keuangan Universitas Andalas.<br>
                3. Simpan dokumen ini sebagai bukti resmi administrasi hunian.
            </td>
            <td class="footer-sign">
                Padang, {{ $printedDate }}<br>
                Administrasi Andalas Residence
                <div class="sign-spacer"></div>
                <span class="sign-line">UPT Asrama Universitas Andalas</span>
            </td>
        </tr>
    </table>
</body>
</html>
