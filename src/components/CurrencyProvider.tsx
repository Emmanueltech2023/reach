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

  // Detect location via free IP GeoIP API
  const detectLocation = async (): Promise<{ countryCode: string; currencyCode: string }> => {
    try {
      const response = await fetch("https://ipapi.co/json/");
      if (response.ok) {
        const data = await response.json();
        if (data.country_code) {
          const countryCode = data.country_code.toUpperCase();
          const currencyCode = getCurrencyForCountry(countryCode);
          return { countryCode, currencyCode };
        }
      }
    } catch (e) {
      console.warn("Failed to detect location via ipapi, falling back to browser language:", e);
    }

    // Fallback: browser language
    try {
      const lang = navigator.language.split("-")[1] || navigator.language;
      if (lang && lang.length === 2) {
        const countryCode = lang.toUpperCase();
        return { countryCode, currencyCode: getCurrencyForCountry(countryCode) };
      }
    } catch {}

    return { countryCode: "US", currencyCode: "USD" };
  };

  useEffect(() => {
    async function initCurrency() {
      try {
        // 1. Check local storage first
        const savedCurrency = localStorage.getItem("preferred_currency");
        const savedCountry = localStorage.getItem("preferred_country");

        if (savedCurrency && savedCountry) {
          setCurrencyState(savedCurrency);
          setCountry(savedCountry);
          setLoading(false);
        }

        // 2. Check authenticated profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("country, preferred_currency")
            .eq("id", user.id)
            .single();

          if (profile) {
            let activeCountry = profile.country;
            let activeCurrency = (profile as any).preferred_currency;

            // If profile has country but no currency, map it
            if (activeCountry && !activeCurrency) {
              activeCurrency = getCurrencyForCountry(activeCountry);
            }

            // If profile has nothing, detect it now
            if (!activeCountry || !activeCurrency) {
              const detected = await detectLocation();
              activeCountry = activeCountry || detected.countryCode;
              activeCurrency = activeCurrency || detected.currencyCode;

              // Save to profile
              await fetch("/api/profile/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: user.id,
                  updates: {
                    country: activeCountry,
                    preferred_currency: activeCurrency,
                  },
                }),
              });
            }

            setCurrencyState(activeCurrency);
            setCountry(activeCountry);
            localStorage.setItem("preferred_currency", activeCurrency);
            localStorage.setItem("preferred_country", activeCountry);
            setLoading(false);
            return;
          }
        }

        // 3. Fallback to geolocation if not logged in / no saved preferences
        if (!savedCurrency) {
          const detected = await detectLocation();
          setCurrencyState(detected.currencyCode);
          setCountry(detected.countryCode);
          localStorage.setItem("preferred_currency", detected.currencyCode);
          localStorage.setItem("preferred_country", detected.countryCode);
        }
      } catch (err) {
        console.error("Error initializing currency:", err);
      } finally {
        setLoading(false);
      }
    }

    initCurrency();
  }, [supabase]);

  const setCurrency = async (code: string) => {
    const upperCode = code.toUpperCase();
    setCurrencyState(upperCode);
    localStorage.setItem("preferred_currency", upperCode);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetch("/api/profile/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            updates: {
              preferred_currency: upperCode,
            },
          }),
        });
      }
    } catch (e) {
      console.error("Failed to update currency on profile:", e);
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
