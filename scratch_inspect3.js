const ExcelJS = require('exceljs');

async function run() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('data/nepal_cooperative_4_khata_kyc_vba_system.xlsx');
  const ws = wb.worksheets.find(w => w.name.includes('सन्तुलन') || w.name.includes('Trial'));
  for (let r = 10; r <= 20; r++) {
    const row = ws.getRow(r);
    const rowObj = {};
    for (let c = 1; c <= 8; c++) {
      const v = row.getCell(c).value;
      if (v) {
        rowObj[`C${c}`] = typeof v === 'object' && v.richText ? v.richText.map(t => t.text).join('') : v;
      }
    }
    console.log(`Row ${r}:`, JSON.stringify(rowObj));
  }
}

run().catch(console.error);

