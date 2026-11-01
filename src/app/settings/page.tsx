"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Calendar,
  PenTool,
  Image as ImageIcon,
  Database,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Upload,
  ShieldCheck,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Phone,
  Mail,
  Globe,
  FileCheck2,
  Trash2,
} from "lucide-react";
import type { OrganisationSettings } from "@/lib/org-settings";
import ResetTransactionsModal from "@/components/ResetTransactionsModal";

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrganisationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "address" | "finance" | "signatories" | "preview" | "system">("profile");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings/org");
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err: any) {
      setNotification({ type: "error", message: "सेटिङ लोड गर्दा त्रुटि: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof OrganisationSettings, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [field]: value,
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      setNotification(null);
      const res = await fetch("/api/settings/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setNotification({ type: "success", message: data.message || "संस्थागत विवरण सफलतापूर्वक सुरक्षित भयो!" });
        // Notify Navbar and other components to update in real-time
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("org-settings-updated", { detail: data.settings }));
        }
        setTimeout(() => setNotification(null), 4000);
      } else {
        setNotification({ type: "error", message: data.error || "सुरक्षित गर्न सकिएन।" });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: "सर्भर त्रुटि: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("के तपाईं सबै संस्थागत सेटिङहरू पूर्ववत (Default) अवस्थामा फर्काउन चाहनुहुन्छ?")) {
      return;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/settings/org", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setNotification({ type: "success", message: data.message || "सेटिङ रिसेट भयो!" });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("org-settings-updated", { detail: data.settings }));
        }
        setTimeout(() => setNotification(null), 4000);
      } else {
        setNotification({ type: "error", message: data.error || "रिसेट गर्न सकिएन।" });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: "त्रुटि: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    try {
      setUploadingLogo(true);
      setNotification(null);
      const res = await fetch("/api/settings/org/logo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings((prev) => (prev ? { ...prev, logoUrl: data.logoUrl } : null));
        setNotification({ type: "success", message: "लोगो सफलतापूर्वक अपलोड भयो!" });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("org-settings-updated", { detail: data.settings }));
        }
        setTimeout(() => setNotification(null), 4000);
      } else {
        setNotification({ type: "error", message: data.error || "लोगो अपलोड गर्न सकिएन।" });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: "लोगो अपलोड गर्दा समस्या: " + err.message });
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-[#1F497D] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        संस्थागत विवरण लोड हुँदैछ...
      </div>
    );
  }

  const tabs = [
    { id: "profile", labelNep: "संस्थाको परिचय", labelEng: "Profile & Identity", icon: Building2 },
    { id: "address", labelNep: "ठेगाना र सम्पर्क", labelEng: "Address & Contact", icon: MapPin },
    { id: "finance", labelNep: "आर्थिक वर्ष र नीति", labelEng: "Fiscal & Rules", icon: Calendar },
    { id: "signatories", labelNep: "प्रतिवेदन हस्ताक्षरकर्ता", labelEng: "Signatories", icon: PenTool },
    { id: "preview", labelNep: "लेटरहेड पूर्वावलोकन", labelEng: "Live Letterhead", icon: ImageIcon },
    { id: "system", labelNep: "एक्सेल डाटाबेस स्थिति", labelEng: "Excel Engine & DB", icon: Database },
  ] as const;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-16 px-1">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-2xl bg-white p-1 border-2 border-slate-200 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            {settings.logoUrl && settings.logoUrl !== "/avatar-placeholder.png" ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className="w-full h-full object-contain rounded-xl"
                onError={(e: any) => {
                  e.target.src = "/avatar-placeholder.png";
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-[#1F497D] to-[#2E5B88] rounded-xl flex items-center justify-center">
                <Building2 className="w-7 h-7 text-amber-400" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {settings.nameNep}
              </h1>
              <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300 whitespace-nowrap">
                संस्थागत सेटिङ
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              सहकारीको परिचय, ठेगाना, आर्थिक वर्ष, वित्तीय नियम र प्रिन्ट प्रतिवेदनका हस्ताक्षरकर्ताहरूको आधिकारिक व्यवस्थापन
            </p>
          </div>
        </div>

        {/* Global Save and Reset Actions */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>डिफल्ट रिसेट</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#1F497D] hover:bg-[#183a63] text-white text-xs font-bold rounded-xl shadow-md transition-all border border-[#2E5B88] disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{saving ? "सुरक्षित हुँदैछ..." : "सेटिङ सुरक्षित गर्नुहोस्"}</span>
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
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 font-bold px-2">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs (Responsive Wrap - Zero Horizontal Scroll) */}
      <div className="flex flex-wrap gap-2 bg-slate-200/80 p-1.5 rounded-2xl text-xs font-bold no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
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

      {/* Form Content */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: General Profile & Identity */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#1F497D]" />
                <span>१. संस्थाको कानुनी तथा आधिकारिक परिचय (General Identity & Registration)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                सहकारीको दर्ता प्रमाणपत्र तथा विधान अनुसार आधिकारिक नाम र कानुनी दर्ता विवरणहरू
              </p>
            </div>

            <div className="space-y-5">
              {/* Row 1: Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>संस्थाको नाम (नेपाली) <strong className="text-rose-500">*</strong></span>
                    <span className="text-[10px] text-slate-400 font-normal">Cooperative Name (Nep)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.nameNep}
                    onChange={(e) => handleInputChange("nameNep", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="उदा: श्री दिपशीखा सहकारी संस्था लि."
                  />
                  <p className="text-[11px] text-slate-400 mt-1">नेभिगेसन बार, भौचर, पासबुक र आधिकारिक रिपोर्टहरूमा देखिन्छ।</p>
                </div>

                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>संस्थाको नाम (English) <strong className="text-rose-500">*</strong></span>
                    <span className="text-[10px] text-slate-400 font-normal">Cooperative Name (Eng)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.nameEng}
                    onChange={(e) => handleInputChange("nameEng", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="e.g. Deepshikha Agriculture Cooperative Ltd."
                  />
                </div>
              </div>

              {/* Row 2: Type & Reg No */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>सहकारीको प्रकार (Cooperative Nature / Type)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Classification</span>
                  </label>
                  <input
                    type="text"
                    value={settings.coopType}
                    onChange={(e) => handleInputChange("coopType", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="उदा: बचत तथा ऋण सहकारी संस्था / कृषि सहकारी संस्था"
                  />
                </div>

                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>सहकारी दर्ता नम्बर (Registration No.) <strong className="text-rose-500">*</strong></span>
                    <span className="text-[10px] text-slate-400 font-normal">Govt Reg No.</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.regNo}
                    onChange={(e) => handleInputChange("regNo", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="उदा: १२३४/०७५/०७६"
                  />
                </div>
              </div>

              {/* Row 3: PAN & Regulatory Authority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>स्थायी लेखा नम्बर (PAN / VAT No.)</span>
                    <span className="text-[10px] text-slate-400 font-normal">IRD PAN</span>
                  </label>
                  <input
                    type="text"
                    value={settings.panNo}
                    onChange={(e) => handleInputChange("panNo", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="उदा: ३०२१४५६७८"
                  />
                </div>

                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>नियमनकारी निकाय (Regulatory Authority)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Department</span>
                  </label>
                  <input
                    type="text"
                    value={settings.regulatoryBody}
                    onChange={(e) => handleInputChange("regulatoryBody", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="उदा: सहकारी विभाग / प्रदेश सहकारी रजिस्ट्रारको कार्यालय"
                  />
                </div>
              </div>

              {/* Row 4: Est Date BS & AD */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>स्थापना मिति वि.सं. (Established Date B.S.)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Bikram Sambat</span>
                  </label>
                  <input
                    type="text"
                    value={settings.establishedDateBs}
                    onChange={(e) => handleInputChange("establishedDateBs", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="२०७५/०३/१५"
                  />
                </div>

                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>स्थापना मिति ई.सं. (Established Date A.D.)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Gregorian Date</span>
                  </label>
                  <input
                    type="date"
                    value={settings.establishedDateAd}
                    onChange={(e) => handleInputChange("establishedDateAd", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Row 5: Taglines */}
              <div className="w-full min-w-0">
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>संस्थाको आदर्श वाक्य / नारा (Nepali Tagline)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Motto</span>
                </label>
                <input
                  type="text"
                  value={settings.taglineNep}
                  onChange={(e) => handleInputChange("taglineNep", e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                  placeholder="उदा: नेपाल सहकारी ऐन तथा नेपाल राष्ट्र बैंक मापदण्ड अनुसार स्वचालित ४-खाता प्रणाली"
                />
              </div>

              <div className="w-full min-w-0">
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>English Tagline / Subtitle</span>
                  <span className="text-[10px] text-slate-400 font-normal">English Motto</span>
                </label>
                <input
                  type="text"
                  value={settings.taglineEng}
                  onChange={(e) => handleInputChange("taglineEng", e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                  placeholder="e.g. Nepal Cooperative 4-Khata Live Excel Core Accounting"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Address & Contact */}
        {activeTab === "address" && (
          <div className="space-y-6">
            {/* Card 1: Geographic Address */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#1F497D]" />
                  <span>२.१ भौगोलिक ठेगाना विवरण (Geographical Address)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  मुख्यालय / कार्यालय रहेको स्थानको आधिकारिक ठेगाना
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">प्रदेश (Province)</label>
                  <input
                    type="text"
                    value={settings.province}
                    onChange={(e) => handleInputChange("province", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="सुदूरपश्चिम प्रदेश"
                  />
                </div>

                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">जिल्ला (District)</label>
                  <input
                    type="text"
                    value={settings.district}
                    onChange={(e) => handleInputChange("district", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="कञ्चनपुर / कैलाली"
                  />
                </div>

                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">स्थानीय तह (Municipality/Palika)</label>
                  <input
                    type="text"
                    value={settings.palika}
                    onChange={(e) => handleInputChange("palika", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="पुनर्वास नगरपालिका"
                  />
                </div>

                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">वडा नं. (Ward No.)</label>
                  <input
                    type="text"
                    value={settings.wardNo}
                    onChange={(e) => handleInputChange("wardNo", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="०२"
                  />
                </div>

                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">टोल / स्थान (Tole / Street)</label>
                  <input
                    type="text"
                    value={settings.tole}
                    onChange={(e) => handleInputChange("tole", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="पुनर्वास बजार"
                  />
                </div>

                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">हुलाक बाकस (Post Box No.)</label>
                  <input
                    type="text"
                    value={settings.postBox}
                    onChange={(e) => handleInputChange("postBox", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="१०१"
                  />
                </div>
              </div>

              <div className="w-full min-w-0 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>पूर्ण आधिकारिक ठेगाना (Full Formatted Address) <strong className="text-rose-500">*</strong></span>
                  <span className="text-[10px] text-slate-400 font-normal">Report Header Address</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.fullAddress}
                  onChange={(e) => handleInputChange("fullAddress", e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                  placeholder="पुनर्वास, कञ्चनपुर, सुदूरपश्चिम प्रदेश, नेपाल"
                />
              </div>
            </div>

            {/* Card 2: Contact Info */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#1F497D]" />
                  <span>२.२ आधिकारिक सम्पर्क माध्यमहरू (Official Contact Channels)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  सदस्यहरू तथा नियमनकारी निकायसँग सम्पर्क गर्न प्रयोग हुने आधिकारिक फोन, इमेल र वेबसाइट
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>सम्पर्क फोन / मोबाइल</span>
                  </label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="०९९-५८०१२३, ९८५१२३४५६७"
                  />
                </div>

                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>आधिकारिक इमेल (Email)</span>
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="info@nepalcoop.org.np"
                  />
                </div>

                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>आधिकारिक वेबसाइट (Website)</span>
                  </label>
                  <input
                    type="text"
                    value={settings.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="https://nepalcoop.org.np"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Fiscal Year & Rules */}
        {activeTab === "finance" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#1F497D]" />
                <span>३. आर्थिक वर्ष र वित्तीय लेखा मापदण्ड (Fiscal Year & Accounting Rules)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                सहकारी ऐन २०७४ तथा नेपाल राष्ट्र बैंक मापदण्ड अनुसार लेखा वर्ष र वित्तीय अनुपात नीति
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="w-full min-w-0">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  चालू आर्थिक वर्ष (Current Fiscal Year) <strong className="text-rose-500">*</strong>
                </label>
                <input
                  type="text"
                  required
                  value={settings.fiscalYear}
                  onChange={(e) => handleInputChange("fiscalYear", e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                  placeholder="२०८३/८४"
                />
                <p className="text-[11px] text-slate-400 mt-1">सबै ४-मूल खाता रिपोर्ट र प्रिन्ट शीर्षकमा स्वचालित देखिन्छ।</p>
              </div>

              <div className="w-full min-w-0">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  आर्थिक वर्ष सुरु मिति (वि.सं.)
                </label>
                <input
                  type="text"
                  value={settings.fiscalYearStartBs}
                  onChange={(e) => handleInputChange("fiscalYearStartBs", e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                  placeholder="२०८३/०४/०१"
                />
              </div>

              <div className="w-full min-w-0">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  आर्थिक वर्ष अन्त्य मिति (वि.सं.)
                </label>
                <input
                  type="text"
                  value={settings.fiscalYearEndBs}
                  onChange={(e) => handleInputChange("fiscalYearEndBs", e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                  placeholder="२०८४/०३/३१"
                />
              </div>

              <div className="w-full min-w-0">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  शेयर प्रतिकित्ता दर रु. (Share Par Value)
                </label>
                <input
                  type="number"
                  value={settings.shareParValue}
                  onChange={(e) => handleInputChange("shareParValue", parseFloat(e.target.value) || 100)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                  placeholder="100"
                />
                <p className="text-[11px] text-slate-400 mt-1">नेपाल सहकारी ऐन अनुसार प्रतिकित्ता दर रु. १००</p>
              </div>

              <div className="w-full min-w-0">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  न्यूनतम अनिवार्य बचत रु. (Min Balance NPR)
                </label>
                <input
                  type="number"
                  value={settings.minimumSavingsBal}
                  onChange={(e) => handleInputChange("minimumSavingsBal", parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                  placeholder="500"
                />
              </div>

              <div className="w-full min-w-0">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  साधारण जगेडा कोष दर % (General Reserve)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.generalReservePct}
                    onChange={(e) => handleInputChange("generalReservePct", parseFloat(e.target.value) || 20)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="20"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">सहकारी ऐन अनुसार खुद नाफाको न्यूनतम २०%</p>
              </div>

              <div className="w-full min-w-0">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  संरक्षित पूँजी फिर्ता कोष % (Patronage Refund)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.patronageRefundPct}
                    onChange={(e) => handleInputChange("patronageRefundPct", parseFloat(e.target.value) || 25)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                    placeholder="25"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">सहकारी ऐन अनुसार खुद नाफाको २५%</p>
              </div>

              <div className="w-full min-w-0 md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  ब्याज गणना विधि (Interest Calculation Method)
                </label>
                <input
                  type="text"
                  value={settings.interestCalcMethod}
                  onChange={(e) => handleInputChange("interestCalcMethod", e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1F497D] focus:bg-white focus:outline-none transition-all"
                  placeholder="दैनिक न्यूनतम मौज्दात विधि (Daily Minimum Balance) / ३६५ दिन"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Signatories */}
        {activeTab === "signatories" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-[#1F497D]" />
                  <span>४. आधिकारिक प्रतिवेदन तथा लेजर हस्ताक्षरकर्ताहरू (Report Signatories)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  ४-खाता लेजर, सन्तुलन परीक्षण, सदस्य पासबुक र आर्थिक विवरणहरू प्रिन्ट गर्दा स्वतः छापिन्छ।
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-[#1F497D] rounded-lg border border-blue-200">
                Print Signature Block
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Signatory 1 */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-black text-slate-800 border-b border-slate-200 pb-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#1F497D] text-white flex items-center justify-center text-[11px]">
                    १
                  </span>
                  <span>पहिलो हस्ताक्षरकर्ता (तयार गर्ने)</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">पद / भूमिका शीर्षक</label>
                  <input
                    type="text"
                    value={settings.signatory1Title}
                    onChange={(e) => handleInputChange("signatory1Title", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    placeholder="तयार गर्ने"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">पद विवरण (Designation)</label>
                  <input
                    type="text"
                    value={settings.signatory1Role}
                    onChange={(e) => handleInputChange("signatory1Role", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    placeholder="लेखापाल / क्यासियर"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">कर्मचारी / व्यक्तिको नाम</label>
                  <input
                    type="text"
                    value={settings.signatory1Name}
                    onChange={(e) => handleInputChange("signatory1Name", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    placeholder="उदा: रमेश शर्मा"
                  />
                </div>
              </div>

              {/* Signatory 2 */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-black text-slate-800 border-b border-slate-200 pb-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#1F497D] text-white flex items-center justify-center text-[11px]">
                    २
                  </span>
                  <span>दोस्रो हस्ताक्षरकर्ता (जाँच्ने)</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">पद / भूमिका शीर्षक</label>
                  <input
                    type="text"
                    value={settings.signatory2Title}
                    onChange={(e) => handleInputChange("signatory2Title", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    placeholder="जाँच्ने"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">पद विवरण (Designation)</label>
                  <input
                    type="text"
                    value={settings.signatory2Role}
                    onChange={(e) => handleInputChange("signatory2Role", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    placeholder="आन्तरिक लेखापरीक्षक"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">लेखापरीक्षकको नाम</label>
                  <input
                    type="text"
                    value={settings.signatory2Name}
                    onChange={(e) => handleInputChange("signatory2Name", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    placeholder="उदा: सीता चौधरी"
                  />
                </div>
              </div>

              {/* Signatory 3 */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-black text-slate-800 border-b border-slate-200 pb-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#1F497D] text-white flex items-center justify-center text-[11px]">
                    ३
                  </span>
                  <span>तेस्रो हस्ताक्षरकर्ता (स्वीकृत गर्ने)</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">पद / भूमिका शीर्षक</label>
                  <input
                    type="text"
                    value={settings.signatory3Title}
                    onChange={(e) => handleInputChange("signatory3Title", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    placeholder="स्वीकृत गर्ने"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">पद विवरण (Designation)</label>
                  <input
                    type="text"
                    value={settings.signatory3Role}
                    onChange={(e) => handleInputChange("signatory3Role", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    placeholder="व्यवस्थापक / अध्यक्ष"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">अध्यक्ष / व्यवस्थापकको नाम</label>
                  <input
                    type="text"
                    value={settings.signatory3Name}
                    onChange={(e) => handleInputChange("signatory3Name", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    placeholder="उदा: हरि प्रसाद जोशी"
                  />
                </div>
              </div>
            </div>

            {/* Visual Preview of Signatures */}
            <div className="mt-6 border-t border-slate-200 pt-5">
              <div className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-[#1F497D]" />
                <span>प्रिन्टमा हस्ताक्षर कसरी देखिन्छ (Live Signature Preview):</span>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-3 text-center text-xs font-bold text-slate-900">
                <div>
                  <div className="w-36 border-b border-slate-700 mx-auto mb-2"></div>
                  <div>{settings.signatory1Name || "हस्ताक्षर"}</div>
                  <div className="text-[11px] text-slate-700">{settings.signatory1Title}</div>
                  <div className="text-[10px] font-normal text-slate-500">({settings.signatory1Role})</div>
                </div>
                <div>
                  <div className="w-36 border-b border-slate-700 mx-auto mb-2"></div>
                  <div>{settings.signatory2Name || "हस्ताक्षर"}</div>
                  <div className="text-[11px] text-slate-700">{settings.signatory2Title}</div>
                  <div className="text-[10px] font-normal text-slate-500">({settings.signatory2Role})</div>
                </div>
                <div>
                  <div className="w-36 border-b border-slate-700 mx-auto mb-2"></div>
                  <div>{settings.signatory3Name || "हस्ताक्षर"}</div>
                  <div className="text-[11px] text-slate-700">{settings.signatory3Title}</div>
                  <div className="text-[10px] font-normal text-slate-500">({settings.signatory3Role})</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Live Letterhead & Logo */}
        {activeTab === "preview" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#1F497D]" />
                    <span>संस्थाको लोगो तथा आधिकारिक लेटरहेड (Logo & Print Letterhead)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    प्रिन्ट प्रतिवेदन, सन्तुलन परीक्षण, सदस्य पासबुक र भौचरहरूमा प्रयोग हुने आधिकारिक लेटरहेड
                  </p>
                </div>
                <label className="flex items-center space-x-2 px-5 py-2.5 bg-[#1F497D] hover:bg-[#183a63] text-white text-xs font-bold rounded-xl cursor-pointer shadow transition-colors shrink-0">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>{uploadingLogo ? "अपलोड हुँदैछ..." : "नयाँ लोगो अपलोड / परिवर्तन"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Realistic Paper Letterhead Mockup */}
              <div className="mt-6 max-w-4xl mx-auto bg-white border-2 border-slate-300 rounded-2xl p-6 sm:p-8 shadow-md">
                {/* Letterhead Top */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4 gap-4">
                  {/* Logo Container strictly sized to prevent any distortion or oversized expansion */}
                  <div className="w-24 h-24 min-w-[96px] min-h-[96px] max-w-[96px] max-h-[96px] rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                    <img
                      src={settings.logoUrl || "/avatar-placeholder.png"}
                      alt="Coop Logo"
                      className="max-h-full max-w-full w-auto h-auto object-contain rounded-xl"
                      onError={(e: any) => {
                        e.target.src = "/avatar-placeholder.png";
                      }}
                    />
                  </div>

                  {/* Institution Names & Metadata */}
                  <div className="text-center flex-1 px-2 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight truncate" title={settings.nameNep}>
                      {settings.nameNep}
                    </h1>
                    <div className="text-sm font-bold text-slate-800 tracking-wide mt-0.5 truncate" title={settings.nameEng}>
                      {settings.nameEng}
                    </div>
                    <p className="text-xs text-slate-700 font-semibold mt-1">
                      {settings.fullAddress}
                    </p>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                      दर्ता नं: <strong className="font-bold text-slate-900">{settings.regNo}</strong> | पान नं:{" "}
                      <strong className="font-bold text-slate-900">{settings.panNo}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      फोन: {settings.phone} | इमेल: {settings.email} | वेव: {settings.website}
                    </p>
                  </div>

                  {/* 4-Khata ERP Badge */}
                  <div className="w-24 shrink-0 text-right hidden sm:block">
                    <span className="inline-block text-[10px] font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full border border-amber-300 shadow-xs">
                      ४-खाता ERP
                    </span>
                  </div>
                </div>

                {/* Sub Bar */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200 pb-2 mb-6 px-1">
                  <div>
                    खाता लेजर: <span className="font-black text-[#1F497D]">सन्तुलन परीक्षण (Trial Balance & Audit)</span>
                  </div>
                  <div>
                    आर्थिक वर्ष: <span className="font-mono">{settings.fiscalYear}</span> | मिति: {new Date().toISOString().split("T")[0]}
                  </div>
                </div>

                {/* Sample Document Body Preview */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400 italic mb-8">
                  [ यहाँ तपाईंको वित्तीय ४-खाता लेजर, सदस्य हिसाब विवरण वा गोश्वारा भौचरको आधिकारिक तालिका छापिनेछ ]
                </div>

                {/* Letterhead Signatures */}
                <div className="grid grid-cols-3 text-center text-xs font-bold text-slate-900 pt-4 border-t border-slate-300">
                  <div>
                    <div className="w-32 border-b border-slate-700 mx-auto mb-1.5"></div>
                    <div className="text-xs font-bold">{settings.signatory1Name}</div>
                    <div className="text-[11px]">{settings.signatory1Title}</div>
                    <div className="text-[10px] font-normal text-slate-500">({settings.signatory1Role})</div>
                  </div>
                  <div>
                    <div className="w-32 border-b border-slate-700 mx-auto mb-1.5"></div>
                    <div className="text-xs font-bold">{settings.signatory2Name}</div>
                    <div className="text-[11px]">{settings.signatory2Title}</div>
                    <div className="text-[10px] font-normal text-slate-500">({settings.signatory2Role})</div>
                  </div>
                  <div>
                    <div className="w-32 border-b border-slate-700 mx-auto mb-1.5"></div>
                    <div className="text-xs font-bold">{settings.signatory3Name}</div>
                    <div className="text-[11px]">{settings.signatory3Title}</div>
                    <div className="text-[10px] font-normal text-slate-500">({settings.signatory3Role})</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: System & Excel Database */}
        {activeTab === "system" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#1F497D]" />
                  <span>६. प्रत्यक्ष एक्सेल कोर डाटाबेस तथा ब्याकअप स्थिति (Live Excel Engine & System DB)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  नेपाल सहकारी ४-खाता प्रणाली प्रत्यक्ष Microsoft Excel (.xlsx) स्प्रेडशिटमा सुरक्षित हुन्छ
                </p>
              </div>
              <span className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active & Live Synced</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">मुख्य डाटाबेस फाइल</div>
                <div className="flex items-center space-x-2 text-sm font-black text-slate-900 font-mono">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>nepal_cooperative_4_khata_kyc_vba_system.xlsx</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  स्थान: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">data/</code> फोल्डर
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">स्वचालित ब्याकअप डाइरेक्टरी</div>
                <div className="flex items-center space-x-2 text-sm font-black text-slate-900 font-mono">
                  <ShieldCheck className="w-4 h-4 text-[#1F497D]" />
                  <span>data/backups/</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  प्रत्येक दिनको पहिलो लोडमा पूर्ण एक्सेल ब्याकअप सुरक्षित हुन्छ।
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start space-x-3.5">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <strong className="font-bold text-sm text-amber-950">प्रत्यक्ष डाटाबेस डाउनलोड तथा सुरक्षा:</strong>
                <p className="text-amber-800 leading-relaxed">
                  यो प्रणाली वास्तविक समयमा एक्सेल फर्मुला, भीबीए म्याक्रो र ४-मूल खाता (सम्पत्ति, दायित्व, खर्च, आम्दानी) गणितमा आधारित छ। कुनै पनि समयमा तपाईंले प्रत्यक्ष एक्सेल फाइल डाउनलोड गरी सुरक्षित राख्न सक्नुहुन्छ।
                </p>
                <div className="pt-2 flex items-center space-x-3">
                  <a
                    href="/api/excel/download"
                    download
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow transition-colors text-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>अहिले नै लाइभ एक्सेल (.xlsx) डाउनलोड गर्नुहोस्</span>
                  </a>
                </div>
              </div>
            </div>

            {/* DANGER ZONE: Transaction Wipe / Reset Engine */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 text-xs text-red-950 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-red-200/80 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow">
                    <Trash2 className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-red-900">
                      कारोबार पूर्ण रिसेट इन्जिन (Wipe All Transactions Engine)
                    </h3>
                    <p className="text-[11px] text-red-700 mt-0.5">
                      सदस्य विवरण (Member KYC) १००% अक्षुण्ण राख्दै सबै भौचर, लेजर र वित्तीय कारोबारहरू शून्य बनाउने।
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-all text-xs shrink-0 self-start sm:self-auto"
                >
                  <Trash2 className="w-4 h-4 text-amber-300" />
                  <span>सबै कारोबार रिसेट गर्नुहोस् (Reset All Transactions)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-red-800">
                <div className="p-3 bg-white/70 rounded-xl border border-red-200/60">
                  <strong className="text-emerald-800 block mb-1">✓ सदस्य व्यक्तिगत KYC सुरक्षित:</strong>
                  सदस्य नं, नाम, नागरिकता, फोन, फोटो, ठेगाना र प्रणाली प्रयोगकर्ता खाताहरू यथावत सुरक्षित रहन्छन्।
                </div>
                <div className="p-3 bg-white/70 rounded-xl border border-red-200/60">
                  <strong className="text-red-900 block mb-1">⚠ वित्तीय मौज्दात शून्य:</strong>
                  सम्पत्ति, दायित्व, खर्च, आम्दानीका दैनिक भौचर तथा शेयर/बचत/ऋणका सबै कारोबार विवरणहरू मेटिन्छन्।
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            पछिल्लो अद्यावधिक: <strong className="text-slate-800">{settings.updatedAt ? new Date(settings.updatedAt).toLocaleString("ne-NP") : "डिफल्ट"}</strong>
          </div>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2.5 bg-[#1F497D] hover:bg-[#183a63] text-white text-xs font-bold rounded-xl shadow-md transition-all border border-[#2E5B88] disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{saving ? "सुरक्षित हुँदैछ..." : "सेटिङ सुरक्षित गर्नुहोस्"}</span>
          </button>
        </div>
      </form>

      {/* Reset Transactions Safety Modal */}
      <ResetTransactionsModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onSuccess={() => fetchSettings()}
      />
    </div>
  );
}
