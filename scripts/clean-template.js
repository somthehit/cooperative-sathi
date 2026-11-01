const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function cleanWorkbookToPristine(filePath) {
  console.log(`Processing pristine clean on: ${filePath}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  // 1. Dashboard (Sheet 1)
  const wsDash = wb.getWorksheet('ड्यासबोर्ड_Dashboard');
  if (wsDash) {
    ['C6', 'E6', 'G6', 'I6', 'C11', 'E11', 'G11', 'I11'].forEach(cellRef => {
      try {
        const c = wsDash.getCell(cellRef);
        c.value = 0;
      } catch (e) {}
    });
  }

  // 2. Assets (Sheet 2)
  const wsAssets = wb.getWorksheet('सम्पत्ति_खाता_Assets');
  if (wsAssets) {
    // Find where Total row currently is
    let totIdx = -1;
    for (let r = 7; r <= wsAssets.rowCount; r++) {
      const t = wsAssets.getRow(r).getCell(1).text || '';
      if (t.includes('कुल') || t.includes('Total')) {
        totIdx = r;
        break;
      }
    }
    if (totIdx > 23) {
      wsAssets.spliceRows(23, totIdx - 23);
    }
    // Clear any trailing rows beyond 23
    for (let r = 24; r <= wsAssets.rowCount; r++) {
      wsAssets.getRow(r).values = [];
    }

    // Row 6 (Opening Balance)
    const r6 = wsAssets.getRow(6);
    r6.getCell(1).value = null;
    r6.getCell(2).value = null;
    r6.getCell(3).value = 'प्रारम्भिक सम्पत्ति मौज्दात (Opening Assets B/F)';
    r6.getCell(4).value = 'OB-001';
    for (let c = 5; c <= 25; c++) r6.getCell(c).value = 0;
    r6.getCell(26).value = { formula: 'G6+J6+M6+P6+S6+V6+Y6', result: 0 };
    r6.commit();

    // Rows 7 to 22 (16 template entry rows)
    for (let r = 7; r <= 22; r++) {
      const row = wsAssets.getRow(r);
      row.getCell(1).value = r - 6;
      row.getCell(2).value = null;
      row.getCell(3).value = null;
      row.getCell(4).value = null;
      row.getCell(5).value = null;
      row.getCell(6).value = null;
      row.getCell(7).value = { formula: `IF($B${r}="","",$G$6+SUM($E$7:E${r})-SUM($F$7:F${r}))`, result: null };
      row.getCell(8).value = null;
      row.getCell(9).value = null;
      row.getCell(10).value = { formula: `IF($B${r}="","",$J$6+SUM($H$7:H${r})-SUM($I$7:I${r}))`, result: null };
      row.getCell(11).value = null;
      row.getCell(12).value = null;
      row.getCell(13).value = { formula: `IF($B${r}="","",$M$6+SUM($K$7:K${r})-SUM($L$7:L${r}))`, result: null };
      row.getCell(14).value = null;
      row.getCell(15).value = null;
      row.getCell(16).value = { formula: `IF($B${r}="","",$P$6+SUM($N$7:N${r})-SUM($O$7:O${r}))`, result: null };
      row.getCell(17).value = null;
      row.getCell(18).value = null;
      row.getCell(19).value = { formula: `IF($B${r}="","",$S$6+SUM($Q$7:Q${r})-SUM($R$7:R${r}))`, result: null };
      row.getCell(20).value = null;
      row.getCell(21).value = null;
      row.getCell(22).value = { formula: `IF($B${r}="","",$V$6+SUM($U$7:U${r})-SUM($T$7:T${r}))`, result: null };
      row.getCell(23).value = null;
      row.getCell(24).value = null;
      row.getCell(25).value = { formula: `IF($B${r}="","",$Y$6+SUM($X$7:X${r})-SUM($W$7:W${r}))`, result: null };
      row.getCell(26).value = { formula: `IF($B${r}="","",G${r}+J${r}+M${r}+P${r}+S${r}+V${r}+Y${r})`, result: null };
      row.commit();
    }

    // Row 23 (Total Row)
    const r23 = wsAssets.getRow(23);
    r23.getCell(5).value = { formula: 'SUM(E7:E22)', result: 0 };
    r23.getCell(6).value = { formula: 'SUM(F7:F22)', result: 0 };
    r23.getCell(7).value = { formula: '$G$6+E23-F23', result: 0 };
    r23.getCell(8).value = { formula: 'SUM(H7:H22)', result: 0 };
    r23.getCell(9).value = { formula: 'SUM(I7:I22)', result: 0 };
    r23.getCell(10).value = { formula: '$J$6+H23-I23', result: 0 };
    r23.getCell(11).value = { formula: 'SUM(K7:K22)', result: 0 };
    r23.getCell(12).value = { formula: 'SUM(L7:L22)', result: 0 };
    r23.getCell(13).value = { formula: '$M$6+K23-L23', result: 0 };
    r23.getCell(14).value = { formula: 'SUM(N7:N22)', result: 0 };
    r23.getCell(15).value = { formula: 'SUM(O7:O22)', result: 0 };
    r23.getCell(16).value = { formula: '$P$6+N23-O23', result: 0 };
    r23.getCell(17).value = { formula: 'SUM(Q7:Q22)', result: 0 };
    r23.getCell(18).value = { formula: 'SUM(R7:R22)', result: 0 };
    r23.getCell(19).value = { formula: '$S$6+Q23-R23', result: 0 };
    r23.getCell(20).value = { formula: 'SUM(T7:T22)', result: 0 };
    r23.getCell(21).value = { formula: 'SUM(U7:U22)', result: 0 };
    r23.getCell(22).value = { formula: '$V$6+T23-U23', result: 0 };
    r23.getCell(23).value = { formula: 'SUM(W7:W22)', result: 0 };
    r23.getCell(24).value = { formula: 'SUM(X7:X22)', result: 0 };
    r23.getCell(25).value = { formula: '$Y$6+W23-X23', result: 0 };
    r23.getCell(26).value = { formula: 'G23+J23+M23+P23+S23+V23+Y23', result: 0 };
    r23.commit();
  }

  // 3. Liabilities (Sheet 3)
  const wsLiab = wb.getWorksheet('दायित्व_खाता_Liability');
  if (wsLiab) {
    let totIdx = -1;
    for (let r = 7; r <= wsLiab.rowCount; r++) {
      const t = wsLiab.getRow(r).getCell(1).text || '';
      if (t.includes('कुल') || t.includes('Total')) {
        totIdx = r;
        break;
      }
    }
    if (totIdx > 23) {
      wsLiab.spliceRows(23, totIdx - 23);
    }
    for (let r = 24; r <= wsLiab.rowCount; r++) {
      wsLiab.getRow(r).values = [];
    }

    // Row 6 (Opening Balance)
    const r6 = wsLiab.getRow(6);
    r6.getCell(1).value = null;
    r6.getCell(2).value = null;
    r6.getCell(3).value = 'प्रारम्भिक दायित्व तथा पुँजी मौज्दात (Opening Liab B/F)';
    r6.getCell(4).value = 'OB-001';
    for (let c = 5; c <= 25; c++) r6.getCell(c).value = 0;
    r6.getCell(26).value = { formula: 'G6+J6+M6+P6+S6+V6+Y6', result: 0 };
    r6.commit();

    // Rows 7 to 22
    for (let r = 7; r <= 22; r++) {
      const row = wsLiab.getRow(r);
      row.getCell(1).value = r - 6;
      row.getCell(2).value = null;
      row.getCell(3).value = null;
      row.getCell(4).value = null;
      row.getCell(5).value = null;
      row.getCell(6).value = null;
      row.getCell(7).value = { formula: `IF($B${r}="","",$G$6+SUM($F$7:F${r})-SUM($E$7:E${r}))`, result: null };
      row.getCell(8).value = null;
      row.getCell(9).value = null;
      row.getCell(10).value = { formula: `IF($B${r}="","",$J$6+SUM($I$7:I${r})-SUM($H$7:H${r}))`, result: null };
      row.getCell(11).value = null;
      row.getCell(12).value = null;
      row.getCell(13).value = { formula: `IF($B${r}="","",$M$6+SUM($L$7:L${r})-SUM($K$7:K${r}))`, result: null };
      row.getCell(14).value = null;
      row.getCell(15).value = null;
      row.getCell(16).value = { formula: `IF($B${r}="","",$P$6+SUM($O$7:O${r})-SUM($N$7:N${r}))`, result: null };
      row.getCell(17).value = null;
      row.getCell(18).value = null;
      row.getCell(19).value = { formula: `IF($B${r}="","",$S$6+SUM($R$7:R${r})-SUM($Q$7:Q${r}))`, result: null };
      row.getCell(20).value = null;
      row.getCell(21).value = null;
      row.getCell(22).value = { formula: `IF($B${r}="","",$V$6+SUM($U$7:U${r})-SUM($T$7:T${r}))`, result: null };
      row.getCell(23).value = null;
      row.getCell(24).value = null;
      row.getCell(25).value = { formula: `IF($B${r}="","",$Y$6+SUM($X$7:X${r})-SUM($W$7:W${r}))`, result: null };
      row.getCell(26).value = { formula: `IF($B${r}="","",G${r}+J${r}+M${r}+P${r}+S${r}+V${r}+Y${r})`, result: null };
      row.commit();
    }

    // Row 23 (Total)
    const r23 = wsLiab.getRow(23);
    r23.getCell(5).value = { formula: 'SUM(E7:E22)', result: 0 };
    r23.getCell(6).value = { formula: 'SUM(F7:F22)', result: 0 };
    r23.getCell(7).value = { formula: '$G$6+F23-E23', result: 0 };
    r23.getCell(8).value = { formula: 'SUM(H7:H22)', result: 0 };
    r23.getCell(9).value = { formula: 'SUM(I7:I22)', result: 0 };
    r23.getCell(10).value = { formula: '$J$6+I23-H23', result: 0 };
    r23.getCell(11).value = { formula: 'SUM(K7:K22)', result: 0 };
    r23.getCell(12).value = { formula: 'SUM(L7:L22)', result: 0 };
    r23.getCell(13).value = { formula: '$M$6+L23-K23', result: 0 };
    r23.getCell(14).value = { formula: 'SUM(N7:N22)', result: 0 };
    r23.getCell(15).value = { formula: 'SUM(O7:O22)', result: 0 };
    r23.getCell(16).value = { formula: '$P$6+O23-N23', result: 0 };
    r23.getCell(17).value = { formula: 'SUM(Q7:Q22)', result: 0 };
    r23.getCell(18).value = { formula: 'SUM(R7:R22)', result: 0 };
    r23.getCell(19).value = { formula: '$S$6+R23-Q23', result: 0 };
    r23.getCell(20).value = { formula: 'SUM(T7:T22)', result: 0 };
    r23.getCell(21).value = { formula: 'SUM(U7:U22)', result: 0 };
    r23.getCell(22).value = { formula: '$V$6+U23-T23', result: 0 };
    r23.getCell(23).value = { formula: 'SUM(W7:W22)', result: 0 };
    r23.getCell(24).value = { formula: 'SUM(X7:X22)', result: 0 };
    r23.getCell(25).value = { formula: '$Y$6+X23-W23', result: 0 };
    r23.getCell(26).value = { formula: 'G23+J23+M23+P23+S23+V23+Y23', result: 0 };
    r23.commit();
  }

  // 4. Expenses (Sheet 4)
  const wsExp = wb.getWorksheet('खर्च_खाता_Expenses');
  if (wsExp) {
    let totIdx = -1;
    for (let r = 5; r <= wsExp.rowCount; r++) {
      const t = wsExp.getRow(r).getCell(1).text || '';
      if (t.includes('कुल') || t.includes('Total')) {
        totIdx = r;
        break;
      }
    }
    if (totIdx > 22) {
      wsExp.spliceRows(22, totIdx - 22);
    }
    for (let r = 23; r <= wsExp.rowCount; r++) {
      wsExp.getRow(r).values = [];
    }
    for (let r = 5; r <= 21; r++) {
      const row = wsExp.getRow(r);
      row.getCell(1).value = r - 4;
      row.getCell(2).value = null;
      row.getCell(3).value = null;
      row.getCell(4).value = null;
      for (let c = 5; c <= 20; c++) row.getCell(c).value = null;
      row.getCell(21).value = { formula: `IF($B${r}="","",SUM(E${r}:T${r}))`, result: null };
      row.commit();
    }
    const r22 = wsExp.getRow(22);
    for (let c = 5; c <= 20; c++) {
      const colLetter = String.fromCharCode(64 + c);
      r22.getCell(c).value = { formula: `SUM(${colLetter}5:${colLetter}21)`, result: 0 };
    }
    r22.getCell(21).value = { formula: 'SUM(U5:U21)', result: 0 };
    r22.commit();
  }

  // 5. Income (Sheet 5)
  const wsInc = wb.getWorksheet('आम्दानी_खाता_Income');
  if (wsInc) {
    let totIdx = -1;
    for (let r = 5; r <= wsInc.rowCount; r++) {
      const t = wsInc.getRow(r).getCell(1).text || '';
      if (t.includes('कुल') || t.includes('Total')) {
        totIdx = r;
        break;
      }
    }
    if (totIdx > 22) {
      wsInc.spliceRows(22, totIdx - 22);
    }
    for (let r = 23; r <= wsInc.rowCount; r++) {
      wsInc.getRow(r).values = [];
    }
    for (let r = 5; r <= 21; r++) {
      const row = wsInc.getRow(r);
      row.getCell(1).value = r - 4;
      row.getCell(2).value = null;
      row.getCell(3).value = null;
      row.getCell(4).value = null;
      for (let c = 5; c <= 20; c++) row.getCell(c).value = null;
      row.getCell(21).value = { formula: `IF($B${r}="","",SUM(E${r}:T${r}))`, result: null };
      row.commit();
    }
    const r22 = wsInc.getRow(22);
    for (let c = 5; c <= 20; c++) {
      const colLetter = String.fromCharCode(64 + c);
      r22.getCell(c).value = { formula: `SUM(${colLetter}5:${colLetter}21)`, result: 0 };
    }
    r22.getCell(21).value = { formula: 'SUM(U5:U21)', result: 0 };
    r22.commit();
  }

  // 6. Member (Sheet 6)
  const wsMem = wb.getWorksheet('सदस्य_खाता_Member');
  if (wsMem) {
    for (let r = 17; r <= wsMem.rowCount; r++) {
      wsMem.getRow(r).values = [];
    }
    for (let r = 5; r <= 15; r++) {
      const row = wsMem.getRow(r);
      for (let c = 1; c <= 15; c++) row.getCell(c).value = null;
      row.commit();
    }
    const r16 = wsMem.getRow(16);
    for (let c = 10; c <= 14; c++) r16.getCell(c).value = 0;
    r16.commit();
  }

  // 7. Share (Sheet 7)
  const wsSh = wb.getWorksheet('शेयर_खाता_Share');
  if (wsSh) {
    for (let r = 26; r <= wsSh.rowCount; r++) {
      wsSh.getRow(r).values = [];
    }
    wsSh.getRow(5).getCell(1).value = 0;
    wsSh.getRow(5).getCell(3).value = 0;
    wsSh.getRow(5).getCell(5).value = 0;
    wsSh.getRow(5).getCell(7).value = 0;
    wsSh.getRow(5).commit();
    for (let r = 9; r <= 24; r++) {
      const row = wsSh.getRow(r);
      for (let c = 1; c <= 12; c++) row.getCell(c).value = null;
      row.commit();
    }
    const r25 = wsSh.getRow(25);
    r25.getCell(5).value = 0;
    r25.getCell(6).value = 0;
    r25.commit();
  }

  // 8. Bachat (Sheet 8)
  const wsSav = wb.getWorksheet('बचत_खाता_Bachat');
  if (wsSav) {
    for (let r = 26; r <= wsSav.rowCount; r++) {
      wsSav.getRow(r).values = [];
    }
    wsSav.getRow(5).getCell(1).value = 0;
    wsSav.getRow(5).getCell(3).value = 0;
    wsSav.getRow(5).getCell(5).value = 0;
    wsSav.getRow(5).getCell(7).value = 0;
    wsSav.getRow(5).commit();
    for (let r = 9; r <= 24; r++) {
      const row = wsSav.getRow(r);
      for (let c = 1; c <= 14; c++) row.getCell(c).value = null;
      row.commit();
    }
    const r25 = wsSav.getRow(25);
    r25.getCell(6).value = 0;
    r25.getCell(7).value = 0;
    r25.getCell(8).value = 0;
    r25.commit();
  }

  // 9. Loan (Sheet 9)
  const wsLn = wb.getWorksheet('ऋण_खाता_Loan');
  if (wsLn) {
    for (let r = 26; r <= wsLn.rowCount; r++) {
      wsLn.getRow(r).values = [];
    }
    wsLn.getRow(5).getCell(1).value = 0;
    wsLn.getRow(5).getCell(3).value = 0;
    wsLn.getRow(5).getCell(5).value = 0;
    wsLn.getRow(5).getCell(7).value = 0;
    wsLn.getRow(5).commit();
    for (let r = 9; r <= 24; r++) {
      const row = wsLn.getRow(r);
      for (let c = 1; c <= 15; c++) row.getCell(c).value = null;
      row.commit();
    }
    const r25 = wsLn.getRow(25);
    r25.getCell(6).value = 0;
    r25.getCell(7).value = 0;
    r25.getCell(8).value = 0;
    r25.commit();
  }

  // 10. Trial Balance (Sheet 10)
  const wsTb = wb.getWorksheet('सन्तुलन_परीक्षण');
  if (wsTb) {
    for (let r = 5; r <= 30; r++) {
      const row = wsTb.getRow(r);
      row.getCell(3).value = 0;
      row.getCell(4).value = 0;
      row.commit();
    }
  }

  // Sheet 11 (Users) is preserved intact!

  await wb.xlsx.writeFile(filePath);
  console.log(`Pristine clean successfully written to: ${filePath}`);
}

module.exports = { cleanWorkbookToPristine };

if (require.main === module) {
  (async () => {
    const rootPath = path.join(process.cwd(), 'nepal_cooperative_4_khata_kyc_vba_system.xlsx');
    const dataPath = path.join(process.cwd(), 'data', 'nepal_cooperative_4_khata_kyc_vba_system.xlsx');
    await cleanWorkbookToPristine(rootPath);
    await cleanWorkbookToPristine(dataPath);
    console.log('BOTH EXCEL WORKBOOKS ARE NOW 100% CLEAN AND PRISTINE!');
  })().catch(console.error);
}
