"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { createBudgetSchema } from "@splitwise/shared";
import type { CreateBudgetInput, BudgetWithProgress } from "@splitwise/shared";
import {
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
} from "@/store/api/budgetApi";
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
import { Slider } from "@/components/ui/slider";

interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBudget?: BudgetWithProgress | null;
}

export function CreateBudgetDialog({
  open,
  onOpenChange,
  editingBudget,
}: CreateBudgetDialogProps) {
  const { toast } = useToast();
  const [createBudget, { isLoading: isCreating }] = useCreateBudgetMutation();
  const [updateBudget, { isLoading: isUpdating }] = useUpdateBudgetMutation();
  const { data: categoriesData } = useGetCategoriesQuery();

  const categories = categoriesData?.data ?? [];
  const isEditing = !!editingBudget;
  const isLoading = isCreating || isUpdating;

  const today = new Date().toISOString().split("T")[0]!;

  const form = useForm<CreateBudgetInput>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: {
      categoryId: null,
      limitAmount: 0,
      period: "monthly",
      alertThreshold: 0.8,
      startDate: new Date().toISOString(),
      endDate: null,
    },
  });

  const alertThreshold = form.watch("alertThreshold") ?? 0.8;

  useEffect(() => {
    if (!open) return;

    if (editingBudget) {
      form.reset({
        categoryId: editingBudget.categoryId ?? null,
        limitAmount: editingBudget.limitAmount,
        period: editingBudget.period,
        alertThreshold: editingBudget.alertThreshold,
        startDate: new Date(editingBudget.startDate).toISOString(),
        endDate: editingBudget.endDate
          ? new Date(editingBudget.endDate).toISOString()
          : null,
      });
    } else {
      form.reset({
        categoryId: null,
        limitAmount: 0,
        period: "monthly",
        alertThreshold: 0.8,
        startDate: new Date().toISOString(),
        endDate: null,
      });
    }
  }, [open, editingBudget, form]);

  const onSubmit = async (values: CreateBudgetInput) => {
    try {
      if (isEditing && editingBudget) {
        await updateBudget({
          id: editingBudget.id,
          categoryId: values.categoryId ?? undefined,
          limitAmount: values.limitAmount,
          period: values.period,
          alertThreshold: values.alertThreshold,
          endDate: values.endDate ?? undefined,
        }).unwrap();
        toast({ title: "Budget updated", description: "Changes saved successfully." });
      } else {
        await createBudget({
          categoryId: values.categoryId ?? undefined,
          limitAmount: values.limitAmount,
          period: values.period,
          alertThreshold: values.alertThreshold,
          startDate: values.startDate ?? new Date().toISOString(),
          endDate: values.endDate ?? undefined,
        }).unwrap();
        toast({ title: "Budget created", description: "Your budget is now active." });
      }
      onOpenChange(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to save budget. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Budget" : "Create Budget"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your budget settings."
              : "Set a spending limit for a category."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                <SelectItem value="none">Overall (All Categories)</SelectItem>
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

          {/* Limit Amount */}
          <div className="space-y-2">
            <Label htmlFor="budget-limit">Limit Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                $
              </span>
              <Input
                id="budget-limit"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="h-12 pl-8 text-xl font-bold"
                {...form.register("limitAmount", { valueAsNumber: true })}
              />
            </div>
            {form.formState.errors.limitAmount && (
              <p className="text-sm text-destructive">
                {form.formState.errors.limitAmount.message}
              </p>
            )}
          </div>

          {/* Period */}
          <div className="space-y-2">
            <Label>Period</Label>
            <Select
              value={form.watch("period")}
              onValueChange={(v) =>
                form.setValue("period", v as "weekly" | "monthly" | "yearly")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Alert Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Alert Threshold</Label>
              <span className="text-sm font-medium text-muted-foreground">
                {Math.round(alertThreshold * 100)}%
              </span>
            </div>
            <Slider
              value={[alertThreshold * 100]}
              onValueChange={([val]) => form.setValue("alertThreshold", (val ?? 80) / 100)}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              You&apos;ll get an alert when spending reaches {Math.round(alertThreshold * 100)}% of the limit.
            </p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="budget-start">Start Date</Label>
              <Input
                id="budget-start"
                type="date"
                defaultValue={
                  editingBudget
                    ? new Date(editingBudget.startDate).toISOString().split("T")[0]
                    : today
                }
                onChange={(e) => {
                  if (e.target.value) {
                    form.setValue("startDate", new Date(e.target.value).toISOString());
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget-end">End Date (optional)</Label>
              <Input
                id="budget-end"
                type="date"
                defaultValue={
                  editingBudget?.endDate
                    ? new Date(editingBudget.endDate).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) => {
                  form.setValue(
                    "endDate",
                    e.target.value ? new Date(e.target.value).toISOString() : null
                  );
                }}
              />
            </div>
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
              {isEditing ? "Save Changes" : "Create Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
