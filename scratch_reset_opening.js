const ExcelJS = require('exceljs');

async function resetFakeOpeningBals() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('data/nepal_cooperative_4_khata_kyc_vba_system.xlsx');
  
  // Sheet 7 = index 6 (Share subledger)
  // Sheet 8 = index 7 (Bachat subledger)
  // Sheet 9 = index 8 (Loan subledger)
  const sheets = [
    { idx: 6, name: 'Share (Sheet 7)' },
    { idx: 7, name: 'Bachat (Sheet 8)' },
    { idx: 8, name: 'Loan (Sheet 9)' },
  ];
  
  for (const s of sheets) {
    const ws = wb.worksheets[s.idx];
    const a5 = ws.getRow(5).getCell(1);
    console.log(`${s.name} A5 before:`, a5.value);
    a5.value = 0;
    ws.getRow(5).commit();
    console.log(`${s.name} A5 after:`, ws.getRow(5).getCell(1).value);
  }
  
  // Also clear stale cached formula results in Sheet 10 rows 5-9 (cols 5,6,7)
  const wsTB = wb.worksheets[9]; // Sheet 10
  console.log('Trial Balance sheet name:', wsTB.name);
  
  for (let row = 5; row <= 9; row++) {
    const r = wsTB.getRow(row);
    for (let col = 5; col <= 8; col++) {
      const cell = r.getCell(col);
      // Clear stale formula results - replace formula objects with 0
      if (cell.value && typeof cell.value === 'object' && cell.value.formula) {
        cell.value = { formula: cell.value.formula, result: 0 };
      } else if (typeof cell.value === 'number') {
        cell.value = 0;
      }
    }
    r.commit();
  }
  
  await wb.xlsx.writeFile('data/nepal_cooperative_4_khata_kyc_vba_system.xlsx');
  console.log('Done! File saved.');
}

resetFakeOpeningBals().catch(console.error);

