"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Scale,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  Columns,
  Minimize2,
  Maximize2,
  X,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";

// Clean and parse multi-line or paren-delimited COA headers
function cleanHeaderTitle(rawText: string) {
  if (!rawText) return { main: "", sub: "", code: "" };
  let cleaned = String(rawText).trim();

  // Remove redundant "हिसाब" where it clutters titles
  cleaned = cleaned.replace(/लगानी हिसाब/g, "लगानी");
  cleaned = cleaned.replace(/अनुदान हिसाब/g, "अनुदान");
  cleaned = cleaned.replace(/खरिद हिसाब/g, "खरिद");
  cleaned = cleaned.replace(/बिक्री हिसाब/g, "बिक्री");

  // Handle newline separation (Sheet 4/5/10 headers often have \n)
  if (cleaned.includes("\n")) {
    const parts = cleaned.split("\n");
    let main = parts[0].trim();
    let sub = parts.slice(1).join(" ").trim().replace(/^\((.*)\)$/, "$1");
    const m = main.match(/^(\d+(\.\d+)?)\s+(.*)$/);
    if (m) {
      return { code: m[1], main: m[3], sub };
    }
    return { main, sub, code: "" };
  }

  // Handle parentheses: e.g. "लगानी (Investment - 100)" or "नगद मौज्दात (Cash - 80)"
  const parenMatch = cleaned.match(/^(.*?)\s*\((.*?)\)$/);
  if (parenMatch) {
    let main = parenMatch[1].trim();
    let subContent = parenMatch[2].trim();
    const codeMatch = subContent.match(/^(.*?)\s*-\s*(\d+)$/);
    if (codeMatch) {
      return { main, sub: codeMatch[1].trim(), code: codeMatch[2].trim() };
    }
    return { main, sub: subContent, code: "" };
  }

  return { main: cleaned, sub: "", code: "" };
}

