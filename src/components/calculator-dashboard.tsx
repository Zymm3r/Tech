"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  Download,
  History,
  Import,
  Loader2,
  MoonStar,
  RefreshCcw,
  Settings2,
  Save,
  Shield,
  FileJson2,
  FileDown,
  Files,
  Undo2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsModal } from "@/components/settings-modal";
import { DEFAULT_CATALOG } from "@/lib/default-data";
import { APP_VERSION } from "@/lib/constants";
import { calculateBasePrice, calculateMultiplierProduct } from "@/lib/calculations";
import { exportCurrentConfiguration, exportPdf, downloadWorkbook } from "@/components/export-utils";
import { Catalog, Multiplier, ProjectConfig, Technician } from "@/types";
import { formatNumber, formatTHB, formatTimestamp } from "@/lib/utils";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { createTemplateWorkbook, catalogFromWorkbook, readWorkbookFromUrl } from "@/lib/spreadsheet";
import { loadCloudConfig, loadLocalCatalog, loadLocalHistory, loadLocalProjectConfig, saveCloudConfig, saveLocalCatalog, saveLocalHistory, saveLocalProjectConfig } from "@/lib/persistence";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { downloadJson } from "@/components/export-utils";

type LoadedSource = "default" | "local" | "spreadsheet" | "cloud";

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
  const [saveState, setSaveState] = useState<string>("Idle");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const catalog = store.catalog ?? DEFAULT_CATALOG;
  const technicians = catalog.technicians.filter((item) => item.active);
  const multipliers = catalog.multipliers.filter((item) => item.active);

  const selectedTechnicians = useMemo(
    () => technicians.filter((item) => store.projectConfig.selectedTechnicianIds.includes(item.id)),
    [store.projectConfig.selectedTechnicianIds, technicians]
  );
  const selectedMultipliers = useMemo(
    () => multipliers.filter((item) => store.projectConfig.selectedMultiplierIds.includes(item.id)),
    [multipliers, store.projectConfig.selectedMultiplierIds]
  );

  const basePrice = calculateBasePrice(technicians, store.projectConfig.selectedTechnicianIds);
  const multiplierProduct = calculateMultiplierProduct(multipliers, store.projectConfig.selectedMultiplierIds);
  const finalPrice = Math.round(basePrice * multiplierProduct);

  const formulaPreview = useMemo(() => {
    const baseExpression = selectedTechnicians.length ? selectedTechnicians.map((item) => formatNumber(item.basePrice)).join(" + ") : "0";
    const multiplierExpression = selectedMultipliers.map((item) => item.multiplier.toFixed(1)).join(" × ");
    if (!selectedMultipliers.length) {
      return `(${baseExpression}) = ${formatNumber(basePrice)}`;
    }
    return `(${baseExpression}) × ${multiplierExpression} = ${formatNumber(finalPrice)}`;
  }, [basePrice, finalPrice, selectedMultipliers, selectedTechnicians]);

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

        try {
          const [technicianBook, multiplierBook] = await Promise.all([
            readWorkbookFromUrl("/data/technicians.xlsx"),
            readWorkbookFromUrl("/data/multipliers.xlsx")
          ]);
          const spreadsheetCatalog = catalogFromWorkbook(technicianBook, multiplierBook);
          if (spreadsheetCatalog) {
            useDashboardStore.getState().setCatalog(spreadsheetCatalog, true);
            setSource("spreadsheet");
          }
        } catch {
          if (!useDashboardStore.getState().catalog) {
            useDashboardStore.getState().setCatalog(DEFAULT_CATALOG, false);
          }
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

  function handleProjectField(key: keyof Omit<ProjectConfig, "version" | "lastSavedAt">, value: string) {
    snapshotAnd(() => {
      store.setProjectField(key, value);
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
    setSaveState(`Saved ${format(new Date(), "HH:mm:ss")}`);
  }

  function handleReset() {
    snapshotAnd(() => {
      store.reset();
      setSaveState("Reset configuration");
    });
  }

  function handleUndo() {
    store.undo();
    store.touchSavedAt();
    setSaveState("Undo applied");
  }

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

  function handleTemplateDownload(kind: "technician" | "multiplier") {
    const workbook = createTemplateWorkbook(catalog);
    if (kind === "technician") {
      const blank = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(blank, workbook.Sheets.Technicians, "Technicians");
      downloadWorkbook("Technician Template.xlsx", blank);
      return;
    }
    const blank = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(blank, workbook.Sheets.Multipliers, "Multipliers");
    downloadWorkbook("Multiplier Template.xlsx", blank);
  }

  function handleExportPdf() {
    exportPdf({
      catalog,
      projectConfig: {
        ...store.projectConfig,
        version: APP_VERSION,
        lastSavedAt: new Date().toISOString()
      }
    });
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<{ projectConfig: ProjectConfig; catalog: Catalog }>;
      if (!parsed.projectConfig || typeof parsed.projectConfig !== "object") {
        throw new Error("Missing projectConfig");
      }
      const importedConfig = parsed.projectConfig;
      snapshotAnd(() => {
        store.importSnapshot(importedConfig);
        if (parsed.catalog) {
          store.setCatalog(parsed.catalog, false);
        }
      });
      setImportError(null);
      setSaveState(`Imported ${file.name}`);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Invalid configuration file");
    }
  }

  async function handleHardReload() {
    setLoading(true);
    try {
      const [technicianBook, multiplierBook] = await Promise.all([
        readWorkbookFromUrl("/data/technicians.xlsx"),
        readWorkbookFromUrl("/data/multipliers.xlsx")
      ]);
      const spreadsheetCatalog = catalogFromWorkbook(technicianBook, multiplierBook);
      if (spreadsheetCatalog) {
        useDashboardStore.getState().setCatalog(spreadsheetCatalog, true);
      }
    } finally {
      setLoading(false);
    }
  }

  const technicianGroups = groupTechnicians(technicians);
  const multiplierGroups = groupMultipliers(multipliers);

  return (
    <div className="min-h-screen">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => handleImportFile(event.target.files?.[0] ?? null)}
      />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
        <header className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-glow backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  Production Dashboard
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Version {APP_VERSION}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Source: {source}
                </Badge>
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Technician Pricing Dashboard</h1>
                <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                  Select technicians, stack risk multipliers, and export a quotation instantly. Spreadsheet files in
                  /public/data stay authoritative when present.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggle />
              <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                <Settings2 className="h-4 w-4" />
                Settings
              </Button>
              <Button variant="outline" onClick={handleImportClick}>
                <Import className="h-4 w-4" />
                Import Configuration
              </Button>
              <Button variant="outline" onClick={handleExportJson}>
                <FileJson2 className="h-4 w-4" />
                Export Current Configuration
              </Button>
              <Button onClick={handleExportPdf}>
                <Download className="h-4 w-4" />
                Export Result PDF
              </Button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Project Name</p>
              <Input
                value={store.projectConfig.projectName}
                onChange={(event) => handleProjectField("projectName", event.target.value)}
                placeholder="Project name"
                className="mt-2"
              />
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer Name</p>
              <Input
                value={store.projectConfig.customerName}
                onChange={(event) => handleProjectField("customerName", event.target.value)}
                placeholder="Customer name"
                className="mt-2"
              />
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 md:col-span-2 xl:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
              <Textarea
                value={store.projectConfig.notes}
                onChange={(event) => handleProjectField("notes", event.target.value)}
                placeholder="Quotation notes for the PDF"
                className="mt-2 min-h-[88px] resize-none"
              />
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Saved</p>
              <p className="mt-3 text-lg font-semibold">{formatTimestamp(store.projectConfig.lastSavedAt)}</p>
              <p className="text-sm text-muted-foreground">{saveState}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Persistence</p>
              <p className="mt-3 text-lg font-semibold">Local + optional Supabase</p>
              <p className="text-sm text-muted-foreground">Cloud sync activates when env vars are set.</p>
            </div>
          </div>
        </header>

        {importError ? (
          <Card className="border-destructive/40 bg-destructive/10">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm">{importError}</p>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.05fr_1fr]">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/70 bg-background/50">
              <CardTitle>Technician Selection</CardTitle>
              <CardDescription>Touch-friendly checklist pulled from the workbook source.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[62vh]">
                <div className="space-y-6 p-6">
                  {Object.entries(technicianGroups).map(([group, items]) => (
                    <section key={group} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge className="rounded-full px-3 py-1">{group}</Badge>
                        <span className="text-sm text-muted-foreground">{items.length} technicians</span>
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
                                      Active
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{item.group}</p>
                                </div>
                              </div>
                              <p className="text-lg font-semibold">{formatTHB(item.basePrice)}</p>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/70 bg-background/50">
              <CardTitle>Risk Multiplier Selection</CardTitle>
              <CardDescription>Multiple selections stack automatically.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[62vh]">
                <div className="space-y-6 p-6">
                  {Object.entries(multiplierGroups).map(([category, items]) => (
                    <section key={category} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge className="rounded-full px-3 py-1" variant="secondary">
                          {category}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{items.length} options</span>
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
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="sticky top-4 h-fit overflow-hidden xl:sticky">
            <CardHeader className="border-b border-border/70 bg-background/50">
              <CardTitle>Live Calculation Summary</CardTitle>
              <CardDescription>Formula preview updates on every selection.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-4">
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected Technicians</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedTechnicians.length ? (
                      selectedTechnicians.map((item) => (
                        <Badge key={item.id} variant="secondary" className="rounded-full px-3 py-1">
                          {item.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No technicians selected.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Base Price</p>
                  <p className="mt-2 text-2xl font-semibold">{formatTHB(basePrice)}</p>
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Applied Multipliers</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedMultipliers.length ? (
                      selectedMultipliers.map((item) => (
                        <Badge key={item.id} className="rounded-full px-3 py-1">
                          {item.name} × {item.multiplier.toFixed(1)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No multipliers selected.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Formula Preview</p>
                  <p className="mt-3 rounded-xl bg-muted/60 p-4 text-sm leading-6">{formulaPreview}</p>
                </div>
              </div>

              <Separator />

              <div className="rounded-[1.5rem] border border-primary/25 bg-primary/10 p-5">
                <p className="text-sm font-medium text-primary">Final Price</p>
                <p className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">{formatTHB(finalPrice)}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedTechnicians.length} technicians · {selectedMultipliers.length} multipliers
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleUndo}>
                  <Undo2 className="h-4 w-4" />
                  Undo
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCcw className="h-4 w-4" />
                  Reset
                </Button>
                <Button onClick={handleSaveConfiguration}>
                  <Save className="h-4 w-4" />
                  Save
                </Button>
                <Button variant="outline" onClick={handleHardReload}>
                  <Files className="h-4 w-4" />
                  Reload Sheets
                </Button>
                <Button variant="outline" onClick={() => handleTemplateDownload("technician")}>
                  <FileDown className="h-4 w-4" />
                  Technician Template.xlsx
                </Button>
                <Button variant="outline" onClick={() => handleTemplateDownload("multiplier")}>
                  <FileDown className="h-4 w-4" />
                  Multiplier Template.xlsx
                </Button>
              </div>

              <div className="grid gap-3 rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Spreadsheet source</span>
                  <span className="font-medium text-foreground">{source}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Local saved at</span>
                  <span className="font-medium text-foreground">{formatTimestamp(store.projectConfig.lastSavedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Version</span>
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
