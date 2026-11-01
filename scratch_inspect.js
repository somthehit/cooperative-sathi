const ExcelJS = require('exceljs');

async function run() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('data/nepal_cooperative_4_khata_kyc_vba_system.xlsx');
  const ws = wb.worksheets.find(w => w.name.includes('सन्तुलन') || w.name.includes('Trial'));
  console.log('Worksheet:', ws.name, 'RowCount:', ws.rowCount);
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const vals = [];
    for (let c = 1; c <= 10; c++) {
      const val = row.getCell(c).value;
      if (val !== null && val !== undefined && val !== '') {
        vals.push(`C${c}: ` + JSON.stringify(val));
      }
    }
    if (vals.length > 0) {
      console.log(`Row ${r}:`, vals.join(' | '));
    }
  }
}

run().catch(console.error);

