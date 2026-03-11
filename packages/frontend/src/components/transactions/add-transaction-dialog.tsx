"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

import { createTransactionSchema } from "@splitwise/shared";
import type { Transaction, CreateTransactionInput } from "@splitwise/shared";
import {
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
} from "@/store/api/transactionApi";
import { useGetCategoriesQuery } from "@/store/api/categoryApi";
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

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransaction?: Transaction | null;
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  editingTransaction,
}: AddTransactionDialogProps) {
  const { toast } = useToast();
  const [createTransaction, { isLoading: isCreating }] = useCreateTransactionMutation();
  const [updateTransaction, { isLoading: isUpdating }] = useUpdateTransactionMutation();
  const { data: categoriesData } = useGetCategoriesQuery();

  const categories = categoriesData ?? [];
  const isEditing = !!editingTransaction;
  const isLoading = isCreating || isUpdating;

  const today = new Date().toISOString().split("T")[0]!;

  const form = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: "expense",
      amount: 0,
      currency: "USD",
      description: "",
      categoryId: null,
      account: "",
      date: new Date().toISOString(),
    },
  });

  const txType = form.watch("type");

  useEffect(() => {
    if (!open) return;

    if (editingTransaction) {
      form.reset({
        type: editingTransaction.type,
        amount: editingTransaction.amount,
        currency: editingTransaction.currency,
        description: editingTransaction.description,
        categoryId: editingTransaction.categoryId ?? null,
        account: editingTransaction.account,
        date: new Date(editingTransaction.date).toISOString(),
      });
    } else {
      form.reset({
        type: "expense",
        amount: 0,
        currency: "USD",
        description: "",
        categoryId: null,
        account: "",
        date: new Date().toISOString(),
      });
    }
  }, [open, editingTransaction, form]);

  const onSubmit = async (values: CreateTransactionInput) => {
    try {
      const payload = { ...values, categoryId: values.categoryId ?? undefined };
      if (isEditing && editingTransaction) {
        await updateTransaction({ id: editingTransaction.id, ...payload }).unwrap();
        toast({ title: "Transaction updated", description: "Changes saved successfully." });
      } else {
        await createTransaction(payload).unwrap();
        toast({
          title: "Transaction added",
          description: `${values.type === "income" ? "Income" : "Expense"} of ${values.amount} recorded.`,
        });
      }
      onOpenChange(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to save transaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the transaction details below."
              : "Record a new income or expense."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Type Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => form.setValue("type", "income")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition-all ${
                txType === "income"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : "border-muted text-muted-foreground hover:border-muted-foreground/30"
              }`}
            >
              <ArrowUpCircle className="h-5 w-5" />
              Income
            </button>
            <button
              type="button"
              onClick={() => form.setValue("type", "expense")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition-all ${
                txType === "expense"
                  ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                  : "border-muted text-muted-foreground hover:border-muted-foreground/30"
              }`}
            >
              <ArrowDownCircle className="h-5 w-5" />
              Expense
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="tx-amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                $
              </span>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="h-14 pl-8 text-2xl font-bold"
                {...form.register("amount", { valueAsNumber: true })}
              />
            </div>
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="tx-description">Description</Label>
            <Input
              id="tx-description"
              placeholder="What was this for?"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.watch("categoryId") ?? "none"}
                onValueChange={(v) =>
                  form.setValue("categoryId", v === "none" ? null : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account */}
            <div className="space-y-2">
              <Label htmlFor="tx-account">Account</Label>
              <Input
                id="tx-account"
                placeholder="e.g. Bank, Cash, Credit Card"
                {...form.register("account")}
              />
              {form.formState.errors.account && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.account.message}
                </p>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="tx-date">Date</Label>
            <Input
              id="tx-date"
              type="date"
              defaultValue={
                editingTransaction
                  ? new Date(editingTransaction.date).toISOString().split("T")[0]
                  : today
              }
              onChange={(e) => {
                if (e.target.value) {
                  form.setValue("date", new Date(e.target.value).toISOString());
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={
                txType === "income"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : txType === "income" ? "Add Income" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
