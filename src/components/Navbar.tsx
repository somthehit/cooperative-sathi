"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Building2,
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  BookOpen,
  LogOut,
  UserCheck,
  ShieldCheck,
  Download,
  Upload,
  Settings,
  FileCheck2,
  FileSpreadsheet,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileDropdownOpen, setFileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orgName, setOrgName] = useState("नेपाल सहकारी संस्था लि.");
  const [orgTagline, setOrgTagline] = useState("Nepal Cooperative 4-Khata Live Excel Core Accounting");
  const [orgLogo, setOrgLogo] = useState<string>("");

  const fileDropdownRef = useRef<HTMLDivElement>(null);

  const loadOrgSettings = () => {
    fetch("/api/settings/org")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          if (data.settings.nameNep) setOrgName(data.settings.nameNep);
          if (data.settings.taglineEng) setOrgTagline(data.settings.taglineEng);
          if (data.settings.logoUrl) setOrgLogo(data.settings.logoUrl);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
        }
      })
      .catch(() => {});

    loadOrgSettings();

    const handleOrgUpdate = (e: any) => {
      const s = e.detail;
      if (s) {
        if (s.nameNep) setOrgName(s.nameNep);
        if (s.taglineEng) setOrgTagline(s.taglineEng);
        if (s.logoUrl) setOrgLogo(s.logoUrl);
      } else {
        loadOrgSettings();
      }
    };

    window.addEventListener("org-settings-updated", handleOrgUpdate);
    return () => window.removeEventListener("org-settings-updated", handleOrgUpdate);
  }, []);

  // Close menus on route change or click outside
  useEffect(() => {
    setMobileMenuOpen(false);
    setFileDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fileDropdownRef.current && !fileDropdownRef.current.contains(e.target as Node)) {
        setFileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`के तपाईं यो फाइल (${file.name}) बाट प्रत्यक्ष एक्सेल डाटाबेस प्रतिस्थापन गर्न चाहनुहुन्छ?`)) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      const res = await fetch("/api/excel/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "फाइल सफलतापूर्वक अपलोड भयो!");
        window.location.reload();
      } else {
        alert("त्रुटि: " + (data.error || "अपलोड असफल भयो"));
      }
    } catch (err: any) {
      alert("अपलोड गर्दा समस्या आयो: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Nav links: "प्रारम्भिक मौज्दात" removed per user request
  const navLinks = [
    { href: "/dashboard", labelNep: "ड्यासबोर्ड", labelEng: "Dashboard", icon: LayoutDashboard },
    { href: "/members", labelNep: "सदस्य के.वाई.सी.", labelEng: "Members KYC", icon: Users },
    { href: "/transactions", labelNep: "कारोबार प्रविष्टि", labelEng: "Transactions Hub", icon: ArrowLeftRight },
    { href: "/khatas", labelNep: "४-मूल खाता", labelEng: "4-Khata Explorer", icon: BookOpen },
    { href: "/audit", labelNep: "आ.व. बन्द / अडिट", labelEng: "Year-End Closing", icon: FileCheck2 },
    { href: "/settings", labelNep: "संस्था सेटिङ", labelEng: "Organisation", icon: Settings },
  ];

  return (
    <header className="bg-[#1F497D]/95 backdrop-blur-md text-white shadow-md sticky top-0 z-50 border-b border-[#2E5B88] w-full">
      <div className="max-w-[1800px] w-full mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 sm:h-13 gap-2 sm:gap-4">
          {/* Logo & Cooperative Brand */}
          <Link href="/dashboard" className="flex items-center space-x-2 sm:space-x-2.5 group shrink-0 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white p-0.5 shadow-sm flex items-center justify-center shrink-0 border border-amber-400/30 overflow-hidden group-hover:scale-105 transition-transform">
              {orgLogo && orgLogo !== "/avatar-placeholder.png" ? (
                <img
                  src={orgLogo}
                  alt={orgName}
                  className="w-full h-full object-contain rounded"
                  onError={() => setOrgLogo("")}
                />
              ) : (
                <div className="w-full h-full bg-[#1F497D] rounded flex items-center justify-center">
                  <Building2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400 group-hover:scale-110 transition-transform" />
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center min-w-0 leading-tight">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs sm:text-sm font-black tracking-tight text-white drop-shadow-sm truncate max-w-[140px] sm:max-w-[200px] lg:max-w-[260px]" title={orgName}>
                  {orgName}
                </span>
                <span className="hidden sm:inline bg-amber-400/20 text-amber-300 text-[8.5px] font-bold px-1.5 py-0.2 rounded-full border border-amber-400/30 shrink-0">
                  ४-खाता
                </span>
              </div>
              <p className="hidden 2xl:block text-[9.5px] text-slate-300 font-medium truncate max-w-[240px]">
                {orgTagline}
              </p>
            </div>
          </Link>

          {/* Nav Links (Desktop Navigation >= lg) */}
          <nav className="hidden lg:flex items-center justify-center space-x-1 flex-1 px-1 sm:px-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.labelEng}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? "bg-[#2E5B88] text-white shadow-inner border border-white/25 ring-1 ring-white/10"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-amber-400" : "text-slate-300"}`} />
                  <span className="whitespace-nowrap">{item.labelNep}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Toolbar & User Profile */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
            {/* File (.xlsx) Unified Dropdown */}
            <div className="relative" ref={fileDropdownRef}>
              <button
                type="button"
                onClick={() => setFileDropdownOpen(!fileDropdownOpen)}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors border border-emerald-400/30"
                title="एक्सेल फाइल डाउनलोड तथा अपलोड"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>फाइल</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${fileDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {fileDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-slate-800 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                    <span>एक्सेल फाइल (.xlsx)</span>
                    <span className="text-emerald-600 font-mono">Live</span>
                  </div>

                  {/* Download Option */}
                  <a
                    href="/api/excel/download"
                    download
                    onClick={() => setFileDropdownOpen(false)}
                    className="flex items-center space-x-3 px-3.5 py-2 hover:bg-emerald-50/80 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 group-hover:text-emerald-700">डाउनलोड (Download)</div>
                      <div className="text-[10px] text-slate-500">प्रत्यक्ष ४-खाता एक्सेल फाइल</div>
                    </div>
                  </a>

                  {/* Upload Option (Admin only) */}
                  {user?.role === "ADMIN" ? (
                    <label
                      className="flex items-center space-x-3 px-3.5 py-2 hover:bg-amber-50/80 transition-colors cursor-pointer border-t border-slate-100 group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-bold text-slate-900 group-hover:text-amber-800">
                          {isUploading ? "अपलोड हुँदैछ..." : "अपलोड (Upload)"}
                        </div>
                        <div className="text-[10px] text-slate-500">नयाँ एक्सेल डाटाबेस सिङ्क</div>
                      </div>
                      <input
                        type="file"
                        accept=".xlsx"
                        className="hidden"
                        onChange={(e) => {
                          setFileDropdownOpen(false);
                          handleFileUpload(e);
                        }}
                        disabled={isUploading}
                      />
                    </label>
                  ) : null}
                </div>
              )}
            </div>

            {/* User Profile or Login */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 sm:pl-2.5 border-l border-white/20 shrink-0">
                <div className="text-right leading-tight">
                  <div className="text-xs font-bold text-white flex items-center justify-end space-x-1">
                    <span className="truncate max-w-[120px] sm:max-w-[160px]">
                      {typeof user.fullName === "string" ? user.fullName : (user.username || "प्रयोगकर्ता")}
                    </span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline shrink-0" />
                  </div>
                  <div className="text-[9.5px] text-amber-300 font-semibold tracking-wide">
                    {user.role === "ADMIN" ? "मुख्य प्रशासक" : user.role} ({user.username})
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="लगआउट गर्नुहोस् (Sign Out)"
                  className="p-1 text-slate-300 hover:text-rose-300 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded-lg shadow-sm transition-colors shrink-0"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>लगइन</span>
              </Link>
            )}

            {/* Mobile / Tablet Menu Button (screens < lg) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none"
              title="मेनु खोल्नुहोस्"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Dropdown Drawer (< lg) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#183a63] border-t border-[#2E5B88] px-4 py-3 shadow-xl animate-in slide-in-from-top-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#2E5B88] text-white shadow-inner border border-white/25"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amber-400" : "text-slate-300"}`} />
                  <div className="min-w-0">
                    <div className="truncate">{item.labelNep}</div>
                    <div className="text-[9px] opacity-70 font-normal truncate">{item.labelEng}</div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Mobile Profile & Actions */}
          <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
            {user ? (
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">{user.fullName || user.username}</span>
                <span className="text-[10px] text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded">
                  {user.role}
                </span>
              </div>
            ) : (
              <Link href="/login" className="text-amber-300 font-bold hover:underline">
                लगइन गर्नुहोस्
              </Link>
            )}
            {user?.role === "ADMIN" && (
              <label className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>एक्सेल सिङ्क</span>
                <input
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
