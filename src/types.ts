export type Technician = {
  id: string;
  name: string;
  group: string;
  basePrice: number;
  active: boolean;
};

export type Multiplier = {
  id: string;
  category: string;
  name: string;
  multiplier: number;
  active: boolean;
};

export type PricingPlan = {
  plan_id: string;
  plan_name: string;
  group: string;
  price: number;
  active: boolean;
  display_order?: number;
};

export type Catalog = {
  technicians: Technician[];
  multipliers: Multiplier[];
  pricingPlans?: PricingPlan[];
};

export type ProjectConfig = {
  version: string;
  customerName: string;
  notes: string;
  selectedTechnicianIds: string[];
  selectedMultiplierIds: string[];
  selectedPricingPlan?: string;
  lastSavedAt: string | null;
};

export type CatalogDraft = {
  technicians: Technician[];
  multipliers: Multiplier[];
  pricingPlans?: PricingPlan[];
};
