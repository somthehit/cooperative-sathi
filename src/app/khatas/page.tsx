"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Scale,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Download,
  Printer,
  RefreshCw,
  Search,
  Layers,
} from "lucide-react";

export default function KhatasPage() {
  const [activeSheetIndex, setActiveSheetIndex] = useState(2); // 2: Assets, 3: Liability, 4: Expenses, 5: Income, 10: Trial Balance
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgSettings, setOrgSettings] = useState<any>(null);

  const khataTabs = [
    { index: 2, labelNep: "सम्पत्ति खाता ०४", labelEng: "Assets (Root 04)", icon: Scale },
    { index: 3, labelNep: "दायित्व खाता ०५", labelEng: "Liabilities (Root 05)", icon: Wallet },
    { index: 4, labelNep: "खर्च खाता ०२", labelEng: "Expenses (Root 02)", icon: ArrowDownCircle },
    { index: 5, labelNep: "आम्दानी खाता ०३", labelEng: "Income (Root 03)", icon: ArrowUpCircle },
    { index: 10, labelNep: "सन्तुलन परीक्षण", labelEng: "Trial Balance & Audit", icon: CheckCircle2 },
  ];

  const loadKhata = async (sheetIdx: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/khatas/${sheetIdx}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Khata fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKhata(activeSheetIndex);
  }, [activeSheetIndex]);

  useEffect(() => {
    fetch("/api/settings/org")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.settings) {
          setOrgSettings(json.settings);
        }
      })
      .catch(() => {});
  }, []);

  const rows = data?.rows || [];
  const headers: string[][] = data?.headers || [];
  const totalRow: any[] = data?.totalRow || [];

  const filteredRows = rows.filter((r: any[]) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.some((cell) => String(cell || "").toLowerCase().includes(q));
  });

  // Group consecutive identical Tier 1 headers to show clean COA account heads with colSpan
  const getHeaderGroups = (row: string[]) => {
    const groups: { text: string; colSpan: number }[] = [];
    let currentText = "";
    let currentSpan = 0;

    for (let i = 0; i < row.length; i++) {
      const text = (row[i] || "").trim();
      if (i === 0) {
        currentText = text;
        currentSpan = 1;
      } else if (text === currentText && text !== "") {
        currentSpan++;
      } else {
        groups.push({ text: currentText, colSpan: currentSpan });
        currentText = text;
        currentSpan = 1;
      }
    }
    if (currentSpan > 0) {
      groups.push({ text: currentText, colSpan: currentSpan });
    }
    return groups;
  };

  const currentTab = khataTabs.find((t) => t.index === activeSheetIndex);

  return (
    <div className="space-y-6 print:space-y-2">
      {/* Official Cooperative Print Header (Visible ONLY on Paper) */}
      <div className="print-only text-center border-b-2 border-slate-900 pb-3 mb-3">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          {orgSettings?.nameNep || "नेपाल सहकारी संस्था लि."} ({orgSettings?.nameEng || "Nepal Cooperative Ltd."})
        </h1>
        <p className="text-xs text-slate-700 font-medium">
          {orgSettings?.fullAddress || "पुनर्वास, कञ्चनपुर, सुदूरपश्चिम प्रदेश, नेपाल"} | दर्ता नं: {orgSettings?.regNo || "१२३४/०७५/०७६"}
        </p>
        <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold text-slate-800 border-t border-slate-300 pt-1.5 px-1">
          <span>
            खाता लेजर: <strong className="text-slate-950 font-black">{currentTab?.labelNep || data?.sheetName}</strong> ({currentTab?.labelEng})
          </span>
          <span suppressHydrationWarning>आर्थिक वर्ष: {orgSettings?.fiscalYear || "२०८३/८४"} | प्रिन्ट मिति: {new Date().toISOString().split("T")[0]}</span>
        </div>
      </div>

      {/* Top Banner (Screen Only) */}
      <div className="no-print bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#1F497D] text-white text-[11px] font-bold px-2 py-0.5 rounded">
              Sheet {activeSheetIndex}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ४-मूल खाता बहु-स्तम्भ लेजर (Multi-Column Khata Explorer)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            प्रत्यक्ष एक्सेल स्प्रेडशिट ढाँचा (Chart of Accounts / COA Headings & Real-time Live Balances)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/api/excel/download"
            download
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>लाइभ एक्सेल (.xlsx)</span>
          </a>
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-300"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>प्रिन्ट</span>
          </button>
        </div>
      </div>

      {/* Khata Selector Tabs (Screen Only - Responsive Wrap, Zero Horizontal Scroll) */}
      <div className="no-print flex flex-wrap gap-2 bg-slate-200/80 p-1.5 rounded-2xl text-xs font-bold no-scrollbar">
        {khataTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSheetIndex === tab.index;
          return (
            <button
              key={tab.index}
              onClick={() => { setActiveSheetIndex(tab.index); setSearch(""); }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? "bg-[#1F497D] text-white shadow-md font-black"
                  : "bg-white/60 hover:bg-white text-slate-700"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-slate-500"}`} />
              <div className="text-left">
                <div className="leading-tight">{tab.labelNep}</div>
                <div className="text-[10px] opacity-75 font-normal">{tab.labelEng}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search / Filter in Current Khata (Screen Only) */}
      <div className="no-print flex items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="भौचर नं, मिति वा कारोबार विवरण खोज्नुहोस्..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F497D]"
          />
        </div>
        <div className="text-slate-500 font-medium">
          खाता शीर्षक: <span className="font-bold text-slate-900">{data?.sheetName}</span> (प्रविष्टिहरू: {filteredRows.length})
        </div>
      </div>

      {/* Multi-Column Ledger Spreadsheet Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#1F497D]" />
            खाता विवरण एक्सेलबाट लोड हुँदैछ...
          </div>
        ) : (
          <div className="overflow-x-auto khata-scroll max-h-[70vh]">
            <table className={`w-full text-left border-collapse text-xs ${activeSheetIndex === 10 ? "" : "whitespace-nowrap"}`}>
              {/* Table Headers */}
              <thead className="bg-[#1F497D] text-white sticky top-0 z-20 shadow">
                {headers.length > 1 ? (
                  <>
                    {/* Tier 1: Chart of Accounts (COA) Group Heads */}
                    <tr className="border-b border-[#2E5B88] bg-[#183a63]">
                      {getHeaderGroups(headers[0]).map((group, gIdx) => (
                        <th
                          key={gIdx}
                          colSpan={group.colSpan}
                          className="py-2 px-3 font-extrabold border-r border-[#2E5B88] text-center text-amber-300 text-[11px] uppercase tracking-wide whitespace-pre-line"
                        >
                          {group.text}
                        </th>
                      ))}
                    </tr>
                    {/* Tier 2: Sub-columns (Dr, Cr, Balance, Particulars, etc.) */}
                    <tr className="bg-[#1F497D]">
                      {headers[1].map((cellText: string, cIdx: number) => (
                        <th
                          key={cIdx}
                          className="py-2.5 px-3 font-bold border-r border-[#2E5B88] text-[10px] text-slate-100 whitespace-pre-line text-center"
                        >
                          {cellText}
                        </th>
                      ))}
                    </tr>
                  </>
                ) : (
                  <tr>
                    {(headers[0] || []).map((cellText: string, cIdx: number) => (
                      <th
                        key={cIdx}
                        className={`py-3 px-3 font-bold border-r border-[#2E5B88] text-white ${
                          activeSheetIndex === 10
                            ? "whitespace-pre-line break-words text-center text-[11px] leading-snug py-2.5"
                            : "text-[11px]"
                        }`}
                      >
                        {cellText}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>

              {/* Table Rows */}
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={headers[headers.length - 1]?.length || 20} className="py-8 text-center text-slate-400">
                      कुनै प्रविष्टि फेला परेन।
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((rVals: any[], rIdx: number) => {
                    const isTotal = String(rVals[0] || "").includes("कुल") || String(rVals[1] || "").includes("प्रारम्भिक");
                    return (
                      <tr
                        key={rIdx}
                        className={`${
                          isTotal
                            ? "bg-amber-50 font-bold text-slate-900"
                            : rIdx % 2 === 0
                            ? "bg-white hover:bg-blue-50/50"
                            : "bg-slate-50/50 hover:bg-blue-50/50"
                        } transition-colors`}
                      >
                        {rVals.map((val: any, cIdx: number) => {
                          const isNumber = typeof val === "number";
                          const headerText = headers[headers.length - 1]?.[cIdx] || "";
                          const isBalCol = headerText.includes("मौज्दात") || headerText.includes("Bal");
                          const isFinalTotalCol = cIdx === rVals.length - 1;
                          const isCenteredCol = activeSheetIndex === 10 && (cIdx === 0 || cIdx === 2 || cIdx === 3);
                          return (
                            <td
                              key={cIdx}
                              className={`py-2 px-3 border-r border-slate-100 ${
                                isNumber
                                  ? "text-right font-mono"
                                  : isCenteredCol
                                  ? "text-center font-medium"
                                  : "text-left font-medium"
                              } ${
                                isFinalTotalCol
                                  ? "font-bold text-[#1F497D] bg-blue-50/50"
                                  : isBalCol
                                  ? "font-semibold text-slate-800 bg-slate-50/40"
                                  : ""
                              } ${activeSheetIndex === 10 ? "break-words" : ""}`}
                            >
                              {isNumber
                                ? val !== 0
                                  ? val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                                  : "-"
                                : String(val ?? "")}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Total Footer Row */}
              {totalRow.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-black sticky bottom-0 z-10 shadow-lg print:bg-slate-100 print:text-black print:static print:shadow-none">
                  <tr className="print:bg-slate-100">
                    {totalRow[0] && String(totalRow[0]).includes("कुल") ? (
                      <>
                        <td
                          colSpan={4}
                          className="py-3 px-3 border-r border-slate-800 text-left font-black text-amber-300 text-xs print:text-black print:bg-slate-100 print:border-slate-500"
                        >
                          {String(totalRow[0])}
                        </td>
                        {totalRow.slice(4).map((val: any, cIdx: number) => {
                          const isNum = typeof val === "number";
                          return (
                            <td
                              key={cIdx}
                              className={`py-3 px-3 border-r border-slate-800 ${
                                isNum ? "text-right font-mono text-amber-300" : "text-left font-bold"
                              } print:text-black print:bg-slate-100 print:border-slate-500 print:font-black`}
                            >
                              {isNum
                                ? val !== 0
                                  ? val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                                  : "-"
                                : String(val ?? "")}
                            </td>
                          );
                        })}
                      </>
                    ) : (
                      totalRow.map((val: any, cIdx: number) => {
                        const isNum = typeof val === "number";
                        return (
                          <td
                            key={cIdx}
                            className={`py-3 px-3 border-r border-slate-800 ${
                              isNum ? "text-right font-mono text-amber-300" : "text-left font-bold"
                            } print:text-black print:bg-slate-100 print:border-slate-500 print:font-black`}
                          >
                            {isNum
                              ? val !== 0
                                ? val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                                : "-"
                              : String(val ?? "")}
                          </td>
                        );
                      })
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Official Signature Block (Visible ONLY on Paper) */}
      <div className="print-only mt-10 pt-6 print-avoid-break">
        <div className="grid grid-cols-3 text-center text-xs font-bold text-slate-900">
          <div>
            <div className="w-40 border-b border-slate-700 mx-auto mb-2"></div>
            <div>{orgSettings?.signatory1Name || "तयार गर्ने"}</div>
            <div className="text-[11px] font-bold">{orgSettings?.signatory1Title || "तयार गर्ने"}</div>
            <div className="text-[10px] font-normal text-slate-600">({orgSettings?.signatory1Role || "लेखापाल / क्यासियर"})</div>
          </div>
          <div>
            <div className="w-40 border-b border-slate-700 mx-auto mb-2"></div>
            <div>{orgSettings?.signatory2Name || "जाँच्ने"}</div>
            <div className="text-[11px] font-bold">{orgSettings?.signatory2Title || "जाँच्ने"}</div>
            <div className="text-[10px] font-normal text-slate-600">({orgSettings?.signatory2Role || "आन्तरिक लेखापरीक्षक"})</div>
          </div>
          <div>
            <div className="w-40 border-b border-slate-700 mx-auto mb-2"></div>
            <div>{orgSettings?.signatory3Name || "स्वीकृत गर्ने"}</div>
            <div className="text-[11px] font-bold">{orgSettings?.signatory3Title || "स्वीकृत गर्ने"}</div>
            <div className="text-[10px] font-normal text-slate-600">({orgSettings?.signatory3Role || "व्यवस्थापक / अध्यक्ष"})</div>
          </div>
        </div>
      </div>
    </div>
  );
}
