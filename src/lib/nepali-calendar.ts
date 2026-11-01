/**
 * नेपाली बिक्रम संवत् (BS) क्यालेन्डर तथा मिति रूपान्तरण औजार
 * Bikram Sambat (BS) to Gregorian (AD) Date Converter and Calendar Utilities
 */

const NEP_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export function nepaliToEnglishDigits(str: string | number): string {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[०-९]/g, (d) => String(NEP_DIGITS.indexOf(d)));
}

export function englishToNepaliDigits(val: string | number): string {
  if (val === null || val === undefined) return "";
  return String(val).replace(/[0-9]/g, (d) => NEP_DIGITS[parseInt(d, 10)]);
}

// Days in each BS month for 2075 BS to 2090 BS (12 months each: Baisakh=0 to Chaitra=11)
const BS_MONTH_DAYS: Record<number, number[]> = {
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2085: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2086: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2088: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2089: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2090: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
};

// Reference point: 2075-01-01 BS = 2018-04-14 AD
const REF_BS_YEAR = 2075;
const REF_AD_DATE = new Date(Date.UTC(2018, 3, 14)); // April 14, 2018

export interface BsDateComponents {
  year: number;
  month: number;
  day: number;
  formattedBs: string;
}

export function parseBsDate(bsStr: string): BsDateComponents | null {
  if (!bsStr) return null;
  const engStr = nepaliToEnglishDigits(bsStr.trim()).replace(/[.\s]/g, "-").replace(/\//g, "-");
  const parts = engStr.split("-").map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) return null;

  const [year, month, day] = parts;
  if (year < 2000 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 32) return null;

  const yStr = String(year);
  const mStr = month < 10 ? `0${month}` : String(month);
  const dStr = day < 10 ? `0${day}` : String(day);

  return {
    year,
    month,
    day,
    formattedBs: `${yStr}/${mStr}/${dStr}`,
  };
}

export function validateBsDate(bsStr: string): { valid: boolean; error?: string; formatted?: string } {
  const parsed = parseBsDate(bsStr);
  if (!parsed) {
    return {
      valid: false,
      error: "अमान्य मिति ढाँचा (Invalid date format). ढाँचा: YYYY/MM/DD वा YYYY-MM-DD हुनुपर्छ।",
    };
  }

  const { year, month, day } = parsed;
  const daysInMonth = BS_MONTH_DAYS[year] ? BS_MONTH_DAYS[year][month - 1] : 32;
  if (day > daysInMonth) {
    return {
      valid: false,
      error: `${year} सालको ${month} महिनामा ${daysInMonth} दिन मात्र हुन्छ। ${day} दिन अमान्य छ।`,
    };
  }

  return { valid: true, formatted: parsed.formattedBs };
}

export function bsToAdDate(bsStr: string): string {
  const parsed = parseBsDate(bsStr);
  if (!parsed) return "";

  const { year, month, day } = parsed;

  // If outside supported lookup range, use approximate offset: BS - 56.7 years
  if (!BS_MONTH_DAYS[year]) {
    const approxYear = year - 57;
    const mStr = month < 10 ? `0${month}` : String(month);
    const dStr = day < 10 ? `0${day}` : String(day);
    return `${approxYear}-${mStr}-${dStr}`;
  }

  // Count total days elapsed from 2075-01-01 BS
  let totalDays = 0;
  for (let y = REF_BS_YEAR; y < year; y++) {
    const months = BS_MONTH_DAYS[y] || [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30];
    for (const d of months) totalDays += d;
  }
  for (let m = 0; m < month - 1; m++) {
    totalDays += BS_MONTH_DAYS[year][m];
  }
  totalDays += (day - 1);

  const adDate = new Date(REF_AD_DATE.getTime() + totalDays * 86400000);
  return adDate.toISOString().split("T")[0];
}

export function adToBsDate(adStr: string): string {
  try {
    const targetAd = new Date(adStr);
    if (isNaN(targetAd.getTime())) return "";

    const diffDays = Math.round((targetAd.getTime() - REF_AD_DATE.getTime()) / 86400000);
    if (diffDays < 0) return "२०७०/०१/०१";

    let remainingDays = diffDays;
    let currYear = REF_BS_YEAR;

    while (currYear <= 2090) {
      const yearMonths = BS_MONTH_DAYS[currYear] || [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30];
      const daysInYear = yearMonths.reduce((a, b) => a + b, 0);

      if (remainingDays >= daysInYear) {
        remainingDays -= daysInYear;
        currYear++;
      } else {
        for (let m = 0; m < 12; m++) {
          const daysInMonth = yearMonths[m];
          if (remainingDays >= daysInMonth) {
            remainingDays -= daysInMonth;
          } else {
            const finalMonth = m + 1;
            const finalDay = remainingDays + 1;
            const mStr = finalMonth < 10 ? `0${finalMonth}` : String(finalMonth);
            const dStr = finalDay < 10 ? `0${finalDay}` : String(finalDay);
            return `${currYear}/${mStr}/${dStr}`;
          }
        }
        break;
      }
    }
  } catch {}
  return "";
}

export function calculateDaysBetweenBs(dateFromBs: string, dateToBs: string): number {
  const adFrom = bsToAdDate(dateFromBs);
  const adTo = bsToAdDate(dateToBs);
  if (!adFrom || !adTo) return 0;

  const d1 = new Date(adFrom).getTime();
  const d2 = new Date(adTo).getTime();
  const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}
