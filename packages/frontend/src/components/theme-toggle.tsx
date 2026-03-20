'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setTheme, applyThemeToDOM, type Theme } from '@/store/slices/uiSlice';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const themes: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export const ThemeToggle = () => {
  const dispatch = useAppDispatch();
  const currentTheme = useAppSelector((s) => s.ui.theme);

  const handleChange = (theme: Theme) => {
    dispatch(setTheme(theme));
    applyThemeToDOM(theme);
  };

  const ActiveIcon = themes.find((t) => t.value === currentTheme)?.icon ?? Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <ActiveIcon className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => handleChange(value)}
            className={cn('cursor-pointer gap-2', currentTheme === value && 'bg-accent')}
          >
            <Icon className="h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
