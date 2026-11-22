<?php

namespace App\Services;

use SimpleXMLElement;
use ZipArchive;

/**
 * @phpstan-type LetterheadRun array{text: string, html: string, bold: bool, italic: bool, size_pt: float}
 * @phpstan-type LetterheadLine array{align: string, runs: list<LetterheadRun>}
 * @phpstan-type LetterheadData array{
 *     template_path: string,
 *     font_name: string,
 *     font_css: string,
 *     margins: array{top_pt: float, right_pt: float, left_pt: float},
 *     logo: array{src: string, width_pt: float, height_pt: float, offset_y_pt: float},
 *     lines: list<LetterheadLine>,
 *     border: array{style: string, thick_pt: float, thin_pt: float, gap_pt: float, space_pt: float}
 * }
 */
class LetterheadTemplateService
{
    public const TEMPLATE_RELATIVE_PATH = 'templates/kop-surat-asrama.docx';

    private const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

    private const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

    private const WP_NS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';

    private const A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

    /** @var array<string, LetterheadData> */
    private static array $cache = [];

    /**
     * Load letterhead structure, typography, margins, logo geometry, and divider rules
     * directly from the official Kop Surat DOCX template.
     *
     * @return LetterheadData
     */
    public function data(?string $templatePath = null): array
    {
        $path = $templatePath ?? resource_path(self::TEMPLATE_RELATIVE_PATH);
        $mtime = is_file($path) ? (int) filemtime($path) : 0;
        $cacheKey = $path.'|'.$mtime;

        if (isset(self::$cache[$cacheKey])) {
            return self::$cache[$cacheKey];
        }

        $parsed = $this->parseDocx($path);
        self::$cache[$cacheKey] = $parsed;

        return $parsed;
    }

    /**
     * Escape text while preserving multi-space runs from Word documents.
     */
    public static function formatRunHtml(string $text): string
    {
        $escaped = e($text);

        return (string) preg_replace_callback(
            '/ {2,}/',
            static fn (array $matches): string => str_repeat('&nbsp;', strlen($matches[0])),
            $escaped,
        );
    }

    /**
     * @return array{
     *     template_path: string,
     *     font_name: string,
     *     font_css: string,
     *     margins: array{top_pt: float, right_pt: float, left_pt: float},
     *     logo: array{src: string, width_pt: float, height_pt: float, offset_y_pt: float},
     *     lines: list<array{
     *         align: string,
     *         runs: list<array{text: string, html: string, bold: bool, italic: bool, size_pt: float}>
     *     }>,
     *     border: array{style: string, thick_pt: float, thin_pt: float, gap_pt: float, space_pt: float}
     * }
     */
    private function parseDocx(string $path): array
    {
        $fallback = $this->fallbackData($path);

        if (! is_file($path) || ! class_exists(ZipArchive::class)) {
            return $fallback;
        }

        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            return $fallback;
        }

