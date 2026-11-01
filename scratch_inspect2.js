const ExcelJS = require('exceljs');

async function run() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('data/nepal_cooperative_4_khata_kyc_vba_system.xlsx');
  
  const wsAssets = wb.worksheets[1]; // Sheet 2 (Assets)
  const wsLiab = wb.worksheets[2]; // Sheet 3 (Liab)
  
  console.log('--- Assets Sheet Row 6 (Opening) ---');
  for (let c = 1; c <= 26; c++) {
    const val = wsAssets.getRow(6).getCell(c).value;
    if (val !== null && val !== undefined && val !== '') {
      console.log(`Col ${c}:`, JSON.stringify(val));
    }
  }

  console.log('--- Assets Sheet Row 23 (Total) ---');
  for (let c = 1; c <= 26; c++) {
    const val = wsAssets.getRow(23).getCell(c).value;
    if (val !== null && val !== undefined && val !== '') {
      console.log(`Col ${c}:`, JSON.stringify(val));
    }
  }

  console.log('--- Liab Sheet Row 6 (Opening) ---');
  for (let c = 1; c <= 26; c++) {
    const val = wsLiab.getRow(6).getCell(c).value;
    if (val !== null && val !== undefined && val !== '') {
      console.log(`Col ${c}:`, JSON.stringify(val));
    }
  }

  console.log('--- Liab Sheet Row 23 (Total) ---');
  for (let c = 1; c <= 26; c++) {
    const val = wsLiab.getRow(23).getCell(c).value;
    if (val !== null && val !== undefined && val !== '') {
      console.log(`Col ${c}:`, JSON.stringify(val));
    }
  }
}

run().catch(console.error);

