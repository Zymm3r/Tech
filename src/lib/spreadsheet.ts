import { Catalog, Multiplier, Technician } from "@/types";
import * as XLSX from "xlsx";

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return ["true", "1", "yes", "y", "active"].includes(value.trim().toLowerCase());
  return false;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function readWorkbookFromUrl(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return XLSX.read(arrayBuffer, { type: "array" });
}

export function catalogFromWorkbook(technicianBook?: XLSX.WorkBook | null, multiplierBook?: XLSX.WorkBook | null): Catalog | null {
  const technicians = technicianBook ? sheetToTechnicians(technicianBook) : [];
  const multipliers = multiplierBook ? sheetToMultipliers(multiplierBook) : [];
  if (!technicians.length && !multipliers.length) return null;
  return {
    technicians,
    multipliers
  };
}

export function sheetToTechnicians(workbook: XLSX.WorkBook): Technician[] {
  const sheet = workbook.Sheets["Technicians"];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rows.map((row) => ({
    id: String(row.id || slugify(String(row.name || ""))),
    name: String(row.name || ""),
    group: String(row.group || ""),
    basePrice: toNumber(row.base_price, 0),
    active: toBoolean(row.active)
  }));
}

export function sheetToMultipliers(workbook: XLSX.WorkBook): Multiplier[] {
  const sheet = workbook.Sheets["Multipliers"];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rows.map((row) => ({
    id: String(row.id || slugify(String(row.name || ""))),
    category: String(row.category || ""),
    name: String(row.name || ""),
    multiplier: toNumber(row.multiplier, 1),
    active: toBoolean(row.active)
  }));
}

export function catalogToWorkbook(catalog: Catalog) {
  const techniciansSheet = XLSX.utils.json_to_sheet(
    catalog.technicians.map((item) => ({
      id: item.id,
      name: item.name,
      group: item.group,
      base_price: item.basePrice,
      active: item.active ? "true" : "false"
    }))
  );
  const multipliersSheet = XLSX.utils.json_to_sheet(
    catalog.multipliers.map((item) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      multiplier: item.multiplier,
      active: item.active ? "true" : "false"
    }))
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, techniciansSheet, "Technicians");
  XLSX.utils.book_append_sheet(workbook, multipliersSheet, "Multipliers");
  return workbook;
}

export function createTemplateWorkbook(catalog: Catalog) {
  return catalogToWorkbook(catalog);
}
