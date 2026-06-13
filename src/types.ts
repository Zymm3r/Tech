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

export type Catalog = {
  technicians: Technician[];
  multipliers: Multiplier[];
};

export type ProjectConfig = {
  version: string;
  projectName: string;
  customerName: string;
  notes: string;
  selectedTechnicianIds: string[];
  selectedMultiplierIds: string[];
  lastSavedAt: string | null;
};

export type CatalogDraft = {
  technicians: Technician[];
  multipliers: Multiplier[];
};
