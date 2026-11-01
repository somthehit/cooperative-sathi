import ExcelJS from "exceljs";

function getCellStr(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val.richText) {
    return val.richText.map((t: any) => t.text).join("");
  }
  return String(val);
}

async function inspect() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("data/nepal_cooperative_4_khata_kyc_vba_system.xlsx");
  
  [2, 3, 4, 5].forEach((idx) => {
    const ws = wb.worksheets[idx - 1];
    console.log(`\n========================================`);
    console.log(`SHEET ${idx}: ${ws.name}`);
    console.log(`========================================`);
    const r4 = ws.getRow(4);
    const r5 = ws.getRow(5);
    for (let c = 1; c <= 30; c++) {
      const v4 = getCellStr(r4.getCell(c).value).trim();
      const v5 = getCellStr(r5.getCell(c).value).trim();
      if (v4 || v5) {
        console.log(`  Col ${c}: Header="${v4}" | Sub="${v5}"`);
      }
    }
  });
}
inspect();
