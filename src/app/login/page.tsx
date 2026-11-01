"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  KeyRound,
  User,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [orgSettings, setOrgSettings] = useState<any>({
    nameNep: "नेपाल सहकारी संस्था लि.",
    nameEng: "Nepal Cooperative Ltd.",
    taglineNep: "४-खाता एकीकृत लेखा तथा सदस्य के.वाई.सी. प्रणाली",
    taglineEng: "4-Khata Live Excel Core Accounting & KYC ERP",
    logoUrl: "",
  });

  useEffect(() => {
    fetch("/api/settings/org")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setOrgSettings({
            nameNep: data.settings.nameNep || "नेपाल सहकारी संस्था लि.",
            nameEng: data.settings.nameEng || "Nepal Cooperative Ltd.",
            taglineNep: data.settings.taglineNep || "४-खाता एकीकृत लेखा तथा सदस्य के.वाई.सी. प्रणाली",
            taglineEng: data.settings.taglineEng || "4-Khata Live Excel Core Accounting & KYC ERP",
            logoUrl: data.settings.logoUrl || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password) {
      setError("कृपया प्रयोगकर्ता नाम र पासवर्ड दुवै प्रविष्टि गर्नुहोस्।");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "लगइन असफल भयो (Login failed)");
      }

      // Check redirection logic:
      // If opening setup is not completed and user is ADMIN -> /opening-setup
      // Otherwise -> redirectParam || data.redirectTo || /dashboard
      const targetUrl =
        data.user?.role === "ADMIN" && data.openingStatus !== "Posted-Locked"
          ? "/opening-setup"
          : redirectParam || data.redirectTo || "/dashboard";

      router.push(targetUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 flex flex-col justify-center items-center p-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transition-all">
        {/* Top Header Banner with Cooperative Branding */}
        <div className="bg-gradient-to-r from-[#17365D] via-[#1F497D] to-[#2E5B88] p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-xl pointer-events-none"></div>

          {/* Org Logo / Icon */}
          <div className="relative z-10">
            {orgSettings.logoUrl ? (
              <div className="w-20 h-20 mx-auto mb-3 bg-white rounded-2xl p-2 flex items-center justify-center shadow-lg border-2 border-white/40">
                <img
                  src={orgSettings.logoUrl}
                  alt={orgSettings.nameNep}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-16 h-16 mx-auto mb-3 bg-white/10 rounded-2xl p-3 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
                <Building2 className="w-10 h-10 text-amber-400" />
              </div>
            )}

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow">
              {orgSettings.nameNep}
            </h1>
            <p className="text-xs text-slate-200 mt-0.5 font-medium">{orgSettings.taglineNep}</p>
            <p className="text-[10px] text-slate-300 mt-0.5 opacity-80">{orgSettings.nameEng}</p>

            <div className="inline-flex items-center space-x-1.5 mt-3 bg-amber-400/20 text-amber-300 text-[11px] font-semibold px-3 py-1 rounded-full border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>नेपाल सहकारी ऐन २०७४ र ४-खाता निर्देशिका प्रमाणीकरण</span>
            </div>
          </div>
        </div>

        {/* Setup Workflow Notice */}
        <div className="bg-amber-50/80 border-b border-amber-200 px-6 py-3 flex items-start space-x-2.5 text-amber-900 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>नयाँ सहकारी गो-लाइभ नियम:</strong> प्रारम्भिक मौज्दात सेट-अप (Opening Setup) मुख्य प्रशासक (Admin) द्वारा सम्पन्न गर्नुपर्दछ। गो-लाइभ सम्पन्न भएपछि मात्र मुख्य ड्यासबोर्ड सक्रिय हुनेछ।
          </p>
        </div>

        {/* Login Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                प्रयोगकर्ता नाम (Username)*
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1F497D] focus:bg-white transition-all"
                  placeholder="प्रयोगकर्ता नाम प्रविष्टि गर्नुहोस्..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                पासवर्ड (Password)*
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1F497D] focus:bg-white transition-all"
                  placeholder="पासवर्ड प्रविष्टि गर्नुहोस्..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-[#17365D] to-[#1F497D] hover:from-[#15345a] hover:to-[#17365D] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span>प्रमाणीकरण हुँदैछ...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>प्रणालीमा प्रवेश गर्नुहोस् (Sign In)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center">
          <p className="text-[10px] text-slate-500">
            Sheet 11 प्रत्यक्ष प्रमाणीकरण (Live Excel DB Auth) • सुरक्षित सेसन कुकी आधारित
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">लोड हुँदैछ...</div>}>
      <LoginForm />
    </Suspense>
  );
}
