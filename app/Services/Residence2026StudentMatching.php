<?php

namespace App\Services;

use App\Models\Kamar;
use App\Models\Prodi;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class Residence2026StudentMatching
{
    /** @var array<string, string> */
    private const BuildingCodes = [
        'RPX(ADA KIPK)' => 'A', 'RUSUNAWA' => 'B', 'PUPERA PUTRI' => 'C', 'MENPERA' => 'D',
        'RMS' => 'E', 'OREN' => 'F', 'HIJAU' => 'G', 'PUPERA PUTERA' => 'H',
    ];

    public function buildingCode(string $sheet): ?string
    {
        return self::BuildingCodes[$sheet] ?? null;
    }

    public function roomKey(string $code, string $number): string
    {
        $normalized = preg_replace('/\s+/u', '', Str::upper(trim($number, " \t\n\r\0\x0B()[]")));

        return $code.'|'.preg_replace('/(?<=[A-Z])\.(?=\d)/', '', $normalized);
    }

    /**
     * Both names separated by "/" are aliases, never a fuzzy room-number match.
     *
     * @param  array<string, mixed>  $row
     * @param  Collection<string, Collection<int, Kamar>>  $lookup
     * @return Collection<int, Kamar>
     */
    public function rooms(array $row, Collection $lookup): Collection
    {
        $code = self::BuildingCodes[$row['sheet']] ?? '?';
        $exact = $lookup->get($this->roomKey($code, $row['room']), collect());
        if ($exact->isNotEmpty()) {
            return $exact;
        }

        return collect(explode('/', $row['room']))
            ->flatMap(fn (string $alias) => $lookup->get($this->roomKey($code, $alias), collect()))
            ->unique('id')->values();
    }

    /**
     * @param  list<string>  $names
     * @param  Collection<int, Prodi>  $programs
     * @return Collection<int, Prodi>
     */
    public function programs(array $names, Collection $programs): Collection
    {
        $aliases = [
            'ilmuhukum' => 'hukum', 'ilmusejarah' => 'sejarah',
            'statistikadansainsdata' => 'statistikdansainsdata',
            'ilmukesehatanmasyarakat' => 'kesehatanmasyarakat', 'kesmas' => 'kesehatanmasyarakat',
            'sasindo' => 'sastraindonesia', 'sasjep' => 'sastrajepang', 'sasing' => 'sastrainggris',
            'sasmin' => 'sastraminangkabau', 'protan' => 'proteksitanaman',
            'tphp' => 'teknologipangandanhasilpertanian', 'tip' => 'teknologiindustripertanian',
            'perternakan' => 'peternakan', 'akutansi' => 'akuntansi',
            'manajemanpemasaran' => 'manajemenpemasaran', 'ilmuekonomi' => 'ekonomi',
            'kewirasuhaan' => 'kewirausahaan',
            'hi' => 'hubunganinternasional', 'limutanah' => 'ilmutanah', 'imutanah' => 'ilmutanah',
            'fmipabiologi' => 'biologi', 'perbankan' => 'perbankandankeuangan',
            'perbankankeuangan' => 'perbankandankeuangan', 'perbankandankeuagan' => 'perbankandankeuangan',
            'agrotenologi' => 'agroteknologi', 'agrottknologi' => 'agroteknologi', 'agroteknolgi' => 'agroteknologi',
            'agribinis' => 'agribisnis', 'argribisnis' => 'agribisnis', 'proteksitanam' => 'proteksitanaman',
            'statistika' => 'statistikdansainsdata', 'management' => 'manajemen',
            'pertenakan' => 'peternakan', 'peterbakan' => 'peternakan',
            'nutrisidanteknologipakan' => 'nutrisidanteknologipakanternak',
            'nutrisidanteknologimakanternak' => 'nutrisidanteknologipakanternak',
            'satraindonesia' => 'sastraindonesia', 'sastraingrris' => 'sastrainggris',
            'sastrainggria' => 'sastrainggris', 'sastraminang' => 'sastraminangkabau', 'satrajepang' => 'sastrajepang',
            'antropologi' => 'antropologisosial', 'tpb' => 'teknikpertaniandanbiosistem',
            'teknikpertanian' => 'teknikpertaniandanbiosistem', 'teknlogipertaniandanbiosistem' => 'teknikpertaniandanbiosistem',
            'teknologipangan' => 'teknologipangandanhasilpertanian',
            'tekonologiindustripertanian' => 'teknologiindustripertanian',
            'teknologiindutripertanian' => 'teknologiindustripertanian', 'ilmukeperawatan' => 'keperawatan',
        ];

        return collect($names)->flatMap(function (string $name) use ($programs, $aliases): Collection {
            $text = Str::lower(Str::ascii($name));
            $degreePattern = '/\b(d\s*-?\s*(iii|iv|3|4)|s\s*-?\s*1)\b/i';
            $degree = null;
            if (preg_match($degreePattern, $text, $match)) {
                $token = preg_replace('/[\s-]/', '', $match[0]);
                $degree = match ($token) {
                    'diii', 'd3' => 'D3', 'div', 'd4' => 'D4', default => 'S1',
                };
                $text = preg_replace($degreePattern, '', $text);
            }
            $text = preg_replace('/^(?:program studi|prodi)\s+/', '', trim($text));
            $normalized = preg_replace('/[^a-z0-9]/', '', $text);
            $canonical = $aliases[$normalized] ?? $normalized;

            return $programs->filter(fn (Prodi $program): bool => ($degree === null || $program->jenjang === $degree)
                && preg_replace('/[^a-z0-9]/', '', Str::lower(Str::ascii($program->name))) === $canonical);
        })->unique('id')->values();
    }
}
