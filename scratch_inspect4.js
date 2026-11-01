const ExcelJS = require('exceljs');

async function run() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('data/nepal_cooperative_4_khata_kyc_vba_system.xlsx');
  const ws = wb.worksheets.find(w => w.name.includes('सन्तुलन') || w.name.includes('Trial'));
  for (let r = 12; r <= 22; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      if (cell.value) {
        console.log(`R${r}C${c}:`, JSON.stringify(cell.value));
      }
    }
  }
}

run().catch(console.error);

