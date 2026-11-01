import fs from "fs";
import path from "path";

export interface OrganisationSettings {
  // १. संस्थाको परिचय (General Identity)
  nameNep: string;
  nameEng: string;
  taglineNep: string;
  taglineEng: string;
  coopType: string;
  regNo: string;
  panNo: string;
  establishedDateBs: string;
  establishedDateAd: string;
  regulatoryBody: string;

  // २. ठेगाना र सम्पर्क (Address & Contact)
  province: string;
  district: string;
  palika: string;
  wardNo: string;
  tole: string;
  fullAddress: string;
  phone: string;
  email: string;
  website: string;
  postBox: string;

  // ३. आर्थिक वर्ष र लेखा नीति (Fiscal Year & Accounting Rules)
  fiscalYear: string;
  fiscalYearStartBs: string;
  fiscalYearEndBs: string;
  shareParValue: number;
  minimumSavingsBal: number;
  generalReservePct: number;
  patronageRefundPct: number;
  cooperativeEducationPct: number;
  cooperativePromotionPct: number;
  staffBonusPct: number;
  communityDevelopmentPct: number;
  interestCalcMethod: string;

  // ३.१ कर्जा नोक्सानी व्यवस्था दरहरू (Loan Loss Provisioning - NRB & Coop Act)
  loanProvisionPassPct: number;
  loanProvisionWatchlistPct: number;
  loanProvisionSubstandardPct: number;
  loanProvisionDoubtfulPct: number;
  loanProvisionLossPct: number;

  // ३.२ ह्रासकट्टी तथा वर्ष-अन्त्य समायोजन (Depreciation & Year-End Accruals)
  depreciationMethod: "WDV" | "SLM";
  fixedAssetsDeprPct: number;
  accrualDayBasis: "365" | "360";
  auditFeeProvision: number;

  // ३.३ प्रारम्भिक मौज्दात र गो-लाइभ सेटिङ (Opening Balance Setup & Go-Live Settings)
  systemGoLiveDateBs: string;
  systemGoLiveDateAd: string;
  openingBalanceStatus: "NotStarted" | "Draft" | "Validated" | "Posted-Locked";
  firstFiscalYear: string;
  goLiveScenario: "A_FY_START" | "B_MID_YEAR";
  suspenseLedgerBalance: number;
  suspenseLedgerReason: string;
  cashBankVerifiedDate?: string;
  cashBankVerifiedUser?: string;
  savingsProducts: Array<{ id: string; nameNep: string; nameEng: string; rate: number }>;
  loanProducts: Array<{ id: string; nameNep: string; nameEng: string; rate: number }>;

  // ४. प्रतिवेदन हस्ताक्षरकर्ताहरू (Report Signatories)
  signatory1Title: string;
  signatory1Role: string;
  signatory1Name: string;

  signatory2Title: string;
  signatory2Role: string;
  signatory2Name: string;

  signatory3Title: string;
  signatory3Role: string;
  signatory3Name: string;

  // ५. लोगो तथा ब्रान्डिङ (Branding & Logo)
  logoUrl: string;
  themePrimaryColor: string;
  updatedAt?: string;
}

