"use client";

import {
  ArrowRight,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { DebtEdge } from "@splitwise/shared";
import { formatCurrency } from "@splitwise/shared";
import type { BalanceEntry } from "@/store/api/expenseApi";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface BalanceCardsProps {
  balances: BalanceEntry[];
  simplifiedDebts: DebtEdge[];
  currency: string;
  onSettleUp?: (debt: DebtEdge) => void;
}

export function BalanceCards({
  balances,
  simplifiedDebts,
  currency,
  onSettleUp,
}: BalanceCardsProps) {
  const totalExpenses = balances.reduce((sum, b) => sum + b.paid, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" />
            Group Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totalExpenses, currency)}
          </div>
          <p className="text-sm text-muted-foreground">Total group expenses</p>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Member Balances
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {balances.map((entry) => {
            const isPositive = entry.balance >= 0;
            return (
              <Card
                key={entry.user.id}
                className={`border-l-4 ${
                  isPositive ? "border-l-emerald-500" : "border-l-red-500"
                }`}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback
                      className={`text-sm ${
                        isPositive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {entry.user.name[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {entry.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Paid {formatCurrency(entry.paid, currency)} · Owes{" "}
                      {formatCurrency(entry.owed, currency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-semibold ${
                        isPositive ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(entry.balance, currency)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {isPositive ? "is owed" : "owes"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {simplifiedDebts.length > 0 && (
        <div>
          <Separator className="mb-6" />
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Simplified Debts
          </h3>
          <div className="space-y-2">
            {simplifiedDebts.map((debt, idx) => (
              <div
                key={`${debt.from}-${debt.to}-${idx}`}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-red-100 text-red-700 text-xs">
                    {debt.fromName[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{debt.fromName}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{debt.toName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    owes{" "}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(debt.amount, currency)}
                    </span>
                  </p>
                </div>
                {onSettleUp && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSettleUp(debt)}
                  >
                    Settle
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {balances.length === 0 && simplifiedDebts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm font-medium">All settled up</p>
          <p className="mt-1 text-xs text-muted-foreground">
            No outstanding balances in this group.
          </p>
        </div>
      )}
    </div>
  );
}
