"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Settings,
  Plus,
  UserPlus,
  Trash2,
  Loader2,
  Shield,
  User,
  Plane,
  Home,
  Heart,
  Briefcase,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  addMemberSchema,
  updateGroupSchema,
  SUPPORTED_CURRENCIES,
  formatCurrency,
} from "@splitwise/shared";
import type {
  AddMemberInput,
  UpdateGroupInput,
  GroupType,
  GroupMember,
  DebtEdge,
  ExpenseWithDetails,
} from "@splitwise/shared";

import {
  useGetGroupQuery,
  useUpdateGroupMutation,
  useAddMemberMutation,
  useRemoveMemberMutation,
} from "@/store/api/groupApi";
import {
  useGetGroupExpensesQuery,
  useGetGroupBalancesQuery,
} from "@/store/api/expenseApi";
import { useGetSimplifiedDebtsQuery } from "@/store/api/settlementApi";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/ui/use-toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

import { ExpenseList } from "@/components/expenses/expense-list";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { BalanceCards } from "@/components/expenses/balance-cards";
import { SettleUpDialog } from "@/components/groups/settle-up-dialog";

const GROUP_TYPE_CONFIG: Record<GroupType, { label: string; icon: LucideIcon; color: string }> = {
  trip: { label: "Trip", icon: Plane, color: "bg-blue-100 text-blue-700" },
  home: { label: "Home", icon: Home, color: "bg-emerald-100 text-emerald-700" },
  couple: { label: "Couple", icon: Heart, color: "bg-pink-100 text-pink-700" },
  project: { label: "Project", icon: Briefcase, color: "bg-amber-100 text-amber-700" },
  other: { label: "Other", icon: MoreHorizontal, color: "bg-gray-100 text-gray-700" },
};

const GROUP_TYPES = [
  { value: "trip", label: "Trip" },
  { value: "home", label: "Home" },
  { value: "couple", label: "Couple" },
  { value: "project", label: "Project" },
  { value: "other", label: "Other" },
] as const;

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
      </div>
      <div className="h-10 w-full rounded bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 w-full rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

