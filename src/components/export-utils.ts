"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Catalog, ProjectConfig } from "@/types";
import { calculateBasePrice, calculateMultiplier, calculateFinalPrice, resolveTechnicianPrice } from "@/lib/pricing-engine";
import { formatTHB } from "@/lib/utils";
import { NotoSansThaiBase64 } from "@/lib/fonts";

type ResultContext = {
  catalog: Catalog;
  projectConfig: ProjectConfig;
};

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, fileName);
}

export function downloadWorkbook(fileName: string, workbook: XLSX.WorkBook) {
  const array = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([array], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  downloadBlob(blob, fileName);
}

export function createConfigurationExport({ catalog, projectConfig }: ResultContext) {
  return {
    version: projectConfig.version,
    exportedAt: new Date().toISOString(),
    projectConfig,
    catalog
  };
}

export function exportCurrentConfiguration(context: ResultContext) {
  const payload = createConfigurationExport(context);
  downloadJson(`project-${format(new Date(), "yyyy-MM-dd")}.json`, payload);
}

// ── XLSX Project Export ──────────────────────────────────────────────

export function exportProjectXlsx(context: ResultContext) {
  const { catalog, projectConfig } = context;
  const planId = projectConfig.selectedPricingPlan || "high-profit";
  const plans = catalog.pricingPlans || [];
  const planName = plans.find(p => p.plan_id === planId)?.plan_name || planId;

  const selectedTechnicians = catalog.technicians.filter(t => projectConfig.selectedTechnicianIds.includes(t.id));
  const selectedMultipliers = catalog.multipliers.filter(m => projectConfig.selectedMultiplierIds.includes(m.id));
  const basePrice = calculateBasePrice(catalog.technicians, projectConfig.selectedTechnicianIds, planId, plans);
  const multiplierProduct = calculateMultiplier(catalog.multipliers, projectConfig.selectedMultiplierIds);
  const finalPrice = Math.round(calculateFinalPrice(basePrice, multiplierProduct));

  // Sheet 1: สรุปงาน
  const summarySheet = XLSX.utils.json_to_sheet([{
    project_name: projectConfig.projectName || "",
    customer_name: projectConfig.customerName || "",
    pricing_plan: planId,
    pricing_plan_name: planName,
    base_price: basePrice,
    final_price: finalPrice,
    notes: projectConfig.notes || "",
    created_at: new Date().toISOString()
  }]);

  // Sheet 2: ช่าง
  const techSheet = XLSX.utils.json_to_sheet(
    selectedTechnicians.map(t => ({
      technician_id: t.id,
      technician_name: t.name,
      group: t.group,
      resolved_price: resolveTechnicianPrice(t, planId, plans, t.basePrice)
    }))
  );

  // Sheet 3: ตัวคูณ
  const multSheet = XLSX.utils.json_to_sheet(
    selectedMultipliers.map(m => ({
      category: m.category,
      multiplier_name: m.name,
      multiplier_value: m.multiplier
    }))
  );

  // Sheet 4: สูตรคำนวณ
  const resolvedPrices = selectedTechnicians.map(t => resolveTechnicianPrice(t, planId, plans, t.basePrice));
  const priceBreakdown = selectedTechnicians.map((t, i) => `${t.name}: ${resolvedPrices[i]}`).join(", ");
  const multiplierBreakdown = selectedMultipliers.map(m => `${m.name}: ×${m.multiplier.toFixed(1)}`).join(", ");
  const formulaSheet = XLSX.utils.json_to_sheet([{
    pricing_plan: planId,
    pricing_plan_name: planName,
    price_breakdown: priceBreakdown,
    base_price: basePrice,
    multiplier_breakdown: multiplierBreakdown,
    multiplier_product: multiplierProduct,
    final_price: finalPrice
  }]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Project Metadata");
  XLSX.utils.book_append_sheet(workbook, techSheet, "Selected Technicians");
  XLSX.utils.book_append_sheet(workbook, multSheet, "Selected Multipliers");
  XLSX.utils.book_append_sheet(workbook, formulaSheet, "สูตรคำนวณ");

  downloadWorkbook(`project-${format(new Date(), "yyyy-MM-dd")}.xlsx`, workbook);
}

// ── XLSX Project Import ──────────────────────────────────────────────

export function importProjectXlsx(arrayBuffer: ArrayBuffer): Partial<ProjectConfig> | null {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // Read สรุปงาน sheet
    const summarySheet = workbook.Sheets["Project Metadata"] || workbook.Sheets["สรุปงาน"];
    if (!summarySheet) return null;
    const summaryRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(summarySheet, { defval: "" });
    if (!summaryRows.length) return null;
    const summary = summaryRows[0];

    // Read ช่าง sheet
    const techSheet = workbook.Sheets["Selected Technicians"] || workbook.Sheets["ช่าง"];
    const techRows = techSheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(techSheet, { defval: "" }) : [];
    const selectedTechnicianIds = techRows.map(r => String(r.technician_id || "")).filter(Boolean);

    // Read ตัวคูณ sheet
    const multSheet = workbook.Sheets["Selected Multipliers"] || workbook.Sheets["ตัวคูณ"];
    const multRows = multSheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(multSheet, { defval: "" }) : [];
    const selectedMultiplierIds = multRows.map(r => String(r.multiplier_name || r.name || "")).filter(Boolean);

    // Read สูตรคำนวณ sheet for plan
    const formulaSheet = workbook.Sheets["สูตรคำนวณ"];
    const formulaRows = formulaSheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(formulaSheet, { defval: "" }) : [];
    const planId = formulaRows.length ? String(formulaRows[0].pricing_plan || summary.pricing_plan || "high-profit") : String(summary.pricing_plan || "high-profit");

    return {
      projectName: String(summary.project_name || ""),
      customerName: String(summary.customer_name || ""),
      notes: String(summary.notes || ""),
      selectedTechnicianIds,
      selectedMultiplierIds,
      selectedPricingPlan: planId
    };
  } catch {
    return null;
  }
}

export async function exportPdf(context: ResultContext) {
  const { catalog, projectConfig } = context;
  const planId = projectConfig.selectedPricingPlan || "high-profit";
  const uniquePlans = Array.from(new Set((catalog.pricingPlans || []).map(p => p.plan_id))).map(id => (catalog.pricingPlans || []).find(p => p.plan_id === id)!);
  const selectedPricingPlanName = uniquePlans.find(p => p.plan_id === planId)?.plan_name || "กำไรสูง";

  const selectedTechnicians = catalog.technicians.filter((item) => projectConfig.selectedTechnicianIds.includes(item.id));
  const selectedMultipliers = catalog.multipliers.filter((item) => projectConfig.selectedMultiplierIds.includes(item.id));
  const basePrice = calculateBasePrice(catalog.technicians, projectConfig.selectedTechnicianIds, planId, catalog.pricingPlans);
  const multiplierProduct = calculateMultiplier(catalog.multipliers, projectConfig.selectedMultiplierIds);
  const finalPrice = Math.round(calculateFinalPrice(basePrice, multiplierProduct));
  const timestamp = new Date().toISOString();

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  try {
    doc.addFileToVFS("NotoSansThai.ttf", NotoSansThaiBase64);
    doc.addFont("NotoSansThai.ttf", "NotoSansThai", "normal");
    doc.setFont("NotoSansThai");
  } catch (err) {
    console.error("Failed to load Thai font:", err);
  }

  doc.setFillColor(14, 165, 233);
  doc.roundedRect(40, 36, 42, 42, 10, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("TP", 52, 63);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.text("ใบเสนอราคา (Quotation)", 96, 58);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`ออกเมื่อ ${timestamp}`, 96, 74);

  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`ชื่อโครงการ: ${projectConfig.projectName || "-"}`, 40, 112);
  doc.text(`ชื่อลูกค้า: ${projectConfig.customerName || "-"}`, 40, 130);
  doc.text(`แผนราคา: ${selectedPricingPlanName}`, 40, 148);
  doc.text(`หมายเหตุ: ${projectConfig.notes || "-"}`, 40, 166);

  autoTable(doc, {
    startY: 188,
    head: [["ประเภท", "ชื่อ", "กลุ่ม / หมวดหมู่", "ราคา", "ตัวคูณ"]],
    body: [
      ...selectedTechnicians.map((item) => ["ช่าง", item.name, item.group, formatTHB(resolveTechnicianPrice(item, planId, catalog.pricingPlans, item.basePrice)), "-"]),
      ...selectedMultipliers.map((item) => ["ตัวคูณ", item.name, item.category, "-", item.multiplier.toFixed(2)])
    ],
    styles: { fontSize: 10, cellPadding: 6, font: "NotoSansThai", fontStyle: "normal" },
    headStyles: { fillColor: [15, 23, 42], fontStyle: "normal" }
  });

  const summaryY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 220;
  doc.setFontSize(12);
  doc.text(`ราคาเริ่มต้น: ${formatTHB(basePrice)}`, 40, summaryY + 28);
  doc.text(`ตัวคูณที่ใช้: × ${multiplierProduct.toFixed(2)}`, 40, summaryY + 48);
  doc.setFontSize(18);
  doc.text(`ราคารวม: ${formatTHB(finalPrice)}`, 40, summaryY + 76);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`จำนวนช่าง: ${selectedTechnicians.length}`, 40, summaryY + 104);
  doc.text(`จำนวนตัวคูณ: ${selectedMultipliers.length}`, 180, summaryY + 104);

  doc.save(`technician-pricing-result-${format(new Date(), "yyyyMMdd-HHmmss")}.pdf`);
}
