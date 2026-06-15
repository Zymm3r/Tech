"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var default_data_1 = require("../src/lib/default-data");
var spreadsheet_1 = require("../src/lib/spreadsheet");
var spreadsheet_2 = require("../src/lib/spreadsheet");
function runTest() {
    console.log("=== Original Data ===");
    var origPlans = default_data_1.DEFAULT_CATALOG.pricingPlans || [];
    console.log(origPlans);
    // 1. Export to workbook
    var workbook = (0, spreadsheet_1.catalogToWorkbook)(default_data_1.DEFAULT_CATALOG);
    // 2. Import back
    var importedPlans = (0, spreadsheet_2.sheetToPricingPlans)(workbook);
    console.log("=== Imported Pricing Plans ===");
    console.log(importedPlans);
    // Check if lengths match
    if (importedPlans.length !== origPlans.length) {
        console.error("Mismatch in length!");
        process.exit(1);
    }
    // Verify plan_name and plan_id
    var hasError = false;
    for (var i = 0; i < importedPlans.length; i++) {
        var orig = origPlans[i];
        var imp = importedPlans[i];
        if (orig.plan_id !== imp.plan_id || orig.plan_name !== imp.plan_name || orig.price !== imp.price || orig.display_order !== imp.display_order) {
            console.error("Mismatch at index", i);
            console.error("Original:", orig);
            console.error("Imported:", imp);
            hasError = true;
        }
    }
    if (hasError) {
        process.exit(1);
    }
    else {
        console.log("✅ All plan IDs, names, prices, and display orders match perfectly between export and import.");
    }
}
runTest();
