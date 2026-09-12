import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <text
                x="16"
                y="21"
                textAnchor="middle"
                fontFamily="Georgia, serif"
                fontSize="14"
                fontWeight="700"
                fill="currentColor"
            >
                AR
            </text>
        </svg>
    );
}
