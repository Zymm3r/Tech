"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Catalog, ProjectConfig } from "@/types";
import { calculateBasePrice, calculateMultiplier, calculateFinalPrice, resolveTechnicianPrice } from "@/lib/pricing-engine";
import { formatTHB } from "@/lib/utils";

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
  downloadJson(`technician-pricing-dashboard-config-${format(new Date(), "yyyyMMdd-HHmmss")}.json`, payload);
}

export function exportPdf(context: ResultContext) {
  const { catalog, projectConfig } = context;
  const planId = projectConfig.selectedPricingPlan || "high-profit";
  const uniquePlans = Array.from(new Set((catalog.pricingPlans || []).map(p => p.plan_id))).map(id => (catalog.pricingPlans || []).find(p => p.plan_id === id)!);
  const selectedPricingPlanName = uniquePlans.find(p => p.plan_id === planId)?.plan_name || "กำไรสูง";

  const selectedTechnicians = catalog.technicians.filter((item) => projectConfig.selectedTechnicianIds.includes(item.id));
  const selectedMultipliers = catalog.multipliers.filter((item) => projectConfig.selectedMultiplierIds.includes(item.id));
  const basePrice = calculateBasePrice(catalog.technicians, projectConfig.selectedTechnicianIds, planId, catalog.pricingPlans);
  const multiplierProduct = calculateMultiplier(catalog.multipliers, projectConfig.selectedMultiplierIds);
  const finalPrice = calculateFinalPrice(basePrice, multiplierProduct);
  const timestamp = new Date().toISOString();

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();

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
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [15, 23, 42] }
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