function MembersTab({
  members,
  groupId,
  currentUserId,
  isAdmin,
}: {
  members: GroupMember[];
  groupId: string;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const { toast } = useToast();
  const [addMember, { isLoading: isAdding }] = useAddMemberMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveMemberMutation();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const memberForm = useForm<AddMemberInput>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: "", role: "member" },
  });

  const onAddMember = async (values: AddMemberInput) => {
    try {
      await addMember({ groupId, email: values.email, role: values.role }).unwrap();
      toast({ title: "Member added", description: "New member has been invited." });
      memberForm.reset();
    } catch {
      toast({ title: "Error", description: "Failed to add member.", variant: "destructive" });
    }
  };

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    try {
      await removeMember({ groupId, userId }).unwrap();
      toast({ title: "Member removed", description: "Member has been removed from the group." });
    } catch {
      toast({ title: "Error", description: "Failed to remove member.", variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" />
              Add Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={memberForm.handleSubmit(onAddMember)}
              className="flex gap-3"
            >
              <Input
                placeholder="Enter user email"
                className="flex-1"
                {...memberForm.register("email")}
              />
              <Select
                value={memberForm.watch("role")}
                onValueChange={(v) =>
                  memberForm.setValue("role", v as "admin" | "member")
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={isAdding}>
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </form>
            {memberForm.formState.errors.email && (
              <p className="mt-2 text-sm text-destructive">
                {memberForm.formState.errors.email.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {member.user?.name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {member.user?.name ?? "Unknown"}
                {member.userId === currentUserId && (
                  <span className="ml-1.5 text-xs text-muted-foreground">(You)</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {member.user?.email ?? ""}
              </p>
            </div>
            <Badge
              variant={member.role === "admin" ? "default" : "secondary"}
              className="shrink-0"
            >
              {member.role === "admin" ? (
                <Shield className="mr-1 h-3 w-3" />
              ) : (
                <User className="mr-1 h-3 w-3" />
              )}
              {member.role}
            </Badge>
            {isAdmin && member.userId !== currentUserId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={isRemoving && removingId === member.userId}
                onClick={() => handleRemove(member.userId)}
              >
                {isRemoving && removingId === member.userId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({
  group,
}: {
  group: {
    id: string;
    name: string;
    type: GroupType;
    currency: string;
    settings: {
      simplifyDebts: boolean;
      defaultSplitType: string;
      allowSettlements: boolean;
    };
  };
}) {
  const { toast } = useToast();
  const [updateGroup, { isLoading }] = useUpdateGroupMutation();

  const form = useForm<UpdateGroupInput>({
    resolver: zodResolver(updateGroupSchema),
    defaultValues: {
      name: group.name,
      type: group.type,
      currency: group.currency,
      settings: {
        simplifyDebts: group.settings?.simplifyDebts ?? true,
        allowSettlements: group.settings?.allowSettlements ?? true,
      },
    },
  });

  const onSubmit = async (values: UpdateGroupInput) => {
    try {
      await updateGroup({ id: group.id, ...values }).unwrap();
      toast({ title: "Settings saved", description: "Group settings updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-name">Group Name</Label>
            <Input id="settings-name" {...form.register("name")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.watch("type") ?? group.type}
                onValueChange={(v) => form.setValue("type", v as GroupType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.watch("currency") ?? group.currency}
                onValueChange={(v) => form.setValue("currency", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Simplify Debts</Label>
              <p className="text-xs text-muted-foreground">
                Minimize the number of transactions needed
              </p>
            </div>
            <Switch
              checked={form.watch("settings.simplifyDebts") ?? true}
              onCheckedChange={(v) =>
                form.setValue("settings.simplifyDebts", v)
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Allow Settlements</Label>
              <p className="text-xs text-muted-foreground">
                Members can record payments to each other
              </p>
            </div>
            <Switch
              checked={form.watch("settings.allowSettlements") ?? true}
              onCheckedChange={(v) =>
                form.setValue("settings.allowSettlements", v)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Settings
      </Button>
    </form>
  );
}

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.id as string;
  const currentUser = useAppSelector((s) => s.auth.user);
  const [page, setPage] = useState(1);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);
  const [settleDebt, setSettleDebt] = useState<DebtEdge | null>(null);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);

  const { data: groupData, isLoading: groupLoading } = useGetGroupQuery(groupId);
  const { data: expensesData, isLoading: expensesLoading } = useGetGroupExpensesQuery({
    groupId,
    page,
    limit: 20,
  });
  const { data: balancesData } = useGetGroupBalancesQuery(groupId);
  const { data: debtsData } = useGetSimplifiedDebtsQuery(groupId);

  const group = groupData;
  const expensesResult = expensesData as { data?: ExpenseWithDetails[]; pagination?: { page: number; totalPages: number; hasNext: boolean; hasPrev: boolean } } | ExpenseWithDetails[] | undefined;
  const expenses = Array.isArray(expensesResult) ? expensesResult : (expensesResult?.data ?? []);
  const pagination = Array.isArray(expensesResult) ? undefined : expensesResult?.pagination;
  const balances = Array.isArray(balancesData) ? balancesData : [];
  const simplifiedDebts = Array.isArray(debtsData) ? debtsData : [];

  const isAdmin = group?.members.some(
    (m) => m.userId === currentUser?.id && m.role === "admin"
  );

  const handleSettleUp = (debt: DebtEdge) => {
    setSettleDebt(debt);
    setSettleDialogOpen(true);
  };

  const handleEditExpense = (expense: ExpenseWithDetails) => {
    setEditingExpense(expense);
    setExpenseDialogOpen(true);
  };

  if (groupLoading) {
    return <PageSkeleton />;
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium">Group not found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The group you're looking for doesn't exist or you don't have access.
        </p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/groups">Back to Groups</Link>
        </Button>
      </div>
    );
  }

  const config = GROUP_TYPE_CONFIG[group.type] ?? GROUP_TYPE_CONFIG.other;
  const TypeIcon = config.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/groups">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {group.name}
              </h1>
              <Badge variant="secondary" className={config.color}>
                <TypeIcon className="mr-1 h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {group.members.length} member{group.members.length !== 1 && "s"}{" "}
              &middot; {group.currency}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="expenses">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="settle">Settle Up</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="gap-2"
              onClick={() => {
                setEditingExpense(null);
                setExpenseDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </div>

          {expensesLoading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <ExpenseList
              expenses={expenses}
              members={group.members}
              currency={group.currency}
              pagination={pagination}
              onPageChange={setPage}
              onEdit={handleEditExpense}
            />
          )}
        </TabsContent>

        <TabsContent value="balances">
          <BalanceCards
            balances={balances}
            simplifiedDebts={simplifiedDebts}
            currency={group.currency}
            onSettleUp={handleSettleUp}
          />
        </TabsContent>

        <TabsContent value="settle" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Simplified Debts</CardTitle>
            </CardHeader>
            <CardContent>
              {simplifiedDebts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm font-medium">All settled up!</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No outstanding debts in this group.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {simplifiedDebts.map((debt, idx) => (
                    <div
                      key={`${debt.from}-${debt.to}-${idx}`}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-red-100 text-red-700 text-xs">
                          {debt.fromName[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{debt.fromName}</span>
                          <span className="text-muted-foreground">
                            {" "}owes{" "}
                          </span>
                          <span className="font-medium">{debt.toName}</span>
                        </p>
                        <p className="text-xs font-semibold text-primary">
                          {formatCurrency(debt.amount, group.currency)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSettleUp(debt)}
                      >
                        Pay
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <MembersTab
            members={group.members}
            groupId={groupId}
            currentUserId={currentUser?.id ?? ""}
            isAdmin={!!isAdmin}
          />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab group={group} />
        </TabsContent>
      </Tabs>

      <AddExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={(open) => {
          setExpenseDialogOpen(open);
          if (!open) setEditingExpense(null);
        }}
        groupId={groupId}
        members={group.members}
        currency={group.currency}
        editingExpense={editingExpense}
      />

      <SettleUpDialog
        open={settleDialogOpen}
        onOpenChange={(open) => {
          setSettleDialogOpen(open);
          if (!open) setSettleDebt(null);
        }}
        groupId={groupId}
        currency={group.currency}
        debt={settleDebt}
      />
    </div>
  );
}
