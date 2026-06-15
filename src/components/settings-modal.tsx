"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { Catalog } from "@/types";
import { getSupabaseClient } from "@/lib/persistence";
import { loadCatalogFromSupabase } from "@/lib/supabase-catalog";
import { useState } from "react";

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

  const [isSaving, setIsSaving] = useState(false);

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

  async function onSubmit(values: FormValues) {
    const client = getSupabaseClient();
    if (!client) {
      alert("ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
      return;
    }

    setIsSaving(true);
    try {
      const techPayload = values.technicians.map((t) => ({
        id: t.id,
        name: t.name,
        group: t.group,
        base_price: Number(t.basePrice),
        active: Boolean(t.active)
      }));
      
      const { error: techError } = await client.from("technicians").upsert(techPayload, { onConflict: "id" });
      if (techError) throw techError;

      const multPayload = values.multipliers.map((m) => ({
        id: m.id,
        category: m.category,
        name: m.name,
        multiplier: Number(m.multiplier),
        active: Boolean(m.active)
      }));

      const { error: multError } = await client.from("multipliers").upsert(multPayload, { onConflict: "id" });
      if (multError) throw multError;

      const refreshedCatalog = await loadCatalogFromSupabase();
      if (!refreshedCatalog) throw new Error("โหลดข้อมูลหลังจากบันทึกไม่สำเร็จ");

      setCatalog(refreshedCatalog, false);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
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

          <div className="flex flex-col sm:flex-row justify-between gap-4 border-t border-border pt-6 mt-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => technicians.append({ id: crypto.randomUUID(), name: "", group: "Group A", basePrice: 0, active: true })}
                disabled={isSaving}
              >
                <Plus className="mr-2 h-4 w-4" /> เพิ่มช่าง
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => multipliers.append({ id: crypto.randomUUID(), name: "", category: "ทั่วไป", multiplier: 1, active: true })}
                disabled={isSaving}
              >
                <Plus className="mr-2 h-4 w-4" /> เพิ่มตัวคูณ
              </Button>
            </div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "กำลังบันทึก..." : "บันทึกลงฐานข้อมูล"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
