"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  UserPlus,
  FileText,
  Printer,
  X,
  CreditCard,
  PiggyBank,
  BadgeDollarSign,
  Phone,
  MapPin,
  ShieldCheck,
  RefreshCw,
  Camera,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [statementData, setStatementData] = useState<any>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Member Form State
  const [formData, setFormData] = useState({
    fullName: "",
    citizenshipNo: "",
    address: "",
    phone: "",
    nomineeName: "",
    nomineeRelation: "श्रीमती (Wife)",
    enrolledDate: "2083-07-10",
    shareUnits: "10",
    paymentMode: "CASH",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  const loadMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/members");
      const json = await res.json();
      if (json.success) {
        setMembers(json.members || []);
      }
    } catch (e) {
      console.error("Members fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const openStatement = async (m: any) => {
    setSelectedMember(m);
    setStatementLoading(true);
    try {
      const res = await fetch(`/api/members/${m.memberId}/statement`);
      const json = await res.json();
      if (json.success) {
        setStatementData(json);
      }
    } catch (e) {
      console.error("Statement fetch error:", e);
    } finally {
      setStatementLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formPayload = new FormData();
      formPayload.append("fullName", formData.fullName);
      formPayload.append("citizenshipNo", formData.citizenshipNo);
      formPayload.append("address", formData.address);
      formPayload.append("phone", formData.phone);
      formPayload.append("nomineeName", formData.nomineeName);
      formPayload.append("nomineeRelation", formData.nomineeRelation);
      formPayload.append("enrolledDate", formData.enrolledDate);
      formPayload.append("shareUnits", formData.shareUnits);
      formPayload.append("paymentMode", formData.paymentMode);
      if (photoFile) {
        formPayload.append("photo", photoFile);
      }

      const res = await fetch("/api/members", {
        method: "POST",
        body: formPayload,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "सदस्य दर्ता असफल भयो");
      }

      alert(`सदस्य सफलतापूर्वक दर्ता भयो! (Member ID: ${json.memberId})`);
      setIsAddModalOpen(false);
      setFormData({
        fullName: "",
        citizenshipNo: "",
        address: "",
        phone: "",
        nomineeName: "",
        nomineeRelation: "श्रीमती (Wife)",
        enrolledDate: "2083-07-10",
        shareUnits: "10",
        paymentMode: "CASH",
      });
      setPhotoFile(null);
      setPhotoPreview("");
      loadMembers();
    } catch (err: any) {
      alert("त्रुटि: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.memberId.toLowerCase().includes(q) ||
      m.fullName.toLowerCase().includes(q) ||
      m.citizenshipNo.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className={`space-y-6 ${selectedMember ? "hide-when-modal-prints" : ""}`}>
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#1F497D] text-white text-[11px] font-bold px-2 py-0.5 rounded">
              Sheet 6
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              सदस्य व्यक्तिगत के.वाई.सी. तथा एकीकृत खाता अभिलेख
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Member KYC Master Directory, Real-Time Share/Savings/Loan Balances & Passbook Statements
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-[#1F497D] hover:bg-[#15345a] text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>नयाँ सदस्य दर्ता (Add Member KYC)</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="सदस्य नं, नाम, नागरिकता वा फोन..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1F497D] focus:bg-white transition-all font-medium"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500 self-end sm:self-center">
          कुल सदस्य: <span className="text-slate-900 font-bold">{members.length} जना</span> (फेला परेको: {filteredMembers.length})
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto khata-scroll">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#1F497D] text-white uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3 px-3">सदस्य नं. (ID)</th>
                <th className="py-3 px-3">फोटो</th>
                <th className="py-3 px-3">सदस्यको पूरा नाम</th>
                <th className="py-3 px-3">नागरिकता नं. र जिल्ला</th>
                <th className="py-3 px-3">ठेगाना / मोबाइल</th>
                <th className="py-3 px-3">हकवाला (नाता)</th>
                <th className="py-3 px-3 text-right">शेयर कित्ता (रकम)</th>
                <th className="py-3 px-3 text-right">बचत मौज्दात</th>
                <th className="py-3 px-3 text-right">ऋण बाँकी</th>
                <th className="py-3 px-3 text-right">खुद स्थिति (Net)</th>
                <th className="py-3 px-3 text-center">पासबुक</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1F497D]" />
                    सदस्यहरूको विवरण लोड हुँदैछ...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    कुनै सदस्य फेला परेन।
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.memberId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-[#1F497D]">
                      {m.memberId}
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border border-slate-300 flex items-center justify-center font-bold text-slate-600 text-xs shadow-inner">
                        {m.photoUrl && m.photoUrl !== "/avatar-placeholder.png" ? (
                          <img
                            src={m.photoUrl}
                            alt={m.fullName}
                            className="w-full h-full object-cover"
                            onError={(e: any) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fullName)}&background=1F497D&color=fff&size=80`;
                            }}
                          />
                        ) : (
                          <span>{m.fullName.charAt(0)}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{m.fullName}</div>
                      <div className="text-[10px] text-slate-400">दर्ता मिति: {m.enrolledDate}</div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {m.citizenshipNo}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <div>{m.address}</div>
                      <div className="text-[10px] text-slate-400">{m.phone}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      <div className="font-semibold">{m.nomineeName}</div>
                      <div className="text-[10px] text-slate-400">{m.nomineeRelation}</div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-slate-900">{m.shareUnits} कित्ता</div>
                      <div className="text-[10px] text-slate-500">रु. {m.shareBalance.toLocaleString()}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      रु. {m.savingsBalance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-amber-700">
                      रु. {m.loanBalance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      रु. {m.netWorth.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => openStatement(m)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#1F497D] font-bold rounded-lg border border-blue-200 transition-colors inline-flex items-center space-x-1"
                        title="पासबुक स्टेटमेन्ट हेर्नुहोस्"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>स्टेटमेन्ट</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Statement Modal / Slide-Over */}
      {selectedMember && (
        <div className="printable-modal fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 print:p-0 print:bg-white print:static">
          <div className="printable-modal-content bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 print:max-w-none print:shadow-none print:border-none print:rounded-none">
            {/* Modal Header */}
            <div className="bg-[#1F497D] text-white p-5 flex items-center justify-between print:bg-transparent print:text-black print:p-0 print:border-b-2 print:border-slate-900 print:mb-3">
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6 text-amber-400 no-print" />
                <div>
                  <div className="print-only text-center mb-1">
                    <h2 className="text-xl font-black text-slate-900">नेपाल सहकारी संस्था लि.</h2>
                    <p className="text-xs text-slate-600">पुनर्वास, कञ्चनपुर | दर्ता नं: १२३४/०७५/०७६</p>
                  </div>
                  <h3 className="text-base font-bold print:text-sm print:font-extrabold print:text-slate-900">
                    सदस्य एकीकृत पासबुक स्टेटमेन्ट (Passbook Statement)
                  </h3>
                  <p className="text-xs text-slate-200 print:text-slate-800 font-medium">
                    सदस्यको नाम: <strong className="text-white print:text-black font-black">{selectedMember.fullName}</strong> ({selectedMember.memberId}) — नागरिकता: {selectedMember.citizenshipNo} | मोबाइल: {selectedMember.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 no-print">
                <button
                  onClick={() => window.print()}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                  title="प्रिन्ट गर्नुहोस्"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs print:p-0 print:space-y-4 print:overflow-visible">
              {statementLoading ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1F497D]" />
                  खाता स्टेटमेन्ट लोड हुँदैछ...
                </div>
              ) : (
                <>
                  {/* Balance Summary Header */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">शेयर पुँजी मौज्दात</div>
                      <div className="text-base font-black text-slate-900 mt-0.5">
                        रु. {(statementData?.member?.shareBalance ?? selectedMember.shareBalance ?? 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ({statementData?.member?.shareUnits ?? selectedMember.shareUnits ?? 0} कित्ता)
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">कुल बचत निक्षेप</div>
                      <div className="text-base font-black text-emerald-700 mt-0.5">
                        रु. {(statementData?.member?.savingsBalance ?? selectedMember.savingsBalance ?? 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold">नियमित/मुद्दती</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">सक्रिय ऋण लगानी</div>
                      <div className="text-base font-black text-amber-700 mt-0.5">
                        रु. {(statementData?.member?.loanBalance ?? selectedMember.loanBalance ?? 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-amber-600 font-semibold">बाँकी साँवा</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">खुद वित्तीय स्थिति (Net)</div>
                      <div className="text-base font-black text-[#1F497D] mt-0.5">
                        रु. {(statementData?.member?.netWorth ?? selectedMember.netWorth ?? 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">शेयर + बचत - ऋण</div>
                    </div>
                  </div>

                  {/* Section 1: Share Transactions */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                      <CreditCard className="w-4 h-4 text-[#1F497D]" />
                      <span>१. शेयर कारोबार इतिहास (Sheet 7 Share Sub-Ledger)</span>
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2">मिति</th>
                            <th className="p-2">भौचर नं</th>
                            <th className="p-2">प्रमाणपत्र</th>
                            <th className="p-2">विवरण</th>
                            <th className="p-2 text-right">कित्ता</th>
                            <th className="p-2 text-right">फिर्ता (Dr)</th>
                            <th className="p-2 text-right">दाखिला (Cr)</th>
                            <th className="p-2 text-right">मौज्दात</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(statementData?.shareTransactions || []).length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-3 text-center text-slate-400">
                                शेयर कारोबार प्रविष्टि छैन।
                              </td>
                            </tr>
                          ) : (
                            (statementData?.shareTransactions || []).map((t: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-2">{t.date}</td>
                                <td className="p-2 font-mono text-[#1F497D]">{t.voucherNo}</td>
                                <td className="p-2">{t.certNo}</td>
                                <td className="p-2">{t.particulars}</td>
                                <td className="p-2 text-right">{t.units}</td>
                                <td className="p-2 text-right">{t.debit > 0 ? `रु. ${t.debit.toLocaleString()}` : "-"}</td>
                                <td className="p-2 text-right font-semibold">{t.credit > 0 ? `रु. ${t.credit.toLocaleString()}` : "-"}</td>
                                <td className="p-2 text-right font-bold text-slate-900">रु. {t.balance.toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 2: Savings Transactions */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                      <PiggyBank className="w-4 h-4 text-emerald-600" />
                      <span>२. बचत तथा निक्षेप कारोबार इतिहास (Sheet 8 Bachat Sub-Ledger)</span>
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2">मिति</th>
                            <th className="p-2">भौचर नं</th>
                            <th className="p-2">बचत शीर्षक</th>
                            <th className="p-2">विवरण</th>
                            <th className="p-2 text-right">ब्याज दर</th>
                            <th className="p-2 text-right">भुक्तानी फिर्ता (Dr)</th>
                            <th className="p-2 text-right">दाखिला (Cr)</th>
                            <th className="p-2 text-right">मौज्दात</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(statementData?.savingTransactions || []).length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-3 text-center text-slate-400">
                                बचत कारोबार प्रविष्टि छैन।
                              </td>
                            </tr>
                          ) : (
                            (statementData?.savingTransactions || []).map((t: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-2">{t.date}</td>
                                <td className="p-2 font-mono text-emerald-700">{t.voucherNo}</td>
                                <td className="p-2 font-semibold">{t.savingsType}</td>
                                <td className="p-2">{t.particulars}</td>
                                <td className="p-2 text-right">{t.rate ? `${(t.rate * 100).toFixed(1)}%` : "-"}</td>
                                <td className="p-2 text-right text-rose-600">{t.debit > 0 ? `रु. ${t.debit.toLocaleString()}` : "-"}</td>
                                <td className="p-2 text-right font-semibold text-emerald-700">{t.credit > 0 ? `रु. ${t.credit.toLocaleString()}` : "-"}</td>
                                <td className="p-2 text-right font-bold text-slate-900">रु. {t.balance.toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3: Loan Transactions */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                      <BadgeDollarSign className="w-4 h-4 text-amber-600" />
                      <span>३. ऋण लगानी तथा साँवा असुली इतिहास (Sheet 9 Loan Sub-Ledger)</span>
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2">मिति</th>
                            <th className="p-2">भौचर नं</th>
                            <th className="p-2">ऋण खाता</th>
                            <th className="p-2">कर्जा शीर्षक</th>
                            <th className="p-2 text-right">ब्याज दर</th>
                            <th className="p-2 text-right">ऋण प्रवाह (Dr)</th>
                            <th className="p-2 text-right">साँवा असुली (Cr)</th>
                            <th className="p-2 text-right">बाँकी साँवा</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(statementData?.loanTransactions || []).length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-3 text-center text-slate-400">
                                ऋण कारोबार प्रविष्टि छैन।
                              </td>
                            </tr>
                          ) : (
                            (statementData?.loanTransactions || []).map((t: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-2">{t.date}</td>
                                <td className="p-2 font-mono text-amber-700">{t.voucherNo}</td>
                                <td className="p-2">{t.loanAccNo}</td>
                                <td className="p-2 font-semibold">{t.loanCategory}</td>
                                <td className="p-2 text-right">{t.rate ? `${(t.rate * 100).toFixed(1)}%` : "-"}</td>
                                <td className="p-2 text-right text-indigo-700 font-semibold">{t.debit > 0 ? `रु. ${t.debit.toLocaleString()}` : "-"}</td>
                                <td className="p-2 text-right text-emerald-600 font-semibold">{t.credit > 0 ? `रु. ${t.credit.toLocaleString()}` : "-"}</td>
                                <td className="p-2 text-right font-bold text-slate-900">रु. {t.balance.toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Official Signature Block for Member Passbook Statement (Visible ONLY on Paper) */}
                  <div className="print-only mt-8 pt-4 border-t border-slate-400 print-avoid-break">
                    <div className="grid grid-cols-3 text-center text-xs font-bold text-slate-900">
                      <div>
                        <div className="w-36 border-b border-slate-700 mx-auto mb-2"></div>
                        <div>तयार गर्ने (फाँटवाला)</div>
                        <div className="text-[10px] font-normal text-slate-600">(कर्मचारी / क्यासियर)</div>
                      </div>
                      <div>
                        <div className="w-36 border-b border-slate-700 mx-auto mb-2"></div>
                        <div>जाँच्ने (लेखा अधिकृत)</div>
                        <div className="text-[10px] font-normal text-slate-600">(आन्तरिक लेखापरीक्षक)</div>
                      </div>
                      <div>
                        <div className="w-36 border-b border-slate-700 mx-auto mb-2"></div>
                        <div>प्रमाणित गर्ने (व्यवस्थापक)</div>
                        <div className="text-[10px] font-normal text-slate-600">(व्यवस्थापक / अख्तियारप्राप्त)</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Member KYC Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-[#1F497D] text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">नयाँ सदस्य दर्ता तथा के.वाई.सी. प्रविष्टि (Add Member KYC)</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Photo Upload Section */}
              <div className="flex items-center space-x-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-16 h-16 rounded-xl bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    सदस्यको फोटो (Member Photo)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1F497D] file:text-white hover:file:bg-[#15345a]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    तस्बिर public/uploads/members/ मा सुरक्षित हुनेछ।
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    सदस्यको पूरा नाम (Full Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="उदा: हरि प्रसाद न्यौपाने"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F497D]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    नागरिकता नं. र जिल्ला (Citizenship No.) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.citizenshipNo}
                    onChange={(e) => setFormData({ ...formData, citizenshipNo: e.target.value })}
                    placeholder="७५-०१-७५-०१२३४ (कञ्चनपुर)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F497D]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ठेगाना / वडा (Address) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="पुनर्वास-०२, कञ्चनपुर"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F497D]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    मोबाइल नं. (Mobile Phone) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+977-9858721011"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F497D]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    हकवालाको पूरा नाम (Nominee Full Name)
                  </label>
                  <input
                    type="text"
                    value={formData.nomineeName}
                    onChange={(e) => setFormData({ ...formData, nomineeName: e.target.value })}
                    placeholder="उदा: सावित्री न्यौपाने"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F497D]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    हकवालासँगको नाता (Relationship with Nominee)
                  </label>
                  <select
                    value={formData.nomineeRelation}
                    onChange={(e) => setFormData({ ...formData, nomineeRelation: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F497D]"
                  >
                    <option value="श्रीमती (Wife)">श्रीमती (Wife)</option>
                    <option value="श्रीमान (Husband)">श्रीमान (Husband)</option>
                    <option value="छोरा (Son)">छोरा (Son)</option>
                    <option value="छोरी (Daughter)">छोरी (Daughter)</option>
                    <option value="बुबा (Father)">बुबा (Father)</option>
                    <option value="आमा (Mother)">आमा (Mother)</option>
                    <option value="दाजु/भाइ (Brother)">दाजु/भाइ (Brother)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    सदस्यता मिति (Enrolled Date B.S.)
                  </label>
                  <input
                    type="text"
                    value={formData.enrolledDate}
                    onChange={(e) => setFormData({ ...formData, enrolledDate: e.target.value })}
                    placeholder="2083-07-10"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F497D]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    प्रारम्भिक शेयर कित्ता (Initial Share Units @ रु १००)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.shareUnits}
                    onChange={(e) => setFormData({ ...formData, shareUnits: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F497D]"
                  />
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    रकम: रु. {(parseInt(formData.shareUnits || "0", 10) * 100).toLocaleString()} (Sheet 7, 3, 2 मा स्वतः प्रविष्टि)
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    भुक्तानी माध्यम (Share Payment Mode)
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="payMode"
                        value="CASH"
                        checked={formData.paymentMode === "CASH"}
                        onChange={() => setFormData({ ...formData, paymentMode: "CASH" })}
                        className="text-[#1F497D]"
                      />
                      <span>नगद मौज्दात (Hisab 80 Cash)</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="payMode"
                        value="BANK"
                        checked={formData.paymentMode === "BANK"}
                        onChange={() => setFormData({ ...formData, paymentMode: "BANK" })}
                        className="text-[#1F497D]"
                      />
                      <span>बैंक दाखिला (Hisab 90 Bank)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#1F497D] hover:bg-[#15345a] text-white font-bold rounded-xl shadow-md flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>दर्ता हुँदैछ...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      <span>सदस्य दर्ता सुरक्षित गर्नुहोस्</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
