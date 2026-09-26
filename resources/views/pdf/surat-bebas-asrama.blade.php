@php
    $letter = app(\App\Services\FreeResidenceLetterFormat::class)->data($pengajuan);
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $letter['title'] }}</title>
    <style>
        @page { margin: 42pt 60pt 64pt; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 9pt; line-height: 1.45; color: #000; }
        .letterhead { width: 100%; table-layout: fixed; border-collapse: collapse; border-bottom: 1.5pt solid #000; }
        .logo { width: 16.66%; text-align: center; vertical-align: middle; }
        .logo img { width: 60pt; height: auto; }
        .institution { width: 66.66%; text-align: center; font-family: 'DejaVu Serif', serif; line-height: 1.3; font-size: 11pt; }
        .institution strong { font-size: 13pt; }
        .spacer { width: 16.66%; }
        .address { font-size: 7pt; line-height: 1.5; }
        .title { margin: 16pt 0 0; text-align: center; text-decoration: underline; font-size: 10pt; font-weight: bold; }
        .number { text-align: center; font-size: 9pt; margin-top: 1pt; }
        .body { margin-top: 30pt; }
        p { text-align: justify; margin: 0 0 13pt; }
        .identity { border-collapse: collapse; width: 85%; margin: 14pt 0 22pt 45pt; }
        .identity td { vertical-align: top; padding: 1pt 0; }
        .label { width: 57pt; }
        .colon { width: 10pt; }
        .signature { margin: 32pt 0 0 59%; width: 41%; page-break-inside: avoid; text-align: center; }
        .signature p { text-align: center; margin: 0; }
        .qr { margin: 8pt auto 4pt; }
        .qr img { width: 78pt; height: 78pt; }
        .qr-hint { font-size: 6.5pt; color: #333; }
        .signer { margin-top: 6pt !important; font-weight: bold; }
        .signer-nip { font-size: 8pt; }
        .notice { position: fixed; bottom: 0; left: 0; right: 0; border: .6pt solid #000; padding: 3pt; font-family: 'DejaVu Serif', serif; font-size: 6.5pt; font-style: italic; line-height: 1.3; }
    </style>
</head>
<body>
    <table class="letterhead">
        <tr>
            <td class="logo"><img src="{{ public_path('images/unand.png') }}" alt="Universitas Andalas"></td>
            <td class="institution">
                KEMENTERIAN PENDIDIKAN TINGGI, SAINS<br>DAN TEKNOLOGI<br>
                UNIVERSITAS ANDALAS<br><strong>ANDALAS RESIDENCE</strong>
                <div class="address">Alamat : Gedung Asrama Roesma/M.Syaff, Limau Manis Padang - 25163<br>
                    Laman : http://www.unand.ac.id &nbsp; email : andalasresidence@unand.ac.id</div>
            </td>
            <td class="spacer"></td>
        </tr>
    </table>
    <h1 class="title">{{ $letter['title'] }}</h1>
    <div class="number">Nomor. {{ $documentNumber ?? $pengajuan->nomor_surat_resmi ?? $pengajuan->nomor_pengajuan }}</div>
    <div class="body">
        <p>Pada hari ini {{ $letter['issuedAt']->translatedFormat('l, d F Y') }} pukul {{ $letter['issuedAt']->format('H:i:s') }} WIB,
            telah diselesaikan proses kliring asrama dan permohonan penerbitan Surat Keterangan Asrama melalui sistem Andalas Residence.
            Adapun identitas pemohon tersebut adalah sebagai berikut:</p>
        <table class="identity">
            <tr><td class="label"><strong>Nama</strong></td><td class="colon">:</td><td><strong>{{ $letter['nama'] ?? $mahasiswa->user->nama }}</strong></td></tr>
            <tr><td><strong>NIM</strong></td><td>:</td><td><strong>{{ $letter['nim'] ?? $mahasiswa->user->nim_nip }}</strong></td></tr>
            <tr><td>Fakultas</td><td>:</td><td>{{ $letter['faculty'] }} / {{ $letter['program'] }}</td></tr>
            <tr><td>Status</td><td>:</td><td>{{ $letter['categoryLabel'] }} / {{ $letter['variant'] === 'not_resident' ? 'Tidak Tinggal Di Asrama' : ($letter['variant'] === 'paid' ? $letter['amount'] : 'Bebas Asrama') }}</td></tr>
            <tr><td>Kamar</td><td>:</td><td>{{ $letter['room'] }}</td></tr>
        </table>
        @if ($letter['variant'] === 'not_resident')
            <p>Menyatakan bahwa mahasiswa tersebut di atas tidak tinggal di Asrama dikarenakan mahasiswa tersebut tidak pernah check-in Asrama.
                Kepada yang bersangkutan diberikan surat keterangan tidak tinggal di Asrama.</p>
        @elseif ($letter['variant'] === 'paid')
            <p>Menyatakan bahwa mahasiswa tersebut di atas telah melunasi uang asrama dan telah dinyatakan bebas dari kewajiban administrasi asrama berdasarkan hasil verifikasi pengelola.</p>
        @else
            <p>Menyatakan bahwa pemohon tersebut di atas telah menyelesaikan proses administrasi hunian dan dinyatakan bebas asrama berdasarkan hasil verifikasi pengelola dan catatan sistem.</p>
        @endif
        <p>Demikian surat keterangan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.</p>
    </div>
    <div class="signature">
        <p>Padang, {{ $letter['issuedAt']->translatedFormat('d F Y') }}</p>
        <p>{{ $letter['signerJabatan'] ?? 'Pengelola Asrama' }}<br>{{ $letter['signerUnit'] ?? 'Universitas Andalas' }}</p>
        @if (! empty($verificationQr))
            <div class="qr"><img src="{{ $verificationQr }}" alt="Kode verifikasi dokumen"></div>
            <p class="qr-hint">Pindai untuk verifikasi keaslian</p>
        @endif
        <p class="signer">{{ $letter['signer'] ?? config('residence.letter_signer') }}</p>
        @if (! empty($letter['signerNip']))
            <p class="signer-nip">NIP. {{ $letter['signerNip'] }}</p>
        @endif
    </div>
    <div class="notice">
        Dilarang memalsukan dokumen. Jika terbukti melanggar, tindakan tersebut akan diproses sesuai dengan sanksi yang berlaku.<br>
        Hasil kliring asrama ini akan diverifikasi ulang oleh Direktorat Keuangan UNAND sesuai dengan data penerbitan surat asrama yang tersedia.
    </div>
</body>
</html>
