import { DEFAULT_CATALOG } from "../src/lib/default-data";
import { importProjectXlsx } from "../src/components/export-utils";
import { catalogToWorkbook } from "../src/lib/spreadsheet";
import { ProjectConfig } from "../src/types";
import * as XLSX from "xlsx";

import { sheetToPricingPlans } from "../src/lib/spreadsheet";

function runTest() {
  console.log("=== Original Data ===");
  const origPlans = DEFAULT_CATALOG.pricingPlans || [];
  console.log(origPlans);

  // 1. Export to workbook
  const workbook = catalogToWorkbook(DEFAULT_CATALOG);
  
  // 2. Import back
  const importedPlans = sheetToPricingPlans(workbook);
  
  console.log("=== Imported Pricing Plans ===");
  console.log(importedPlans);
  
  // Check if lengths match
  if (importedPlans.length !== origPlans.length) {
    console.error("Mismatch in length!");
    process.exit(1);
  }
  
  // Verify plan_name and plan_id
  let hasError = false;
  for (let i = 0; i < importedPlans.length; i++) {
    const orig = origPlans[i];
    const imp = importedPlans[i];
    if (orig.plan_id !== imp.plan_id || orig.plan_name !== imp.plan_name || orig.price !== imp.price || orig.display_order !== imp.display_order) {
      console.error("Mismatch at index", i);
      console.error("Original:", orig);
      console.error("Imported:", imp);
      hasError = true;
    }
  }
  if (hasError) {
    process.exit(1);
  } else {
    console.log("✅ All plan IDs, names, prices, and display orders match perfectly between export and import.");
  }
}

runTest();