        try {
            $documentXml = $this->readXml($zip, 'word/document.xml');
            $stylesXml = $this->readXml($zip, 'word/styles.xml');
            $relsXml = $this->readXml($zip, 'word/_rels/document.xml.rels');

            $fontName = $this->extractDefaultFont($stylesXml) ?? $fallback['font_name'];
            $margins = $this->extractMargins($documentXml, $fallback['margins']);
            $headerEntry = $this->resolveDefaultHeaderPath($documentXml, $relsXml);
            $headerXml = $headerEntry !== null ? $this->readXml($zip, $headerEntry) : null;

            if ($headerXml === null) {
                return [...$fallback, 'font_name' => $fontName, 'font_css' => $this->resolveDompdfFontCss($fontName), 'margins' => $margins];
            }

            $logo = $this->extractLogo($zip, $headerEntry, $headerXml, $fallback['logo']);
            [$lines, $border] = $this->extractParagraphsAndBorder($headerXml, $fallback['border']);

            if ($lines === []) {
                $lines = $fallback['lines'];
            }

            return [
                'template_path' => $path,
                'font_name' => $fontName,
                'font_css' => $this->resolveDompdfFontCss($fontName),
                'margins' => $margins,
                'logo' => $logo,
                'lines' => $lines,
                'border' => $border,
            ];
        } finally {
            $zip->close();
        }
    }

    private function readXml(ZipArchive $zip, string $entry): ?SimpleXMLElement
    {
        $contents = $zip->getFromName($entry);
        if (! is_string($contents) || $contents === '') {
            return null;
        }

        $previous = libxml_use_internal_errors(true);
        $xml = simplexml_load_string($contents);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return $xml instanceof SimpleXMLElement ? $xml : null;
    }

    private function extractDefaultFont(?SimpleXMLElement $stylesXml): ?string
    {
        if ($stylesXml === null) {
            return null;
        }

        $stylesXml->registerXPathNamespace('w', self::W_NS);
        $nodes = $stylesXml->xpath('//w:docDefaults/w:rPrDefault/w:rPr/w:rFonts');
        if (! is_array($nodes) || $nodes === []) {
            return null;
        }

        $attrs = $nodes[0]->attributes(self::W_NS);
        $ascii = (string) ($attrs['ascii'] ?? '');

        return $ascii !== '' ? $ascii : null;
    }

    /**
     * @param  array{top_pt: float, right_pt: float, left_pt: float}  $fallback
     * @return array{top_pt: float, right_pt: float, left_pt: float}
     */
    private function extractMargins(?SimpleXMLElement $documentXml, array $fallback): array
    {
        if ($documentXml === null) {
            return $fallback;
        }

        $documentXml->registerXPathNamespace('w', self::W_NS);
        $nodes = $documentXml->xpath('//w:sectPr/w:pgMar');
        if (! is_array($nodes) || $nodes === []) {
            return $fallback;
        }

        $attrs = $nodes[0]->attributes(self::W_NS);
        $leftTwips = (int) ($attrs['left'] ?? 0);
        $rightTwips = (int) ($attrs['right'] ?? 0);
        $headerTwips = (int) ($attrs['header'] ?? 0);

        return [
            'top_pt' => $headerTwips > 0 ? max(16.0, round($headerTwips / 20, 2)) : $fallback['top_pt'],
            'right_pt' => $rightTwips > 0 ? round($rightTwips / 20, 2) : $fallback['right_pt'],
            'left_pt' => $leftTwips > 0 ? round($leftTwips / 20, 2) : $fallback['left_pt'],
        ];
    }

    private function resolveDefaultHeaderPath(?SimpleXMLElement $documentXml, ?SimpleXMLElement $relsXml): ?string
    {
        if ($documentXml === null || $relsXml === null) {
            return 'word/header2.xml';
        }

        $documentXml->registerXPathNamespace('w', self::W_NS);
        $documentXml->registerXPathNamespace('r', self::R_NS);

        $headerRefs = $documentXml->xpath('//w:sectPr/w:headerReference[@w:type="default"]');
        if (! is_array($headerRefs) || $headerRefs === []) {
            $headerRefs = $documentXml->xpath('//w:sectPr/w:headerReference');
        }
        if (! is_array($headerRefs) || $headerRefs === []) {
            return null;
        }

        $rAttrs = $headerRefs[0]->attributes(self::R_NS);
        $relId = (string) ($rAttrs['id'] ?? '');
        if ($relId === '') {
            return null;
        }

        foreach ($relsXml->children() as $rel) {
            if ((string) $rel['Id'] === $relId) {
                $target = ltrim((string) $rel['Target'], '/');

                return str_starts_with($target, 'word/') ? $target : 'word/'.$target;
            }
        }

        return null;
    }

    /**
     * @param  array{src: string, width_pt: float, height_pt: float, offset_y_pt: float}  $fallback
     * @return array{src: string, width_pt: float, height_pt: float, offset_y_pt: float}
     */
    private function extractLogo(ZipArchive $zip, string $headerEntry, SimpleXMLElement $headerXml, array $fallback): array
    {
        $headerXml->registerXPathNamespace('wp', self::WP_NS);
        $headerXml->registerXPathNamespace('a', self::A_NS);
        $headerXml->registerXPathNamespace('r', self::R_NS);

        $widthPt = $fallback['width_pt'];
        $heightPt = $fallback['height_pt'];
        $offsetYPt = $fallback['offset_y_pt'];

        $extents = $headerXml->xpath('.//wp:extent');
        if (is_array($extents) && $extents !== []) {
            $cx = (int) ($extents[0]['cx'] ?? 0);
            $cy = (int) ($extents[0]['cy'] ?? 0);
            if ($cx > 0 && $cy > 0) {
                $widthPt = round($cx / 12700, 2);
                $heightPt = round($cy / 12700, 2);
            }
        }

        $posV = $headerXml->xpath('.//wp:positionV/wp:posOffset');
        if (is_array($posV) && $posV !== []) {
            $offsetYPt = round(((int) (string) $posV[0]) / 12700, 2);
        }

        // Prefer the crisp high-resolution official seal in public/images/unand.png when present;
        // fall back to embedding the image packaged inside the DOCX header directly.
        $src = public_path('images/unand.png');
        if (! is_file($src)) {
            $embedded = $this->extractHeaderImageDataUri($zip, $headerEntry, $headerXml);
            if ($embedded !== null) {
                $src = $embedded;
            }
        }

        return [
            'src' => $src,
            'width_pt' => $widthPt,
            'height_pt' => $heightPt,
            'offset_y_pt' => $offsetYPt,
        ];
    }

    private function extractHeaderImageDataUri(ZipArchive $zip, string $headerEntry, SimpleXMLElement $headerXml): ?string
    {
        $blips = $headerXml->xpath('.//a:blip');
        if (! is_array($blips) || $blips === []) {
            return null;
        }

        $rAttrs = $blips[0]->attributes(self::R_NS);
        $embedId = (string) ($rAttrs['embed'] ?? '');
        if ($embedId === '') {
            return null;
        }

        $headerFile = basename($headerEntry);
        $relsXml = $this->readXml($zip, 'word/_rels/'.$headerFile.'.rels');
        if ($relsXml === null) {
            return null;
        }

        foreach ($relsXml->children() as $rel) {
            if ((string) $rel['Id'] !== $embedId) {
                continue;
            }

            $target = ltrim((string) $rel['Target'], '/');
            $mediaPath = str_starts_with($target, 'word/') ? $target : 'word/'.$target;
            $bytes = $zip->getFromName($mediaPath);
            if (! is_string($bytes) || $bytes === '') {
                return null;
            }

            $ext = strtolower(pathinfo($mediaPath, PATHINFO_EXTENSION));
            $mime = match ($ext) {
                'jpg', 'jpeg' => 'image/jpeg',
                'gif' => 'image/gif',
                default => 'image/png',
            };

            return 'data:'.$mime.';base64,'.base64_encode($bytes);
        }

        return null;
    }

    /**
     * @param  array{style: string, thick_pt: float, thin_pt: float, gap_pt: float, space_pt: float}  $fallbackBorder
     * @return array{
     *     0: list<array{
     *         align: string,
     *         runs: list<array{text: string, html: string, bold: bool, italic: bool, size_pt: float}>
     *     }>,
     *     1: array{style: string, thick_pt: float, thin_pt: float, gap_pt: float, space_pt: float}
     * }
     */
    private function extractParagraphsAndBorder(SimpleXMLElement $headerXml, array $fallbackBorder): array
    {
        $headerXml->registerXPathNamespace('w', self::W_NS);
        $paragraphs = $headerXml->xpath('./w:p');
        if (! is_array($paragraphs)) {
            return [[], $fallbackBorder];
        }

        $lines = [];
        $border = $fallbackBorder;

        foreach ($paragraphs as $paragraph) {
            $paragraph->registerXPathNamespace('w', self::W_NS);
            $align = 'center';
            $paraSizePt = 12.0;
            $paraBold = false;
            $paraItalic = false;

            $pPrList = $paragraph->xpath('./w:pPr');
            if (is_array($pPrList) && $pPrList !== []) {
                $pPr = $pPrList[0];
                $pPr->registerXPathNamespace('w', self::W_NS);

                $jc = $pPr->xpath('./w:jc');
                if (is_array($jc) && $jc !== []) {
                    $val = (string) ($jc[0]->attributes(self::W_NS)['val'] ?? '');
                    if (in_array($val, ['left', 'center', 'right', 'both'], true)) {
                        $align = $val === 'both' ? 'justify' : $val;
                    }
                }

                $pRPr = $pPr->xpath('./w:rPr');
                if (is_array($pRPr) && $pRPr !== []) {
                    [$paraBold, $paraItalic, $paraSizePt] = $this->parseRunProps($pRPr[0], false, false, 12.0);
                }

                $bottomBdr = $pPr->xpath('./w:pBdr/w:bottom');
                if (is_array($bottomBdr) && $bottomBdr !== []) {
                    $bAttrs = $bottomBdr[0]->attributes(self::W_NS);
                    $style = (string) ($bAttrs['val'] ?? $fallbackBorder['style']);
                    $szEighths = (int) ($bAttrs['sz'] ?? 24);
                    $space = (float) ($bAttrs['space'] ?? 6);
                    $thickPt = $szEighths > 0 ? round($szEighths / 8, 2) : $fallbackBorder['thick_pt'];

                    $border = [
                        'style' => $style,
                        'thick_pt' => min(2.6, max(1.5, $thickPt)),
                        'thin_pt' => 0.75,
                        'gap_pt' => 1.5,
                        'space_pt' => max(3.0, $space),
                    ];
                }
            }

            $runNodes = $paragraph->xpath('./w:r');
            if (! is_array($runNodes)) {
                continue;
            }

            $runs = [];
            foreach ($runNodes as $runNode) {
                $runNode->registerXPathNamespace('w', self::W_NS);
                $textNodes = $runNode->xpath('./w:t');
                if (! is_array($textNodes) || $textNodes === []) {
                    continue;
                }

                $text = '';
                foreach ($textNodes as $textNode) {
                    $text .= (string) $textNode;
                }
                if ($text === '') {
                    continue;
                }

                $rPrNodes = $runNode->xpath('./w:rPr');
                [$bold, $italic, $sizePt] = (is_array($rPrNodes) && $rPrNodes !== [])
                    ? $this->parseRunProps($rPrNodes[0], $paraBold, $paraItalic, $paraSizePt)
                    : [$paraBold, $paraItalic, $paraSizePt];

                $lastIndex = count($runs) - 1;
                if (
                    $lastIndex >= 0
                    && $runs[$lastIndex]['bold'] === $bold
                    && $runs[$lastIndex]['italic'] === $italic
                    && $runs[$lastIndex]['size_pt'] === $sizePt
                ) {
                    $runs[$lastIndex]['text'] .= $text;
                    $runs[$lastIndex]['html'] = self::formatRunHtml($runs[$lastIndex]['text']);
                } else {
                    $runs[] = [
                        'text' => $text,
                        'html' => self::formatRunHtml($text),
                        'bold' => $bold,
                        'italic' => $italic,
                        'size_pt' => $sizePt,
                    ];
                }
            }

            if ($runs !== []) {
                $lines[] = [
                    'align' => $align,
                    'runs' => $runs,
                ];
            }
        }

        return [$lines, $border];
    }

    /**
     * @return array{0: bool, 1: bool, 2: float}
     */
    private function parseRunProps(SimpleXMLElement $rPr, bool $defaultBold, bool $defaultItalic, float $defaultSizePt): array
    {
        $rPr->registerXPathNamespace('w', self::W_NS);
        $bold = $defaultBold;
        $italic = $defaultItalic;
        $sizePt = $defaultSizePt;

        $bNodes = $rPr->xpath('./w:b');
        if (is_array($bNodes) && $bNodes !== []) {
            $bVal = (string) ($bNodes[0]->attributes(self::W_NS)['val'] ?? '1');
            $bold = ! in_array(strtolower($bVal), ['0', 'false', 'off'], true);
        }

        $iNodes = $rPr->xpath('./w:i');
        if (is_array($iNodes) && $iNodes !== []) {
            $iVal = (string) ($iNodes[0]->attributes(self::W_NS)['val'] ?? '1');
            $italic = ! in_array(strtolower($iVal), ['0', 'false', 'off'], true);
        }

        $szNodes = $rPr->xpath('./w:sz');
        if (is_array($szNodes) && $szNodes !== []) {
            $halfPoints = (int) ($szNodes[0]->attributes(self::W_NS)['val'] ?? 0);
            if ($halfPoints > 0) {
                $sizePt = round($halfPoints / 2, 2);
            }
        }

        return [$bold, $italic, $sizePt];
    }

    /**
     * Map Word font family names onto DomPDF's built-in PDF Core14 Times-Roman metrics so
     * DomPDF never falls back to wide DejaVu Serif when rendering Times New Roman.
     */
    private function resolveDompdfFontCss(string $fontName): string
    {
        $normalized = strtolower(trim($fontName));
        if (str_contains($normalized, 'times')) {
            return '"Times-Roman", Times, "Times New Roman", serif';
        }
        if (str_contains($normalized, 'arial') || str_contains($normalized, 'helvetica') || str_contains($normalized, 'calibri')) {
            return 'Helvetica, "'.$fontName.'", sans-serif';
        }

        return '"Times-Roman", Times, "'.$fontName.'", serif';
    }

    /**
     * @return array{
     *     template_path: string,
     *     font_name: string,
     *     font_css: string,
     *     margins: array{top_pt: float, right_pt: float, left_pt: float},
     *     logo: array{src: string, width_pt: float, height_pt: float, offset_y_pt: float},
     *     lines: list<array{
     *         align: string,
     *         runs: list<array{text: string, html: string, bold: bool, italic: bool, size_pt: float}>
     *     }>,
     *     border: array{style: string, thick_pt: float, thin_pt: float, gap_pt: float, space_pt: float}
     * }
     */
    private function fallbackData(string $path): array
    {
        $rawLines = [
            ['KEMENTERIAN PENDIDIKAN TINGGI, SAINS,', false],
            ['DAN TEKNOLOGI', false],
            ['UNIVERSITAS ANDALAS', true],
            ['ANDALAS RESIDENCE', true],
            ['Gedung Asrama Roesma/M.Syaff, Limau Manis Padang - 25163', false],
            ['Telp. 0811-6699634          Fax. 0751-71085', false],
            ['Laman: https://andalasresidence.unand.ac.id       e-mail : andalasresidence@unand.ac.id', false],
        ];

        $lines = array_map(
            static fn (array $row): array => [
                'align' => 'center',
                'runs' => [[
                    'text' => $row[0],
                    'html' => self::formatRunHtml($row[0]),
                    'bold' => $row[1],
                    'italic' => false,
                    'size_pt' => 12.0,
                ]],
            ],
            $rawLines,
        );

        return [
            'template_path' => $path,
            'font_name' => 'Times New Roman',
            'font_css' => '"Times-Roman", Times, "Times New Roman", serif',
            'margins' => [
                'top_pt' => 16.0,
                'right_pt' => 56.65,
                'left_pt' => 56.7,
            ],
            'logo' => [
                'src' => public_path('images/unand.png'),
                'width_pt' => 63.1,
                'height_pt' => 78.0,
                'offset_y_pt' => -0.7,
            ],
            'lines' => $lines,
            'border' => [
                'style' => 'thinThickSmallGap',
                'thick_pt' => 2.6,
                'thin_pt' => 0.75,
                'gap_pt' => 1.5,
                'space_pt' => 6.0,
            ],
        ];
    }
}
