"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getCurrencyForCountry,
  formatCurrency as baseFormatCurrency,
  convertFromUSD as baseConvertFromUSD,
} from "@/lib/currency";

interface CurrencyContextType {
  currency: string;
  country: string;
  symbol: string;
  loading: boolean;
  setCurrency: (code: string) => void;
  formatCurrency: (amount: number, options?: { compact?: boolean; convertFromUSD?: boolean; showCode?: boolean }) => string;
  convertFromUSD: (amount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [currency, setCurrencyState] = useState<string>("USD");
  const [country, setCountry] = useState<string>("US");
  const [loading, setLoading] = useState<boolean>(true);

  // Map to store symbols
  const symbol = useMemo(() => {
    try {
      return new Intl.NumberFormat("en", { style: "currency", currency })
        .format(0)
        .replace(/[0-9\s.,]/g, "");
    } catch {
      return "$";
    }
  }, [currency]);

  // Detect location safely using browser locale & timezone without failing network requests
  const detectLocation = async (): Promise<{ countryCode: string; currencyCode: string }> => {
    // 1. Browser language detection (instant, zero network)
    try {
      if (typeof window !== "undefined" && navigator?.language) {
        const parts = navigator.language.split("-");
        const countryCode = (parts.length > 1 ? parts[1] : parts[0]).toUpperCase();
        if (countryCode.length === 2) {
          const currencyCode = getCurrencyForCountry(countryCode);
          return { countryCode, currencyCode };
        }
      }
    } catch {}

    // 2. Timezone heuristic
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz.includes("London")) return { countryCode: "GB", currencyCode: "GBP" };
      if (tz.includes("Lagos") || tz.includes("Africa/Lagos")) return { countryCode: "NG", currencyCode: "NGN" };
      if (tz.includes("Paris") || tz.includes("Berlin") || tz.includes("Rome") || tz.includes("Madrid")) return { countryCode: "FR", currencyCode: "EUR" };
      if (tz.includes("Tokyo")) return { countryCode: "JP", currencyCode: "JPY" };
      if (tz.includes("Toronto") || tz.includes("Vancouver")) return { countryCode: "CA", currencyCode: "CAD" };
      if (tz.includes("Sydney") || tz.includes("Melbourne")) return { countryCode: "AU", currencyCode: "AUD" };
    } catch {}

    return { countryCode: "US", currencyCode: "USD" };
  };

  useEffect(() => {
    let isMounted = true;

    async function initCurrency() {
      try {
        // 1. Check local storage first
        if (typeof window !== "undefined") {
          const savedCurrency = localStorage.getItem("preferred_currency");
          const savedCountry = localStorage.getItem("preferred_country");

          if (savedCurrency && savedCountry) {
            if (isMounted) {
              setCurrencyState(savedCurrency);
              setCountry(savedCountry);
              setLoading(false);
            }
          }
        }

        // 2. Check authenticated profile safely using local session first
        let user: any = null;
        let session: any = null;
        try {
          const sessionRes = await supabase.auth.getSession().catch(() => ({ data: { session: null }, error: null }));
          session = sessionRes?.data?.session || null;
          user = session?.user || null;
        } catch {
          user = null;
          session = null;
        }

        if (user) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("country, preferred_currency")
              .eq("id", user.id)
              .maybeSingle();

            if (profile && isMounted) {
              let activeCountry = profile.country;
              let activeCurrency = (profile as any).preferred_currency;

              if (activeCountry && !activeCurrency) {
                activeCurrency = getCurrencyForCountry(activeCountry);
              }

              if (!activeCountry || !activeCurrency) {
                const detected = await detectLocation();
                activeCountry = activeCountry || detected.countryCode;
                activeCurrency = activeCurrency || detected.currencyCode;

                if (session?.access_token) {
                  fetch("/api/profile/update", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                      userId: user.id,
                      updates: {
                        country: activeCountry,
                        preferred_currency: activeCurrency,
                      },
                    }),
                  }).catch(() => {});
                }
              }

              setCurrencyState(activeCurrency);
              setCountry(activeCountry);
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem("preferred_currency", activeCurrency);
                  localStorage.setItem("preferred_country", activeCountry);
                } catch {}
              }
              setLoading(false);
              return;
            }
          } catch {}
        }

        // 3. Fallback for guests
        const detected = await detectLocation();
        if (isMounted) {
          setCurrencyState(detected.currencyCode);
          setCountry(detected.countryCode);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    }

    void initCurrency();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const setCurrency = async (code: string) => {
    const upperCode = code.toUpperCase();
    setCurrencyState(upperCode);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("preferred_currency", upperCode);
      }
    } catch {}

    try {
      const sessionRes = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const session = sessionRes?.data?.session;
      const user = session?.user;
      if (user && session?.access_token) {
        await fetch("/api/profile/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            updates: {
              preferred_currency: upperCode,
            },
          }),
        }).catch(() => {});
      }
    } catch (e) {
      // non-blocking
    }
  };

  const formatCurrencyVal = (
    amount: number,
    options: { compact?: boolean; convertFromUSD?: boolean; showCode?: boolean } = {}
  ) => {
    const { compact = true, convertFromUSD = true, showCode = false } = options;
    return baseFormatCurrency(amount, currency, { compact, convertFromUSD, showCode });
  };

  const convertFromUSDVal = (amount: number) => {
    return baseConvertFromUSD(amount, currency);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        country,
        symbol,
        loading,
        setCurrency,
        formatCurrency: formatCurrencyVal,
        convertFromUSD: convertFromUSDVal,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
