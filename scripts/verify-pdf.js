"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var jspdf_1 = require("jspdf");
var jspdf_autotable_1 = __importDefault(require("jspdf-autotable"));
var fonts_1 = require("../src/lib/fonts");
var fs_1 = __importDefault(require("fs"));
var PDFParser = require("pdf2json");
function runTest() {
    return __awaiter(this, void 0, void 0, function () {
        var doc, currentY, arrayBuffer, buffer, pdfParser;
        return __generator(this, function (_a) {
            doc = new jspdf_1.jsPDF({ unit: "pt", format: "a4" });
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
                process.exit(1);
            }
            doc.setFontSize(18);
            doc.text("ใบเสนอราคา (Quotation)", 96, 58);
            doc.text("ชื่อโครงการ: ทดสอบระบบ", 40, 112);
            doc.text("ชื่อลูกค้า: บริษัท ไทย จำกัด", 40, 130);
            doc.text("หมายเหตุ: ที่อับอากาศ / ความปลอดภัย", 40, 166);
            doc.text("รายการช่าง", 40, 195);
            (0, jspdf_autotable_1.default)(doc, {
                startY: 205,
                head: [["ลำดับ", "ชื่อช่าง", "กลุ่ม", "ราคาที่ใช้คำนวณ"]],
                body: [
                    ["1", "พี่บอย", "Group A", "2,400"],
                    ["2", "ช่างแอร์", "Group B", "1,500"]
                ],
                styles: { fontSize: 10, cellPadding: 6, font: "NotoSansThai" },
                headStyles: { fillColor: [15, 23, 42] }
            });
            currentY = doc.lastAutoTable.finalY + 15;
            doc.text("ราคารวมก่อนตัวคูณ: 3,900", 40, currentY);
            arrayBuffer = doc.output("arraybuffer");
            buffer = Buffer.from(arrayBuffer);
            // Save for manual inspection if needed
            if (!fs_1.default.existsSync("test-output")) {
                fs_1.default.mkdirSync("test-output");
            }
            fs_1.default.writeFileSync("test-output/test-pdf-thai.pdf", buffer);
            pdfParser = new PDFParser(null, 1);
            pdfParser.on("pdfParser_dataError", function (errData) {
                console.error(errData.parserError);
                process.exit(1);
            });
            pdfParser.on("pdfParser_dataReady", function (pdfData) {
                var text = pdfParser.getRawTextContent();
                var expectedStrings = [
                    "รายการช่าง",
                    "พี่บอย",
                    "ราคารวมก่อนตัวคูณ"
                ];
                var failed = false;
                for (var _i = 0, expectedStrings_1 = expectedStrings; _i < expectedStrings_1.length; _i++) {
                    var str = expectedStrings_1[_i];
                    if (!text.includes(str)) {
                        console.error("\u274C Missing string: \"".concat(str, "\""));
                        failed = true;
                    }
                    else {
                        console.log("\u2705 Found string: \"".concat(str, "\""));
                    }
                }
                if (failed) {
                    console.log("Extracted text:");
                    console.log(text);
                    process.exit(1);
                }
                else {
                    console.log("✅ All Thai strings rendered and extracted correctly. No fallbacks.");
                }
            });
            pdfParser.parseBuffer(buffer);
            return [2 /*return*/];
        });
    });
}
runTest().catch(console.error);