export const DEFAULT_ORG_SETTINGS: OrganisationSettings = {
  nameNep: "नेपाल सहकारी संस्था लि.",
  nameEng: "Nepal Cooperative Ltd.",
  taglineNep: "नेपाल सहकारी ऐन तथा नेपाल राष्ट्र बैंक मापदण्ड अनुसार स्वचालित ४-खाता प्रणाली",
  taglineEng: "Nepal Cooperative 4-Khata Live Excel Core Accounting",
  coopType: "बचत तथा ऋण सहकारी संस्था (Savings & Credit Cooperative)",
  regNo: "१२३४/०७५/०७६",
  panNo: "३०२१४५६७८",
  establishedDateBs: "२०७५/०३/१५",
  establishedDateAd: "2018-06-29",
  regulatoryBody: "सहकारी विभाग / सुदूरपश्चिम प्रदेश सहकारी रजिस्ट्रारको कार्यालय",

  province: "सुदूरपश्चिम प्रदेश",
  district: "कञ्चनपुर",
  palika: "पुनर्वास नगरपालिका",
  wardNo: "०२",
  tole: "पुनर्वास बजार",
  fullAddress: "पुनर्वास, कञ्चनपुर, सुदूरपश्चिम प्रदेश, नेपाल",
  phone: "०९९-५८०१२३, ९८५१२३४५६७",
  email: "info@nepalcoop.org.np",
  website: "https://nepalcoop.org.np",
  postBox: "१०१",

  fiscalYear: "२०८३/८४",
  fiscalYearStartBs: "२०८३/०४/०१",
  fiscalYearEndBs: "२०८४/०३/३१",
  shareParValue: 100,
  minimumSavingsBal: 500,
  generalReservePct: 25,
  patronageRefundPct: 25,
  cooperativeEducationPct: 5,
  cooperativePromotionPct: 5,
  staffBonusPct: 5,
  communityDevelopmentPct: 5,
  interestCalcMethod: "दैनिक न्यूनतम मौज्दात विधि (Daily Minimum Balance) / ३६५ दिन",

  loanProvisionPassPct: 1,
  loanProvisionWatchlistPct: 5,
  loanProvisionSubstandardPct: 25,
  loanProvisionDoubtfulPct: 50,
  loanProvisionLossPct: 100,

  depreciationMethod: "WDV",
  fixedAssetsDeprPct: 15,
  accrualDayBasis: "365",
  auditFeeProvision: 25000,

  systemGoLiveDateBs: "२०८३/०४/०१",
  systemGoLiveDateAd: "2026-07-16",
  openingBalanceStatus: "NotStarted",
  firstFiscalYear: "२०८३/८४",
  goLiveScenario: "A_FY_START",
  suspenseLedgerBalance: 0,
  suspenseLedgerReason: "",
  savingsProducts: [
    { id: "SAV-01", nameNep: "साधारण बचत", nameEng: "General Savings", rate: 6.0 },
    { id: "SAV-02", nameNep: "मासिक क्रमिक बचत", nameEng: "Monthly Recurring", rate: 7.5 },
    { id: "SAV-03", nameNep: "मुद्दती बचत (१ वर्ष)", nameEng: "Fixed Deposit 1-Yr", rate: 9.0 },
    { id: "SAV-04", nameNep: "बाल बचत", nameEng: "Child Savings", rate: 6.5 },
    { id: "SAV-05", nameNep: "महिला स्वावलम्बन बचत", nameEng: "Women Empowerment Savings", rate: 7.0 },
  ],
  loanProducts: [
    { id: "LOAN-01", nameNep: "कृषि तथा पशुपालन कर्जा", nameEng: "Agriculture & Livestock Loan", rate: 11.5 },
    { id: "LOAN-02", nameNep: "व्यापारिक तथा व्यवसाय कर्जा", nameEng: "Business & Trade Loan", rate: 12.5 },
    { id: "LOAN-03", nameNep: "घरघडेरी तथा आवास कर्जा", nameEng: "Housing & Real Estate Loan", rate: 13.0 },
    { id: "LOAN-04", nameNep: "आपतकालीन तथा सामाजिक कर्जा", nameEng: "Emergency & Social Loan", rate: 10.0 },
    { id: "LOAN-05", nameNep: "हायर पर्चेज / सवारी कर्जा", nameEng: "Hire Purchase / Vehicle Loan", rate: 12.0 },
  ],

  signatory1Title: "तयार गर्ने",
  signatory1Role: "लेखापाल / क्यासियर",
  signatory1Name: "रमेश शर्मा",

  signatory2Title: "जाँच्ने",
  signatory2Role: "आन्तरिक लेखापरीक्षक",
  signatory2Name: "सीता चौधरी",

  signatory3Title: "स्वीकृत गर्ने",
  signatory3Role: "व्यवस्थापक / अध्यक्ष",
  signatory3Name: "हरि प्रसाद जोशी",

  logoUrl: "/avatar-placeholder.png",
  themePrimaryColor: "#1F497D",
};

const SETTINGS_FILE = path.join(process.cwd(), "data", "org_settings.json");

export class OrgSettingsManager {
  public static getSettings(): OrganisationSettings {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_ORG_SETTINGS, ...parsed };
      }
    } catch (err) {
      console.error("Error reading organisation settings:", err);
    }
    return { ...DEFAULT_ORG_SETTINGS };
  }

  public static saveSettings(updates: Partial<OrganisationSettings>): OrganisationSettings {
    try {
      const current = this.getSettings();
      const updated: OrganisationSettings = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const dir = path.dirname(SETTINGS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
      return updated;
    } catch (err) {
      console.error("Error saving organisation settings:", err);
      throw new Error("संस्थागत सेटिङ सुरक्षित गर्न सकिएन");
    }
  }

  public static resetToDefault(): OrganisationSettings {
    try {
      const resetData = { ...DEFAULT_ORG_SETTINGS, updatedAt: new Date().toISOString() };
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(resetData, null, 2), "utf-8");
      return resetData;
    } catch (err) {
      console.error("Error resetting organisation settings:", err);
      throw new Error("सेटिङ रिसेट गर्न सकिएन");
    }
  }
}

export function getOrgSettings(): OrganisationSettings {
  return OrgSettingsManager.getSettings();
}
