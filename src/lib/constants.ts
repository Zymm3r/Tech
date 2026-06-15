export const APP_VERSION = "1.0.0";
export const CONFIG_STORAGE_KEY = "technician-pricing-dashboard:config";
export const CATALOG_STORAGE_KEY = "technician-pricing-dashboard:catalog";
export const HISTORY_STORAGE_KEY = "technician-pricing-dashboard:history";

export const DEFAULT_PROJECT_CONFIG = {
  version: APP_VERSION,
  projectName: "",
  customerName: "",
  notes: "",
  selectedTechnicianIds: [],
  selectedMultiplierIds: [],
  selectedPricingPlan: "high-profit",
  lastSavedAt: null
};
