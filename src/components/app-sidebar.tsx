'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Inbox, Send, FileText, Star, Trash2 } from 'lucide-react';

const menuItems = [
  { href: '/inbox', icon: Inbox, label: 'Inbox' },
  { href: '/sent', icon: Send, label: 'Sent' },
  { href: '/drafts', icon: FileText, label: 'Drafts' },
  { href: '/starred', icon: Star, label: 'Starred' },
  { href: '/spam', icon: Trash2, label: 'Spam' },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map(item => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
