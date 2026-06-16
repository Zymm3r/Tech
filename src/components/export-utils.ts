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
    technicians_name: selectedTechnicians.map(t => t.name).join(", "),
    pricing_plan_name: planName,
    technicians_group: selectedTechnicians.map(t => t.group).join(", "),
    base_price: basePrice,
    multipliers_name: selectedMultipliers.map(m => m.name).join(", "),
    multipliers_value: selectedMultipliers.map(m => m.multiplier.toFixed(1)).join(", "),
    Total_multiplier: multiplierProduct,
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
  
  console.log({
    basePrice,
    multiplierProduct,
    finalPrice,
    selectedTechnicians,
    selectedMultipliers
  });

  const savedDate = projectConfig.lastSavedAt ? new Date(projectConfig.lastSavedAt) : new Date();
  const savedTimestamp = format(savedDate, "dd/MM/yyyy");
  const exportTimestamp = format(new Date(), "dd/MM/yyyy HH:mm:ss");
  const appVersion = (projectConfig as any).version || "1.0.0";

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.width || 595.28;
  const rightEdge = pageWidth - 40; // margin = 40
  const margin = 40;

  try {
    doc.addFileToVFS("NotoSansThai.ttf", NotoSansThaiBase64);
    doc.addFont("NotoSansThai.ttf", "NotoSansThai", "normal");
    doc.addFont("NotoSansThai.ttf", "NotoSansThai", "bold");
    doc.addFont("NotoSansThai.ttf", "NotoSansThai", "italic");
    doc.addFont("NotoSansThai.ttf", "NotoSansThai", "bolditalic");
    doc.setFont("NotoSansThai", "normal");
  } catch (err) {
    console.error("Failed to load Thai font:", err);
  }

  let currentY = margin;

  // ==========================================
  // HEADER SECTION (Standard Invoice Layout)
  // ==========================================
  
  // Left side: Logo & Company Placeholder
  try {
    const img = new Image();
    img.src = "/logo.png";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    doc.addImage(img, "PNG", margin, currentY, 46, 46);
  } catch (err) {
    console.warn("Failed to load logo:", err);
    doc.setFillColor(14, 165, 233); // Primary blue
    doc.roundedRect(margin, currentY, 42, 42, 8, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("TP", margin + 10, currentY + 28);
  }
  
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.text("Technician Pricing", margin + 55, currentY + 18);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("บริษัท ซ่อมบำรุงและติดตั้ง จำกัด (ตัวอย่าง)", margin + 55, currentY + 32);

  // Right side: Document Title & Meta – manually position X instead of { align: "right" }
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text("ใบเสนอราคา", rightEdge - 40, currentY + 18);
  doc.setFontSize(10);
  doc.text("QUOTATION", rightEdge - 25, currentY + 32);

  currentY += 60;

  // Document Details (Right) – manually position X
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`วันที่ (Date):`, rightEdge - 100, currentY);
  doc.text(savedTimestamp, rightEdge - 50, currentY);
  
  doc.text(`แผนราคา (Plan):`, rightEdge - 100, currentY + 15);
  doc.text(selectedPricingPlanName, rightEdge - 50, currentY + 15);

  // Customer Details (Left)
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY - 15, 250, 60, "F");
  doc.setTextColor(100, 116, 139);
  doc.text("เสนอต่อ (Prepared For):", margin + 10, currentY);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text(String((projectConfig as any).customerName || "ลูกค้าทั่วไป"), margin + 10, currentY + 18);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`หมายเหตุ: ${(projectConfig as any).notes || "-"}`, margin + 10, currentY + 35);

  currentY += 70;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 20;

  // ==========================================
  // LINE ITEMS: TECHNICIANS
  // ==========================================
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("1. รายการช่าง (Labor & Technicians)", margin, currentY);
  
  autoTable(doc, {
    startY: currentY + 10,
    head: [["ลำดับ", "ชื่อช่าง", "กลุ่ม", "ราคาที่ใช้คำนวณ (THB)"]],
    body: selectedTechnicians.map((t, index) => [
      String(index + 1),
      t.name,
      t.group,
      pdfFormatPrice(resolveTechnicianPrice(t, planId, plans, t.basePrice))
    ]),
    styles: { fontSize: 12, cellPadding: 6, font: "NotoSansThai", textColor: [0, 0, 0] },
    headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0] },
    columnStyles: { 3: { halign: 'right' } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Subtotal for Technicians – manually position X
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`รวมค่าแรงช่าง (${selectedTechnicians.length} คน):`, rightEdge - 160, currentY);
  doc.text(pdfFormatPrice(basePrice), rightEdge - 80, currentY);
  currentY += 30;

  if (currentY > 650) { doc.addPage(); currentY = margin; }

  // ==========================================
  // LINE ITEMS: MULTIPLIERS
  // ==========================================
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("2. ปัจจัยและตัวคูณ (Multipliers & Adjustments)", margin, currentY);

  if (sortedMultipliers.length > 0) {
    autoTable(doc, {
      startY: currentY + 10,
      head: [["ลำดับ", "หมวดหมู่", "รายการ", "ค่าตัวคูณ"]],
      body: sortedMultipliers.map((m, index) => [
        String(index + 1),
        m.category,
        m.name,
        `×${m.multiplier.toFixed(1)}`
      ]),
      styles: { fontSize: 12, cellPadding: 6, font: "NotoSansThai", textColor: [0, 0, 0] },
      headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0] },
      columnStyles: { 3: { halign: 'right' } }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("- ไม่มีตัวคูณที่เลือก -", margin + 10, currentY + 20);
    currentY += 40;
  }

  if (currentY > 600) { doc.addPage(); currentY = margin; }

  // ==========================================
  // FINANCIAL SUMMARY BOX – manually position X
  // ==========================================
  currentY += 10;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(0, 0, 0); // slate-200
  doc.rect(pageWidth - 280, currentY, 240, 95, "FD");

  const summaryLabelX = rightEdge - 150;
  const summaryValueX = rightEdge - 60;

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("ยอดรวมค่าแรง (Base Subtotal):", summaryLabelX, currentY + 25);
  doc.text(pdfFormatPrice(basePrice), summaryValueX, currentY + 25);

  doc.text("ตัวคูณรวม (Total Multipliers):", summaryLabelX, currentY + 45);
  doc.text(`×${multiplierProduct.toFixed(2)}`, summaryValueX, currentY + 45);

  doc.line(pageWidth - 260, currentY + 55, rightEdge - 10, currentY + 55);

  doc.setFontSize(16);
  doc.text("ราคารวมสุทธิ (Grand Total):", summaryLabelX, currentY + 78);
  doc.setFontSize(22);
  doc.text(pdfFormatPrice(finalPrice), summaryValueX, currentY + 78);

  currentY += 130;

  // ==========================================
  // SIGNATURE SECTION
  // ==========================================
  if (currentY > 650) { doc.addPage(); currentY = margin + 20; }

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);

  // Prepared By (Left)
  doc.line(margin + 20, currentY + 40, margin + 170, currentY + 40);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("ผู้เสนอราคา (Prepared By)", margin + 95, currentY + 55);
  doc.setTextColor(100, 116, 139);
  doc.text("วันที่ (Date) _____/_____/_____", margin + 95, currentY + 70);

  // Accepted By (Right)
  doc.line(rightEdge - 170, currentY + 40, rightEdge - 20, currentY + 40);
  doc.setTextColor(15, 23, 42);
  doc.text("ผู้อนุมัติ/ลูกค้า (Accepted By)", rightEdge - 95, currentY + 55);
  doc.setTextColor(100, 116, 139);
  doc.text("วันที่ (Date) _____/_____/_____", rightEdge - 95, currentY + 70);

  // ==========================================
  // APPENDIX: CALCULATION BREAKDOWN
  // ==========================================
  doc.addPage();
  currentY = margin;
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("เอกสารแนบ: รายละเอียดและสูตรการคำนวณ (Calculation Breakdown)", margin, currentY);
  currentY += 20;

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("รายการช่าง:", margin, currentY);
  currentY += 15;
  
  doc.setTextColor(0, 0, 0);
  selectedTechnicians.forEach((t) => {
    const p = resolveTechnicianPrice(t, planId, plans, t.basePrice);
    doc.text(`${t.name} (${t.group}) = ${pdfFormatPrice(p)}`, margin + 15, currentY);
    currentY += 15;
    if (currentY > 780) { doc.addPage(); currentY = margin; }
  });
  
  currentY += 5;
  doc.text(`รวมค่าแรง = ${pdfFormatPrice(basePrice)}`, margin + 15, currentY);
  currentY += 25;

  if (sortedMultipliers.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.text("ตัวคูณ:", margin, currentY);
    currentY += 15;
    
    doc.setTextColor(0, 0, 0);
    sortedMultipliers.forEach((m) => {
      doc.text(`${m.name} = ×${m.multiplier.toFixed(1)}`, margin + 15, currentY);
      currentY += 15;
      if (currentY > 780) { doc.addPage(); currentY = margin; }
    });
    currentY += 10;
  }

  doc.setTextColor(0, 0, 0);
  doc.text("สมการคำนวณ (Formula):", margin, currentY);
  currentY += 15;
  
  doc.setTextColor(0, 0, 0);
  const calculationSteps = [pdfFormatPrice(basePrice)];
  sortedMultipliers.forEach(m => calculationSteps.push(m.multiplier.toFixed(1)));
  doc.text(calculationSteps.join(" × "), margin + 15, currentY);
  
  currentY += 20;
  doc.setFontSize(14);
  doc.text(`= ${pdfFormatPrice(finalPrice)}`, margin + 15, currentY);

  // ==========================================
  // FOOTER (Applied to all pages)
  // ==========================================
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    const pageHeight = doc.internal.pageSize.height || 842;
    const footerY = pageHeight - 30;
    
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, footerY - 15, pageWidth - margin, footerY - 15);
    
    doc.text(`Generated by Technician Pricing Dashboard v${appVersion}`, margin, footerY);
    doc.text(`Exported: ${exportTimestamp}`, margin, footerY + 12);
    doc.text(`Page ${i} of ${totalPages}`, rightEdge - 50, footerY + 12);
  }

  doc.save(`Quotation-${(projectConfig as any).customerName ? (projectConfig as any).customerName.replace(/\s+/g, '-') : 'Customer'}-${format(new Date(), "yyyyMMdd")}.pdf`);
}