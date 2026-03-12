"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Handshake,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@splitwise/shared";

import { useAppSelector } from "@/store/hooks";
import { useGetGroupsQuery } from "@/store/api/groupApi";
import { useGetGroupExpensesQuery } from "@/store/api/expenseApi";
import { useGetGroupSettlementsQuery } from "@/store/api/settlementApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
  id: string;
  type: "expense" | "settlement";
  description: string;
  amount: number;
  currency: string;
  date: string;
  groupName: string;
  groupId: string;
  actor: string;
  isOutgoing: boolean;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-muted" />
      ))}
    </div>
  );
}

export default function ActivityPage() {
  const currentUser = useAppSelector((s) => s.auth.user);
  const { data: groups, isLoading: groupsLoading } = useGetGroupsQuery();

  const groupList = Array.isArray(groups) ? groups : [];
  const firstThreeIds = groupList.slice(0, 3).map((g) => g.id);

  const { data: expenses0 } = useGetGroupExpensesQuery(
    { groupId: firstThreeIds[0] ?? "", limit: 10 },
    { skip: !firstThreeIds[0] },
  );
  const { data: expenses1 } = useGetGroupExpensesQuery(
    { groupId: firstThreeIds[1] ?? "", limit: 10 },
    { skip: !firstThreeIds[1] },
  );
  const { data: expenses2 } = useGetGroupExpensesQuery(
    { groupId: firstThreeIds[2] ?? "", limit: 10 },
    { skip: !firstThreeIds[2] },
  );

  const { data: settlements0 } = useGetGroupSettlementsQuery(
    firstThreeIds[0] ?? "",
    { skip: !firstThreeIds[0] },
  );
  const { data: settlements1 } = useGetGroupSettlementsQuery(
    firstThreeIds[1] ?? "",
    { skip: !firstThreeIds[1] },
  );
  const { data: settlements2 } = useGetGroupSettlementsQuery(
    firstThreeIds[2] ?? "",
    { skip: !firstThreeIds[2] },
  );

  const activity: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];
    const groupMap = new Map(groupList.map((g) => [g.id, g]));

    const allExpenses = [expenses0, expenses1, expenses2];
    firstThreeIds.forEach((gId, idx) => {
      const raw = allExpenses[idx];
      const expenseList = Array.isArray(raw) ? raw : (raw?.data ?? []);
      const group = groupMap.get(gId);
      if (!group) return;

      for (const exp of expenseList) {
        const payerNames = exp.payers?.map((p: { user?: { name?: string } }) => p.user?.name ?? "Someone").join(", ") ?? "Someone";
        items.push({
          id: exp.id,
          type: "expense",
          description: exp.description,
          amount: Number(exp.amount),
          currency: group.currency ?? "USD",
          date: exp.date ?? exp.createdAt,
          groupName: group.name,
          groupId: gId,
          actor: payerNames,
          isOutgoing: exp.payers?.some((p: { userId?: string }) => p.userId === currentUser?.id) ?? false,
        });
      }
    });

    const allSettlements = [settlements0, settlements1, settlements2];
    firstThreeIds.forEach((gId, idx) => {
      const stlList = Array.isArray(allSettlements[idx]) ? allSettlements[idx] : [];
      const group = groupMap.get(gId);
      if (!group) return;

      for (const stl of stlList as Array<{ id: string; amount: number; createdAt: string; fromUser?: { name?: string; id?: string }; toUser?: { name?: string } }>) {
        items.push({
          id: stl.id,
          type: "settlement",
          description: `${stl.fromUser?.name ?? "Someone"} paid ${stl.toUser?.name ?? "Someone"}`,
          amount: Number(stl.amount),
          currency: group.currency ?? "USD",
          date: stl.createdAt,
          groupName: group.name,
          groupId: gId,
          actor: stl.fromUser?.name ?? "Someone",
          isOutgoing: stl.fromUser?.id === currentUser?.id,
        });
      }
    });

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [expenses0, expenses1, expenses2, settlements0, settlements1, settlements2, groupList, firstThreeIds, currentUser?.id]);

  const isLoading = groupsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="mt-1 text-muted-foreground">
          Recent expenses and settlements across your groups.
        </p>
      </div>

      {isLoading ? (
        <ActivitySkeleton />
      ) : activity.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">No activity yet</p>
            <p className="mt-1 max-w-[250px] text-xs text-muted-foreground">
              Join a group and add expenses to see your activity feed here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0 pb-2">
            {activity.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={`/groups/${item.groupId}`}
                className="flex items-center gap-3 px-6 py-3 hover:bg-accent/50"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback
                    className={
                      item.type === "settlement"
                        ? "bg-emerald-100 text-emerald-700"
                        : item.isOutgoing
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                    }
                  >
                    {item.type === "settlement" ? (
                      <Handshake className="h-4 w-4" />
                    ) : item.isOutgoing ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.type === "expense" ? (
                      <>
                        <span>{item.actor}</span>
                        <span className="text-muted-foreground"> added </span>
                        <span>{item.description}</span>
                      </>
                    ) : (
                      item.description
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.groupName} · {formatRelativeDate(item.date)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={item.type === "settlement" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {item.type === "settlement" ? (
                      <Handshake className="mr-1 h-3 w-3" />
                    ) : (
                      <Receipt className="mr-1 h-3 w-3" />
                    )}
                    {formatCurrency(item.amount, item.currency)}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
