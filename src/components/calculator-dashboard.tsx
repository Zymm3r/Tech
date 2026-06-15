"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  Download,
  Import,
  RefreshCcw,
  Settings2,
  Save,
  FileJson2,
  FileDown,
  FileSpreadsheet,
  FolderOpen,
  Undo2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsModal } from "@/components/settings-modal";
import { DEFAULT_CATALOG } from "@/lib/default-data";
import { APP_VERSION } from "@/lib/constants";
import { calculateBasePrice, calculateMultiplier, calculateFinalPrice, resolveTechnicianPrice, sortPricingPlans } from "@/lib/pricing-engine";
import { exportCurrentConfiguration, exportPdf, exportProjectXlsx, importProjectXlsx } from "@/components/export-utils";
import { Catalog, Multiplier, ProjectConfig, Technician } from "@/types";
import { formatNumber, formatTHB, formatTimestamp } from "@/lib/utils";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { loadCloudConfig, loadLocalCatalog, loadLocalHistory, loadLocalProjectConfig, saveCloudConfig, saveLocalCatalog, saveLocalHistory, saveLocalProjectConfig } from "@/lib/persistence";
import { loadCatalogFromSupabase } from "@/lib/supabase-catalog";
import { cn } from "@/lib/utils";

type LoadedSource = "default" | "local" | "cloud" | "Supabase DB";

function groupTechnicians(technicians: Technician[]) {
  return technicians.reduce<Record<string, Technician[]>>((acc, item) => {
    acc[item.group] ??= [];
    acc[item.group].push(item);
    return acc;
  }, {});
}

function groupMultipliers(multipliers: Multiplier[]) {
  return multipliers.reduce<Record<string, Multiplier[]>>((acc, item) => {
    acc[item.category] ??= [];
    acc[item.category].push(item);
    return acc;
  }, {});
}

function createSnapshot(projectConfig: ProjectConfig, catalog: Catalog | null) {
  return {
    projectConfig: {
      ...projectConfig,
      lastSavedAt: new Date().toISOString()
    },
    catalog
  };
}

