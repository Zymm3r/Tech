import { Catalog, Multiplier, Technician } from "@/types";

export function getActiveTechnicians(catalog: Catalog) {
  return catalog.technicians.filter((item) => item.active);
}

export function getActiveMultipliers(catalog: Catalog) {
  return catalog.multipliers.filter((item) => item.active);
}

export function calculateBasePrice(technicians: Technician[], selectedIds: string[]) {
  return technicians.filter((technician) => selectedIds.includes(technician.id)).reduce((sum, item) => sum + item.basePrice, 0);
}

export function calculateMultiplierProduct(multipliers: Multiplier[], selectedIds: string[]) {
  return multipliers
    .filter((multiplier) => selectedIds.includes(multiplier.id))
    .reduce((product, item) => product * item.multiplier, 1);
}

export function formatFormula(basePrice: number, selectedMultipliers: Multiplier[]) {
  const baseExpression = selectedMultipliers.length ? "" : `${basePrice.toLocaleString("th-TH")}`;
  const multiplierExpression = selectedMultipliers.map((item) => item.multiplier.toFixed(1)).join(" × ");
  return { baseExpression, multiplierExpression };
}
