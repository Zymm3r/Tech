"use client";
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadJson = downloadJson;
exports.downloadWorkbook = downloadWorkbook;
exports.createConfigurationExport = createConfigurationExport;
exports.exportCurrentConfiguration = exportCurrentConfiguration;
exports.exportProjectXlsx = exportProjectXlsx;
exports.importProjectXlsx = importProjectXlsx;
exports.exportPdf = exportPdf;
var jspdf_1 = __importDefault(require("jspdf"));
var jspdf_autotable_1 = __importDefault(require("jspdf-autotable"));
var XLSX = __importStar(require("xlsx"));
var date_fns_1 = require("date-fns");
var pricing_engine_1 = require("@/lib/pricing-engine");
var utils_1 = require("@/lib/utils");
var fonts_1 = require("@/lib/fonts");
function downloadBlob(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
}
function downloadJson(fileName, data) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    downloadBlob(blob, fileName);
}
function downloadWorkbook(fileName, workbook) {
    var array = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    var blob = new Blob([array], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    downloadBlob(blob, fileName);
}
function createConfigurationExport(_a) {
    var catalog = _a.catalog, projectConfig = _a.projectConfig;
    return {
        version: projectConfig.version,
        exportedAt: new Date().toISOString(),
        projectConfig: projectConfig,
        catalog: catalog
    };
}
function exportCurrentConfiguration(context) {
    var payload = createConfigurationExport(context);
    downloadJson("project-".concat((0, date_fns_1.format)(new Date(), "yyyy-MM-dd"), ".json"), payload);
}
// ── XLSX Project Export ──────────────────────────────────────────────
function exportProjectXlsx(context) {
    var _a;
    var catalog = context.catalog, projectConfig = context.projectConfig;
    var planId = projectConfig.selectedPricingPlan || "high-profit";
    var plans = catalog.pricingPlans || [];
    var planName = ((_a = plans.find(function (p) { return p.plan_id === planId; })) === null || _a === void 0 ? void 0 : _a.plan_name) || planId;
    var selectedTechnicians = catalog.technicians.filter(function (t) { return projectConfig.selectedTechnicianIds.includes(t.id); });
    var selectedMultipliers = catalog.multipliers.filter(function (m) { return projectConfig.selectedMultiplierIds.includes(m.id); });
    var basePrice = (0, pricing_engine_1.calculateBasePrice)(catalog.technicians, projectConfig.selectedTechnicianIds, planId, plans);
    var multiplierProduct = (0, pricing_engine_1.calculateMultiplier)(catalog.multipliers, projectConfig.selectedMultiplierIds);
    var finalPrice = Math.round((0, pricing_engine_1.calculateFinalPrice)(basePrice, multiplierProduct));
    // Sheet 1: สรุปงาน
    var summarySheet = XLSX.utils.json_to_sheet([{
            project_name: projectConfig.projectName || "",
            customer_name: projectConfig.customerName || "",
            pricing_plan: planId,
            pricing_plan_name: planName,
            base_price: basePrice,
            final_price: finalPrice,
            notes: projectConfig.notes || "",
            created_at: new Date().toISOString(),
            technicians_name: selectedTechnicians.map(function (t) { return t.name; }).join(", "),
            technicians_group: selectedTechnicians.map(function (t) { return t.group; }).join(", "),
            multipliers_name: selectedMultipliers.map(function (m) { return m.name; }).join(", "),
            multipliers_value: selectedMultipliers.map(function (m) { return m.multiplier.toFixed(1); }).join(", "),
            Sum_multiplier: selectedMultipliers.reduce(function (sum, m) { return sum + m.multiplier; }, 0)
        }]);
    // Sheet 2: ช่าง
    var techSheet = XLSX.utils.json_to_sheet(selectedTechnicians.map(function (t) { return ({
        technician_id: t.id,
        technician_name: t.name,
        group: t.group,
        resolved_price: (0, pricing_engine_1.resolveTechnicianPrice)(t, planId, plans, t.basePrice)
    }); }));
    // Sheet 3: ตัวคูณ
    var multSheet = XLSX.utils.json_to_sheet(selectedMultipliers.map(function (m) { return ({
        category: m.category,
        multiplier_name: m.name,
        multiplier_value: m.multiplier
    }); }));
    // Sheet 4: สูตรคำนวณ
    var resolvedPrices = selectedTechnicians.map(function (t) { return (0, pricing_engine_1.resolveTechnicianPrice)(t, planId, plans, t.basePrice); });
    var priceBreakdown = selectedTechnicians.map(function (t, i) { return "".concat(t.name, ": ").concat(resolvedPrices[i]); }).join(", ");
    var multiplierBreakdown = selectedMultipliers.map(function (m) { return "".concat(m.name, ": \u00D7").concat(m.multiplier.toFixed(1)); }).join(", ");
    var formulaSheet = XLSX.utils.json_to_sheet([{
            pricing_plan: planId,
            pricing_plan_name: planName,
            price_breakdown: priceBreakdown,
            base_price: basePrice,
            multiplier_breakdown: multiplierBreakdown,
            multiplier_product: multiplierProduct,
            final_price: finalPrice
        }]);
    var workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Project Metadata");
    XLSX.utils.book_append_sheet(workbook, techSheet, "Selected Technicians");
    XLSX.utils.book_append_sheet(workbook, multSheet, "Selected Multipliers");
    XLSX.utils.book_append_sheet(workbook, formulaSheet, "สูตรคำนวณ");
    downloadWorkbook("project-".concat((0, date_fns_1.format)(new Date(), "yyyy-MM-dd"), ".xlsx"), workbook);
}
// ── XLSX Project Import ──────────────────────────────────────────────
function importProjectXlsx(arrayBuffer) {
    try {
        var workbook = XLSX.read(arrayBuffer, { type: "array" });
        // Read สรุปงาน sheet
        var summarySheet = workbook.Sheets["Project Metadata"] || workbook.Sheets["สรุปงาน"];
        if (!summarySheet)
            return null;
        var summaryRows = XLSX.utils.sheet_to_json(summarySheet, { defval: "" });
        if (!summaryRows.length)
            return null;
        var summary = summaryRows[0];
        // Read ช่าง sheet
        var techSheet = workbook.Sheets["Selected Technicians"] || workbook.Sheets["ช่าง"];
        var techRows = techSheet ? XLSX.utils.sheet_to_json(techSheet, { defval: "" }) : [];
        var selectedTechnicianIds = techRows.map(function (r) { return String(r.technician_id || ""); }).filter(Boolean);
        // Read ตัวคูณ sheet
        var multSheet = workbook.Sheets["Selected Multipliers"] || workbook.Sheets["ตัวคูณ"];
        var multRows = multSheet ? XLSX.utils.sheet_to_json(multSheet, { defval: "" }) : [];
        var selectedMultiplierIds = multRows.map(function (r) { return String(r.multiplier_name || r.name || ""); }).filter(Boolean);
        // Read สูตรคำนวณ sheet for plan
        var formulaSheet = workbook.Sheets["สูตรคำนวณ"];
        var formulaRows = formulaSheet ? XLSX.utils.sheet_to_json(formulaSheet, { defval: "" }) : [];
        var planId = formulaRows.length ? String(formulaRows[0].pricing_plan || summary.pricing_plan || "high-profit") : String(summary.pricing_plan || "high-profit");
        return {
            projectName: String(summary.project_name || ""),
            customerName: String(summary.customer_name || ""),
            notes: String(summary.notes || ""),
            selectedTechnicianIds: selectedTechnicianIds,
            selectedMultiplierIds: selectedMultiplierIds,
            selectedPricingPlan: planId
        };
    }
    catch (_a) {
        return null;
    }
}
function exportPdf(context) {
    return __awaiter(this, void 0, void 0, function () {
        var catalog, projectConfig, planId, uniquePlans, selectedPricingPlanName, selectedTechnicians, selectedMultipliers, sortedMultipliers, basePrice, multiplierProduct, finalPrice, savedDate, savedTimestamp, exportTimestamp, appVersion, formatNum, doc, currentY, calculationSteps, pageHeight, footerY;
        var _a;
        return __generator(this, function (_b) {
            catalog = context.catalog, projectConfig = context.projectConfig;
            planId = projectConfig.selectedPricingPlan || "high-profit";
            uniquePlans = (0, pricing_engine_1.sortPricingPlans)(Array.from(new Set((catalog.pricingPlans || []).map(function (p) { return p.plan_id; }))).map(function (id) { return (catalog.pricingPlans || []).find(function (p) { return p.plan_id === id; }); }));
            selectedPricingPlanName = ((_a = uniquePlans.find(function (p) { return p.plan_id === planId; })) === null || _a === void 0 ? void 0 : _a.plan_name) || planId;
            selectedTechnicians = catalog.technicians.filter(function (item) { return projectConfig.selectedTechnicianIds.includes(item.id); });
            selectedMultipliers = catalog.multipliers.filter(function (item) { return projectConfig.selectedMultiplierIds.includes(item.id); });
            sortedMultipliers = __spreadArray([], selectedMultipliers, true).sort(function (a, b) { return (a.category || "").localeCompare(b.category || ""); });
            basePrice = (0, pricing_engine_1.calculateBasePrice)(catalog.technicians, projectConfig.selectedTechnicianIds, planId, catalog.pricingPlans);
            multiplierProduct = (0, pricing_engine_1.calculateMultiplier)(catalog.multipliers, projectConfig.selectedMultiplierIds);
            finalPrice = Math.round((0, pricing_engine_1.calculateFinalPrice)(basePrice, multiplierProduct));
            savedDate = projectConfig.lastSavedAt ? new Date(projectConfig.lastSavedAt) : new Date();
            savedTimestamp = (0, date_fns_1.format)(savedDate, "dd/MM/yyyy HH:mm:ss");
            exportTimestamp = (0, date_fns_1.format)(new Date(), "dd/MM/yyyy HH:mm:ss");
            appVersion = projectConfig.version || "1.0.0";
            formatNum = function (num) { return new Intl.NumberFormat("th-TH").format(num); };
            doc = new jspdf_1.default({ unit: "pt", format: "a4" });
            try {
                doc.addFileToVFS("NotoSansThai.ttf", fonts_1.NotoSansThaiBase64);
                doc.addFont("NotoSansThai.ttf", "NotoSansThai", "normal");
                doc.addFont("NotoSansThai.ttf", "NotoSansThai", "bold");
                doc.addFont("NotoSansThai.ttf", "NotoSansThai", "italic");
                doc.addFont("NotoSansThai.ttf", "NotoSansThai", "bolditalic");
                doc.setFont("NotoSansThai", "normal");
            }
            catch (err) {
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
            doc.text("\u0E2D\u0E2D\u0E01\u0E40\u0E21\u0E37\u0E48\u0E2D: ".concat(savedTimestamp), 96, 74);
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text("\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23: ".concat(projectConfig.projectName || "-"), 40, 112);
            doc.text("\u0E0A\u0E37\u0E48\u0E2D\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32: ".concat(projectConfig.customerName || "-"), 40, 128);
            doc.text("\u0E41\u0E1C\u0E19\u0E23\u0E32\u0E04\u0E32: ".concat(selectedPricingPlanName), 40, 144);
            doc.text("\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38: ".concat(projectConfig.notes || "-"), 40, 160);
            // --- Section 1: รายการช่าง ---
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text("รายการช่าง", 40, 195);
            (0, jspdf_autotable_1.default)(doc, {
                startY: 205,
                head: [["ลำดับ", "ชื่อช่าง", "กลุ่ม", "ราคาที่ใช้คำนวณ"]],
                body: selectedTechnicians.map(function (t, index) { return [
                    String(index + 1),
                    t.name,
                    t.group,
                    formatNum((0, pricing_engine_1.resolveTechnicianPrice)(t, planId, catalog.pricingPlans, t.basePrice))
                ]; }),
                styles: { fontSize: 10, cellPadding: 6, font: "NotoSansThai" },
                headStyles: { fillColor: [15, 23, 42] }
            });
            currentY = doc.lastAutoTable.finalY + 15;
            // --- Section 2: สรุปราคาแรง ---
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text("\u0E08\u0E33\u0E19\u0E27\u0E19\u0E0A\u0E48\u0E32\u0E07: ".concat(selectedTechnicians.length, " \u0E04\u0E19"), 40, currentY);
            currentY += 15;
            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.text("\u0E23\u0E32\u0E04\u0E32\u0E23\u0E27\u0E21\u0E01\u0E48\u0E2D\u0E19\u0E15\u0E31\u0E27\u0E04\u0E39\u0E13: ".concat((0, utils_1.formatTHB)(basePrice)), 40, currentY);
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
                (0, jspdf_autotable_1.default)(doc, {
                    startY: currentY + 10,
                    head: [["ลำดับ", "หมวดหมู่", "รายการ", "ค่า"]],
                    body: sortedMultipliers.map(function (m, index) { return [
                        String(index + 1),
                        m.category,
                        m.name,
                        "\u00D7".concat(m.multiplier.toFixed(2))
                    ]; }),
                    styles: { fontSize: 10, cellPadding: 6, font: "NotoSansThai" },
                    headStyles: { fillColor: [15, 23, 42] }
                });
                currentY = doc.lastAutoTable.finalY + 30;
            }
            else {
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
            selectedTechnicians.forEach(function (t) {
                var p = (0, pricing_engine_1.resolveTechnicianPrice)(t, planId, catalog.pricingPlans, t.basePrice);
                doc.text("".concat(t.name, " (").concat(t.group, ") = ").concat(formatNum(p)), 50, currentY);
                currentY += 15;
                // Page break protection within loop
                if (currentY > 750) {
                    doc.addPage();
                    currentY = 40;
                }
            });
            currentY += 5;
            doc.setFontSize(11);
            doc.text("\u0E23\u0E27\u0E21\u0E04\u0E48\u0E32\u0E41\u0E23\u0E07 = ".concat(formatNum(basePrice)), 40, currentY);
            currentY += 25;
            if (sortedMultipliers.length > 0) {
                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139);
                doc.text("ตัวคูณ:", 40, currentY);
                currentY += 15;
                doc.setTextColor(15, 23, 42);
                sortedMultipliers.forEach(function (m) {
                    doc.text("".concat(m.name, " = \u00D7").concat(m.multiplier.toFixed(2)), 50, currentY);
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
            calculationSteps = [formatNum(basePrice)];
            sortedMultipliers.forEach(function (m) { return calculationSteps.push(m.multiplier.toFixed(2)); });
            doc.text(calculationSteps.join(" × "), 50, currentY);
            currentY += 20;
            doc.setFontSize(12);
            doc.text("= ".concat((0, utils_1.formatTHB)(finalPrice)), 50, currentY);
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
            doc.text("".concat((0, utils_1.formatTHB)(basePrice)), 530, currentY + 30, { align: "right" });
            doc.setTextColor(100, 116, 139);
            doc.text("ตัวคูณรวม", 60, currentY + 50);
            doc.setTextColor(15, 23, 42);
            doc.text("\u00D7".concat(multiplierProduct.toFixed(2)), 530, currentY + 50, { align: "right" });
            doc.setFontSize(16);
            doc.text("ราคารวมสุทธิ", 60, currentY + 80);
            doc.setFontSize(18);
            doc.setTextColor(14, 165, 233);
            doc.text("".concat((0, utils_1.formatTHB)(finalPrice)), 530, currentY + 80, { align: "right" });
            currentY += 130;
            // --- Footer ---
            // Position at bottom of the page
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184); // slate-400
            pageHeight = doc.internal.pageSize.height || 842;
            footerY = pageHeight - 40;
            doc.text("\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E42\u0E14\u0E22 Technician Pricing Dashboard v".concat(appVersion), 40, footerY);
            doc.text("\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E48\u0E07\u0E2D\u0E2D\u0E01 PDF: ".concat(exportTimestamp), 40, footerY + 15);
            doc.text("\u0E08\u0E33\u0E19\u0E27\u0E19\u0E0A\u0E48\u0E32\u0E07\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14: ".concat(selectedTechnicians.length, " | \u0E08\u0E33\u0E19\u0E27\u0E19\u0E15\u0E31\u0E27\u0E04\u0E39\u0E13\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14: ").concat(sortedMultipliers.length, " | \u0E41\u0E1C\u0E19\u0E23\u0E32\u0E04\u0E32\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49: ").concat(selectedPricingPlanName), 555, footerY + 15, { align: "right" });
            doc.save("technician-pricing-result-".concat((0, date_fns_1.format)(new Date(), "yyyyMMdd-HHmmss"), ".pdf"));
            return [2 /*return*/];
        });
    });
}
