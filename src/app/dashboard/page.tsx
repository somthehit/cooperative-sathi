"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Wallet,
  PiggyBank,
  BadgeDollarSign,
  Scale,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertTriangle,
  Download,
  PlusCircle,
  ArrowRight,
  FileSpreadsheet,
  Activity,
  Layers,
  RefreshCw,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [openingSetup, setOpeningSetup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      setRefreshing(true);
      const [res, openRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/opening-setup").catch(() => null),
      ]);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
      if (openRes && openRes.ok) {
        const openJson = await openRes.json();
        if (openJson.success) {
          setOpeningSetup(openJson);
          if (openJson.status !== "Posted-Locked") {
            // Opening setup is pending! Direct user to /opening-setup
            router.push("/opening-setup");
            return;
          }
        }
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-10 h-10 text-[#1F497D] animate-spin" />
        <p className="text-sm font-semibold text-slate-600">
          एक्सेल डाटाबेसबाट लाइभ वित्तीय विवरण लोड हुँदैछ...
        </p>
      </div>
    );
  }

  const kpi = data?.topKpi || {};
  const pearls = data?.pearlsRatios || {};
  const fourKhata = data?.fourKhataBalances || {};
  const charts = data?.charts || {};

  const COLORS = ["#1F497D", "#2E5B88", "#0D9488", "#E11D48", "#D97706", "#6366F1", "#8B5CF6"];

  return (
    <div className="space-y-8 pb-10">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-[#1F497D] via-[#24528C] to-[#2E5B88] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-400 text-slate-900 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                कार्यकारी ड्यासबोर्ड
              </span>
              <span className="text-xs text-slate-300 flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                लाइभ एक्सेल सिङ्क (Sheet 1 to 10)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-white">
              नेपाल सहकारी वित्तीय तथा सदस्य अवस्था
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 mt-1">
              Nepal Cooperative 4-Khata Integrated ERP Dashboard & Real-Time Portfolio
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadDashboard}
              disabled={refreshing}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold backdrop-blur transition-all border border-white/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>ताजा गर्नुहोस्</span>
            </button>

            <a
              href="/api/excel/download"
              download
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all border border-emerald-400/40"
            >
              <Download className="w-4 h-4" />
              <span>लाइभ .xlsx डाउनलोड</span>
            </a>

            <Link
              href="/opening-setup"
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md transition-all border border-blue-400/30"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>प्रारम्भिक मौज्दात</span>
            </Link>

            <Link
              href="/audit"
              className="flex items-center space-x-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md transition-all border border-purple-400/30"
            >
              <FileCheck2 className="w-4 h-4 text-amber-300" />
              <span>आ.व. बन्द / अडिट</span>
            </Link>

            <Link
              href="/transactions"
              className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>नयाँ कारोबार प्रविष्टि</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Go-Live Setup Banner if not posted */}
      {openingSetup && openingSetup.status !== "Posted-Locked" && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-600 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-950">
                संस्थाको प्रारम्भिक मौज्दात (Go-Live Setup) प्रविष्टि सम्पन्न भएको छैन
              </h4>
              <p className="text-xs text-amber-800">
                पहिलो आर्थिक वर्षको साविक अन्तिम खाताहरू, सदस्य सेयर, बचत तथा कर्जा मौज्दात प्रविष्टि गरी गो-लाइभ सम्पन्न गर्नुहोस्।
              </p>
            </div>
          </div>
          <Link
            href="/opening-setup"
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow shrink-0"
          >
            गो-लाइभ सेटअप सुरु गर्नुहोस् &rarr;
          </Link>
        </div>
      )}

      {/* Suspense Ledger Alert Banner if balance > 0 */}
      {openingSetup && openingSetup.settings?.suspenseLedgerBalance > 0 && (
        <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-black text-red-950">
                साविक खाताको प्रारम्भिक मौज्दात फरक (सस्पेन्स खाता): रु. {openingSetup.settings.suspenseLedgerBalance.toLocaleString()}
              </h4>
              <p className="text-xs text-red-800">
                {openingSetup.settings.suspenseLedgerReason || "यो फरकलाई आर्थिक वर्षको लेखापरीक्षण हुनुपूर्व आवश्यक प्रमाणसहित मिलान गर्नुपर्छ।"}
              </p>
            </div>
          </div>
          <Link
            href="/opening-setup"
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow shrink-0"
          >
            सस्पेन्स मिलान हेर्नुहोस्
          </Link>
        </div>
      )}

      {/* 6 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Assets */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              १. कुल सम्पत्ति
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1F497D] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            रु. {(kpi.totalAssets || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span>खाता ०४ (सम्पत्ति खाता)</span>
            <span className="text-emerald-600 font-semibold">DR Normal</span>
          </div>
        </div>

        {/* Total Liabilities */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              २. दायित्व तथा पुँजी
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            रु. {(kpi.totalLiabilities || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span>खाता ०५ (दायित्व खाता)</span>
            <span className="text-indigo-600 font-semibold">CR Normal</span>
          </div>
        </div>

        {/* Total Loan Portfolio */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              ३. कुल ऋण लगानी
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <BadgeDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            रु. {(kpi.loanPortfolio || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span>हिसाब ११० (कृषि/व्यापार..)</span>
            <span className="text-amber-600 font-semibold">सक्रिय ऋण</span>
          </div>
        </div>

        {/* Total Member Savings */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              ४. सदस्य बचत/निक्षेप
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            रु. {(kpi.memberSavings || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span>हिसाब ३० (बचत उप-खाता)</span>
            <span className="text-emerald-600 font-semibold">नियमित/मुद्दती</span>
          </div>
        </div>

        {/* Net Operating Surplus */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              ५. खुद बचत (Surplus)
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-teal-700 tracking-tight">
            रु. {(kpi.netOperatingSurplus || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span>आम्दानी ०३ - खर्च ०२</span>
            <span className="text-teal-600 font-semibold">नाफा अधिशेष</span>
          </div>
        </div>

        {/* Active Members Count */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              ६. सक्रिय सदस्य
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {(kpi.activeMembersCount || 0).toLocaleString()} जना
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span>सदस्य खाता (KYC Master)</span>
            <span className="text-purple-600 font-semibold">सक्रिय</span>
          </div>
        </div>
      </div>

      {/* 4-Khata Financial Health & PEARLS Ratio Scorecard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 4-Khata Summary Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-[#1F497D]" />
              <h2 className="text-base font-bold text-slate-900">४ मूल खाता वित्तीय मौज्दात</h2>
            </div>
            <Link
              href="/khatas"
              className="text-xs font-semibold text-[#1F497D] hover:underline flex items-center gap-1"
            >
              <span>खाता हेर्नुहोस्</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <div className="font-bold text-slate-800">१. सम्पत्ति खाता (Root 04 Assets)</div>
                <div className="text-[10px] text-slate-500">नगद, बैंक, लगानी, ऋण मौज्दात</div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-slate-900">रु. {(fourKhata.assets || 0).toLocaleString()}</div>
                <div className="text-[10px] text-emerald-600 font-semibold">DR Normal</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <div className="font-bold text-slate-800">२. दायित्व तथा पुँजी (Root 05 Liability)</div>
                <div className="text-[10px] text-slate-500">शेयर पुँजी, जगेडा कोष, बचत निक्षेप</div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-slate-900">रु. {(fourKhata.liabilities || 0).toLocaleString()}</div>
                <div className="text-[10px] text-indigo-600 font-semibold">CR Normal</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <div className="font-bold text-slate-800">३. खर्च खाता (Root 02 Expenses)</div>
                <div className="text-[10px] text-slate-500">तलब, घरभाडा, खरिद, ब्याज खर्च</div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-slate-900">रु. {(fourKhata.expenses || 0).toLocaleString()}</div>
                <div className="text-[10px] text-rose-600 font-semibold">१५०.१ देखि १५०.१६</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <div className="font-bold text-slate-800">४. आम्दानी खाता (Root 03 Income)</div>
                <div className="text-[10px] text-slate-500">ऋण ब्याज, बिक्री, कमिशन आम्दानी</div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-slate-900">रु. {(fourKhata.income || 0).toLocaleString()}</div>
                <div className="text-[10px] text-teal-600 font-semibold">१६०.१ देखि १६०.१६</div>
              </div>
            </div>

            {/* Trial Balance Health Bar */}
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-xs">दोहोरो सन्तुलन परीक्षण (Audit Status):</span>
              </div>
              <span className="font-black text-xs text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                {pearls.balanceSheetCheck?.status || "सन्तुलित"}
              </span>
            </div>
          </div>
        </div>

        {/* PEARLS Scorecard (2 columns span) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                सहकारी वित्तीय सुचक तथा पर्ल्स अनुपात (PEARLS Ratio Scorecard)
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              नेपाल राष्ट्र बैंक / सहकारी विभाग मापदण्ड
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* L2D Ratio */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <div className="font-bold text-slate-800">कर्जा-निक्षेप अनुपात (Loan to Deposit - L2D)</div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {pearls.loanToDeposit?.status}
                </span>
              </div>
              <div className="text-xl font-black text-[#1F497D] mt-1">
                {pearls.loanToDeposit?.formatted}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                <span>मापदण्ड: {pearls.loanToDeposit?.benchmark}</span>
                <span>(कुल कर्जा / कुल बचत)</span>
              </div>
            </div>

            {/* Liquidity Ratio */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <div className="font-bold text-slate-800">तरलता अनुपात (Liquidity Ratio - L1)</div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {pearls.liquidityRatio?.status}
                </span>
              </div>
              <div className="text-xl font-black text-[#1F497D] mt-1">
                {pearls.liquidityRatio?.formatted}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                <span>मापदण्ड: {pearls.liquidityRatio?.benchmark}</span>
                <span>(नगद+बैंक / कुल बचत)</span>
              </div>
            </div>

            {/* Capital Adequacy */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <div className="font-bold text-slate-800">संस्थागत पुँजी अनुपात (Capital Adequacy - E9)</div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {pearls.capitalAdequacy?.status}
                </span>
              </div>
              <div className="text-xl font-black text-[#1F497D] mt-1">
                {pearls.capitalAdequacy?.formatted}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                <span>मापदण्ड: {pearls.capitalAdequacy?.benchmark}</span>
                <span>(शेयर पुँजी / कुल सम्पत्ति)</span>
              </div>
            </div>

            {/* Share to Deposit */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <div className="font-bold text-slate-800">शेयर-बचत अनुपात (Share to Deposit - E1)</div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {pearls.shareToDeposit?.status}
                </span>
              </div>
              <div className="text-xl font-black text-[#1F497D] mt-1">
                {pearls.shareToDeposit?.formatted}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                <span>मापदण्ड: {pearls.shareToDeposit?.benchmark}</span>
                <span>(शेयर पुँजी / कुल बचत)</span>
              </div>
            </div>

            {/* Average Savings per Member */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <div className="font-bold text-slate-800">सदस्य प्रति औसत बचत (Avg Savings/Member)</div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                  सामान्य
                </span>
              </div>
              <div className="text-xl font-black text-[#1F497D] mt-1">
                {pearls.avgSavingsPerMember?.formatted}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                प्रति सदस्य वित्तीय संलग्नता सूचक
              </div>
            </div>

            {/* Balance Sheet Verification */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <div className="font-bold text-slate-800">वासलात सन्तुलन स्थिति (Balance Sheet Diff)</div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  सन्तुलित
                </span>
              </div>
              <div className="text-xl font-black text-emerald-700 mt-1">
                {pearls.balanceSheetCheck?.formatted}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                सम्पत्ति = दायित्व + खुद सञ्चालन बचत मिलान
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Bar Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                मासिक वित्तीय प्रवृत्ति (Monthly Financial Portfolio)
              </h3>
              <p className="text-[11px] text-slate-500">
                सम्पत्ति, दायित्व, बचत र ऋण लगानीको तुलनात्मक ग्राफ
              </p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyFinancials || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(val) => `${(val / 100000).toFixed(0)} लाख`}
                />
                <Tooltip
                  formatter={(value: any) => [`रु. ${Number(value).toLocaleString()}`, "रकम"]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="assets" name="सम्पत्ति (Assets)" fill="#1F497D" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" name="बचत (Savings)" fill="#0D9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="loans" name="ऋण (Loans)" fill="#D97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Income / Expense Breakdown Pie Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                आम्दानी तथा खर्च संरचना (Income & Expense Breakdown)
              </h3>
              <p className="text-[11px] text-slate-500">
                खाता ०३ आम्दानी र खाता ०२ खर्चको शीर्षकगत विवरण
              </p>
            </div>
          </div>
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.incomeExpenseBreakdown || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={45}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {(charts.incomeExpenseBreakdown || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`रु. ${Number(val).toLocaleString()}`, "रकम"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
