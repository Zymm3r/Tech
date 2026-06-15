"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Catalog, ProjectConfig } from "@/types";
import { calculateBasePrice, calculateMultiplier, calculateFinalPrice, resolveTechnicianPrice, sortPricingPlans } from "@/lib/pricing-engine";
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
  const uniquePlans = sortPricingPlans(Array.from(new Set((catalog.pricingPlans || []).map(p => p.plan_id))).map(id => (catalog.pricingPlans || []).find(p => p.plan_id === id)!));
  const selectedPricingPlanName = uniquePlans.find(p => p.plan_id === planId)?.plan_name || planId;

  const selectedTechnicians = catalog.technicians.filter((item) => projectConfig.selectedTechnicianIds.includes(item.id));
  const selectedMultipliers = catalog.multipliers.filter((item) => projectConfig.selectedMultiplierIds.includes(item.id));
  const sortedMultipliers = [...selectedMultipliers].sort((a, b) => (a.category || "").localeCompare(b.category || ""));

  const basePrice = calculateBasePrice(catalog.technicians, projectConfig.selectedTechnicianIds, planId, catalog.pricingPlans);
  const multiplierProduct = calculateMultiplier(catalog.multipliers, projectConfig.selectedMultiplierIds);
  const finalPrice = Math.round(calculateFinalPrice(basePrice, multiplierProduct));
  
  const savedDate = projectConfig.lastSavedAt ? new Date(projectConfig.lastSavedAt) : new Date();
  const savedTimestamp = format(savedDate, "dd/MM/yyyy HH:mm:ss");
  const exportTimestamp = format(new Date(), "dd/MM/yyyy HH:mm:ss");
  const appVersion = (projectConfig as any).version || "1.0.0";
  const formatNum = (num: number) => new Intl.NumberFormat("th-TH").format(num);

  const doc = new jsPDF({ unit: "pt", format: "a4" });

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

  // --- Header ---
  doc.setFillColor(14, 165, 233);
  doc.roundedRect(40, 36, 42, 42, 10, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("TP", 52, 63);
  
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(22);
  doc.text("ใบเสนอราคา", 96, 58);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`ออกเมื่อ: ${savedTimestamp}`, 96, 74);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`ชื่อโครงการ: ${projectConfig.projectName || "-"}`, 40, 112);
  doc.text(`ชื่อลูกค้า: ${projectConfig.customerName || "-"}`, 40, 128);
  doc.text(`แผนราคา: ${selectedPricingPlanName}`, 40, 144);
  doc.text(`หมายเหตุ: ${projectConfig.notes || "-"}`, 40, 160);

  // --- Section 1: รายการช่าง ---
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("รายการช่าง", 40, 195);

  autoTable(doc, {
    startY: 205,
    head: [["ลำดับ", "ชื่อช่าง", "กลุ่ม", "ราคาที่ใช้คำนวณ"]],
    body: selectedTechnicians.map((t, index) => [
      String(index + 1),
      t.name,
      t.group,
      formatNum(resolveTechnicianPrice(t, planId, catalog.pricingPlans, t.basePrice))
    ]),
    styles: { fontSize: 10, cellPadding: 6, font: "NotoSansThai" },
    headStyles: { fillColor: [15, 23, 42] }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 15;

  // --- Section 2: สรุปราคาแรง ---
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`จำนวนช่าง: ${selectedTechnicians.length} คน`, 40, currentY);
  currentY += 15;
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`ราคารวมก่อนตัวคูณ: ${formatTHB(basePrice)}`, 40, currentY);
  
  currentY += 35;

  // Check page break for Multipliers table
  if (currentY > 650) {
    doc.addPage();
    currentY = 40;
  }

  // --- Section 3: ตัวคูณที่เลือก ---
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("ตัวคูณที่เลือก", 40, currentY);

  if (sortedMultipliers.length > 0) {
    autoTable(doc, {
      startY: currentY + 10,
      head: [["ลำดับ", "หมวดหมู่", "รายการ", "ค่า"]],
      body: sortedMultipliers.map((m, index) => [
        String(index + 1),
        m.category,
        m.name,
        `×${m.multiplier.toFixed(2)}`
      ]),
      styles: { fontSize: 10, cellPadding: 6, font: "NotoSansThai" },
      headStyles: { fillColor: [15, 23, 42] }
    });
    currentY = (doc as any).lastAutoTable.finalY + 30;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("- ไม่มีตัวคูณที่เลือก -", 40, currentY + 20);
    currentY += 45;
  }

  // Check page break for Formula
  if (currentY > 600) {
    doc.addPage();
    currentY = 40;
  }

  // --- Section 4: สูตรคำนวณ ---
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("สูตรคำนวณ", 40, currentY);
  currentY += 20;

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("รายการช่าง:", 40, currentY);
  currentY += 15;
  
  doc.setTextColor(15, 23, 42);
  selectedTechnicians.forEach((t) => {
    const p = resolveTechnicianPrice(t, planId, catalog.pricingPlans, t.basePrice);
    doc.text(`${t.name} (${t.group}) = ${formatNum(p)}`, 50, currentY);
    currentY += 15;
    
    // Page break protection within loop
    if (currentY > 750) {
      doc.addPage();
      currentY = 40;
    }
  });
  
  currentY += 5;
  doc.setFontSize(11);
  doc.text(`รวมค่าแรง = ${formatNum(basePrice)}`, 40, currentY);
  currentY += 25;

  if (sortedMultipliers.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("ตัวคูณ:", 40, currentY);
    currentY += 15;
    
    doc.setTextColor(15, 23, 42);
    sortedMultipliers.forEach((m) => {
      doc.text(`${m.name} = ×${m.multiplier.toFixed(2)}`, 50, currentY);
      currentY += 15;
      if (currentY > 750) {
        doc.addPage();
        currentY = 40;
      }
    });
    
    currentY += 10;
  }

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("คำนวณ:", 40, currentY);
  currentY += 15;
  
  doc.setTextColor(15, 23, 42);
  const calculationSteps = [formatNum(basePrice)];
  sortedMultipliers.forEach(m => calculationSteps.push(m.multiplier.toFixed(2)));
  doc.text(calculationSteps.join(" × "), 50, currentY);
  
  currentY += 20;
  doc.setFontSize(12);
  doc.text(`= ${formatTHB(finalPrice)}`, 50, currentY);
  currentY += 30;

  // Check page break for Summary Box
  if (currentY > 680) {
    doc.addPage();
    currentY = 40;
  }

  // --- Section 5: สรุปสุดท้าย (Highlighted Box) ---
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(40, currentY, 515, 100, 8, 8, "F");
  
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text("ค่าแรงรวม", 60, currentY + 30);
  doc.setTextColor(15, 23, 42);
  doc.text(`${formatTHB(basePrice)}`, 530, currentY + 30, { align: "right" });
  
  doc.setTextColor(100, 116, 139);
  doc.text("ตัวคูณรวม", 60, currentY + 50);
  doc.setTextColor(15, 23, 42);
  doc.text(`×${multiplierProduct.toFixed(2)}`, 530, currentY + 50, { align: "right" });
  
  doc.setFontSize(16);
  doc.text("ราคารวมสุทธิ", 60, currentY + 80);
  doc.setFontSize(18);
  doc.setTextColor(14, 165, 233);
  doc.text(`${formatTHB(finalPrice)}`, 530, currentY + 80, { align: "right" });

  currentY += 130;

  // --- Footer ---
  // Position at bottom of the page
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  const pageHeight = doc.internal.pageSize.height || 842;
  const footerY = pageHeight - 40;
  
  doc.text(`สร้างโดย Technician Pricing Dashboard v${appVersion}`, 40, footerY);
  doc.text(`วันที่ส่งออก PDF: ${exportTimestamp}`, 40, footerY + 15);
  
  doc.text(`จำนวนช่างทั้งหมด: ${selectedTechnicians.length} | จำนวนตัวคูณทั้งหมด: ${sortedMultipliers.length} | แผนราคาที่ใช้: ${selectedPricingPlanName}`, 555, footerY + 15, { align: "right" });

  doc.save(`technician-pricing-result-${format(new Date(), "yyyyMMdd-HHmmss")}.pdf`);
}
