"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Minus } from "lucide-react";

import {
  SUPPORTED_CURRENCIES,
  formatCurrency,
  splitEqually,
} from "@splitwise/shared";
import type {
  GroupMember,
  ExpenseWithDetails,
} from "@splitwise/shared";
import {
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
} from "@/store/api/expenseApi";
import { useGetCategoriesQuery } from "@/store/api/categoryApi";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  members: GroupMember[];
  currency: string;
  editingExpense?: ExpenseWithDetails | null;
}

const formSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.string().min(1),
  date: z.string().min(1),
  categoryId: z.string().optional(),
  splitType: z.enum(["equal", "percentage", "exact", "shares"]),
  payerId: z.string().min(1, "Select a payer"),
});

type FormValues = z.infer<typeof formSchema>;

interface SplitEntry {
  userId: string;
  name: string;
  included: boolean;
  value: number;
}

export function AddExpenseDialog({
  open,
  onOpenChange,
  groupId,
  members,
  currency,
  editingExpense,
}: AddExpenseDialogProps) {
  const { toast } = useToast();
  const currentUser = useAppSelector((s) => s.auth.user);
  const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();
  const [updateExpense, { isLoading: isUpdating }] = useUpdateExpenseMutation();
  const { data: categoriesData } = useGetCategoriesQuery();

  const categories = categoriesData ?? [];
  const isEditing = !!editingExpense;
  const isLoading = isCreating || isUpdating;

  const today = new Date().toISOString().split("T")[0]!;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: 0,
      currency,
      date: today,
      categoryId: "",
      splitType: "equal",
      payerId: currentUser?.id ?? "",
    },
  });

  const [splits, setSplits] = useState<SplitEntry[]>(() =>
    members.map((m) => ({
      userId: m.userId,
      name: m.user?.name ?? "Unknown",
      included: true,
      value: 0,
    }))
  );

  useEffect(() => {
    if (!open) return;

    if (editingExpense) {
      form.reset({
        description: editingExpense.description,
        amount: editingExpense.amount,
        currency: editingExpense.currency,
        date: new Date(editingExpense.date).toISOString().split("T")[0],
        categoryId: editingExpense.categoryId ?? "",
        splitType: editingExpense.splitType,
        payerId: editingExpense.payers[0]?.userId ?? currentUser?.id ?? "",
      });

      setSplits(
        members.map((m) => {
          const existingSplit = editingExpense.splits.find(
            (s) => s.userId === m.userId
          );
          return {
            userId: m.userId,
            name: m.user?.name ?? "Unknown",
            included: !!existingSplit,
            value:
              editingExpense.splitType === "percentage"
                ? existingSplit?.percentage ?? 0
                : editingExpense.splitType === "shares"
                  ? existingSplit?.shares ?? 0
                  : existingSplit?.amount ?? 0,
          };
        })
      );
    } else {
      form.reset({
        description: "",
        amount: 0,
        currency,
        date: today,
        categoryId: "",
        splitType: "equal",
        payerId: currentUser?.id ?? "",
      });
      setSplits(
        members.map((m) => ({
          userId: m.userId,
          name: m.user?.name ?? "Unknown",
          included: true,
          value: 0,
        }))
      );
    }
  }, [open, editingExpense, members, currency, currentUser?.id, form, today]);

  const splitType = form.watch("splitType");
  const amount = form.watch("amount") || 0;

  const includedSplits = splits.filter((s) => s.included);

  const splitSummary = useMemo(() => {
    if (splitType === "equal") {
      const count = includedSplits.length;
      if (count === 0) return { perPerson: 0, total: 0 };
      const per = amount / count;
      return { perPerson: per, total: amount };
    }
    if (splitType === "percentage") {
      const total = includedSplits.reduce((s, e) => s + e.value, 0);
      return { total, remaining: 100 - total };
    }
    if (splitType === "exact") {
      const total = includedSplits.reduce((s, e) => s + e.value, 0);
      return { total, remaining: amount - total };
    }
    if (splitType === "shares") {
      const totalShares = includedSplits.reduce((s, e) => s + e.value, 0);
      return { totalShares };
    }
    return {};
  }, [splitType, amount, includedSplits]);

  const toggleMember = (userId: string) => {
    setSplits((prev) =>
      prev.map((s) =>
        s.userId === userId ? { ...s, included: !s.included } : s
      )
    );
  };

  const updateSplitValue = (userId: string, value: number) => {
    setSplits((prev) =>
      prev.map((s) => (s.userId === userId ? { ...s, value } : s))
    );
  };

  const onSubmit = async (values: FormValues) => {
    const included = splits.filter((s) => s.included);
    if (included.length === 0) {
      toast({ title: "Error", description: "Select at least one member for the split.", variant: "destructive" });
      return;
    }

    let splitData: { userId: string; amount?: number; percentage?: number; shares?: number }[];

    if (values.splitType === "equal") {
      const amounts = splitEqually(values.amount, included.length);
      splitData = included.map((s, i) => ({
        userId: s.userId,
        amount: amounts[i],
      }));
    } else if (values.splitType === "percentage") {
      splitData = included.map((s) => ({
        userId: s.userId,
        percentage: s.value,
      }));
    } else if (values.splitType === "exact") {
      splitData = included.map((s) => ({
        userId: s.userId,
        amount: s.value,
      }));
    } else {
      splitData = included.map((s) => ({
        userId: s.userId,
        shares: s.value || 1,
      }));
    }

    const payload = {
      groupId,
      amount: values.amount,
      currency: values.currency,
      description: values.description,
      splitType: values.splitType,
      categoryId: values.categoryId || undefined,
      date: new Date(values.date).toISOString(),
      payers: [{ userId: values.payerId, amount: values.amount }],
      splits: splitData,
    };

    try {
      if (isEditing && editingExpense) {
        await updateExpense({ id: editingExpense.id, ...payload }).unwrap();
        toast({ title: "Expense updated", description: "Changes saved successfully." });
      } else {
        await createExpense(payload).unwrap();
        toast({ title: "Expense added", description: `"${values.description}" has been recorded.` });
      }
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Failed to save expense. Please try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the expense details below."
              : "Record a new expense for this group."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What was this expense for?"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.watch("currency")}
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
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                {...form.register("date")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.watch("categoryId") || "none"}
                onValueChange={(v) =>
                  form.setValue("categoryId", v === "none" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paid by</Label>
              <Select
                value={form.watch("payerId")}
                onValueChange={(v) => form.setValue("payerId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Who paid?" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.user?.name ?? "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Split Type</Label>
            <Tabs
              value={splitType}
              onValueChange={(v) =>
                form.setValue(
                  "splitType",
                  v as "equal" | "percentage" | "exact" | "shares"
                )
              }
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="equal">Equal</TabsTrigger>
                <TabsTrigger value="percentage">%</TabsTrigger>
                <TabsTrigger value="exact">Exact</TabsTrigger>
                <TabsTrigger value="shares">Shares</TabsTrigger>
              </TabsList>

              <ScrollArea className="mt-3 max-h-[200px]">
                <TabsContent value="equal" className="mt-0 space-y-1">
                  {splits.map((s) => (
                    <button
                      key={s.userId}
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors ${
                        s.included
                          ? "bg-primary/5 ring-1 ring-primary/20"
                          : "opacity-50 hover:opacity-75"
                      }`}
                      onClick={() => toggleMember(s.userId)}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {s.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm">{s.name}</span>
                      {s.included && amount > 0 && (
                        <span className="text-sm font-medium text-muted-foreground">
                          {formatCurrency(
                            amount / includedSplits.length,
                            form.watch("currency")
                          )}
                        </span>
                      )}
                    </button>
                  ))}
                </TabsContent>

                <TabsContent value="percentage" className="mt-0 space-y-1">
                  {splits
                    .filter((s) => s.included)
                    .map((s) => (
                      <div
                        key={s.userId}
                        className="flex items-center gap-3 rounded-md p-2"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">
                            {s.name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-sm">{s.name}</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            className="h-8 w-20 text-right"
                            value={s.value || ""}
                            onChange={(e) =>
                              updateSplitValue(s.userId, Number(e.target.value))
                            }
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                    ))}
                  <p className="px-2 text-xs text-muted-foreground">
                    Total:{" "}
                    <span
                      className={
                        (splitSummary as { total: number }).total === 100
                          ? "text-emerald-600 font-medium"
                          : "text-destructive font-medium"
                      }
                    >
                      {(splitSummary as { total: number }).total}%
                    </span>{" "}
                    / 100%
                  </p>
                </TabsContent>

                <TabsContent value="exact" className="mt-0 space-y-1">
                  {splits
                    .filter((s) => s.included)
                    .map((s) => (
                      <div
                        key={s.userId}
                        className="flex items-center gap-3 rounded-md p-2"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">
                            {s.name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-sm">{s.name}</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-8 w-24 text-right"
                          value={s.value || ""}
                          onChange={(e) =>
                            updateSplitValue(s.userId, Number(e.target.value))
                          }
                        />
                      </div>
                    ))}
                  <p className="px-2 text-xs text-muted-foreground">
                    Remaining:{" "}
                    <span
                      className={
                        Math.abs(
                          (splitSummary as { remaining: number }).remaining
                        ) < 0.01
                          ? "text-emerald-600 font-medium"
                          : "text-destructive font-medium"
                      }
                    >
                      {formatCurrency(
                        (splitSummary as { remaining: number }).remaining,
                        form.watch("currency")
                      )}
                    </span>
                  </p>
                </TabsContent>

                <TabsContent value="shares" className="mt-0 space-y-1">
                  {splits
                    .filter((s) => s.included)
                    .map((s) => (
                      <div
                        key={s.userId}
                        className="flex items-center gap-3 rounded-md p-2"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">
                            {s.name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-sm">{s.name}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              updateSplitValue(
                                s.userId,
                                Math.max(0, s.value - 1)
                              )
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            className="h-8 w-16 text-center"
                            value={s.value || ""}
                            onChange={(e) =>
                              updateSplitValue(
                                s.userId,
                                Number(e.target.value)
                              )
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              updateSplitValue(s.userId, s.value + 1)
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  {(splitSummary as { totalShares?: number }).totalShares !==
                    undefined && (
                    <p className="px-2 text-xs text-muted-foreground">
                      Total shares:{" "}
                      <span className="font-medium">
                        {
                          (splitSummary as { totalShares: number })
                            .totalShares
                        }
                      </span>
                    </p>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
