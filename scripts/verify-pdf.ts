import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { NotoSansThaiBase64 } from "../src/lib/fonts";
import fs from "fs";
const PDFParser = require("pdf2json");

async function runTest() {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  try {
    doc.addFileToVFS("NotoSansThai.ttf", NotoSansThaiBase64);
    doc.addFont("NotoSansThai.ttf", "NotoSansThai", "normal");
    doc.addFont("NotoSansThai.ttf", "NotoSansThai", "bold");
    doc.addFont("NotoSansThai.ttf", "NotoSansThai", "italic");
    doc.addFont("NotoSansThai.ttf", "NotoSansThai", "bolditalic");
    doc.setFont("NotoSansThai", "normal");
  } catch (err) {
    console.error("Failed to load Thai font:", err);
    process.exit(1);
  }

  doc.setFontSize(18);
  doc.text("ใบเสนอราคา (Quotation)", 96, 58);
  doc.text("ชื่อโครงการ: ทดสอบระบบ", 40, 112);
  doc.text("ชื่อลูกค้า: บริษัท ไทย จำกัด", 40, 130);
  doc.text("หมายเหตุ: ที่อับอากาศ / ความปลอดภัย", 40, 166);

  autoTable(doc, {
    startY: 188,
    head: [["ประเภท", "ชื่อ", "กลุ่ม / หมวดหมู่", "ราคา", "ตัวคูณ"]],
    body: [
      ["ช่าง", "พี่บอย", "Group A", "2,400", "-"],
      ["ช่าง", "ช่างแอร์", "Group B", "1,500", "-"],
      ["ตัวคูณ", "ไล่เช็ค ไม่มีแบบ / ความลับสูง", "Security", "-", "1.50"],
      ["ตัวคูณ", "ที่อับอากาศ", "Safety", "-", "1.20"],
      ["ตัวคูณ", "ทำงานกลางคืน", "Time", "-", "2.00"]
    ],
    styles: { fontSize: 10, cellPadding: 6, font: "NotoSansThai" },
    headStyles: { fillColor: [15, 23, 42] }
  });

  const arrayBuffer = doc.output("arraybuffer");
  const buffer = Buffer.from(arrayBuffer);
  
  // Save for manual inspection if needed
  if (!fs.existsSync("test-output")) {
    fs.mkdirSync("test-output");
  }
  fs.writeFileSync("test-output/test-pdf-thai.pdf", buffer);
  
  // Parse PDF
  const pdfParser = new PDFParser(null, 1);
  
  pdfParser.on("pdfParser_dataError", (errData: any) => {
    console.error(errData.parserError);
    process.exit(1);
  });
  
  pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
    const text = pdfParser.getRawTextContent();
    
    const expectedStrings = [
      "ใบเสนอราคา",
      "ชื่อโครงการ",
      "ชื่อลูกค้า",
      "พี่บอย",
      "ที่อับอากาศ",
      "ไล่เช็ค",
      "ไม่มีแบบ"
    ];
    
    let failed = false;
    for (const str of expectedStrings) {
      if (!text.includes(str)) {
        console.error(`❌ Missing string: "${str}"`);
        failed = true;
      } else {
        console.log(`✅ Found string: "${str}"`);
      }
    }
    
    if (failed) {
      console.log("Extracted text:");
      console.log(text);
      process.exit(1);
    } else {
      console.log("✅ All Thai strings rendered and extracted correctly. No fallbacks.");
    }
  });

  pdfParser.parseBuffer(buffer);
}

runTest().catch(console.error);
