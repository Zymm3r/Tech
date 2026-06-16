"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Catalog, ProjectConfig } from "@/types";
import { calculateBasePrice, calculateMultiplier, calculateFinalPrice, resolveTechnicianPrice, sortPricingPlans } from "@/lib/pricing-engine";
import { formatTHB } from "@/lib/utils";
import { NotoSansThaiBase64 } from "@/lib/fonts";
import { DEFAULT_CATALOG } from "@/lib/default-data";

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
  const activeTechnicians = catalog.technicians.filter(t => t.active);
  const activeMultipliers = catalog.multipliers.filter(m => m.active);
  const plans = catalog.pricingPlans ?? DEFAULT_CATALOG.pricingPlans ?? [];
  const planName = plans.find(p => p.plan_id === planId)?.plan_name || planId;

  const selectedTechnicians = activeTechnicians.filter(t => projectConfig.selectedTechnicianIds.includes(t.id));
  const selectedMultipliers = activeMultipliers.filter(m => projectConfig.selectedMultiplierIds.includes(m.id));
  const basePrice = calculateBasePrice(activeTechnicians, projectConfig.selectedTechnicianIds, planId, plans);
  const multiplierProduct = calculateMultiplier(activeMultipliers, projectConfig.selectedMultiplierIds);
  const finalPrice = Math.round(calculateFinalPrice(basePrice, multiplierProduct));

  // Sheet 1: สรุปงาน
  const summarySheet = XLSX.utils.json_to_sheet([{
    customer_name: projectConfig.customerName || "",
    notes: projectConfig.notes || "",
    technicians_name: selectedTechnicians.map(t => t.name).join(", "),
    pricing_plan_name: planName,
    technicians_group: selectedTechnicians.map(t => t.group).join(", "),
    base_price: basePrice,
    multipliers_name: selectedMultipliers.map(m => m.name).join(", "),
    multipliers_value: selectedMultipliers.map(m => m.multiplier.toFixed(1)).join(", "),
    Total_multiplier: multiplierProduct,
    final_price: finalPrice,
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

// ── PDF helpers ──────────────────────────────────────────────────────

/** Safe number formatter for PDF – uses " บาท" instead of ฿ symbol which crashes jsPDF's Thai font renderer */
function pdfFormatPrice(value: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "0 บาท";
  }
  return new Intl.NumberFormat("th-TH").format(value) + " บาท";
}

/** Plain number formatter (no currency) for PDF */
function pdfFormatNum(value: number): string {
  return new Intl.NumberFormat("th-TH").format(value);
}

// ── PDF Export ───────────────────────────────────────────────────────

export async function exportPdf(context: ResultContext) {
  const { catalog, projectConfig } = context;
  const planId = projectConfig.selectedPricingPlan || "high-profit";
  const activeTechnicians = catalog.technicians.filter(t => t.active);
  const activeMultipliers = catalog.multipliers.filter(m => m.active);
  const plans = catalog.pricingPlans ?? DEFAULT_CATALOG.pricingPlans ?? [];
  const uniquePlans = sortPricingPlans(Array.from(new Set(plans.map(p => p.plan_id))).map(id => plans.find(p => p.plan_id === id)!));
  const selectedPricingPlanName = uniquePlans.find(p => p.plan_id === planId)?.plan_name || planId;

  const selectedTechnicians = activeTechnicians.filter((item) => projectConfig.selectedTechnicianIds.includes(item.id));
  const selectedMultipliers = activeMultipliers.filter((item) => projectConfig.selectedMultiplierIds.includes(item.id));
  const sortedMultipliers = [...selectedMultipliers].sort((a, b) => (a.category || "").localeCompare(b.category || ""));

  const basePrice = calculateBasePrice(activeTechnicians, projectConfig.selectedTechnicianIds, planId, plans);
  const multiplierProduct = calculateMultiplier(activeMultipliers, projectConfig.selectedMultiplierIds);
  const finalPrice = Math.round(calculateFinalPrice(basePrice, multiplierProduct));

  const savedDate = projectConfig.lastSavedAt ? new Date(projectConfig.lastSavedAt) : new Date();
  const savedTimestamp = format(savedDate, "dd/MM/yyyy");
  
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.width || 595.28;
  const pageHeight = doc.internal.pageSize.height || 841.89;
  const rightEdge = pageWidth - 40; 
  const margin = 40;

  try {
    doc.addFileToVFS("NotoSansThai.ttf", NotoSansThaiBase64);
    doc.addFont("NotoSansThai.ttf", "NotoSansThai", "normal");
    doc.addFont("NotoSansThai.ttf", "NotoSansThai", "bold");
    doc.setFont("NotoSansThai", "normal");
  } catch (err) {
    console.error("Failed to load Thai font:", err);
  }

  let currentY = margin;

  // ==========================================
  // 1. COMPACT HEADER
  // ==========================================
  try {
    const img = new Image();
    img.src = "/logo.png";
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
    doc.addImage(img, "PNG", margin, currentY, 36, 36);
  } catch (err) {
    doc.setFillColor(14, 165, 233);
    doc.roundedRect(margin, currentY, 36, 36, 6, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("TP", margin + 8, currentY + 24);
  }
  
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.text("Technician Pricing", margin + 45, currentY + 14);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("บริษัท ซ่อมบำรุงและติดตั้ง จำกัด (ตัวอย่าง)", margin + 45, currentY + 26);

  // Right-aligned Title
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text("ใบเสนอราคา", rightEdge, currentY + 16, { align: "right" });
  doc.setFontSize(9);
  doc.text("QUOTATION", rightEdge, currentY + 28, { align: "right" });

  currentY += 45;

  // ==========================================
  // 2. CUSTOMER & META INFO (Side-by-Side)
  // ==========================================
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, pageWidth - (margin * 2), 45, "F");
  
  // Left: Customer
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text("เสนอต่อ (Prepared For):", margin + 10, currentY + 14);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(String(projectConfig.customerName || "ลูกค้าทั่วไป"), margin + 10, currentY + 28);
  
  // Right: Date & Plan
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`วันที่: ${savedTimestamp}`, rightEdge - 10, currentY + 14, { align: "right" });
  doc.text(`แผนราคา: ${selectedPricingPlanName}`, rightEdge - 10, currentY + 28, { align: "right" });

  currentY += 60;

  // ==========================================
  // 3. TABLES (Compact Padding & Font)
  // ==========================================
  autoTable(doc, {
    startY: currentY,
    head: [["รายการช่าง (Labor)", "กลุ่ม", "ราคา (THB)"]],
    body: selectedTechnicians.map((t) => [
      t.name, t.group, pdfFormatPrice(resolveTechnicianPrice(t, planId, plans, t.basePrice))
    ]),
    styles: { fontSize: 9, cellPadding: 4, font: "NotoSansThai" },
    headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0] },
    columnStyles: { 2: { halign: 'right' } },
    margin: { left: margin, right: margin }
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;

  if (sortedMultipliers.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [["ปัจจัยและตัวคูณ (Multipliers)", "หมวดหมู่", "ค่าตัวคูณ"]],
      body: sortedMultipliers.map((m) => [
        m.name, m.category, `×${m.multiplier.toFixed(2)}`
      ]),
      styles: { fontSize: 9, cellPadding: 4, font: "NotoSansThai" },
      headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0] },
      columnStyles: { 2: { halign: 'right' } },
      margin: { left: margin, right: margin }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // ==========================================
  // 4. SUMMARY & NOTES (Side-by-Side)
  // ==========================================
  // Left: Notes & Formula
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const notesText = `รายละเอียดงาน: ${projectConfig.notes || "-"}`;
  const wrappedNotes = doc.splitTextToSize(notesText, 250);
  doc.text(wrappedNotes, margin, currentY + 10);
  doc.text(`สูตร: ยอดรวม (${pdfFormatNum(basePrice)}) × ตัวคูณ (${multiplierProduct.toFixed(2)})`, margin, currentY + 40);

  // Right: Financial Summary Box
  doc.setFillColor(241, 245, 249);
  doc.rect(pageWidth - 240, currentY, 200, 55, "F");
  
  doc.setTextColor(0, 0, 0);
  doc.text("ยอดรวมค่าแรง:", rightEdge - 80, currentY + 15, { align: "right" });
  doc.text(pdfFormatPrice(basePrice), rightEdge - 10, currentY + 15, { align: "right" });
  
  doc.text("ตัวคูณรวม:", rightEdge - 80, currentY + 28, { align: "right" });
  doc.text(`×${multiplierProduct.toFixed(2)}`, rightEdge - 10, currentY + 28, { align: "right" });

  doc.setFontSize(12);
  doc.setFont("NotoSansThai", "bold");
  doc.text("ราคารวมสุทธิ:", rightEdge - 80, currentY + 45, { align: "right" });
  doc.text(pdfFormatPrice(finalPrice), rightEdge - 10, currentY + 45, { align: "right" });
  doc.setFont("NotoSansThai", "normal"); // Reset

  // ==========================================
  // 5. SIGNATURES (Fixed at Bottom)
  // ==========================================
  const sigY = pageHeight - 60; // ตรึงไว้ล่างสุดของ A4 เสมอ
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);

  // Left Signature
  doc.line(margin + 10, sigY, margin + 140, sigY);
  doc.setFontSize(9);
  doc.text("ผู้เสนอราคา (Prepared By)", margin + 75, sigY + 15, { align: "center" });
  
  // Right Signature
  doc.line(rightEdge - 140, sigY, rightEdge - 10, sigY);
  doc.text("ผู้อนุมัติ/ลูกค้า (Accepted By)", rightEdge - 75, sigY + 15, { align: "center" });

  doc.save(`Quotation-${(projectConfig as any).customerName ? String((projectConfig as any).customerName).replace(/\s+/g, '-') : 'Customer'}-${format(new Date(), "yyyyMMdd")}.pdf`);
}
