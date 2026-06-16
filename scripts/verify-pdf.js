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
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var pdf = require("pdf-parse");
function findTahomaFont() {
    var possiblePaths = [
        "C:\\Windows\\Fonts\\tahoma.ttf",
        "C:\\Windows\\Fonts\\Tahoma.ttf",
        "C:\\Windows\\Fonts\\TAHOMA.TTF",
        "/Library/Fonts/Tahoma.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/tahoma.ttf",
    ];
    for (var _i = 0, possiblePaths_1 = possiblePaths; _i < possiblePaths_1.length; _i++) {
        var p = possiblePaths_1[_i];
        if (fs_1.default.existsSync(p)) {
            return p;
        }
    }
    // Fallback: search C:\Windows\Fonts
    var fontsDir = "C:\\Windows\\Fonts";
    if (fs_1.default.existsSync(fontsDir)) {
        var files = fs_1.default.readdirSync(fontsDir);
        var found = files.find(function (f) { return f.toLowerCase() === "tahoma.ttf"; });
        if (found) {
            return path_1.default.join(fontsDir, found);
        }
    }
    // Check if public/fonts/NotoSansThai-Regular.ttf already exists
    var fallbackPath = "public/fonts/NotoSansThai-Regular.ttf";
    if (fs_1.default.existsSync(fallbackPath)) {
        console.log("System Tahoma font not found. Reusing existing fallback font: ".concat(fallbackPath));
        return fallbackPath;
    }
    throw new Error("tahoma.ttf not found on system.");
}
function runTest() {
    return __awaiter(this, void 0, void 0, function () {
        var fontPath, fontBuffer, base64, publicFontDir, targetPublicFontPath, srcLibDir, targetFontsTsPath, doc, testString, arrayBuffer, buffer, testOutputDir, testPdfPath, uint8, parser, data, extractedText, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Locating system font tahoma.ttf...");
                    fontPath = findTahomaFont();
                    console.log("Found font at: ".concat(fontPath));
                    fontBuffer = fs_1.default.readFileSync(fontPath);
                    base64 = fontBuffer.toString("base64");
                    publicFontDir = "public/fonts";
                    if (!fs_1.default.existsSync(publicFontDir)) {
                        fs_1.default.mkdirSync(publicFontDir, { recursive: true });
                    }
                    targetPublicFontPath = path_1.default.join(publicFontDir, "NotoSansThai-Regular.ttf");
                    fs_1.default.writeFileSync(targetPublicFontPath, fontBuffer);
                    console.log("Successfully wrote font to ".concat(targetPublicFontPath));
                    srcLibDir = "src/lib";
                    if (!fs_1.default.existsSync(srcLibDir)) {
                        fs_1.default.mkdirSync(srcLibDir, { recursive: true });
                    }
                    targetFontsTsPath = path_1.default.join(srcLibDir, "fonts.ts");
                    fs_1.default.writeFileSync(targetFontsTsPath, "export const NotoSansThaiBase64 = \"".concat(base64, "\";\n"));
                    console.log("Successfully wrote font base64 to ".concat(targetFontsTsPath));
                    doc = new jspdf_1.jsPDF({ unit: "pt", format: "a4" });
                    try {
                        doc.addFileToVFS("NotoSansThai.ttf", base64);
                        doc.addFont("NotoSansThai.ttf", "NotoSansThai", "normal");
                        doc.setFont("NotoSansThai", "normal");
                    }
                    catch (err) {
                        console.error("Failed to load Thai font into jsPDF:", err);
                        process.exit(1);
                    }
                    testString = "ABC abc 1234567890 ทดสอบ";
                    doc.setFontSize(18);
                    doc.text(testString, 40, 100);
                    arrayBuffer = doc.output("arraybuffer");
                    buffer = Buffer.from(arrayBuffer);
                    testOutputDir = "test-output";
                    if (!fs_1.default.existsSync(testOutputDir)) {
                        fs_1.default.mkdirSync(testOutputDir);
                    }
                    testPdfPath = path_1.default.join(testOutputDir, "test-pdf-thai.pdf");
                    fs_1.default.writeFileSync(testPdfPath, buffer);
                    console.log("Generated test PDF at ".concat(testPdfPath));
                    // Parse PDF with pdf-parse
                    console.log("Parsing generated PDF with pdf-parse...");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    uint8 = new Uint8Array(buffer);
                    parser = new pdf.PDFParse(uint8);
                    return [4 /*yield*/, parser.getText()];
                case 2:
                    data = _a.sent();
                    extractedText = data.text;
                    console.log("Extracted Text:", JSON.stringify(extractedText));
                    if (extractedText.includes(testString)) {
                        console.log("\u2705 Success! Found the exact string: \"".concat(testString, "\""));
                        process.exit(0);
                    }
                    else {
                        console.error("\u274C Error: Extracted text does not contain the exact string: \"".concat(testString, "\""));
                        process.exit(1);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    console.error("Failed to parse PDF:", err_1);
                    process.exit(1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
runTest().catch(function (err) {
    console.error(err);
    process.exit(1);
});
