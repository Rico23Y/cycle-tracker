import { Link } from '@inertiajs/react';
import { BookOpen, Calendar, Eye, FolderGit2, LayoutGrid, ThermometerSun, UserRound, Venus } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard, calendar } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(), // before  ' /dashboard'
        icon: LayoutGrid,
    },
    {
        title: 'Calendar',
        href: calendar(), // before   ' /calendar'
        icon: Calendar,
    },
    {
        title: 'Cycles',
        href: '/cycles',
        icon: Venus,
    },
    {
        title: 'BBT',
        href: '/bbt',
        icon: ThermometerSun,
    },
    {
        title: 'Insights',
        href: '/insights',
        icon: Eye,
    },
    {
        title: 'Partners',
        href: '/partners',
        icon: UserRound,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'GitHub',
        href: 'https://github.com/Rico23Y/cycle-tracker',
        icon: FolderGit2,
    },
    {
        title: 'Project README',
        href: 'https://github.com/Rico23Y/cycle-tracker#readme',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={'/dashboard'} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