export default function KhatasPage() {
  const [activeSheetIndex, setActiveSheetIndex] = useState(2); // 2: Assets, 3: Liability, 4: Expenses, 5: Income, 10: Trial Balance
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgSettings, setOrgSettings] = useState<any>(null);
  const [isCompact, setIsCompact] = useState(true); // Default to compact dense mode
  const [activeHeadFilter, setActiveHeadFilter] = useState<number | "all">("all");

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
    setActiveHeadFilter("all");
    setSearch("");
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

  const rows: any[][] = data?.rows || [];
  const headers: string[][] = data?.headers || [];
  const totalRow: any[] = data?.totalRow || [];

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r: any[]) =>
      r.some((cell) => String(cell ?? "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  // Group consecutive identical Tier 1 headers to show clean COA account heads with colSpan
  const headerGroups = useMemo(() => {
    if (!headers || headers.length <= 1) return [];
    const row = headers[0];
    const groups: {
      text: string;
      colSpan: number;
      startIndex: number;
      endIndex: number;
    }[] = [];
    let currentText = "";
    let currentSpan = 0;
    let startIdx = 0;

    for (let i = 0; i < row.length; i++) {
      const text = (row[i] || "").trim();
      if (i === 0) {
        currentText = text;
        currentSpan = 1;
        startIdx = 0;
      } else if (text === currentText && text !== "") {
        currentSpan++;
      } else {
        groups.push({
          text: currentText,
          colSpan: currentSpan,
          startIndex: startIdx,
          endIndex: i - 1,
        });
        currentText = text;
        currentSpan = 1;
        startIdx = i;
      }
    }
    if (currentSpan > 0) {
      groups.push({
        text: currentText,
        colSpan: currentSpan,
        startIndex: startIdx,
        endIndex: row.length - 1,
      });
    }
    return groups;
  }, [headers]);

  // Determine active visible column indices based on activeHeadFilter
  const visibleColumnIndices = useMemo(() => {
    if (headers.length <= 1 || activeHeadFilter === "all" || headerGroups.length === 0) {
      const totalCols = headers[headers.length - 1]?.length || 0;
      return Array.from({ length: totalCols }, (_, i) => i);
    }

    const group = headerGroups[activeHeadFilter];
    if (!group) {
      const totalCols = headers[headers.length - 1]?.length || 0;
      return Array.from({ length: totalCols }, (_, i) => i);
    }

    // Always include General Info cols (0, 1, 2, 3), selected head cols, and Final Total col (last col)
    const indices = [0, 1, 2, 3];
    for (let i = group.startIndex; i <= group.endIndex; i++) {
      if (!indices.includes(i)) indices.push(i);
    }
    const lastColIdx = (headers[headers.length - 1]?.length || 1) - 1;
    if (!indices.includes(lastColIdx) && lastColIdx > 3) {
      indices.push(lastColIdx);
    }
    return indices;
  }, [headers, activeHeadFilter, headerGroups]);

  const currentTab = khataTabs.find((t) => t.index === activeSheetIndex);

  // Clean sheet title for user-facing badges
  const cleanSheetTitle = currentTab?.labelNep || data?.sheetName?.replace(/_/g, " ") || "";

  return (
    <div className="space-y-4 print:space-y-2">
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
            खाता लेजर: <strong className="text-slate-950 font-black">{cleanSheetTitle}</strong> ({currentTab?.labelEng})
          </span>
          <span suppressHydrationWarning>
            आर्थिक वर्ष: {orgSettings?.fiscalYear || "२०८३/८४"} | प्रिन्ट मिति: {new Date().toISOString().split("T")[0]}
          </span>
        </div>
      </div>

      {/* Top Banner (Screen Only - Compact & Executive) */}
      <div className="no-print bg-white rounded-xl px-5 py-3.5 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#1F497D] text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">
              Sheet {activeSheetIndex}
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              ४-मूल खाता बहु-स्तम्भ लेजर (Multi-Column Khata Explorer)
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            प्रत्यक्ष एक्सेल स्प्रेडशिट ढाँचा • COA समूह स्तम्भ तथा वास्तविक मौज्दात (Real-time Live Balances)
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Density Toggle (Compact vs Normal) */}
          <button
            onClick={() => setIsCompact(!isCompact)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              isCompact
                ? "bg-amber-50 text-amber-900 border-amber-300 shadow-sm"
                : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
            title="सघन (Compact) वा सामान्य (Standard) स्तम्भ चौडाई छनोट"
          >
            {isCompact ? <Minimize2 className="w-3.5 h-3.5 text-amber-600" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-500" />}
            <span>{isCompact ? "सघन मोड (Compact)" : "सामान्य मोड (Normal)"}</span>
          </button>

          <a
            href="/api/excel/download"
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>एक्सेल (.xlsx)</span>
          </a>

          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-300"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>प्रिन्ट</span>
          </button>

          <button
            onClick={() => loadKhata(activeSheetIndex)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-300 transition-colors"
            title="ताजा गर्नुहोस् (Refresh)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#1F497D]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Khata Selector Tabs (Screen Only - Sleek & Compact) */}
      <div className="no-print flex flex-wrap gap-1.5 bg-slate-200/70 p-1.5 rounded-xl text-xs font-bold no-scrollbar border border-slate-300/60">
        {khataTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSheetIndex === tab.index;
          return (
            <button
              key={tab.index}
              onClick={() => {
                setActiveSheetIndex(tab.index);
                setSearch("");
                setActiveHeadFilter("all");
              }}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? "bg-[#1F497D] text-white shadow font-black"
                  : "bg-white/70 hover:bg-white text-slate-700"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-300" : "text-slate-500"}`} />
              <div className="text-left">
                <div className="leading-none text-xs">{tab.labelNep}</div>
                <div className="text-[9.5px] opacity-75 font-normal mt-0.5">{tab.labelEng}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search / Filter / Account Focus Pill Bar (Screen Only) */}
      <div className="no-print bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="भौचर नं, मिति वा कारोबार विवरण खोज्नुहोस्..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1F497D]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Clean Account Title Badge */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-medium">खाता:</span>
            <span className="font-extrabold text-[#1F497D] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
              {cleanSheetTitle}
            </span>
            <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
              ({currentTab?.labelEng})
            </span>
            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-300">
              प्रविष्टि: {filteredRows.length}
            </span>
          </div>
        </div>

        {/* Account Head Quick Jump / Filter Pills (For Sheets 2 and 3) */}
        {headerGroups.length > 2 && (
          <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10.5px] font-bold text-slate-500 flex items-center whitespace-nowrap pl-0.5">
              <Filter className="w-3 h-3 mr-1 text-[#1F497D]" />
              स्तम्भ फोकस:
            </span>
            <button
              onClick={() => setActiveHeadFilter("all")}
              className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all whitespace-nowrap ${
                activeHeadFilter === "all"
                  ? "bg-[#1F497D] text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              सबै स्तम्भहरू (All Columns)
            </button>
            {headerGroups.slice(1, -1).map((group, idx) => {
              const actualIdx = idx + 1;
              const titleInfo = cleanHeaderTitle(group.text);
              const isSelected = activeHeadFilter === actualIdx;
              return (
                <button
                  key={actualIdx}
                  onClick={() => setActiveHeadFilter(isSelected ? "all" : actualIdx)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all whitespace-nowrap border ${
                    isSelected
                      ? "bg-[#183a63] text-amber-300 border-[#183a63] shadow-sm ring-1 ring-amber-400"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {titleInfo.code && (
                    <span className="bg-slate-200/80 text-slate-800 text-[9px] px-1 rounded font-mono">
                      {titleInfo.code}
                    </span>
                  )}
                  <span>{titleInfo.main}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Multi-Column Ledger Spreadsheet Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#1F497D]" />
            खाता विवरण एक्सेलबाट लोड हुँदैछ...
          </div>
        ) : (
          <div className="overflow-x-auto khata-scroll max-h-[72vh] relative">
            <table
              className={`w-full text-left border-separate border-spacing-0 ${
                isCompact ? "text-[11px]" : "text-xs"
              } ${activeSheetIndex === 10 ? "" : "whitespace-nowrap"}`}
            >
              {/* Table Headers */}
              <thead className="bg-[#1F497D] text-white sticky top-0 z-20 shadow-sm">
                {headers.length > 1 ? (
                  <>
                    {/* Tier 1: Chart of Accounts (COA) Group Heads */}
                    <tr className="bg-[#142d4c] text-white">
                      {headerGroups
                        .filter((group, gIdx) => {
                          if (activeHeadFilter === "all") return true;
                          // Keep Group 0 (General Info), the active selected head, and Group last (Total)
                          return (
                            gIdx === 0 ||
                            gIdx === activeHeadFilter ||
                            gIdx === headerGroups.length - 1
                          );
                        })
                        .map((group, gIdx) => {
                          const titleInfo = cleanHeaderTitle(group.text);
                          const isGeneralInfo = gIdx === 0;
                          return (
                            <th
                              key={gIdx}
                              colSpan={group.colSpan}
                              className={`${
                                isCompact ? "py-1.5 px-2" : "py-2.5 px-3"
                              } font-bold border-r border-[#244b7a] border-b border-[#244b7a] text-center ${
                                isGeneralInfo
                                  ? "sticky left-0 z-30 bg-[#142d4c] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.35)]"
                                  : ""
                              }`}
                            >
                              <div className="flex flex-col items-center justify-center leading-tight">
                                <div className="flex items-center space-x-1">
                                  {titleInfo.code && (
                                    <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] px-1 py-0.2 rounded font-mono font-bold tracking-normal">
                                      {titleInfo.code}
                                    </span>
                                  )}
                                  <span className="font-bold text-amber-300 text-[11px] sm:text-xs tracking-normal whitespace-nowrap">
                                    {titleInfo.main}
                                  </span>
                                </div>
                                {titleInfo.sub && (
                                  <span className="text-[9px] text-slate-300 font-normal opacity-85 tracking-normal whitespace-nowrap mt-0.5">
                                    {titleInfo.sub}
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                    </tr>

                    {/* Tier 2: Sub-columns (Dr, Cr, Bal, SN, Date, Particulars, etc.) */}
                    <tr className="bg-[#1F497D]">
                      {visibleColumnIndices.map((cIdx: number) => {
                        const cellText = headers[1]?.[cIdx] || "";
                        const isDr = cellText.includes("डेबिट") || cellText.includes("Dr");
                        const isCr = cellText.includes("क्रेडिट") || cellText.includes("Cr");
                        const isBal = cellText.includes("मौज्दात") || cellText.includes("Bal");

                        let mainLabel = cellText;
                        let subLabel = "";

                        if (isDr) {
                          mainLabel = "डेबिट";
                          subLabel = activeSheetIndex === 3 ? "Dr (-)" : "Dr (+)";
                        } else if (isCr) {
                          mainLabel = "क्रेडिट";
                          subLabel = activeSheetIndex === 3 ? "Cr (+)" : "Cr (-)";
                        } else if (isBal) {
                          mainLabel = "मौज्दात";
                          subLabel = "Bal";
                        } else {
                          const pMatch = cellText.match(/^(.*?)\s*\((.*?)\)$/);
                          if (pMatch) {
                            mainLabel = pMatch[1].trim();
                            subLabel = pMatch[2].trim();
                          }
                        }

                        // Sticky coordinates for first 4 general info columns
                        const isStickyCol = cIdx < 4;
                        let stickyStyle = "";
                        if (cIdx === 0) {
                          stickyStyle = "sticky left-0 z-30 bg-[#1F497D] min-w-[42px] max-w-[42px]";
                        } else if (cIdx === 1) {
                          stickyStyle = "sticky left-[42px] z-30 bg-[#1F497D] min-w-[82px] max-w-[82px]";
                        } else if (cIdx === 2) {
                          stickyStyle = `sticky left-[124px] z-30 bg-[#1F497D] ${
                            isCompact ? "min-w-[160px] max-w-[200px]" : "min-w-[190px] max-w-[240px]"
                          }`;
                        } else if (cIdx === 3) {
                          stickyStyle = "sticky left-[284px] z-30 bg-[#1F497D] min-w-[72px] max-w-[72px] border-r-2 border-slate-400 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.25)]";
                        }

                        return (
                          <th
                            key={cIdx}
                            className={`${
                              isCompact ? "py-1 px-1.5" : "py-2 px-2.5"
                            } font-bold border-r border-[#2E5B88] border-b border-[#2E5B88] text-center leading-tight ${stickyStyle} ${
                              isBal
                                ? "bg-[#183a63] text-amber-200 font-black min-w-[78px]"
                                : isDr
                                ? "bg-[#1c4373] text-sky-200 min-w-[72px]"
                                : isCr
                                ? "bg-[#19406e] text-emerald-200 min-w-[72px]"
                                : ""
                            }`}
                          >
                            <div className="whitespace-nowrap text-[10px]">{mainLabel}</div>
                            {subLabel && (
                              <div className="text-[8.5px] opacity-75 font-normal whitespace-nowrap mt-0.5">
                                {subLabel}
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </>
                ) : (
                  /* Single-Tier Header for Sheets 4, 5, 10 */
                  <tr className="bg-[#1F497D]">
                    {(headers[0] || []).map((cellText: string, cIdx: number) => {
                      const titleInfo = cleanHeaderTitle(cellText);
                      const isSticky = activeSheetIndex !== 10 && cIdx < 4;

                      let stickyStyle = "";
                      if (isSticky) {
                        if (cIdx === 0) stickyStyle = "sticky left-0 z-30 bg-[#1F497D] min-w-[42px] max-w-[42px]";
                        else if (cIdx === 1) stickyStyle = "sticky left-[42px] z-30 bg-[#1F497D] min-w-[82px] max-w-[82px]";
                        else if (cIdx === 2) stickyStyle = `sticky left-[124px] z-30 bg-[#1F497D] ${isCompact ? "min-w-[160px] max-w-[200px]" : "min-w-[190px] max-w-[240px]"}`;
                        else if (cIdx === 3) stickyStyle = "sticky left-[284px] z-30 bg-[#1F497D] min-w-[72px] max-w-[72px] border-r-2 border-slate-400 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.25)]";
                      }

                      return (
                        <th
                          key={cIdx}
                          className={`${
                            isCompact ? "py-1.5 px-2" : "py-2.5 px-3"
                          } font-bold border-r border-[#2E5B88] border-b border-[#2E5B88] text-white text-center leading-tight ${stickyStyle}`}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <div className="flex items-center space-x-1">
                              {titleInfo.code && (
                                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] px-1 rounded font-mono font-bold">
                                  {titleInfo.code}
                                </span>
                              )}
                              <span className="font-bold text-slate-50 text-[10.5px] whitespace-nowrap">
                                {titleInfo.main}
                              </span>
                            </div>
                            {titleInfo.sub && (
                              <span className="text-[9px] text-slate-300 font-normal opacity-85 whitespace-nowrap mt-0.5">
                                {titleInfo.sub}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                )}
              </thead>

              {/* Table Rows */}
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumnIndices.length || 20}
                      className="py-12 text-center text-slate-400"
                    >
                      कुनै प्रविष्टि फेला परेन।
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((rVals: any[], rIdx: number) => {
                    const isOpening =
                      String(rVals[2] || "").includes("प्रारम्भिक") ||
                      String(rVals[3] || "").includes("OB-");
                    const isTotal = String(rVals[0] || "").includes("कुल") || isOpening;

                    const rowBg = isOpening
                      ? "bg-amber-50/90 font-bold text-slate-900 border-b border-amber-200"
                      : isTotal
                      ? "bg-amber-50 font-bold text-slate-900"
                      : rIdx % 2 === 0
                      ? "bg-white hover:bg-blue-50/60"
                      : "bg-slate-50/60 hover:bg-blue-50/60";

                    return (
                      <tr key={rIdx} className={`${rowBg} transition-colors group`}>
                        {visibleColumnIndices.map((cIdx: number) => {
                          const val = rVals[cIdx];
                          const isNumber = typeof val === "number";
                          const headerText = headers[headers.length - 1]?.[cIdx] || "";
                          const isBalCol = headerText.includes("मौज्दात") || headerText.includes("Bal");
                          const isFinalTotalCol = cIdx === rVals.length - 1;
                          const isCenteredCol =
                            activeSheetIndex === 10
                              ? cIdx === 0 || cIdx === 2 || cIdx === 3
                              : cIdx === 0 || cIdx === 1 || cIdx === 3;

                          // Sticky cells for the first 4 general info columns
                          const isStickyCol = activeSheetIndex !== 10 && cIdx < 4;
                          let stickyStyle = "";
                          const cellBgSolid = isOpening
                            ? "bg-amber-50"
                            : rIdx % 2 === 0
                            ? "bg-white group-hover:bg-blue-50/60"
                            : "bg-[#f8fafc] group-hover:bg-blue-50/60";

                          if (isStickyCol) {
                            if (cIdx === 0) stickyStyle = `sticky left-0 z-10 ${cellBgSolid} min-w-[42px] max-w-[42px]`;
                            else if (cIdx === 1) stickyStyle = `sticky left-[42px] z-10 ${cellBgSolid} min-w-[82px] max-w-[82px]`;
                            else if (cIdx === 2) stickyStyle = `sticky left-[124px] z-10 ${cellBgSolid} ${isCompact ? "min-w-[160px] max-w-[200px]" : "min-w-[190px] max-w-[240px]"} truncate`;
                            else if (cIdx === 3) stickyStyle = `sticky left-[284px] z-10 ${cellBgSolid} min-w-[72px] max-w-[72px] border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]`;
                          }

                          return (
                            <td
                              key={cIdx}
                              title={cIdx === 2 ? String(val ?? "") : undefined}
                              className={`${
                                isCompact ? "py-1 px-1.5" : "py-2 px-2.5"
                              } border-r border-slate-100 ${stickyStyle} ${
                                isNumber
                                  ? "text-right font-mono tabular-nums"
                                  : isCenteredCol
                                  ? "text-center font-medium"
                                  : "text-left font-medium"
                              } ${
                                isFinalTotalCol
                                  ? "font-bold text-[#1F497D] bg-blue-50/40"
                                  : isBalCol
                                  ? "font-semibold text-slate-900 bg-amber-50/20"
                                  : ""
                              }`}
                            >
                              {isOpening && cIdx === 0 ? (
                                <span className="bg-amber-200 text-amber-900 text-[9px] font-bold px-1 py-0.5 rounded">
                                  OB
                                </span>
                              ) : isNumber ? (
                                val !== 0 ? (
                                  val.toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  })
                                ) : (
                                  <span className="text-slate-300 font-mono">-</span>
                                )
                              ) : (
                                String(val ?? "")
                              )}
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
                <tfoot className="bg-slate-900 text-white font-black sticky bottom-0 z-20 shadow-lg print:bg-slate-100 print:text-black print:static print:shadow-none">
                  <tr className="print:bg-slate-100">
                    {/* Sticky colSpan for General Info if viewing full 4-Khata */}
                    {visibleColumnIndices.length > 4 && visibleColumnIndices[0] === 0 ? (
                      <>
                        <td
                          colSpan={4}
                          className={`${
                            isCompact ? "py-2 px-2.5" : "py-2.5 px-3"
                          } border-r border-slate-800 text-left font-black text-amber-300 text-xs sticky left-0 z-30 bg-slate-900 border-r-2 border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.35)] print:text-black print:bg-slate-100 print:border-slate-500`}
                        >
                          {String(totalRow[0] || "कुल जम्मा (Total)")}
                        </td>
                        {visibleColumnIndices.slice(4).map((cIdx: number) => {
                          const val = totalRow[cIdx];
                          const isNum = typeof val === "number";
                          return (
                            <td
                              key={cIdx}
                              className={`${
                                isCompact ? "py-2 px-1.5" : "py-2.5 px-2.5"
                              } border-r border-slate-800 ${
                                isNum
                                  ? "text-right font-mono tabular-nums text-amber-300"
                                  : "text-left font-bold"
                              } print:text-black print:bg-slate-100 print:border-slate-500 print:font-black`}
                            >
                              {isNum ? (
                                val !== 0 ? (
                                  val.toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  })
                                ) : (
                                  <span className="text-slate-500 font-mono">-</span>
                                )
                              ) : (
                                String(val ?? "")
                              )}
                            </td>
                          );
                        })}
                      </>
                    ) : (
                      visibleColumnIndices.map((cIdx: number) => {
                        const val = totalRow[cIdx];
                        const isNum = typeof val === "number";
                        return (
                          <td
                            key={cIdx}
                            className={`${
                              isCompact ? "py-2 px-1.5" : "py-2.5 px-2.5"
                            } border-r border-slate-800 ${
                              isNum
                                ? "text-right font-mono tabular-nums text-amber-300"
                                : "text-left font-bold"
                            } print:text-black print:bg-slate-100 print:border-slate-500 print:font-black`}
                          >
                            {isNum ? (
                              val !== 0 ? (
                                val.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                })
                              ) : (
                                <span className="text-slate-500 font-mono">-</span>
                              )
                            ) : (
                              String(val ?? "")
                            )}
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
            <div className="text-[10px] font-normal text-slate-600">
              ({orgSettings?.signatory1Role || "लेखापाल / क्यासियर"})
            </div>
          </div>
          <div>
            <div className="w-40 border-b border-slate-700 mx-auto mb-2"></div>
            <div>{orgSettings?.signatory2Name || "जाँच्ने"}</div>
            <div className="text-[11px] font-bold">{orgSettings?.signatory2Title || "जाँच्ने"}</div>
            <div className="text-[10px] font-normal text-slate-600">
              ({orgSettings?.signatory2Role || "आन्तरिक लेखापरीक्षक"})
            </div>
          </div>
          <div>
            <div className="w-40 border-b border-slate-700 mx-auto mb-2"></div>
            <div>{orgSettings?.signatory3Name || "स्वीकृत गर्ने"}</div>
            <div className="text-[11px] font-bold">{orgSettings?.signatory3Title || "स्वीकृत गर्ने"}</div>
            <div className="text-[10px] font-normal text-slate-600">
              ({orgSettings?.signatory3Role || "व्यवस्थापक / अध्यक्ष"})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
