@php
    $letterhead ??= app(\App\Services\LetterheadTemplateService::class)->data();
@endphp
        .letterhead-docx {
            position: relative;
            width: 100%;
            margin: 0 0 14pt;
            font-family: {!! $letterhead['font_css'] !!};
            color: #000;
        }
        .letterhead-logo {
            position: absolute;
            left: 0;
            top: {{ $letterhead['logo']['offset_y_pt'] }}pt;
            width: {{ $letterhead['logo']['width_pt'] }}pt;
            height: {{ $letterhead['logo']['height_pt'] }}pt;
        }
        .letterhead-lines {
            width: 100%;
        }
        .letterhead-line {
            margin: 0;
            padding: 0;
            line-height: 1.15;
            color: #000;
        }
        .letterhead-rule-wrap {
            margin-top: {{ $letterhead['border']['space_pt'] }}pt;
        }
        .letterhead-rule-thick {
            border-top: {{ $letterhead['border']['thick_pt'] }}pt solid #000;
            height: 0;
            font-size: 0;
            line-height: 0;
        }
        .letterhead-rule-thin {
            border-top: {{ $letterhead['border']['thin_pt'] }}pt solid #000;
            margin-top: {{ $letterhead['border']['gap_pt'] }}pt;
            height: 0;
            font-size: 0;
            line-height: 0;
        }
