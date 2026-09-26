<?php

namespace App\Services;

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Color\Color;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;

class DocumentVerificationQr
{
    /** @return array{data_uri: string, url: string} */
    public function make(string $token): array
    {
        $url = route('dokumen.verifikasi', $token);
        // Versi terkompresi logo agar pembuatan QR tetap ringan di CLI/worker.
        $logo = public_path('images/unand-qr.png');
        $fallback = public_path('images/unand.png');
        $resolved = is_file($logo) ? $logo : (is_file($fallback) ? $fallback : '');

        $result = (new Builder(
            writer: new PngWriter,
            data: $url,
            encoding: new Encoding('UTF-8'),
            errorCorrectionLevel: ErrorCorrectionLevel::High,
            size: 480,
            margin: 8,
            roundBlockSizeMode: RoundBlockSizeMode::Margin,
            foregroundColor: new Color(15, 63, 58),
            backgroundColor: new Color(255, 255, 255),
            logoPath: $resolved,
            logoResizeToWidth: 110,
            logoPunchoutBackground: true,
        ))->build();

        return ['data_uri' => $result->getDataUri(), 'url' => $url];
    }
}
