"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Users,
  Trash2,
  Lock,
  Download,
} from "lucide-react";

interface ResetTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ResetTransactionsModal({
  isOpen,
  onClose,
  onSuccess,
}: ResetTransactionsModalProps) {
  const [reason, setReason] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [resetOpeningBalances, setResetOpeningBalances] = useState(true);
  const [clearOpeningStaging, setClearOpeningStaging] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const isPhraseValid =
    confirmPhrase.trim().toUpperCase() === "RESET-CONFIRM" ||
    confirmPhrase.trim() === "सबै कारोबार मेटाउनुहोस्" ||
    confirmPhrase.trim().toUpperCase() === "RESET";

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhraseValid) {
      setError("कृपया पुष्टि वाक्यांश 'RESET-CONFIRM' वा 'सबै कारोबार मेटाउनुहोस्' सही तरिकाले लेख्नुहोस्।");
      return;
    }
    if (!reason || reason.trim().length < 10) {
      setError("कृपया कम्तिमा १० अक्षरको आधिकारिक कारण अनिवार्य रूपमा खुलाउनुहोस्।");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/reset-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim(),
          confirmPhrase: confirmPhrase.trim(),
          resetOpeningBalances,
          clearOpeningStaging,
          clearOpeningDraft: resetOpeningBalances,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "कारोबार रिसेट गर्न सकिएन।");
      }

      setResult(data);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "कारोबार रिसेट गर्दा त्रुटि आयो।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-red-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[88vh] flex flex-col my-auto">
        {/* Header (Fixed) */}
        <div className="bg-gradient-to-r from-red-700 via-rose-700 to-red-800 px-5 py-3.5 text-white flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
              <Trash2 className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black tracking-tight text-white drop-shadow-sm">
                  कारोबार पूर्ण रिसेट इन्जिन (Wipe All Transactions)
                </h3>
                <span className="text-[10px] font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow-sm">
                  Admin Only
                </span>
              </div>
              <p className="text-[11px] text-red-100 font-medium">
                सदस्य व्यक्तिगत विवरण (KYC) अक्षुण्ण राख्दै सम्पूर्ण वित्तीय कारोबार र भौचरहरू शून्य बनाउने।
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Scrollable if viewport is tiny) */}
        {result ? (
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-800">
                कारोबार रिसेट सफलतापूर्वक सम्पन्न भयो!
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                {result.message}
              </p>
            </div>

            {/* Preserved Stats Card */}
            <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center space-x-2.5 p-2.5 bg-white rounded-lg border border-slate-200">
                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">सुरक्षित सदस्य (KYC)</div>
                  <div className="font-bold text-slate-900 text-xs">{result.membersPreservedCount} जना</div>
                </div>
              </div>
              <div className="flex items-center space-x-2.5 p-2.5 bg-white rounded-lg border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-[#1F497D] shrink-0" />
                <div className="overflow-hidden">
                  <div className="text-[10px] text-slate-500 font-medium">सुरक्षा ब्याकअप फाइल</div>
                  <div className="font-mono font-bold text-slate-800 text-[10px] truncate">
                    {result.backupFileName}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2.5">
              <a
                href="/api/excel/download"
                download
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>रिसेटपछिको एक्सेल डाउनलोड</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (typeof window !== "undefined") window.location.reload();
                }}
                className="px-5 py-2 bg-[#1F497D] hover:bg-[#183a63] text-white text-xs font-bold rounded-lg shadow transition"
              >
                पृष्ठ ताजा गर्नुहोस् (Refresh Page)
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              {/* Preservation & Wipe Visual Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-900 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>१००% सुरक्षित रहने विवरण:</span>
                  </div>
                  <ul className="text-[11px] text-emerald-800 space-y-0.5 list-disc list-inside">
                    <li>सबै सदस्यहरूको व्यक्तिगत विवरण (KYC)</li>
                    <li>सदस्य नं., नागरिकता, फोन, ठेगाना</li>
                    <li>प्रणाली प्रयोगकर्ता लगइन खाताहरू (Users)</li>
                    <li>संस्थाको नाम, प्यान, लोगो र सेटिङ</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-rose-900 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>मेटाएर शून्य (०) हुने विवरण:</span>
                  </div>
                  <ul className="text-[11px] text-rose-800 space-y-0.5 list-disc list-inside">
                    <li>सम्पत्ति र दायित्व खाताका दैनिक भौचरहरू</li>
                    <li>खर्च र आम्दानी खाताका सम्पूर्ण प्रविष्टिहरू</li>
                    <li>शेयर, बचत र कर्जाका व्यक्तिगत खाता कारोबार</li>
                    <li>सदस्यहरूको चालू मौज्दात (सबै ०.००)</li>
                  </ul>
                </div>
              </div>

              {/* Emergency Backup Notice */}
              <div className="flex items-center space-x-2.5 p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  <b>सुरक्षा ग्यारेन्टी:</b> रिसेट सुरु हुनासाथ चालु सम्पूर्ण एक्सेल फाइल र डाटाहरू स्वचालित रूपमा <code>data/backups/</code> मा ब्याकअप भएर मात्र कारोबार मेटाइन्छ।
                </p>
              </div>

              {/* Config Options */}
              <div className="space-y-1.5 bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetOpeningBalances}
                    onChange={(e) => setResetOpeningBalances(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                  />
                  <span className="font-semibold text-slate-800 text-[11.5px]">
                    प्रारम्भिक मौज्दात प्रविष्टि (Opening Balances OB-001) पनि रिसेट गरी शून्य बनाउने
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearOpeningStaging}
                    onChange={(e) => setClearOpeningStaging(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                  />
                  <span className="font-semibold text-slate-800 text-[11.5px]">
                    बल्क आयात गरिएका परीक्षण ब्याचहरू (Staged Member Batches) पनि हटाउने
                  </span>
                </label>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                  आधिकारिक कारण (Mandatory Reason - कम्तिमा १० अक्षर) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="उदा: परीक्षण तथा डेमो कारोबारहरू हटाएर वास्तविक प्रारम्भिक मौज्दात प्रविष्ट गर्न लागिएको।"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {/* Safety Confirmation Phrase */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11.5px] font-bold text-slate-700">
                    पुष्टि वाक्यांश टाइप गर्नुहोस् <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500">
                    पुष्टि कोड: <strong className="text-red-600">RESET-CONFIRM</strong>
                  </span>
                </div>
                <input
                  type="text"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  placeholder="RESET-CONFIRM"
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none uppercase"
                />
              </div>

              {error && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Actions (Fixed at Bottom) */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
              >
                रद्द गर्नुहोस् (Cancel)
              </button>
              <button
                type="submit"
                disabled={loading || !isPhraseValid || reason.trim().length < 10}
                className="flex items-center space-x-1.5 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>कारोबार रिसेट हुँदैछ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>स्वीकृत गरी कारोबार मेटाउनुहोस्</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
