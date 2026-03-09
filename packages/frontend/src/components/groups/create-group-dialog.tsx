"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { createGroupSchema, SUPPORTED_CURRENCIES } from "@splitwise/shared";
import type { CreateGroupInput } from "@splitwise/shared";
import { useCreateGroupMutation } from "@/store/api/groupApi";
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
import { Switch } from "@/components/ui/switch";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GROUP_TYPES = [
  { value: "trip", label: "Trip" },
  { value: "home", label: "Home" },
  { value: "couple", label: "Couple" },
  { value: "project", label: "Project" },
  { value: "other", label: "Other" },
] as const;

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const { toast } = useToast();
  const [createGroup, { isLoading }] = useCreateGroupMutation();

  const form = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      type: "other",
      currency: "USD",
      settings: {
        simplifyDebts: true,
        defaultSplitType: "equal",
        allowSettlements: true,
      },
    },
  });

  const onSubmit = async (values: CreateGroupInput) => {
    try {
      await createGroup({
        name: values.name,
        type: values.type,
        currency: values.currency,
      }).unwrap();

      toast({ title: "Group created", description: `"${values.name}" has been created successfully.` });
      form.reset();
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Failed to create group. Please try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription>
            Set up a new group to start splitting expenses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              placeholder="e.g. Weekend Trip, Roommates"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(val) =>
                  form.setValue("type", val as CreateGroupInput["type"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
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
                value={form.watch("currency")}
                onValueChange={(val) => form.setValue("currency", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
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

          <div className="space-y-4 rounded-lg border p-4">
            <h4 className="text-sm font-medium">Settings</h4>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="simplifyDebts" className="text-sm">
                  Simplify Debts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Minimize the number of transactions needed
                </p>
              </div>
              <Switch
                id="simplifyDebts"
                checked={form.watch("settings.simplifyDebts") ?? true}
                onCheckedChange={(val) =>
                  form.setValue("settings.simplifyDebts", val)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allowSettlements" className="text-sm">
                  Allow Settlements
                </Label>
                <p className="text-xs text-muted-foreground">
                  Members can record payments to each other
                </p>
              </div>
              <Switch
                id="allowSettlements"
                checked={form.watch("settings.allowSettlements") ?? true}
                onCheckedChange={(val) =>
                  form.setValue("settings.allowSettlements", val)
                }
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
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
