<?php

namespace App\Services;

use Dom\Element;
use Dom\HTMLDocument;
use Dom\Node;
use Dom\Text;

class LandingRichText
{
    public static function html(?string $value): string
    {
        if (! $value) {
            return '';
        }
        if (! preg_match('/<\/?[a-z][^>]*>/i', $value)) {
            return '<p>'.nl2br(htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')).'</p>';
        }

        $document = HTMLDocument::createFromString('<!DOCTYPE html><html><body>'.$value.'</body></html>', LIBXML_NOERROR, 'UTF-8');
        $body = $document->getElementsByTagName('body')->item(0);
        $html = '';
        foreach ($body->childNodes as $node) {
            $html .= self::node($node);
        }

        return $html;
    }

    private static function node(Node $node): string
    {
        if ($node instanceof Text) {
            return htmlspecialchars($node->textContent, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }
        if (! $node instanceof Element || $node->namespaceURI !== 'http://www.w3.org/1999/xhtml') {
            return '';
        }
        $tag = strtolower($node->tagName);
        if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'template', 'form', 'noscript'], true)) {
            return '';
        }
        $children = '';
        foreach ($node->childNodes as $child) {
            $children .= self::node($child);
        }
        if (! in_array($tag, ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'br', 'hr', 'a', 'span', 'img', 'pre', 'code'], true)) {
            return $children;
        }

        $attributes = [];
        if ($tag === 'a' && self::safeUrl($node->getAttribute('href') ?? '')) {
            $attributes['href'] = $node->getAttribute('href');
            $attributes['rel'] = 'noopener noreferrer';
        }
        if ($tag === 'img') {
            $src = $node->getAttribute('src') ?? '';
            if (! self::safeUrl($src, true)) {
                return '';
            }
            $attributes = ['src' => $src, 'alt' => $node->getAttribute('alt') ?? '', 'loading' => 'lazy'];
            foreach (['width', 'height'] as $dimension) {
                $size = $node->getAttribute($dimension) ?? '';
                if (ctype_digit($size) && (int) $size <= 4096) {
                    $attributes[$dimension] = $size;
                }
            }
            $align = $node->getAttribute('data-align');
            if (in_array($align, ['left', 'center', 'right'], true)) {
                $attributes['data-align'] = $align;
            }
        }
        $styles = [];
        foreach (explode(';', $node->getAttribute('style') ?? '') as $declaration) {
            $parts = explode(':', $declaration, 2);
            if (count($parts) !== 2) {
                continue;
            }
            [$property, $value] = array_map('trim', $parts);
            $valid = match ($property) {
                'text-align' => in_array($value, ['left', 'right', 'center', 'justify'], true),
                'font-size' => (bool) preg_match('/^(12|13|14|16|18|20|24|28|32|40)px$/', $value),
                'color' => (bool) preg_match('/^(#[a-f0-9]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i', $value),
                default => false,
            };
            if ($valid) {
                $styles[] = $property.':'.$value;
            }
        }
        if ($styles) {
            $attributes['style'] = implode(';', $styles);
        }
        $serialized = '';
        foreach ($attributes as $name => $value) {
            $serialized .= ' '.$name.'="'.htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'"';
        }

        return '<'.$tag.$serialized.'>'.(in_array($tag, ['br', 'hr', 'img'], true) ? '' : $children.'</'.$tag.'>');
    }

    private static function safeUrl(string $url, bool $image = false): bool
    {
        if (preg_match('/[\x00-\x20\x7f\\\\]/', $url)) {
            return false;
        }
        if (str_starts_with($url, '/') && ! str_starts_with($url, '//')) {
            return true;
        }
        if (! $image && str_starts_with($url, '#')) {
            return true;
        }

        return in_array(strtolower(parse_url($url, PHP_URL_SCHEME) ?: ''), $image ? ['https', 'http'] : ['https', 'http', 'mailto', 'tel'], true);
    }
}
