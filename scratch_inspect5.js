const ExcelJS = require('exceljs');

async function run() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('data/nepal_cooperative_4_khata_kyc_vba_system.xlsx');
  
  const wsShare = wb.worksheets[6]; // Sheet 7
  const wsBachat = wb.worksheets[7]; // Sheet 8
  const wsLoan = wb.worksheets[8]; // Sheet 9
  
  console.log('Sheet 7 (Share) A5:', wsShare.getRow(5).getCell(1).value);
  console.log('Sheet 7 Row 25:', wsShare.getRow(25).getCell(10).value);
  
  console.log('Sheet 8 (Bachat) A5:', wsBachat.getRow(5).getCell(1).value);
  console.log('Sheet 8 Row 25:', wsBachat.getRow(25).getCell(10).value);
  
  console.log('Sheet 9 (Loan) A5:', wsLoan.getRow(5).getCell(1).value);
  console.log('Sheet 9 Row 25:', wsLoan.getRow(25).getCell(11).value);
}

run().catch(console.error);

