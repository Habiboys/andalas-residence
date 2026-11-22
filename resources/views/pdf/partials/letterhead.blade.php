@php
    $letterhead ??= app(\App\Services\LetterheadTemplateService::class)->data();
    $isDoubleBorder = str_contains(strtolower($letterhead['border']['style']), 'thick')
        || strtolower($letterhead['border']['style']) === 'double';
@endphp
<div class="letterhead-docx" data-template="kop-surat-asrama.docx">
    <img class="letterhead-logo" src="{{ $letterhead['logo']['src'] }}" alt="Universitas Andalas">
    <div class="letterhead-lines">
        @foreach ($letterhead['lines'] as $line)
            <div class="letterhead-line" style="text-align: {{ $line['align'] }};">
                @foreach ($line['runs'] as $run)
                    <span style="font-size: {{ $run['size_pt'] }}pt; font-weight: {{ $run['bold'] ? 'bold' : 'normal' }}; font-style: {{ $run['italic'] ? 'italic' : 'normal' }};">{!! $run['html'] !!}</span>
                @endforeach
            </div>
        @endforeach
    </div>
    <div class="letterhead-rule-wrap">
        <div class="letterhead-rule-thick"></div>
        @if ($isDoubleBorder)
            <div class="letterhead-rule-thin"></div>
        @endif
    </div>
</div>
