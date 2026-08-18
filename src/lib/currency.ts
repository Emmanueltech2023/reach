// Country code (ISO 3166-1 alpha-2) → Currency code (ISO 4217)
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Africa
  NG: "NGN", GH: "GHS", KE: "KES", ZA: "ZAR", EG: "EGP", TZ: "TZS",
  UG: "UGX", ET: "ETB", RW: "RWF", CM: "XAF", SN: "XOF", CI: "XOF",
  MA: "MAD", TN: "TND", DZ: "DZD", AO: "AOA", MZ: "MZN", ZW: "USD",
  // Americas
  US: "USD", CA: "CAD", MX: "MXN", BR: "BRL", AR: "ARS", CO: "COP",
  CL: "CLP", PE: "PEN", VE: "VES", EC: "USD", UY: "UYU", PY: "PYG",
  // Europe
  GB: "GBP", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", IE: "EUR", PT: "EUR", FI: "EUR", GR: "EUR",
  CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK",
  RO: "RON", HU: "HUF", HR: "EUR", BG: "BGN", UA: "UAH", RU: "RUB",
  TR: "TRY",
  // Asia
  CN: "CNY", JP: "JPY", KR: "KRW", IN: "INR", ID: "IDR", TH: "THB",
  VN: "VND", PH: "PHP", MY: "MYR", SG: "SGD", HK: "HKD", TW: "TWD",
  BD: "BDT", PK: "PKR", LK: "LKR", NP: "NPR", MM: "MMK", KH: "KHR",
  // Middle East
  AE: "AED", SA: "SAR", QA: "QAR", KW: "KWD", BH: "BHD", OM: "OMR",
  JO: "JOD", LB: "LBP", IQ: "IQD", IL: "ILS",
  // Oceania
  AU: "AUD", NZ: "NZD",
};

// Currency symbol map for common currencies
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥",
  NGN: "₦", GHS: "₵", KES: "KSh", ZAR: "R", EGP: "E£",
  INR: "₹", BRL: "R$", CAD: "C$", AUD: "A$", NZD: "NZ$",
  CHF: "CHF", SEK: "kr", NOK: "kr", DKK: "kr", PLN: "zł",
  TRY: "₺", RUB: "₽", UAH: "₴", KRW: "₩", THB: "฿",
  MYR: "RM", SGD: "S$", HKD: "HK$", TWD: "NT$", PHP: "₱",
  IDR: "Rp", VND: "₫", PKR: "Rs", BDT: "৳", LKR: "Rs",
  AED: "د.إ", SAR: "﷼", MXN: "MX$", COP: "COL$", ARS: "AR$",
  PEN: "S/", CLP: "CLP$",
  XAF: "FCFA", XOF: "CFA", MAD: "MAD", TND: "DT", DZD: "DA",
  AOA: "Kz", MZN: "MT", TZS: "TSh", UGX: "USh", ETB: "Br",
  RWF: "FRw",
  CZK: "Kč", RON: "lei", HUF: "Ft", BGN: "лв",
  KWD: "KD", BHD: "BD", OMR: "OMR", QAR: "QR", JOD: "JD",
  LBP: "L£", IQD: "ع.د", ILS: "₪",
  VES: "Bs.S", UYU: "$U", PYG: "₲", NPR: "Rs", MMK: "K", KHR: "៛",
};

// Approximate exchange rates vs USD (for display purposes)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.5, CNY: 7.25,
  NGN: 1550, GHS: 15.5, KES: 153, ZAR: 18.1, EGP: 48.5,
  INR: 83.5, BRL: 4.97, CAD: 1.36, AUD: 1.54, NZD: 1.67,
  CHF: 0.88, SEK: 10.7, NOK: 10.6, DKK: 6.88, PLN: 4.0,
  TRY: 32.5, RUB: 92, UAH: 37.5, KRW: 1340, THB: 35.5,
  MYR: 4.72, SGD: 1.35, HKD: 7.83, TWD: 32.2, PHP: 56.5,
  IDR: 15700, VND: 25000, PKR: 278, BDT: 110, LKR: 310,
  AED: 3.67, SAR: 3.75, MXN: 17.1, COP: 3950, ARS: 870,
  PEN: 3.73, CLP: 935, CZK: 23.2, RON: 4.58, HUF: 358,
  BGN: 1.8, XAF: 603, XOF: 603, MAD: 10.1, TND: 3.12,
  DZD: 135, AOA: 825, MZN: 63.5, TZS: 2510, UGX: 3750,
  ETB: 56.5, RWF: 1270, KWD: 0.31, BHD: 0.377, OMR: 0.385,
  QAR: 3.64, JOD: 0.71, LBP: 89500, IQD: 1310, ILS: 3.72,
  VES: 36.5, UYU: 39.2, PYG: 7450, NPR: 133, MMK: 2100, KHR: 4100,
};

/**
 * Get the currency code for a given country code
 */
export function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || "USD";
}

/**
 * Get the symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
}

/**
 * Format a currency amount with the appropriate symbol and locale formatting.
 *
 * @param amount - The amount to format
 * @param currency - The target currency code (e.g. "NGN", "EUR")
 * @param options - Additional formatting options
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  options: {
    compact?: boolean;
    convertFromUSD?: boolean;
    showCode?: boolean;
  } = {}
): string {
  const { compact = true, convertFromUSD: shouldConvert = false, showCode = false } = options;

  let displayAmount = amount;

  if (shouldConvert && currency !== "USD") {
    const rate = EXCHANGE_RATES[currency.toUpperCase()] || 1;
    displayAmount = amount * rate;
  }

  const symbol = showCode ? currency : getCurrencySymbol(currency);

  if (compact) {
    if (Math.abs(displayAmount) >= 1_000_000_000) {
      return `${symbol}${(displayAmount / 1_000_000_000).toFixed(1)}B`;
    }
    if (Math.abs(displayAmount) >= 1_000_000) {
      return `${symbol}${(displayAmount / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(displayAmount) >= 1_000) {
      return `${symbol}${(displayAmount / 1_000).toFixed(0)}K`;
    }
  }

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: displayAmount % 1 === 0 ? 0 : 2,
    }).format(displayAmount);
  } catch {
    return `${symbol}${displayAmount.toLocaleString()}`;
  }
}

/**
 * Convert a USD amount to local currency
 */
export function convertFromUSD(amountUSD: number, targetCurrency: string): number {
  const rate = EXCHANGE_RATES[targetCurrency.toUpperCase()] || 1;
  return amountUSD * rate;
}

/**
 * Get all supported currencies for dropdown selectors
 */
export function getSupportedCurrencies(): { code: string; symbol: string; name: string }[] {
  return [
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
    { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
    { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
    { code: "ZAR", symbol: "R", name: "South African Rand" },
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "BRL", symbol: "R$", name: "Brazilian Real" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
    { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
    { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
    { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
    { code: "TRY", symbol: "₺", name: "Turkish Lira" },
    { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
    { code: "PKR", symbol: "Rs", name: "Pakistani Rupee" },
  ];
}

export { COUNTRY_CURRENCY_MAP, CURRENCY_SYMBOLS, EXCHANGE_RATES };
