import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
const pdf = require("pdf-parse");

function findTahomaFont(): string {
  const possiblePaths = [
    "C:\\Windows\\Fonts\\tahoma.ttf",
    "C:\\Windows\\Fonts\\Tahoma.ttf",
    "C:\\Windows\\Fonts\\TAHOMA.TTF",
    "/Library/Fonts/Tahoma.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/tahoma.ttf",
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  
  // Fallback: search C:\Windows\Fonts
  const fontsDir = "C:\\Windows\\Fonts";
  if (fs.existsSync(fontsDir)) {
    const files = fs.readdirSync(fontsDir);
    const found = files.find(f => f.toLowerCase() === "tahoma.ttf");
    if (found) {
      return path.join(fontsDir, found);
    }
  }
  
  // Check if public/fonts/NotoSansThai-Regular.ttf already exists
  const fallbackPath = "public/fonts/NotoSansThai-Regular.ttf";
  if (fs.existsSync(fallbackPath)) {
    console.log(`System Tahoma font not found. Reusing existing fallback font: ${fallbackPath}`);
    return fallbackPath;
  }
  
  throw new Error("tahoma.ttf not found on system.");
}

async function runTest() {
  console.log("Locating system font tahoma.ttf...");
  const fontPath = findTahomaFont();
  console.log(`Found font at: ${fontPath}`);

  // Read font file
  const fontBuffer = fs.readFileSync(fontPath);
  const base64 = fontBuffer.toString("base64");

  // Overwrite the TTF file at public/fonts/NotoSansThai-Regular.ttf
  const publicFontDir = "public/fonts";
  if (!fs.existsSync(publicFontDir)) {
    fs.mkdirSync(publicFontDir, { recursive: true });
  }
  const targetPublicFontPath = path.join(publicFontDir, "NotoSansThai-Regular.ttf");
  fs.writeFileSync(targetPublicFontPath, fontBuffer);
  console.log(`Successfully wrote font to ${targetPublicFontPath}`);

  // Write base64 to src/lib/fonts.ts
  const srcLibDir = "src/lib";
  if (!fs.existsSync(srcLibDir)) {
    fs.mkdirSync(srcLibDir, { recursive: true });
  }
  const targetFontsTsPath = path.join(srcLibDir, "fonts.ts");
  fs.writeFileSync(targetFontsTsPath, `export const NotoSansThaiBase64 = "${base64}";\n`);
  console.log(`Successfully wrote font base64 to ${targetFontsTsPath}`);

  // Create PDF doc
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  try {
    doc.addFileToVFS("NotoSansThai.ttf", base64);
    doc.addFont("NotoSansThai.ttf", "NotoSansThai", "normal");
    doc.setFont("NotoSansThai", "normal");
  } catch (err) {
    console.error("Failed to load Thai font into jsPDF:", err);
    process.exit(1);
  }

  const testString = "ABC abc 1234567890 ทดสอบ";
  doc.setFontSize(18);
  doc.text(testString, 40, 100);

  const arrayBuffer = doc.output("arraybuffer");
  const buffer = Buffer.from(arrayBuffer);

  // Write test PDF file to test-output/test-pdf-thai.pdf
  const testOutputDir = "test-output";
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir);
  }
  const testPdfPath = path.join(testOutputDir, "test-pdf-thai.pdf");
  fs.writeFileSync(testPdfPath, buffer);
  console.log(`Generated test PDF at ${testPdfPath}`);

  // Parse PDF with pdf-parse
  console.log("Parsing generated PDF with pdf-parse...");
  try {
    const uint8 = new Uint8Array(buffer);
    const parser = new pdf.PDFParse(uint8);
    const data = await parser.getText();
    const extractedText = data.text;
    console.log("Extracted Text:", JSON.stringify(extractedText));

    if (extractedText.includes(testString)) {
      console.log(`✅ Success! Found the exact string: "${testString}"`);
      process.exit(0);
    } else {
      console.error(`❌ Error: Extracted text does not contain the exact string: "${testString}"`);
      process.exit(1);
    }
  } catch (err) {
    console.error("Failed to parse PDF:", err);
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
