<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Surat Bebas Asrama — {{ $pengajuan->nomor_pengajuan }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 24px; }
        .title { font-size: 16px; font-weight: bold; text-decoration: underline; margin-top: 12px; }
        .meta { margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        td { padding: 4px 8px; vertical-align: top; }
        .label { width: 180px; font-weight: bold; }
        .footer { margin-top: 48px; text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <strong>UNIVERSITAS ANDALAS</strong><br>
        <strong>ANDALAS RESIDEN</strong><br>
        <div class="title">SURAT KETERANGAN BEBAS ASRAMA</div>
        <div>Nomor: {{ $documentNumber ?? $pengajuan->nomor_surat_resmi ?? $pengajuan->nomor_pengajuan }}</div>
    </div>

    <p>Yang bertanda tangan di bawah ini, Staff Administrasi Andalas Residen, menerangkan bahwa:</p>

    <table>
        <tr><td class="label">Nama</td><td>: {{ $mahasiswa->user->nama }}</td></tr>
        <tr><td class="label">NIM</td><td>: {{ $mahasiswa->user->nim_nip }}</td></tr>
        <tr><td class="label">Program Studi</td><td>: {{ $mahasiswa->prodi?->name ?? '-' }}</td></tr>
        <tr><td class="label">Angkatan</td><td>: {{ $mahasiswa->angkatan ?? '-' }}</td></tr>
        <tr><td class="label">Alasan</td><td>: {{ $pengajuan->alasan }}</td></tr>
    </table>

    <p>Telah dinyatakan <strong>BEBAS ASRAMA</strong> setelah memenuhi seluruh kewajiban administrasi, keuangan, dan aset.</p>

    <div class="footer">
        <p>Padang, {{ now()->translatedFormat('d F Y') }}</p>
        <p>Staff Administrasi Andalas Residen</p>
        <br><br><br>
        <p><strong>(_________________________)</strong></p>
    </div>
</body>
</html>
