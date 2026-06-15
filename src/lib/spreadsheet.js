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
Object.defineProperty(exports, "__esModule", { value: true });
exports.readWorkbookFromUrl = readWorkbookFromUrl;
exports.catalogFromWorkbook = catalogFromWorkbook;
exports.sheetToTechnicians = sheetToTechnicians;
exports.sheetToMultipliers = sheetToMultipliers;
exports.sheetToPricingPlans = sheetToPricingPlans;
exports.catalogToWorkbook = catalogToWorkbook;
exports.createTemplateWorkbook = createTemplateWorkbook;
var XLSX = __importStar(require("xlsx"));
function toBoolean(value) {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return value !== 0;
    if (typeof value === "string")
        return ["true", "1", "yes", "y", "active"].includes(value.trim().toLowerCase());
    return false;
}
function toNumber(value, fallback) {
    if (fallback === void 0) { fallback = 0; }
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function slugify(value) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}
function readWorkbookFromUrl(url) {
    return __awaiter(this, void 0, void 0, function () {
        var response, arrayBuffer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch(url, { cache: "no-store" })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("Failed to fetch ".concat(url));
                    }
                    return [4 /*yield*/, response.arrayBuffer()];
                case 2:
                    arrayBuffer = _a.sent();
                    return [2 /*return*/, XLSX.read(arrayBuffer, { type: "array" })];
            }
        });
    });
}
function catalogFromWorkbook(technicianBook, multiplierBook, pricingPlanBook) {
    var technicians = technicianBook ? sheetToTechnicians(technicianBook) : [];
    var multipliers = multiplierBook ? sheetToMultipliers(multiplierBook) : [];
    var pricingPlans = pricingPlanBook ? sheetToPricingPlans(pricingPlanBook) : [];
    if (!technicians.length && !multipliers.length && !pricingPlans.length)
        return null;
    return {
        technicians: technicians,
        multipliers: multipliers,
        pricingPlans: pricingPlans
    };
}
function sheetToTechnicians(workbook) {
    var sheet = workbook.Sheets["Technicians"];
    if (!sheet)
        return [];
    var rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    return rows.map(function (row) { return ({
        id: String(row.id || slugify(String(row.name || ""))),
        name: String(row.name || ""),
        group: String(row.group || ""),
        basePrice: toNumber(row.base_price, 0),
        active: toBoolean(row.active)
    }); });
}
function sheetToMultipliers(workbook) {
    var sheet = workbook.Sheets["Multipliers"];
    if (!sheet)
        return [];
    var rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    return rows.map(function (row) { return ({
        id: String(row.id || slugify(String(row.name || ""))),
        category: String(row.category || ""),
        name: String(row.name || ""),
        multiplier: toNumber(row.multiplier, 1),
        active: toBoolean(row.active)
    }); });
}
function sheetToPricingPlans(workbook) {
    var sheet = workbook.Sheets["PricingPlans"];
    if (!sheet)
        return [];
    var rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    return rows.map(function (row) {
        var plan_id = String(row.plan_id || "");
        var raw_plan_name = String(row.plan_name || "");
        var plan_name = raw_plan_name;
        // Remap old names to new standard names
        if (plan_id === "high-profit")
            plan_name = "กลุ่มที่ 1 (กำไรสูง)";
        if (plan_id === "medium-profit")
            plan_name = "กลุ่มที่ 2 (กำไรปานกลาง)";
        if (plan_id === "flat-rate")
            plan_name = "กลุ่มที่ 3 (ราคาเท่ากัน)";
        return {
            plan_id: plan_id,
            plan_name: plan_name,
            group: String(row.group || ""),
            price: toNumber(row.price, 0),
            active: toBoolean(row.active),
            display_order: row.display_order ? Number(row.display_order) : undefined
        };
    });
}
function catalogToWorkbook(catalog) {
    var techniciansSheet = XLSX.utils.json_to_sheet(catalog.technicians.map(function (item) { return ({
        id: item.id,
        name: item.name,
        group: item.group,
        base_price: item.basePrice,
        active: item.active ? "true" : "false"
    }); }));
    var multipliersSheet = XLSX.utils.json_to_sheet(catalog.multipliers.map(function (item) { return ({
        id: item.id,
        category: item.category,
        name: item.name,
        multiplier: item.multiplier,
        active: item.active ? "true" : "false"
    }); }));
    var workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, techniciansSheet, "Technicians");
    XLSX.utils.book_append_sheet(workbook, multipliersSheet, "Multipliers");
    if (catalog.pricingPlans) {
        var pricingPlansSheet = XLSX.utils.json_to_sheet(catalog.pricingPlans.map(function (item) { return ({
            plan_id: item.plan_id,
            plan_name: item.plan_name,
            group: item.group,
            price: item.price,
            active: item.active ? "true" : "false",
            display_order: item.display_order
        }); }));
        XLSX.utils.book_append_sheet(workbook, pricingPlansSheet, "PricingPlans");
    }
    return workbook;
}
function createTemplateWorkbook(catalog) {
    return catalogToWorkbook(catalog);
}
