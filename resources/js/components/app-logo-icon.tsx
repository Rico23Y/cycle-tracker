import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 40 40"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* Crescent / moon */}
            <path
                d="M27.5 6.5C18.7 7.7 12 15.2 12 24.3C12 29 13.8 33.3 16.8 36.5C8.9 34.9 3 27.9 3 19.5C3 9.8 10.8 2 20.5 2C23.1 2 25.5 2.6 27.5 3.6C28.7 4.2 28.8 6.3 27.5 6.5Z"
                fill="currentColor"
                opacity="0.9"
            />

            {/* Cycle ring */}
            <path
                d="M24.5 11.5C31.4 11.5 37 17.1 37 24C37 30.9 31.4 36.5 24.5 36.5C17.6 36.5 12 30.9 12 24C12 17.1 17.6 11.5 24.5 11.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
            />

            {/* Center dot */}
            <circle
                cx="24.5"
                cy="24"
                r="3.5"
                fill="currentColor"
            />
        </svg>
    );
}