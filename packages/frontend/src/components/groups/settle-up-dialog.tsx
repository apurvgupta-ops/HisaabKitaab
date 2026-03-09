"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowRight } from "lucide-react";

import { formatCurrency } from "@splitwise/shared";
import type { DebtEdge } from "@splitwise/shared";
import { useCreateSettlementMutation } from "@/store/api/settlementApi";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SettleUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  currency: string;
  debt?: DebtEdge | null;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "stripe", label: "Stripe" },
  { value: "razorpay", label: "Razorpay" },
  { value: "other", label: "Other" },
] as const;

const settleFormSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentMethod: z.string().optional(),
  note: z.string().max(500).optional(),
});

type SettleFormValues = z.infer<typeof settleFormSchema>;

export function SettleUpDialog({
  open,
  onOpenChange,
  groupId,
  currency,
  debt,
}: SettleUpDialogProps) {
  const { toast } = useToast();
  const currentUser = useAppSelector((s) => s.auth.user);
  const [createSettlement, { isLoading }] = useCreateSettlementMutation();

  const form = useForm<SettleFormValues>({
    resolver: zodResolver(settleFormSchema),
    defaultValues: {
      amount: debt?.amount ?? 0,
      paymentMethod: "cash",
      note: "",
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && debt) {
      form.reset({
        amount: debt.amount,
        paymentMethod: "cash",
        note: "",
      });
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: SettleFormValues) => {
    if (!debt) return;

    try {
      await createSettlement({
        groupId,
        fromUserId: debt.from,
        toUserId: debt.to,
        amount: values.amount,
        currency,
        paymentMethod: (values.paymentMethod as "cash" | "bank_transfer" | "upi" | "stripe" | "razorpay" | "other") || undefined,
        note: values.note || undefined,
      }).unwrap();

      toast({
        title: "Settlement recorded",
        description: `${debt.fromName} paid ${formatCurrency(values.amount, currency)} to ${debt.toName}.`,
      });
      onOpenChange(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to record settlement. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Settle Up</DialogTitle>
          <DialogDescription>
            Record a payment between group members.
          </DialogDescription>
        </DialogHeader>

        {debt && (
          <div className="flex items-center justify-center gap-4 rounded-lg bg-muted/50 p-4">
            <div className="flex flex-col items-center gap-1">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-red-100 text-red-700">
                  {debt.fromName[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">{debt.fromName}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-semibold text-primary">
                {formatCurrency(debt.amount, currency)}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-emerald-100 text-emerald-700">
                  {debt.toName[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">{debt.toName}</span>
            </div>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settle-amount">Amount</Label>
            <Input
              id="settle-amount"
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
            <Label>Payment Method</Label>
            <Select
              value={form.watch("paymentMethod") ?? "cash"}
              onValueChange={(v) => form.setValue("paymentMethod", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settle-note">Note (optional)</Label>
            <Input
              id="settle-note"
              placeholder="Add a note..."
              {...form.register("note")}
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
            <Button type="submit" disabled={isLoading || !debt}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
