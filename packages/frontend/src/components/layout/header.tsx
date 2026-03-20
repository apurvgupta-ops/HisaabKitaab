'use client';

import { Bell, Menu, DollarSign } from 'lucide-react';
import Link from 'next/link';

import { useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onMenuToggle: () => void;
}

const getInitials = (name: string | undefined): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
};

export const Header = ({ onMenuToggle }: HeaderProps) => {
  const user = useAppSelector((s) => s.auth.user);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onMenuToggle} className="shrink-0">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <DollarSign className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight">Splitwise</span>
        </Link>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">You have no new notifications</p>
            </div>
            <DropdownMenuItem className="cursor-pointer text-center text-xs text-primary">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link href="/settings">
          <Avatar className="h-8 w-8 ring-2 ring-transparent transition-all hover:ring-primary/20">
            <AvatarImage src={user?.avatar ?? undefined} alt={user?.name} />
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
};
