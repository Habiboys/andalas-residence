@php
    // daisyUI reads data-theme; the .dark class drives Tailwind's dark: variant.
    // Both are set from the same value so the first paint matches the stored appearance.
    $initialDark = ($appearance ?? 'system') === 'dark';
@endphp
<!DOCTYPE html>
<html
    lang="{{ str_replace('_', '-', app()->getLocale()) }}"
    data-theme="{{ $initialDark ? 'andalas-dark' : 'andalas' }}"
    @class(['dark' => $initialDark])
>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                        document.documentElement.dataset.theme = 'andalas-dark';
                    }
                }
            })();
        </script>

        {{-- Inline style to prevent a flash of the wrong theme before app.css loads. Keep in sync with --color-base-100 in app.css. --}}
        <style>
            html {
                background-color: #f3f4f6;
            }

            html.dark {
                background-color: #1e293b;
            }
        </style>

        <link rel="icon" href="/images/logo-andalas-residence.png" type="image/png">
        <link rel="apple-touch-icon" href="/images/logo-andalas-residence.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
