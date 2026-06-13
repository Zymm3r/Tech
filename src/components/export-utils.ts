"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Catalog, ProjectConfig } from "@/types";
import { calculateBasePrice, calculateMultiplierProduct } from "@/lib/calculations";
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
  const selectedTechnicians = catalog.technicians.filter((item) => projectConfig.selectedTechnicianIds.includes(item.id));
  const selectedMultipliers = catalog.multipliers.filter((item) => projectConfig.selectedMultiplierIds.includes(item.id));
  const basePrice = calculateBasePrice(catalog.technicians, projectConfig.selectedTechnicianIds);
  const multiplierProduct = calculateMultiplierProduct(catalog.multipliers, projectConfig.selectedMultiplierIds);
  const finalPrice = Math.round(basePrice * multiplierProduct);
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
  doc.text("Technician Pricing Dashboard", 96, 58);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Exported at ${timestamp}`, 96, 74);

  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`Project: ${projectConfig.projectName || "-"}`, 40, 112);
  doc.text(`Customer: ${projectConfig.customerName || "-"}`, 40, 130);
  doc.text(`Version: ${projectConfig.version}`, 40, 148);
  doc.text(`Notes: ${projectConfig.notes || "-"}`, 40, 166);

  autoTable(doc, {
    startY: 188,
    head: [["Type", "Name", "Group / Category", "Price", "Multiplier"]],
    body: [
      ...selectedTechnicians.map((item) => ["Technician", item.name, item.group, formatTHB(item.basePrice), "-"]),
      ...selectedMultipliers.map((item) => ["Multiplier", item.name, item.category, "-", item.multiplier.toFixed(2)])
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [15, 23, 42] }
  });

  const summaryY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 220;
  doc.setFontSize(12);
  doc.text(`Subtotal: ${formatTHB(basePrice)}`, 40, summaryY + 28);
  doc.text(`Multiplier: × ${multiplierProduct.toFixed(2)}`, 40, summaryY + 48);
  doc.setFontSize(18);
  doc.text(`Grand Total: ${formatTHB(finalPrice)}`, 40, summaryY + 76);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Selected technicians: ${selectedTechnicians.length}`, 40, summaryY + 104);
  doc.text(`Selected multipliers: ${selectedMultipliers.length}`, 180, summaryY + 104);

  doc.save(`technician-pricing-result-${format(new Date(), "yyyyMMdd-HHmmss")}.pdf`);
}
