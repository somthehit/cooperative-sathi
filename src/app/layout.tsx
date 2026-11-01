import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "नेपाल सहकारी ४-खाता प्रणाली | Nepal Cooperative 4-Khata ERP",
  description: "Nepal Cooperative 4-Khata (चार खाता) & Member KYC Live Excel Database Web ERP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ne" suppressHydrationWarning className="overflow-x-clip max-w-full w-full">
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-slate-100 text-slate-900 selection:bg-amber-200 print:bg-white print:text-black overflow-x-clip max-w-full w-full"
      >
        <div className="no-print sticky top-0 z-50 w-full max-w-full">
          <Navbar />
        </div>
        <main className="flex-1 max-w-[1800px] w-full mx-auto p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 print:max-w-none">
          {children}
        </main>
        <footer className="no-print bg-slate-900 text-slate-400 py-6 text-center text-xs border-t border-slate-800">
          <div className="max-w-[1800px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              नेपाल सहकारी ऐन तथा नेपाल राष्ट्र बैंक मापदण्ड अनुसार स्वचालित ४-मूल खाता (सम्पत्ति, दायित्व, खर्च, आम्दानी) प्रणाली
            </div>
            <div className="flex items-center space-x-2 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Excel Engine (.xlsx) Connected</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