export function CalculatorDashboard() {
  const store = useDashboardStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<LoadedSource>("default");
  const [importError, setImportError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<string>("ว่าง");
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const xlsxInputRef = useRef<HTMLInputElement | null>(null);

  const catalog = store.catalog ?? DEFAULT_CATALOG;
  const technicians = catalog.technicians.filter((item) => item.active);
  const multipliers = catalog.multipliers.filter((item) => item.active);

  const pricingPlans = useMemo(() => catalog.pricingPlans ?? DEFAULT_CATALOG.pricingPlans ?? [], [catalog.pricingPlans]);
  const uniquePlans = useMemo(() => {
    const plans = Array.from(new Set(pricingPlans.map(p => p.plan_id))).map(id => pricingPlans.find(p => p.plan_id === id)!);
    return sortPricingPlans(plans);
  }, [pricingPlans]);
  const selectedPricingPlanId = store.projectConfig.selectedPricingPlan || "high-profit";
  const selectedPricingPlanName = uniquePlans.find(p => p.plan_id === selectedPricingPlanId)?.plan_name || selectedPricingPlanId;

  const selectedTechnicians = useMemo(
    () => technicians.filter((item) => store.projectConfig.selectedTechnicianIds.includes(item.id)),
    [store.projectConfig.selectedTechnicianIds, technicians]
  );
  const selectedMultipliers = useMemo(
    () => multipliers.filter((item) => store.projectConfig.selectedMultiplierIds.includes(item.id)),
    [multipliers, store.projectConfig.selectedMultiplierIds]
  );

  const basePrice = calculateBasePrice(technicians, store.projectConfig.selectedTechnicianIds, selectedPricingPlanId, pricingPlans);
  const multiplierProduct = calculateMultiplier(multipliers, store.projectConfig.selectedMultiplierIds);
  const finalPrice = Math.round(calculateFinalPrice(basePrice, multiplierProduct));


  const formulaPreview = useMemo(() => {
    const resolvedPrices = selectedTechnicians.map(t => resolveTechnicianPrice(t, selectedPricingPlanId, pricingPlans, t.basePrice));
    const baseExpression = selectedTechnicians.length ? resolvedPrices.map((p) => formatNumber(p)).join(" + ") : "0";
    const multiplierExpression = selectedMultipliers.map((item) => item.multiplier.toFixed(1)).join(" × ");
    if (!selectedMultipliers.length) {
      return `(${baseExpression}) = ${formatNumber(basePrice)}`;
    }
    return `(${baseExpression}) × ${multiplierExpression} = ${formatNumber(finalPrice)}`;
  }, [basePrice, finalPrice, selectedMultipliers, selectedTechnicians, selectedPricingPlanId, pricingPlans]);

  // ── Hydration ──────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      try {
        const [localConfig, localCatalog, localHistory, cloudConfig] = await Promise.all([
          Promise.resolve(loadLocalProjectConfig()),
          Promise.resolve(loadLocalCatalog()),
          Promise.resolve(loadLocalHistory()),
          loadCloudConfig().catch(() => null)
        ]);

        if (!mounted) return;

        if (localHistory.length) {
          useDashboardStore.setState({ history: localHistory });
        }

        if (localConfig) {
          useDashboardStore.getState().hydrate(localConfig, localCatalog);
          setSource("local");
        }

        if (cloudConfig?.project_config) {
          useDashboardStore.getState().hydrate(cloudConfig.project_config, cloudConfig.catalog ?? localCatalog);
          setSource("cloud");
        }

        // Load catalog from Supabase DB (source of truth)
        const supabaseCatalog = await loadCatalogFromSupabase().catch(() => null);
        if (supabaseCatalog) {
          useDashboardStore.getState().setCatalog(supabaseCatalog, true);
          setSource("Supabase DB");
        } else if (!useDashboardStore.getState().catalog) {
          useDashboardStore.getState().setCatalog(DEFAULT_CATALOG, false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      saveLocalProjectConfig(store.projectConfig);
      saveLocalCatalog(store.catalog ?? DEFAULT_CATALOG);
      saveLocalHistory(store.history);
    }
  }, [loading, store.catalog, store.history, store.projectConfig]);

  // ── Handlers ───────────────────────────────────────────────────────

  function snapshotAnd(action: () => void) {
    store.pushSnapshot();
    action();
  }

  function handleTechnicianToggle(id: string, checked: boolean) {
    snapshotAnd(() => {
      const next = checked
        ? [...store.projectConfig.selectedTechnicianIds, id]
        : store.projectConfig.selectedTechnicianIds.filter((value) => value !== id);
      store.setSelectedTechnicianIds(next);
      store.touchSavedAt();
    });
  }

  function handleMultiplierToggle(id: string, checked: boolean) {
    snapshotAnd(() => {
      const next = checked
        ? [...store.projectConfig.selectedMultiplierIds, id]
        : store.projectConfig.selectedMultiplierIds.filter((value) => value !== id);
      store.setSelectedMultiplierIds(next);
      store.touchSavedAt();
    });
  }

  function handleProjectField(key: keyof ProjectConfig, value: string) {
    snapshotAnd(() => {
      store.setProjectField(key as keyof Omit<ProjectConfig, "version" | "lastSavedAt">, value);
      store.touchSavedAt();
    });
  }

  function handleSaveConfiguration() {
    const snapshot = createSnapshot(store.projectConfig, store.catalog);
    useDashboardStore.getState().hydrate(snapshot.projectConfig, snapshot.catalog);
    saveLocalProjectConfig(snapshot.projectConfig);
    saveLocalCatalog(snapshot.catalog ?? DEFAULT_CATALOG);
    saveLocalHistory(store.history);
    saveCloudConfig(snapshot.projectConfig, snapshot.catalog).catch(() => undefined);
    setSaveState(`บันทึกเมื่อ ${format(new Date(), "HH:mm:ss")}`);
  }

  function handleReset() {
    snapshotAnd(() => {
      store.reset();
      setSaveState("เริ่มใหม่แล้ว");
    });
  }

  function handleUndo() {
    store.undo();
    store.touchSavedAt();
    setSaveState("ย้อนกลับแล้ว");
  }

  // JSON export/import
  function handleExportJson() {
    exportCurrentConfiguration({
      catalog,
      projectConfig: {
        ...store.projectConfig,
        version: APP_VERSION,
        lastSavedAt: new Date().toISOString()
      }
    });
  }

  function handleImportJsonClick() {
    jsonInputRef.current?.click();
  }

  async function handleImportJsonFile(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<{ projectConfig: ProjectConfig; catalog: Catalog }>;
      if (!parsed.projectConfig || typeof parsed.projectConfig !== "object") {
        throw new Error("ไม่มีข้อมูล projectConfig");
      }
      const importedConfig = parsed.projectConfig;
      snapshotAnd(() => {
        store.importSnapshot(importedConfig);
        if (parsed.catalog) {
          store.setCatalog(parsed.catalog, false);
        }
      });
      setImportError(null);
      setSaveState(`นำเข้า ${file.name}`);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "ไฟล์ JSON ไม่ถูกต้อง");
    }
  }

  // XLSX export/import
  function handleExportXlsx() {
    exportProjectXlsx({
      catalog,
      projectConfig: {
        ...store.projectConfig,
        version: APP_VERSION,
        lastSavedAt: new Date().toISOString()
      }
    });
  }

  function handleImportXlsxClick() {
    xlsxInputRef.current?.click();
  }

  async function handleImportXlsxFile(file: File | null) {
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const imported = importProjectXlsx(arrayBuffer);
      if (!imported) {
        throw new Error("ไม่สามารถอ่านข้อมูลจากไฟล์ Excel ได้ (ต้องมีชีท 'Project Metadata' หรือ 'สรุปงาน')");
      }

      // Resolve multiplier IDs from names
      const multNames = imported.selectedMultiplierIds || [];
      const resolvedMultiplierIds = multipliers
        .filter(m => multNames.includes(m.name) || multNames.includes(m.id))
        .map(m => m.id);

      snapshotAnd(() => {
        store.importSnapshot({
          version: imported.version ?? store.projectConfig.version,
          customerName: imported.customerName ?? store.projectConfig.customerName,
          notes: imported.notes ?? store.projectConfig.notes,
          selectedTechnicianIds: imported.selectedTechnicianIds ?? store.projectConfig.selectedTechnicianIds,
          selectedMultiplierIds: resolvedMultiplierIds.length ? resolvedMultiplierIds : store.projectConfig.selectedMultiplierIds,
          selectedPricingPlan: imported.selectedPricingPlan ?? store.projectConfig.selectedPricingPlan,
          lastSavedAt: new Date().toISOString()
        });
      });
      setImportError(null);
      setSaveState(`นำเข้า ${file.name}`);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "ไฟล์ Excel ไม่ถูกต้อง");
    }
  }

  async function handleExportPdf() {
    await exportPdf({
      catalog,
      projectConfig: {
        ...store.projectConfig,
        version: APP_VERSION,
        lastSavedAt: new Date().toISOString()
      }
    });
  }

  async function handleReloadCatalog() {
    setLoading(true);
    try {
      const supabaseCatalog = await loadCatalogFromSupabase().catch(() => null);
      if (supabaseCatalog) {
        useDashboardStore.getState().setCatalog(supabaseCatalog, true);
        setSource("Supabase DB");
        setSaveState("โหลดข้อมูลจาก Supabase สำเร็จ");
      } else {
        setSaveState("ไม่พบข้อมูลจาก Supabase ใช้ค่าเริ่มต้น");
      }
    } finally {
      setLoading(false);
    }
  }

  const technicianGroups = groupTechnicians(technicians);
  const multiplierGroups = groupMultipliers(multipliers);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {/* Hidden file inputs */}
      <input
        ref={jsonInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => { handleImportJsonFile(event.target.files?.[0] ?? null); event.target.value = ""; }}
      />
      <input
        ref={xlsxInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(event) => { handleImportXlsxFile(event.target.files?.[0] ?? null); event.target.value = ""; }}
      />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      <div className="mx-auto flex max-w-[1680px] flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-glow backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1">ระบบคำนวณราคา</Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">เวอร์ชัน {APP_VERSION}</Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">แหล่งข้อมูล: {source}</Badge>
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">คำนวณราคา</h1>
                <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                  เลือกนายช่างที่ต้องการ เลือกตัวคูณความเสี่ยง และดาวน์โหลดใบเสนอราคาได้ทันที
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggle />
              <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                <Settings2 className="h-4 w-4" />
                ตั้งค่า
              </Button>
              <Button variant="outline" onClick={handleImportJsonClick}>
                <FolderOpen className="h-4 w-4" />
                เปิดโปรเจกต์ (.json)
              </Button>
              <Button variant="outline" onClick={handleExportJson}>
                <FileJson2 className="h-4 w-4" />
                บันทึกโปรเจกต์ (.json)
              </Button>
              <Button variant="outline" onClick={handleImportXlsxClick}>
                <FolderOpen className="h-4 w-4" />
                เปิดไฟล์ Excel
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">ชื่อลูกค้า</p>
              <Input
                value={store.projectConfig.customerName}
                onChange={(event) => handleProjectField("customerName", event.target.value)}
                placeholder="ชื่อลูกค้า"
                className="mt-2"
              />
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 md:col-span-2 xl:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">รายละเอียดงาน</p>
              <Textarea
                value={store.projectConfig.notes}
                onChange={(event) => handleProjectField("notes", event.target.value)}
                placeholder="ระบุรายละเอียดการทำงาน"
                className="mt-2 min-h-[88px] resize-none"
              />
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">บันทึกล่าสุด</p>
              <p className="mt-3 text-lg font-semibold">{formatTimestamp(store.projectConfig.lastSavedAt)}</p>
              <p className="text-sm text-muted-foreground">{saveState}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">ระบบการจัดเก็บ</p>
              <p className="mt-3 text-lg font-semibold"> Supabase DB </p>
              <p className="text-sm text-muted-foreground">ข้อมูลช่าง/ราคามาจาก Supabase DB</p>
            </div>
          </div>
        </header>

        {/* ── Error Banner ─────────────────────────────────────────── */}
        {importError ? (
          <Card className="border-destructive/40 bg-destructive/10">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm">{importError}</p>
            </CardContent>
          </Card>
        ) : null}

        {/* ── Main Grid ───────────────────────────────────────────── */}
        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.05fr_1fr]">

          {/* Column 1: Pricing Plan + Technicians */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader className="border-b border-border/70 bg-background/50">
                <CardTitle>แผนราคา</CardTitle>
                <CardDescription>เลือกกลุ่มแผนที่ต้องการใช้คำนวณ</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <select
                  value={selectedPricingPlanId}
                  onChange={(e) => handleProjectField("selectedPricingPlan", e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uniquePlans.map(p => (
                    <option key={p.plan_id} value={p.plan_id}>{p.plan_name}</option>
                  ))}
                </select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border/70 bg-background/50">
                <CardTitle>นายช่าง</CardTitle>
                <CardDescription>เลือกนายช่างที่ต้องการให้ปฏิบัติงานในโครงการนี้</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {Object.entries(technicianGroups).map(([group, items]) => (
                    <section key={group} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge className="rounded-full px-3 py-1">{group}</Badge>
                        <span className="text-sm text-muted-foreground">{items.length} คน</span>
                      </div>
                      <div className="grid gap-3">
                        {items.map((item) => {
                          const checked = store.projectConfig.selectedTechnicianIds.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              className={cn(
                                "flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition",
                                checked ? "border-primary/50 bg-primary/10" : "border-border bg-background/60 hover:bg-accent/50"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <Checkbox checked={checked} onCheckedChange={(value) => handleTechnicianToggle(item.id, value === true)} />
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-medium">{item.name}</p>
                                    <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
                                      พร้อมทำงาน
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{item.group}</p>
                                </div>
                              </div>
                              <p className="text-lg font-semibold">{formatTHB(resolveTechnicianPrice(item, selectedPricingPlanId, pricingPlans, item.basePrice))}</p>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Multipliers */}
          <Card className="flex h-full flex-col">
            <CardHeader className="border-b border-border/70 bg-background/50">
              <CardTitle>ตัวคูณ</CardTitle>
              <CardDescription>เลือกความเสี่ยงที่เกี่ยวข้อง (สามารถเลือกซ้อนกันได้)</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-6">
              <div className="space-y-6">
                {Object.entries(multiplierGroups).map(([category, items]) => (
                  <section key={category} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className="rounded-full px-3 py-1" variant="secondary">{category}</Badge>
                      <span className="text-sm text-muted-foreground">{items.length} รายการ</span>
                    </div>
                    <div className="grid gap-3">
                      {items.map((item) => {
                        const checked = store.projectConfig.selectedMultiplierIds.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className={cn(
                              "flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition",
                              checked ? "border-primary/50 bg-primary/10" : "border-border bg-background/60 hover:bg-accent/50"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <Checkbox checked={checked} onCheckedChange={(value) => handleMultiplierToggle(item.id, value === true)} />
                              <div className="space-y-1">
                                <p className="text-base font-medium">{item.name}</p>
                                <p className="text-sm text-muted-foreground">{item.category}</p>
                              </div>
                            </div>
                            <p className="text-lg font-semibold">× {item.multiplier.toFixed(1)}</p>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Column 3: Summary */}
          <Card className="sticky top-4 h-fit xl:sticky">
            <CardHeader className="border-b border-border/70 bg-background/50">
              <CardTitle>สรุปการคำนวณ</CardTitle>
              <CardDescription>ดูตัวอย่างสูตรการคำนวณแบบเรียลไทม์</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-4">
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">แผนราคา</p>
                  <p className="mt-2 text-lg font-semibold">{selectedPricingPlanName}</p>
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">ชื่อลูกค้า</p>
                  <p className="mt-2 text-lg font-semibold">{store.projectConfig.customerName || "-"}</p>
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">นายช่างที่เลือก</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedTechnicians.length ? (
                      selectedTechnicians.map((item) => (
                        <Badge key={item.id} variant="secondary" className="rounded-full px-3 py-1">{item.name} ({item.group})</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">ยังไม่ได้เลือกช่าง</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">ราคาเริ่มต้น</p>
                  <p className="mt-2 text-2xl font-semibold">{formatTHB(basePrice)}</p>
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">ตัวคูณที่ใช้</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedMultipliers.length ? (
                      selectedMultipliers.map((item) => (
                        <Badge key={item.id} className="rounded-full px-3 py-1">{item.name} × {item.multiplier.toFixed(1)}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">ยังไม่ได้เลือกตัวคูณ</span>
                    )}
                  </div>
                  {selectedMultipliers.length > 0 && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      ตัวคูณสุทธิ: <span className="font-semibold text-foreground">{multiplierProduct.toFixed(2)}</span>
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">รายละเอียดงาน</p>
                  <p className="mt-2 text-lg font-semibold">{store.projectConfig.notes || "-"}</p>
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">วัน-เวลาที่สร้าง</p>
                  <p className="mt-2 text-lg font-semibold">{formatTimestamp(store.projectConfig.lastSavedAt)}</p>
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">สูตรคำนวณ</p>
                  <p className="mt-3 rounded-xl bg-muted/60 p-4 text-sm leading-6">{formulaPreview}</p>
                </div>
              </div>

              <Separator />

              <div className="rounded-[1.5rem] border border-primary/25 bg-primary/10 p-5">
                <p className="text-sm font-medium text-primary">ราคารวม</p>
                <p className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">{formatTHB(finalPrice)}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedTechnicians.length} คน · {selectedMultipliers.length} ตัวคูณ
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleUndo}>
                  <Undo2 className="h-4 w-4" />
                  ย้อนกลับ
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCcw className="h-4 w-4" />
                  เริ่มใหม่
                </Button>
                <Button onClick={handleSaveConfiguration} className="col-span-2">
                  <Save className="h-4 w-4" />
                  บันทึก
                </Button>
                <Button variant="outline" onClick={handleExportXlsx}>
                  <FileSpreadsheet className="h-4 w-4" />
                  ดาวน์โหลด Excel
                </Button>
                <Button onClick={handleExportPdf}>
                  <Download className="h-4 w-4" />
                  ดาวน์โหลด PDF
                </Button>
              </div>

              <div className="grid gap-3 rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>แหล่งข้อมูล</span>
                  <span className="font-medium text-foreground">{source}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>บันทึกล่าสุดในเครื่อง</span>
                  <span className="font-medium text-foreground">{formatTimestamp(store.projectConfig.lastSavedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>เวอร์ชัน</span>
                  <span className="font-medium text-foreground">{store.projectConfig.version}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
