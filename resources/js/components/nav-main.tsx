import { Link, usePage } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

const DATA_OWNER_PATHS = [
    '/dashboard',
    '/calendar',
    '/cycles',
    '/bbt',
    '/insights',
];

type HrefValue = NavItem['href'];

function hrefToString(href: HrefValue): string {
    if (typeof href === 'string') {
        return href;
    }

    if (
        typeof href === 'object' &&
        href !== null &&
        'url' in href &&
        typeof href.url === 'string'
    ) {
        return href.url;
    }

    return String(href);
}

function shouldPreserveOwner(href: string) {
    return DATA_OWNER_PATHS.some((path) => href.startsWith(path));
}

function hrefWithStoredOwner(href: string) {
    if (typeof window === 'undefined') {
        return href;
    }

    if (!shouldPreserveOwner(href)) {
        return href;
    }

    const selectedOwner = localStorage.getItem('cycle-tracker:selected-owner');

    if (!selectedOwner || selectedOwner === 'me') {
        return href;
    }

    const url = new URL(href, window.location.origin);
    url.searchParams.set('owner', selectedOwner);

    return `${url.pathname}${url.search}`;
}

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();
    const { url } = usePage();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>

            <SidebarMenu>
                {items.map((item) => {
                    const href = hrefToString(item.href);
                    const finalHref = hrefWithStoredOwner(href);

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentUrl(href) || url.startsWith(href)}
                                tooltip={{ children: item.title }}
                            >
                                <Link href={finalHref} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}