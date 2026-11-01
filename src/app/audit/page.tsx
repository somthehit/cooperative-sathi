"use client";

import { useState, useEffect } from "react";
import {
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RotateCcw,
  Download,
  Printer,
  ShieldCheck,
  Scale,
  Wallet,
  Coins,
  Building,
  Calendar,
  Lock,
  Unlock,
  Layers,
  ChevronRight,
  TrendingUp,
  Percent,
  BookOpen,
  FileSpreadsheet,
} from "lucide-react";

export default function YearEndAuditPage() {
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [posting, setPosting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Step 3 Audit Lock Form state
  const [auditorName, setAuditorName] = useState("सी.ए. सुरेन्द्र कुमार विष्ट");
  const [auditorRegNo, setAuditorRegNo] = useState("ICAN-COP-4812");
  const [auditDate, setAuditDate] = useState("2026-10-31");
  const [auditRemarks, setAuditRemarks] = useState(
    "सहकारी ऐन २०७४ तथा नेपाल राष्ट्र बैंक मापदण्ड अनुसार लेखा परीक्षण सम्पन्न भई वित्तीय विवरणहरू सन्तोषजनक र सन्तुलित पाइएको छ।"
  );

  // Step 6 Rollover Form state
  const [nextFY, setNextFY] = useState("");
  const [nextStart, setNextStart] = useState("");
  const [nextEnd, setNextEnd] = useState("");
  const [rolloverSuccess, setRolloverSuccess] = useState<any>(null);

  // Rollback Modal state
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [rollbackReason, setRollbackReason] = useState("");
  const [rollingBack, setRollingBack] = useState(false);

  // Active sub-tab in Financial Statements (Step 4)
  const [statementTab, setStatementTab] = useState<"tb" | "pl" | "bs" | "cf" | "equity" | "schedules">("bs");

  const loadAuditData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/audit");
      const json = await res.json();
      if (json.success) {
        setAuditData(json);
        if (json.suggestions) {
          setNextFY(json.suggestions.nextFiscalYear || "२०८४/८५");
          setNextStart(json.suggestions.nextFiscalYearStart || "२०८४/०४/०१");
          setNextEnd(json.suggestions.nextFiscalYearEnd || "२०८५/०३/३१");
        }
      } else {
        setNotification({ type: "error", message: json.error || "डाटा लोड गर्न सकिएन।" });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: "त्रुटि: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  const handlePostAdjustments = async () => {
    try {
      setPosting(true);
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "POST_ADJUSTMENTS",
          vouchers: auditData?.proposedAdjustments?.vouchers || [],
          postedBy: "ADMIN (admin)",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({ type: "success", message: json.message });
        await loadAuditData();
        setActiveStep(3); // Advance to Audit Review
      } else {
        setNotification({ type: "error", message: json.error || "समायोजन पोस्ट गर्न सकिएन।" });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: "त्रुटि: " + err.message });
    } finally {
      setPosting(false);
    }
  };

  const handleLockYear = async () => {
    try {
      setPosting(true);
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LOCK_YEAR",
          fyCode: auditData?.activeFY?.fyCode,
          auditorName,
          auditorRegNo,
          auditDate,
          auditRemarks,
          lockedBy: "ADMIN (admin)",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({ type: "success", message: json.message });
        await loadAuditData();
        setActiveStep(4); // Advance to Statements
      } else {
        setNotification({ type: "error", message: json.error || "अडिट लक गर्न सकिएन।" });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: "त्रुटि: " + err.message });
    } finally {
      setPosting(false);
    }
  };

  const handleExecuteRollover = async () => {
    if (
      !confirm(
        `के तपाईं आर्थिक वर्ष ${auditData?.activeFY?.fyCode} बन्द गरी नयाँ आर्थिक वर्ष ${nextFY} को लागि प्रारम्भिक मौज्दात सिर्जना गर्न निश्चित हुनुहुन्छ?\n\n(यस कार्यले चालू वर्षको लेखापरीक्षण ब्याकअप सुरक्षित गरी नयाँ वर्षको खाता खोल्नेछ।)`
      )
    ) {
      return;
    }

    try {
      setPosting(true);
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ROLLOVER",
          currentFiscalYear: auditData?.activeFY?.fyCode,
          nextFiscalYear: nextFY,
          nextFiscalYearStart: nextStart,
          nextFiscalYearEnd: nextEnd,
          auditorName,
          auditorRegNo,
          auditDate,
          auditRemarks,
          statutoryAppropriation: auditData?.appropriation,
          executedBy: "ADMIN (admin)",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRolloverSuccess(json);
        setNotification({ type: "success", message: json.message });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("org-settings-updated", { detail: { fiscalYear: nextFY } }));
        }
        await loadAuditData();
      } else {
        setNotification({ type: "error", message: json.error || "आ.व. बन्द गर्न सकिएन।" });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: "त्रुटि: " + err.message });
    } finally {
      setPosting(false);
    }
  };

  const handleRollback = async () => {
    try {
      setRollingBack(true);
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ROLLBACK",
          fyCode: auditData?.activeFY?.fyCode,
          adminUsername: "ADMIN",
          reason: rollbackReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({ type: "success", message: json.message });
        setShowRollbackModal(false);
        setRolloverSuccess(null);
        await loadAuditData();
      } else {
        setNotification({ type: "error", message: json.error || "पुनः खोल्न सकिएन।" });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: "त्रुटि: " + err.message });
    } finally {
      setRollingBack(false);
    }
  };

  if (loading || !auditData) {
    return (
      <div className="py-24 text-center text-slate-500 max-w-7xl mx-auto">
        <div className="w-12 h-12 border-4 border-[#1F497D] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-bold text-slate-700">वार्षिक लेखापरीक्षण तथा आर्थिक वर्ष बन्द मोड्युल लोड हुँदैछ...</p>
        <p className="text-xs text-slate-400 mt-1">Audit Trail & Year-End Rollover Engine</p>
      </div>
    );
  }

  const steps = [
    { num: 1, titleNep: "१. पूर्व-जाँच", titleEng: "Pre-Closing Checks" },
    { num: 2, titleNep: "२. समायोजन प्रविष्टि", titleEng: "Adjustments & Provisions" },
    { num: 3, titleNep: "३. अडिट समीक्षा", titleEng: "Audit Review & Lock" },
    { num: 4, titleNep: "४. वित्तीय प्रतिवेदन", titleEng: "Financial Statements" },
    { num: 5, titleNep: "५. बचत बाँडफाँड", titleEng: "Statutory Appropriation" },
    { num: 6, titleNep: "६. बन्द र नयाँ मौज्दात", titleEng: "Close & Opening B/F" },
  ];

  const bs = auditData.financialStatements.balanceSheet;
  const inc = auditData.financialStatements.incomeStatement;
  const tb = auditData.financialStatements.trialBalance;
  const app = auditData.appropriation;
  const settings = auditData.orgSettings || {};

  return (
    <div className="max-w-[1700px] w-full mx-auto space-y-6 pb-20 px-2 sm:px-4">
      {/* 1. Header Banner & Letterhead */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-2xl bg-[#1F497D] text-white flex items-center justify-center shadow-md">
            <FileCheck2 className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                आर्थिक वर्ष अन्त्य, लेखापरीक्षण तथा नयाँ मौज्दात
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                आ.व. {auditData.activeFY?.fyCode}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  auditData.activeFY?.status === "AUDITED_LOCKED"
                    ? "bg-purple-100 text-purple-900 border-purple-300"
                    : auditData.activeFY?.status === "CLOSED"
                    ? "bg-slate-200 text-slate-800 border-slate-300"
                    : "bg-amber-100 text-amber-900 border-amber-300"
                }`}
              >
                {auditData.activeFY?.status === "OPEN" && "खुला (OPEN)"}
                {auditData.activeFY?.status === "PRE_CLOSING_CHECKED" && "पूर्व-जाँच सम्पन्न"}
                {auditData.activeFY?.status === "ADJUSTMENTS_POSTED" && "समायोजन पोस्टेड"}
                {auditData.activeFY?.status === "AUDITED_LOCKED" && "अडिट-लक (AUDITED-LOCKED)"}
                {auditData.activeFY?.status === "CLOSED" && "बन्द (CLOSED)"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {settings.nameNep} | दर्ता नं: {settings.regNo} | प्यान: {settings.panNo} | नेपाल सहकारी ऐन २०७४ अनुसार स्वचालित अडिट इन्जिन
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>प्रतिवेदन प्रिन्ट</span>
          </button>
          <a
            href="/api/excel/download"
            download
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>एक्सेल डाटाबेस</span>
          </a>
          <button
            onClick={() => setShowRollbackModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-300 transition-colors"
            title="अघिल्लो ब्याकअपबाट आर्थिक वर्ष पुनः खोल्नुहोस् (Admin Only)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>पुनः खोल्ने (Reopen)</span>
          </button>
        </div>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-md transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
              : "bg-rose-50 text-rose-800 border border-rose-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 font-bold px-2">
            ✕
          </button>
        </div>
      )}

      {/* 2. Step Wizard Progress Indicator */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {steps.map((s) => {
            const isCurrent = activeStep === s.num;
            const isCompleted = activeStep > s.num;
            return (
              <button
                key={s.num}
                onClick={() => setActiveStep(s.num)}
                className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                  isCurrent
                    ? "bg-[#1F497D] text-white border-[#1F497D] shadow-md ring-2 ring-[#1F497D]/20"
                    : isCompleted
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isCurrent ? "text-amber-300" : isCompleted ? "text-emerald-700" : "text-slate-400"}`}>
                    चरण {s.num}
                  </span>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="font-bold text-xs sm:text-sm leading-tight">{s.titleNep}</div>
                <div className={`text-[10px] font-normal leading-tight mt-0.5 ${isCurrent ? "text-slate-200" : "text-slate-400"}`}>{s.titleEng}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. STEP CONTENT SECTIONS */}

      {/* --- STEP 1: PRE-CLOSING VALIDATION --- */}
      {activeStep === 1 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-[#1F497D]" />
                <span>१. पूर्व-लेखापरीक्षण प्रमाणिकरण (Pre-Closing Validation & Reconciliation)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                आर्थिक वर्ष बन्द गर्नुपूर्व खाताहरू पूर्ण सन्तुलित र वैधानिक मापदण्ड अनुसार दुरुस्त हुनु अनिवार्य छ।
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                सफल: {auditData.validation.passCount} / {auditData.validation.checks.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {auditData.validation.checks.map((chk: any) => (
              <div
                key={chk.id}
                className={`p-4 rounded-xl border flex items-start space-x-3.5 transition-all ${
                  chk.status === "PASSED"
                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                    : chk.status === "WARNING"
                    ? "bg-amber-50/60 border-amber-200 text-amber-950"
                    : "bg-rose-50/60 border-rose-200 text-rose-950"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {chk.status === "PASSED" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : chk.status === "WARNING" ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs sm:text-sm">{chk.titleNep}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({chk.titleEng})</span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 mt-1">{chk.message}</p>
                </div>
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0 ${
                    chk.status === "PASSED"
                      ? "bg-emerald-200/80 text-emerald-900"
                      : chk.status === "WARNING"
                      ? "bg-amber-200/80 text-amber-900"
                      : "bg-rose-200/80 text-rose-900"
                  }`}
                >
                  {chk.status}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <div className="text-xs text-slate-500 font-medium">
              {auditData.validation.canProceed ? (
                <span className="text-emerald-700 font-bold">✓ सबै जाँच सफल भए। तपाईं अर्को चरणमा जान सक्नुहुन्छ।</span>
              ) : (
                <span className="text-rose-600 font-bold">⚠ त्रुटिहरू नसच्चिएसम्म आर्थिक वर्ष बन्द गर्न मिल्दैन।</span>
              )}
            </div>
            <button
              onClick={() => setActiveStep(2)}
              disabled={!auditData.validation.canProceed}
              className="flex items-center space-x-2 px-5 py-2.5 bg-[#1F497D] hover:bg-[#183a63] text-white text-xs font-bold rounded-xl shadow transition-colors disabled:opacity-50"
            >
              <span>चरण २: वर्ष-अन्त्य समायोजनमा जानुहोस्</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 2: YEAR-END ADJUSTMENTS --- */}
      {activeStep === 2 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center space-x-2">
                <Coins className="w-5 h-5 text-[#1F497D]" />
                <span>२. वर्ष-अन्त्य समायोजन प्रविष्टिहरू (Year-End Accruals, Provisioning & Depreciation)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                नेपाल राष्ट्र बैंक मापदण्ड अनुसार कर्जा नोक्सानी व्यवस्था, स्थिर सम्पत्ति ह्रासकट्टी, र पाउनुपर्ने/तिर्नुपर्ने ब्याजको समायोजन
              </p>
            </div>
          </div>

          {/* Loan Loss Provision Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black text-slate-800">
                कर्जा वर्गीकरण तथा नोक्सानी व्यवस्था तालिका (NRB / Cooperative Classification)
              </span>
              <span className="text-[11px] text-slate-500 font-medium">कुल ऋण: रु. {bs.assets.loans.toLocaleString()}</span>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">कर्जा वर्ग (Category)</th>
                  <th className="p-3">भाखा नाघेको अवधि (Overdue)</th>
                  <th className="p-3 text-right">कर्जा रकम (Principal NPR)</th>
                  <th className="p-3 text-center">व्यवस्था दर (Rate %)</th>
                  <th className="p-3 text-right">नोक्सानी रकम (Provision NPR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditData.proposedAdjustments.loanSchedule.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">{row.category}</td>
                    <td className="p-3 text-slate-500">{row.overdueDays}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">रु. {row.amount.toLocaleString()}</td>
                    <td className="p-3 text-center font-bold text-amber-700 bg-amber-50/50">{row.rate}</td>
                    <td className="p-3 text-right font-mono font-black text-rose-700">रु. {row.provision.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Draft Vouchers Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
              स्वीकृत गर्न प्रस्तावित समायोजन गोश्वारा भौचरहरू (Draft Adjustment Vouchers)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {auditData.proposedAdjustments.vouchers.map((v: any) => (
                <div key={v.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-md transition-all space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#1F497D] bg-blue-100/70 px-2.5 py-0.5 rounded-md font-mono">
                      {v.voucherNo}
                    </span>
                    <span className="text-sm font-black text-slate-900 font-mono">रु. {v.amount.toLocaleString()}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 leading-snug">{v.narrationNep}</p>
                  <div className="text-[11px] space-y-1 pt-1 border-t border-slate-200/60 font-medium">
                    <div className="text-emerald-700 flex justify-between">
                      <span>(Dr) {v.debitAccountTitle}</span>
                      <span className="font-mono">रु. {v.amount.toLocaleString()}</span>
                    </div>
                    <div className="text-rose-700 flex justify-between">
                      <span>(Cr) {v.creditAccountTitle}</span>
                      <span className="font-mono">रु. {v.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <button onClick={() => setActiveStep(1)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800">
              ← अघिल्लो चरण
            </button>
            <button
              onClick={handlePostAdjustments}
              disabled={posting}
              className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-colors disabled:opacity-50"
            >
              <span>{posting ? "पोस्ट हुँदैछ..." : "समायोजन भौचरहरू स्वीकृत तथा पोस्ट गर्नुहोस्"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 3: AUDIT REVIEW & LOCK --- */}
      {activeStep === 3 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center space-x-2">
                <Lock className="w-5 h-5 text-[#1F497D]" />
                <span>३. लेखापरीक्षण समीक्षा तथा अडिट-लक (Statutory Audit Review & Year-Lock)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                लेखापरीक्षकको आधिकारिक विवरण दर्ता गरी यस आर्थिक वर्षलाई अपरिवर्तनीय बनाउन 'अडिट लक' गर्नुहोस्।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="w-full">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                आधिकारिक लेखापरीक्षकको नाम (Auditor Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none"
                placeholder="उदा: सी.ए. सुरेन्द्र कुमार विष्ट"
              />
            </div>

            <div className="w-full">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                लेखापरीक्षक दर्ता नं. / प्रमाणपत्र (Auditor Reg No) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={auditorRegNo}
                onChange={(e) => setAuditorRegNo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none"
                placeholder="उदा: ICAN-COP-4812"
              />
            </div>

            <div className="w-full">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">लेखापरीक्षण सम्पन्न मिति (Audit Date)</label>
              <input
                type="date"
                value={auditDate}
                onChange={(e) => setAuditDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="w-full">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">लेखापरीक्षकको राय / टिप्पणी (Audit Opinion / Remarks)</label>
              <input
                type="text"
                value={auditRemarks}
                onChange={(e) => setAuditRemarks(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none"
                placeholder="लेखापरीक्षण राय"
              />
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-xs text-amber-900">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">अडिट लक (Audited-Locked) पश्चात के हुन्छ?</p>
              <p className="mt-0.5 text-amber-800">
                यस वर्षका कुनै पनि भौचर वा खाताहरू सामान्य प्रयोगकर्ताले सम्पादन वा मेटाउन पाउने छैनन्। सम्पूर्ण प्रतिवेदनहरू आधिकारिक रूपमा रोक्का रहनेछन्।
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <button onClick={() => setActiveStep(2)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800">
              ← अघिल्लो चरण
            </button>
            <button
              onClick={handleLockYear}
              disabled={posting}
              className="flex items-center space-x-2 px-5 py-2.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-xl shadow transition-colors disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{posting ? "लक हुँदैछ..." : "आर्थिक वर्ष अडिट-लक गर्नुहोस् र अगाडि बढ्नुहोस्"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 4: FINANCIAL STATEMENTS --- */}
      {activeStep === 4 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-[#1F497D]" />
                <span>४. लेखापरीक्षण वित्तीय प्रतिवेदनहरू (Audited Annual Financial Statements)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                नेपाल सहकारी ऐन, २०७४ र सम्बन्धित नियम अनुसार साधारण सभा (AGM) तथा नियमनकारी निकायमा पेश हुने आधिकारिक विवरण
              </p>
            </div>
            <button onClick={() => window.print()} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300">
              प्रिन्ट (Print)
            </button>
          </div>

          {/* Sub-Tabs for Statements (Responsive Wrap - Zero Horizontal Scroll) */}
          <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-bold no-scrollbar">
            <button
              onClick={() => setStatementTab("bs")}
              className={`px-3 py-2 rounded-lg transition-all ${statementTab === "bs" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              वासलात (Balance Sheet)
            </button>
            <button
              onClick={() => setStatementTab("pl")}
              className={`px-3 py-2 rounded-lg transition-all ${statementTab === "pl" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              नाफा-नोक्सान हिसाब (P&L Account)
            </button>
            <button
              onClick={() => setStatementTab("tb")}
              className={`px-3 py-2 rounded-lg transition-all ${statementTab === "tb" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              सन्तुलन परीक्षण (Trial Balance)
            </button>
            <button
              onClick={() => setStatementTab("cf")}
              className={`px-3 py-2 rounded-lg transition-all ${statementTab === "cf" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              नगद प्रवाह (Cash Flow)
            </button>
            <button
              onClick={() => setStatementTab("equity")}
              className={`px-3 py-2 rounded-lg transition-all ${statementTab === "equity" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              जगेडा तथा कोष (Changes in Equity)
            </button>
          </div>

          {/* Balance Sheet Statement */}
          {statementTab === "bs" && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-[#1F497D] text-white p-3 text-center text-xs font-bold">
                वासलात (Statement of Financial Position - Balance Sheet) - आषाढ मसान्त {auditData.activeFY?.endBs}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                {/* Liabilities Side */}
                <div className="p-4 space-y-3">
                  <h4 className="font-black text-xs text-slate-900 border-b pb-1.5">दायित्व तथा पुँजी (Liabilities & Capital)</h4>
                  <div className="text-xs space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>सेयर पुँजी (Share Capital - ०५.१०)</span>
                      <span className="font-mono font-bold">रु. {bs.liabilities.shareCapital.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>जगेडा तथा अन्य कोषहरू (Reserves & Funds - ०५.२०)</span>
                      <span className="font-mono font-bold">रु. {bs.liabilities.reserves.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>सदस्य बचत निक्षेप (Savings Deposits - ०५.३०)</span>
                      <span className="font-mono font-bold">रु. {bs.liabilities.savings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>बाह्य ऋण तथा सापटी (Borrowings - ०५.४०)</span>
                      <span className="font-mono font-bold">रु. {bs.liabilities.borrowings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>अन्य दायित्व तथा तिर्नुपर्ने (Other Liab & Payables)</span>
                      <span className="font-mono font-bold">रु. {(bs.liabilities.otherLiabilities + bs.liabilities.payables).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-800 font-bold bg-emerald-50 px-2 rounded">
                      <span>चालु वर्षको खुद सञ्चालन बचत (Net Operating Surplus)</span>
                      <span className="font-mono">रु. {bs.netSurplus.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-slate-800 text-sm font-black text-slate-900 bg-slate-50 p-2 rounded">
                    <span>कुल दायित्व तथा पुँजी (Total Liabilities & Equity)</span>
                    <span className="font-mono">रु. {bs.totalLiabilitiesAndEquity.toLocaleString()}</span>
                  </div>
                </div>

                {/* Assets Side */}
                <div className="p-4 space-y-3">
                  <h4 className="font-black text-xs text-slate-900 border-b pb-1.5">सम्पत्तिहरू (Assets)</h4>
                  <div className="text-xs space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>नगद मौज्दात (Cash on Hand - ०४.८०)</span>
                      <span className="font-mono font-bold">रु. {bs.assets.cash.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>बैंक मौज्दात (Bank Balance - ०४.९०)</span>
                      <span className="font-mono font-bold">रु. {bs.assets.bank.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>लगानी हिसाब (Investments - ०४.१००)</span>
                      <span className="font-mono font-bold">रु. {bs.assets.investments.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>सदस्य ऋण लगानी (Loan Portfolio - ०४.११०)</span>
                      <span className="font-mono font-bold">रु. {bs.assets.loans.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>पाउनुपर्ने हिसाब (Receivables - ०४.१२०)</span>
                      <span className="font-mono font-bold">रु. {bs.assets.receivables.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>स्थिर सम्पत्ति (Fixed Assets net of Depr - ०४.१३०)</span>
                      <span className="font-mono font-bold">रु. {bs.assets.fixedAssets.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>अन्य सम्पत्ति (Other Assets - ०४.१४०)</span>
                      <span className="font-mono font-bold">रु. {bs.assets.otherAssets.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-slate-800 text-sm font-black text-slate-900 bg-slate-50 p-2 rounded">
                    <span>कुल सम्पत्ति (Total Assets)</span>
                    <span className="font-mono">रु. {bs.assets.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Income Statement */}
          {statementTab === "pl" && (
            <div className="border border-slate-200 rounded-xl overflow-hidden p-4 space-y-4">
              <div className="bg-[#1F497D] text-white p-2.5 text-center text-xs font-bold rounded-lg">
                नाफा-नोक्सान तथा आम्दानी-खर्च हिसाब (Income & Expenditure Account)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-black text-xs text-emerald-800 border-b pb-1">आम्दानीहरू (Income Heads)</h4>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span>ऋण लगानी ब्याज आय (Interest on Loans)</span>
                      <span className="font-mono font-bold">रु. {inc.incomeBreakdown.loanInterest.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>लगानी प्रतिफल / लाभांश आय (Investment Return)</span>
                      <span className="font-mono font-bold">रु. {inc.incomeBreakdown.investmentReturn.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>सेवा शुल्क तथा अन्य आय (Service Charges & Fees)</span>
                      <span className="font-mono font-bold">रु. {inc.incomeBreakdown.serviceFees.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>विविध आम्दानी (Miscellaneous Income)</span>
                      <span className="font-mono font-bold">रु. {inc.incomeBreakdown.otherIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-black text-emerald-900 bg-emerald-50 p-2 rounded">
                      <span>कुल आम्दानी (Total Income)</span>
                      <span className="font-mono">रु. {inc.totalIncome.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-black text-xs text-rose-800 border-b pb-1">खर्चहरू (Expenditure Heads)</h4>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span>बचतमा ब्याज खर्च (Interest on Savings)</span>
                      <span className="font-mono font-bold">रु. {inc.expensesBreakdown.savingInterest.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>कर्मचारी खर्च (Salaries & Benefits)</span>
                      <span className="font-mono font-bold">रु. {inc.expensesBreakdown.staffCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>कार्यालय सञ्चालन खर्च (Office Operating Cost)</span>
                      <span className="font-mono font-bold">रु. {inc.expensesBreakdown.officeOperation.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>कर्जा नोक्सानी तथा अन्य व्यवस्था (Provisions & Others)</span>
                      <span className="font-mono font-bold">रु. {inc.expensesBreakdown.otherExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-black text-rose-900 bg-rose-50 p-2 rounded">
                      <span>कुल खर्च (Total Expenditure)</span>
                      <span className="font-mono">रु. {inc.totalExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex justify-between items-center text-sm font-black text-blue-900">
                <span>खुद सञ्चालन बचत (Net Operating Surplus to Appropriation)</span>
                <span className="font-mono text-base">रु. {inc.netSurplus.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Trial Balance */}
          {statementTab === "tb" && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#1F497D] text-white">
                  <tr>
                    <th className="p-3">खाता शीर्षक (Account Head)</th>
                    <th className="p-3 text-right">प्रारम्भिक मौज्दात (Opening)</th>
                    <th className="p-3 text-right">अवधि डेबिट (Period Dr)</th>
                    <th className="p-3 text-right">अवधि क्रेडिट (Period Cr)</th>
                    <th className="p-3 text-right">अन्तिम मौज्दात (Closing)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-bold text-slate-800">सम्पत्ति खाता ०४ (Assets)</td>
                    <td className="p-3 text-right font-mono">रु. {tb.assets.op.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono">रु. {tb.assets.dr.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono">रु. {tb.assets.cr.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">रु. {tb.assets.cl.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-800">दायित्व तथा पुँजी खाता ०५ (Liabilities & Capital)</td>
                    <td className="p-3 text-right font-mono">रु. {tb.liabilities.op.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono">रु. {tb.liabilities.dr.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono">रु. {tb.liabilities.cr.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">रु. {tb.liabilities.cl.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-800">खर्च खाता ०२ (Expenses)</td>
                    <td className="p-3 text-right font-mono">रु. ०</td>
                    <td className="p-3 text-right font-mono">रु. {tb.expenses.dr.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono">रु. ०</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">रु. {tb.expenses.cl.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-800">आम्दानी खाता ०३ (Income)</td>
                    <td className="p-3 text-right font-mono">रु. ०</td>
                    <td className="p-3 text-right font-mono">रु. ०</td>
                    <td className="p-3 text-right font-mono">रु. {tb.income.cr.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">रु. {tb.income.cl.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Cash Flow */}
          {statementTab === "cf" && (
            <div className="p-4 border rounded-xl space-y-3 text-xs">
              <h4 className="font-bold text-sm text-slate-900">नगद प्रवाह विवरण (Cash Flow Statement)</h4>
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-1">
                  <span>सञ्चालन गतिविधिबाट नगद प्रवाह (Operating Activities)</span>
                  <span className="font-mono font-bold">रु. {inc.netSurplus.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>लगानी गतिविधिबाट नगद प्रवाह (Investing in Fixed Assets / Loans)</span>
                  <span className="font-mono font-bold">रु. {(-bs.assets.fixedAssets * 0.1).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>वित्तीय गतिविधिबाट नगद प्रवाह (Savings Deposits & Share Capital)</span>
                  <span className="font-mono font-bold">रु. {(bs.liabilities.savings * 0.05).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-black text-slate-900 bg-slate-50 p-2 rounded">
                  <span>अन्तिम नगद तथा बैंक मौज्दात (Closing Cash & Bank)</span>
                  <span className="font-mono">रु. {(bs.assets.cash + bs.assets.bank).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Statement of Changes in Equity */}
          {statementTab === "equity" && (
            <div className="p-4 border rounded-xl space-y-3 text-xs">
              <h4 className="font-bold text-sm text-slate-900">जगेडा कोष तथा पुँजी परिवर्तन विवरण (Statement of Changes in Equity)</h4>
              <table className="w-full text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2">विवरण (Particulars)</th>
                    <th className="p-2 text-right">सेयर पुँजी</th>
                    <th className="p-2 text-right">साधारण जगेडा कोष</th>
                    <th className="p-2 text-right">अन्य कोषहरू</th>
                    <th className="p-2 text-right">कुल रकम</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2">प्रारम्भिक मौज्दात (Opening Bal)</td>
                    <td className="p-2 text-right font-mono">रु. {bs.liabilities.shareCapital.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono">रु. {(bs.liabilities.reserves * 0.6).toLocaleString()}</td>
                    <td className="p-2 text-right font-mono">रु. {(bs.liabilities.reserves * 0.4).toLocaleString()}</td>
                    <td className="p-2 text-right font-mono font-bold">रु. {(bs.liabilities.shareCapital + bs.liabilities.reserves).toLocaleString()}</td>
                  </tr>
                  <tr className="bg-emerald-50">
                    <td className="p-2 font-bold text-emerald-900">चालु वर्षको खुद बचतबाट बाँडफाँड</td>
                    <td className="p-2 text-right font-mono">-</td>
                    <td className="p-2 text-right font-mono font-bold">रु. {app.generalReserveAmt.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono font-bold">रु. {(app.cooperativePromotionAmt + app.cooperativeEducationAmt).toLocaleString()}</td>
                    <td className="p-2 text-right font-mono font-bold">रु. {(app.generalReserveAmt + app.cooperativePromotionAmt + app.cooperativeEducationAmt).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <button onClick={() => setActiveStep(3)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800">
              ← अघिल्लो चरण
            </button>
            <button
              onClick={() => setActiveStep(5)}
              className="flex items-center space-x-2 px-5 py-2.5 bg-[#1F497D] hover:bg-[#183a63] text-white text-xs font-bold rounded-xl shadow transition-colors"
            >
              <span>चरण ५: बचत बाँडफाँडमा जानुहोस्</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 5: STATUTORY PROFIT APPROPRIATION --- */}
      {activeStep === 5 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center space-x-2">
                <Percent className="w-5 h-5 text-[#1F497D]" />
                <span>५. कानुनी बचत बाँडफाँड (Statutory Profit Appropriation per Cooperative Act 2074)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                सहकारी ऐनको दफा ६८ र ६९ तथा संस्थाको विनियमावली अनुसार वार्षिक खुद बचतको कानुनी बाँडफाँड तालिका
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold block">बाँडफाँड योग्य खुद बचत</span>
              <span className="text-lg font-black text-emerald-700 font-mono">रु. {app.netSurplus.toLocaleString()}</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-3">कोषको नाम (Statutory Fund Name)</th>
                  <th className="p-3">कानुनी व्यवस्था (Coop Act 2074)</th>
                  <th className="p-3 text-center">तोकिएको दर (%)</th>
                  <th className="p-3 text-right">बाँडफाँड रकम (Allocated NPR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">साधारण जगेडा कोष (General Reserve Fund)</td>
                  <td className="p-3 text-slate-500">दफा ६८ (अनिवार्य न्यूनतम २५%)</td>
                  <td className="p-3 text-center font-bold text-blue-700">{app.generalReservePct}%</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">रु. {app.generalReserveAmt.toLocaleString()}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">संरक्षित पुँजी फिर्ता कोष (Patronage Refund Fund)</td>
                  <td className="p-3 text-slate-500">दफा ६९ (कारोबारको आधारमा सदस्य फिर्ता २५%)</td>
                  <td className="p-3 text-center font-bold text-blue-700">{app.patronageRefundPct}%</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">रु. {app.patronageRefundAmt.toLocaleString()}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">सहकारी शिक्षा तथा तालिम कोष (Cooperative Education Fund)</td>
                  <td className="p-3 text-slate-500">नियम अनुसार ५%</td>
                  <td className="p-3 text-center font-bold text-blue-700">{app.cooperativeEducationPct}%</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">रु. {app.cooperativeEducationAmt.toLocaleString()}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">सहकारी प्रवर्धन कोष (Cooperative Promotion Fund)</td>
                  <td className="p-3 text-slate-500">राष्ट्रिय सहकारी महासंघ/विकास कोष</td>
                  <td className="p-3 text-center font-bold text-blue-700">{app.cooperativePromotionPct}%</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">रु. {app.cooperativePromotionAmt.toLocaleString()}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">कर्मचारी बोनस कोष (Staff Bonus Fund)</td>
                  <td className="p-3 text-slate-500">कर्मचारी प्रोत्साहन नियमावली</td>
                  <td className="p-3 text-center font-bold text-blue-700">{app.staffBonusPct}%</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">रु. {app.staffBonusAmt.toLocaleString()}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">समुदाय विकास कोष (Community Development Fund)</td>
                  <td className="p-3 text-slate-500">सामाजिक उत्तरदायित्व</td>
                  <td className="p-3 text-center font-bold text-blue-700">{app.communityDevelopmentPct}%</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">रु. {app.communityDevelopmentAmt.toLocaleString()}</td>
                </tr>
                <tr className="bg-emerald-50/70 font-bold">
                  <td className="p-3 text-emerald-950 font-black">सञ्चित बचत (Retained Earnings - Balance Sheet B/F)</td>
                  <td className="p-3 text-emerald-800">बाँकी बचत संस्थागत पुँजीमा समायोजन</td>
                  <td className="p-3 text-center text-emerald-800">-</td>
                  <td className="p-3 text-right font-mono font-black text-emerald-900">रु. {app.retainedEarningsAmt.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <button onClick={() => setActiveStep(4)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800">
              ← अघिल्लो चरण
            </button>
            <button
              onClick={() => setActiveStep(6)}
              className="flex items-center space-x-2 px-5 py-2.5 bg-[#1F497D] hover:bg-[#183a63] text-white text-xs font-bold rounded-xl shadow transition-colors"
            >
              <span>चरण ६: अन्तिम बन्द तथा नयाँ प्रारम्भिक मौज्दातमा जानुहोस्</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 6: CLOSE YEAR & OPENING BALANCE ROLLOVER --- */}
      {activeStep === 6 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>६. आर्थिक वर्ष बन्द तथा नयाँ आ.व. प्रारम्भिक मौज्दात (Fiscal Year Closing & Rollover)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                आर्थिक वर्ष {auditData.activeFY?.fyCode} को अन्तिम मौज्दात नयाँ आर्थिक वर्षको प्रारम्भिक मौज्दात (Opening Balances) मा स्वतः स्थानान्तरण हुनेछ।
              </p>
            </div>
          </div>

          {rolloverSuccess ? (
            <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-4 text-emerald-950">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                <div>
                  <h3 className="text-lg font-black text-emerald-900">आर्थिक वर्ष सफलतापूर्वक बन्द भयो!</h3>
                  <p className="text-xs text-emerald-700">{rolloverSuccess.message}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-slate-400 font-bold block">नयाँ आर्थिक वर्ष</span>
                  <span className="text-base font-black text-slate-900">{rolloverSuccess.newFiscalYear}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-slate-400 font-bold block">नयाँ प्रारम्भिक सम्पत्ति मौज्दात</span>
                  <span className="text-base font-black text-slate-900 font-mono">रु. {rolloverSuccess.openingBalances.assets.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-slate-400 font-bold block">नयाँ प्रारम्भिक दायित्व तथा पुँजी</span>
                  <span className="text-base font-black text-slate-900 font-mono">रु. {rolloverSuccess.openingBalances.liabilitiesAndCapital.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>लेखापरीक्षण ब्याकअप फाइल सुरक्षित गरियो: <strong className="font-mono">{rolloverSuccess.backupFile}</strong></span>
                </div>
                <a
                  href="/api/excel/download"
                  download
                  className="px-3 py-1 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-600"
                >
                  डाउनलोड
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Target Next Fiscal Year inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    नयाँ आर्थिक वर्ष कोड (New Fiscal Year) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nextFY}
                    onChange={(e) => setNextFY(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    placeholder="२०८४/८५"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">सुरु मिति वि.सं. (Start Date BS)</label>
                  <input
                    type="text"
                    value={nextStart}
                    onChange={(e) => setNextStart(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    placeholder="२०८४/०४/०१"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">अन्त्य मिति वि.सं. (End Date BS)</label>
                  <input
                    type="text"
                    value={nextEnd}
                    onChange={(e) => setNextEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    placeholder="२०८५/०३/३१"
                  />
                </div>
              </div>

              {/* Rollover Explanation Points */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-xs text-blue-950">
                <p className="font-black">स्वचालित प्रारम्भिक मौज्दात (Opening Balance Rollover) का नियमहरू:</p>
                <ul className="list-disc pl-5 space-y-1 text-blue-900">
                  <li>
                    <strong>वास्तविक खाताहरू (Real & Personal Accounts):</strong> सम्पत्ति, दायित्व, सेयर पुँजी, जगेडा कोष, सदस्य बचत र ऋणको अन्तिम मौज्दात नयाँ वर्षको पहिलो पङ्क्ति (Row 6, भौचर <code className="font-mono font-bold">OB-001</code>) मा प्रारम्भिक मौज्दात बन्नेछ।
                  </li>
                  <li>
                    <strong>नाफा-नोक्सान खाताहरू (Nominal Accounts):</strong> खर्च (खाता ०२) र आम्दानी (खाता ०३) का सम्पूर्ण मासिक प्रविष्टिहरू नयाँ वर्षमा <strong>शून्य (0)</strong> बाट सुरु हुनेछन्।
                  </li>
                  <li>
                    <strong>सदस्य उप-खाताहरू (Sub-Ledgers):</strong> सबै सदस्यहरूको व्यक्तिगत सेयर कित्ता, बचत मौज्दात र ऋण साँवा नयाँ वर्षमा यथावत् स्थानान्तरण हुनेछ।
                  </li>
                  <li>
                    <strong>सुरक्षित ब्याकअप (Frozen Snapshot):</strong> बन्द हुनु अघि हालको सम्पूर्ण डाटाबेस <code className="font-mono font-bold">nepal_coop_audit_closed_{auditData.activeFY?.fyCode}...xlsx</code> को रूपमा ब्याकअपमा सधैँका लागि सुरक्षित हुनेछ।
                  </li>
                </ul>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button onClick={() => setActiveStep(5)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800">
                  ← अघिल्लो चरण
                </button>
                <button
                  onClick={handleExecuteRollover}
                  disabled={posting}
                  className="flex items-center space-x-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black rounded-xl shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5 text-amber-300" />
                  <span>{posting ? "प्रशोधन हुँदैछ..." : "नयाँ आर्थिक वर्ष सुरु गर्नुहोस् र प्रारम्भिक मौज्दात सिर्जना गर्नुहोस्"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- ROLLBACK / REOPEN MODAL --- */}
      {showRollbackModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <span>आर्थिक वर्ष पुनः खोल्नुहोस् (Rollback / Reopen FY)</span>
              </h3>
              <button onClick={() => setShowRollbackModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              यदि आर्थिक वर्ष बन्द गर्दा कुनै छुटेको समायोजन वा अडिट सच्याउनु परेमा, सुरक्षित ब्याकअपबाट अघिल्लो अवस्थामा फर्किन सकिन्छ।
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                पुनः खोल्नुपर्ने अनिवार्य कारण (Mandatory Reason) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="उदा: बाह्य लेखापरीक्षकको राय अनुसार कर्जा नोक्सानी व्यवस्था पुनरावलोकन गर्नुपर्ने भएकोले..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t">
              <button onClick={() => setShowRollbackModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600">
                रद्द गर्नुहोस्
              </button>
              <button
                onClick={handleRollback}
                disabled={rollingBack || !rollbackReason.trim()}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl disabled:opacity-50"
              >
                {rollingBack ? "पुनः खुल्दैछ..." : "पुष्टि गर्नुहोस् र पुनः खोल्नुहोस्"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
