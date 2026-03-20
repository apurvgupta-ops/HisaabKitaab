import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/store/provider';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Splitwise - Expense Splitting & Money Management',
  description: 'Split expenses with friends, track personal finances, and manage budgets.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <StoreProvider>
          <ThemeProvider>
            <TooltipProvider delayDuration={0}>
              {children}
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
