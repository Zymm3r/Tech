"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { Catalog } from "@/types";
import { saveLocalCatalog } from "@/lib/persistence";

type FormValues = {
  technicians: Catalog["technicians"];
  multipliers: Catalog["multipliers"];
};

export function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const catalog = useDashboardStore((state) => state.catalog);
  const setCatalog = useDashboardStore((state) => state.setCatalog);
  
  const uniqueGroups = Array.from(new Set([
    ...(catalog?.pricingPlans?.map(p => p.group) || []),
    ...(catalog?.technicians?.map(t => t.group) || []),
    "Group A", "Group B", "Group C"
  ])).filter(Boolean);

  const form = useForm<FormValues>({
    defaultValues: {
      technicians: catalog?.technicians ?? [],
      multipliers: catalog?.multipliers ?? []
    }
  });

  const technicians = useFieldArray({ control: form.control, name: "technicians" });
  const multipliers = useFieldArray({ control: form.control, name: "multipliers" });

  useEffect(() => {
    form.reset({
      technicians: catalog?.technicians ?? [],
      multipliers: catalog?.multipliers ?? []
    });
  }, [catalog, form]);

  function onSubmit(values: FormValues) {
    const nextCatalog: Catalog = {
      ...catalog,
      technicians: values.technicians.map((item) => ({
        ...item,
        basePrice: Number(item.basePrice),
        active: Boolean(item.active)
      })),
      multipliers: values.multipliers.map((item) => ({
        ...item,
        multiplier: Number(item.multiplier),
        active: Boolean(item.active)
      }))
    };
    setCatalog(nextCatalog, false);
    saveLocalCatalog(nextCatalog);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>ตั้งค่า</DialogTitle>
          <DialogDescription>ปรับปรุงข้อมูลสำรอง (Fallback) ของช่างและตัวคูณสำหรับเบราว์เซอร์นี้</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-base font-semibold">ช่าง</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {technicians.fields.map((field, index) => (
                <div key={field.id} className="rounded-2xl border border-border p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>ชื่อ</Label>
                      <Input {...form.register(`technicians.${index}.name` as const)} />
                    </div>
                    <div className="space-y-2">
                      <Label>กลุ่ม</Label>
                      <select
                        {...form.register(`technicians.${index}.group` as const)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {uniqueGroups.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>ราคา</Label>
                      <Input type="number" {...form.register(`technicians.${index}.basePrice` as const, { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>พร้อมทำงาน</Label>
                      <input type="checkbox" className="ml-2 h-5 w-5" {...form.register(`technicians.${index}.active` as const)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-base font-semibold">ตัวคูณ</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {multipliers.fields.map((field, index) => (
                <div key={field.id} className="rounded-2xl border border-border p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>ชื่อ</Label>
                      <Input {...form.register(`multipliers.${index}.name` as const)} />
                    </div>
                    <div className="space-y-2">
                      <Label>หมวดหมู่</Label>
                      <Input {...form.register(`multipliers.${index}.category` as const)} />
                    </div>
                    <div className="space-y-2">
                      <Label>ตัวคูณ</Label>
                      <Input type="number" step="0.1" {...form.register(`multipliers.${index}.multiplier` as const, { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>พร้อมทำงาน</Label>
                      <input type="checkbox" className="ml-2 h-5 w-5" {...form.register(`multipliers.${index}.active` as const)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              เริ่มใหม่
            </Button>
            <Button type="submit">บันทึกการตั้งค่า</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
