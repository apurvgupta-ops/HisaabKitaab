"use client";

import { DollarSign, PieChart, Users, Wallet } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Split Expenses",
    description: "Easily split bills with friends and groups",
  },
  {
    icon: PieChart,
    title: "Track Spending",
    description: "Visualize where your money goes",
  },
  {
    icon: Wallet,
    title: "Settle Debts",
    description: "Simplify payments with smart debt resolution",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Branding Panel */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400 p-12 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0djEyaDE0VjM2SDM2djEySDE0VjM2SDB2LTJoMTRWMjJIMFYxNGgxNFYwaDJ2MTRoMTJWMGgydjE0aDE0djJINDh2MTJoMTR2Mkg0OHYxMmgtMlYzNkgzNHYxMmgtMlYzNkgyMnYxMmgtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <DollarSign className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Splitwise</span>
          </div>
          <p className="mt-1 text-emerald-100 text-sm">
            Smart expense management for everyone
          </p>
        </div>

        <div className="relative z-10 space-y-8">
          <h1 className="text-4xl font-bold leading-tight">
            Share expenses,
            <br />
            not headaches.
          </h1>
          <p className="max-w-md text-lg text-emerald-50/90 leading-relaxed">
            Track group expenses, split bills fairly, and settle debts
            effortlessly — all in one beautiful app.
          </p>

          <div className="space-y-5 pt-4">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-emerald-100/80">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-emerald-200/60">
          &copy; {new Date().getFullYear()} Splitwise. All rights reserved.
        </p>
      </div>

      {/* Mobile Branding Header */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 text-white lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
          <DollarSign className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold">Splitwise</span>
      </div>

      {/* Form Panel */}
      <div className="flex flex-1 items-center justify-center bg-gray-50/50 px-4 py-10 sm:px-8 lg:w-1/2">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
