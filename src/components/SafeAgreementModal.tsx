"use client";

import { useState } from "react";
import {
  X,
  FileText,
  Download,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Percent,
  Sparkles,
} from "lucide-react";

type SafeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultCompany?: string;
  defaultFounder?: string;
  defaultInvestor?: string;
  defaultAmount?: number;
  dealId?: string;
};

export default function SafeAgreementModal({
  isOpen,
  onClose,
  defaultCompany = "REACH Portfolio Startup Inc.",
  defaultFounder = "Startup Founder",
  defaultInvestor = "Angel Investor",
  defaultAmount = 50000,
  dealId,
}: SafeModalProps) {
  const [companyName, setCompanyName] = useState(defaultCompany);
  const [founderName, setFounderName] = useState(defaultFounder);
  const [investorName, setInvestorName] = useState(defaultInvestor);
  const [purchaseAmount, setPurchaseAmount] = useState(defaultAmount || 50000);
  const [valuationCap, setValuationCap] = useState(5000000);
  const [discountRate, setDiscountRate] = useState(20);
  const [hasProRata, setHasProRata] = useState(true);
  const [governingLaw, setGoverningLaw] = useState("State of Delaware, United States");

  const [copied, setCopied] = useState(false);
  const [signed, setSigned] = useState(false);

  if (!isOpen) return null;

  const agreementDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const agreementHash = `SAFE-RCH-${(dealId || "001").slice(0, 6).toUpperCase()}-${Math.floor(
    100000 + Math.random() * 900000
  )}`;

  const legalMarkdown = `
SIMPLE AGREEMENT FOR FUTURE EQUITY (SAFE)
Post-Money Valuation Cap & Discount
REACH Verified Deal Room: ${agreementHash}

THIS CERTIFIES THAT in exchange for the payment by ${investorName} (the "Investor") of $${purchaseAmount.toLocaleString()} (the "Purchase Amount") on or about ${agreementDate}, ${companyName} (the "Company"), hereby issues to the Investor the right to certain shares of the Company’s Capital Stock, subject to the terms set forth below.

1. EVENTS
(a) Equity Financing. If there is an Equity Financing before the expiration or termination of this instrument, the Company will automatically issue to the Investor a number of shares of Safe Preferred Stock equal to the Purchase Amount divided by the Safe Price.
(b) Post-Money Valuation Cap: $${valuationCap.toLocaleString()} USD.
(c) Discount Rate: ${discountRate}%.
(d) Pro-Rata Rights: ${hasProRata ? "Granted to Investor" : "Not Applicable"}.

2. GOVERNING LAW
This instrument shall be governed by, and construed in accordance with, the laws of ${governingLaw}.

SIGNATURES:
Company: ${companyName}
Representative: ${founderName}
Investor: ${investorName}
Executed via REACH Verified Platform on ${agreementDate}.
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(legalMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#12121E] border border-[#3A3A52] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A3E] bg-[#0A0A0F]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/15 border border-[#C9A84C]/35 flex items-center justify-center text-[#C9A84C]">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F5F3ED]">
                  YC Standard SAFE & Term Sheet Builder
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                  Legal Standard
                </span>
              </div>
              <p className="text-xs text-[#8E8CA0] flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={13} className="text-[#C9A84C]" />
                <span>Post-Money Valuation Cap · Industry Standard Agreement</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] text-[#A8A6B8] hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Two-Column Editor & Live Document View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Input Parameters (5 cols) */}
          <div className="lg:col-span-5 p-5 bg-[#0D0D16] border-r border-[#2A2A3E] overflow-y-auto space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#C9A84C] flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>Investment Terms</span>
            </h4>

            <div>
              <label className="text-[11px] font-semibold text-[#8E8CA0] uppercase tracking-wider block mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-[#141424] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3 py-2.5 outline-none focus:border-[#C9A84C] transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#8E8CA0] uppercase tracking-wider block mb-1">
                  Founder Name
                </label>
                <input
                  type="text"
                  value={founderName}
                  onChange={(e) => setFounderName(e.target.value)}
                  className="w-full bg-[#141424] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3 py-2.5 outline-none focus:border-[#C9A84C] transition"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#8E8CA0] uppercase tracking-wider block mb-1">
                  Investor / Fund
                </label>
                <input
                  type="text"
                  value={investorName}
                  onChange={(e) => setInvestorName(e.target.value)}
                  className="w-full bg-[#141424] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3 py-2.5 outline-none focus:border-[#C9A84C] transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#8E8CA0] uppercase tracking-wider block mb-1">
                  Investment ($ USD)
                </label>
                <input
                  type="number"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                  className="w-full bg-[#141424] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3 py-2.5 outline-none focus:border-[#C9A84C] transition font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#8E8CA0] uppercase tracking-wider block mb-1">
                  Valuation Cap ($)
                </label>
                <input
                  type="number"
                  value={valuationCap}
                  onChange={(e) => setValuationCap(Number(e.target.value))}
                  className="w-full bg-[#141424] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3 py-2.5 outline-none focus:border-[#C9A84C] transition font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#8E8CA0] uppercase tracking-wider block mb-1">
                  Discount Rate (%)
                </label>
                <input
                  type="number"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(Number(e.target.value))}
                  className="w-full bg-[#141424] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3 py-2.5 outline-none focus:border-[#C9A84C] transition font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#8E8CA0] uppercase tracking-wider block mb-1">
                  Pro-Rata Rights
                </label>
                <button
                  type="button"
                  onClick={() => setHasProRata(!hasProRata)}
                  className={`w-full py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    hasProRata
                      ? "bg-[#C9A84C]/20 border-[#C9A84C] text-[#C9A84C]"
                      : "bg-[#141424] border-[#2A2A3E] text-[#8E8CA0]"
                  }`}
                >
                  {hasProRata ? "Granted ✓" : "None"}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#8E8CA0] uppercase tracking-wider block mb-1">
                Governing Jurisdiction
              </label>
              <select
                value={governingLaw}
                onChange={(e) => setGoverningLaw(e.target.value)}
                className="w-full bg-[#141424] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3 py-2.5 outline-none focus:border-[#C9A84C] transition cursor-pointer"
              >
                <option value="State of Delaware, United States">Delaware, United States</option>
                <option value="England & Wales, United Kingdom">England & Wales, UK</option>
                <option value="Federal Republic of Nigeria">Federal Republic of Nigeria</option>
                <option value="Cayman Islands">Cayman Islands</option>
                <option value="Republic of Singapore">Republic of Singapore</option>
                <option value="United Arab Emirates (ADGM / DIFC)">ADGM / DIFC, UAE</option>
              </select>
            </div>
          </div>

          {/* Right Column: Live Formatted Legal Preview (7 cols) */}
          <div className="lg:col-span-7 p-6 bg-[#07070C] overflow-y-auto space-y-5 print:p-0 print:bg-white print:text-black">
            <div className="flex items-center justify-between border-b border-[#2A2A3E] pb-3">
              <span className="text-xs font-mono text-[#8E8CA0]">
                REF: {agreementHash}
              </span>
              <span className="text-xs text-[#8E8CA0]">{agreementDate}</span>
            </div>

            <div className="space-y-4 text-xs leading-relaxed font-serif text-[#D8D6E8] bg-[#0F0F1A] p-6 rounded-2xl border border-[#2A2A3E]">
              <div className="text-center space-y-1 pb-3 border-b border-[#2A2A3E]/60">
                <h2 className="text-base font-bold tracking-tight text-[#F5F3ED]">
                  SIMPLE AGREEMENT FOR FUTURE EQUITY
                </h2>
                <p className="text-[11px] text-[#C9A84C] font-mono">
                  (Post-Money Valuation Cap & Discount Model)
                </p>
              </div>

              <p>
                THIS CERTIFIES THAT in exchange for the payment by <strong>{investorName}</strong> (the &ldquo;Investor&rdquo;) of <strong>${purchaseAmount.toLocaleString()} USD</strong> (the &ldquo;Purchase Amount&rdquo;) on or about {agreementDate}, <strong>{companyName}</strong> (the &ldquo;Company&rdquo;), hereby issues to the Investor the right to certain shares of the Company&apos;s Capital Stock, subject to the terms set forth below.
              </p>

              <div className="p-3.5 rounded-xl bg-[#07070C] border border-[#2A2A3E] space-y-2 font-sans text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8E8CA0]">Valuation Cap:</span>
                  <span className="font-bold text-[#F5F3ED]">${valuationCap.toLocaleString()} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8E8CA0]">Discount Rate:</span>
                  <span className="font-bold text-emerald-400">{discountRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8E8CA0]">Pro-Rata Rights:</span>
                  <span className="font-bold text-[#C9A84C]">{hasProRata ? "Included" : "Standard"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8E8CA0]">Governing Law:</span>
                  <span className="font-bold text-[#F5F3ED]">{governingLaw}</span>
                </div>
              </div>

              <p>
                <strong>1. Conversion upon Equity Financing.</strong> If there is an Equity Financing before the termination of this Safe, on the initial closing of such Equity Financing, this Safe will automatically convert into the number of shares of Safe Preferred Stock equal to the Purchase Amount divided by the Conversion Price.
              </p>

              <p>
                <strong>2. Liquidity & Dissolution.</strong> If there is a Change of Control or an Initial Public Offering before the termination of this instrument, the Investor will automatically receive a portion of Proceeds equal to the greater of (i) the Purchase Amount or (ii) the amount payable on the number of shares of Common Stock equal to the Purchase Amount divided by the Liquidity Price.
              </p>

              <div className="pt-4 border-t border-[#2A2A3E]/60 grid grid-cols-2 gap-4 font-sans text-[11px]">
                <div className="p-3 rounded-xl bg-[#07070C] border border-[#2A2A3E] space-y-1">
                  <span className="text-[#8E8CA0] block">Company Representative:</span>
                  <span className="font-bold text-[#F5F3ED] block">{founderName}</span>
                  <span className="text-emerald-400 font-semibold block text-[10px]">
                    ✓ Authenticated Member (REACH KYC)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#07070C] border border-[#2A2A3E] space-y-1">
                  <span className="text-[#8E8CA0] block">Investor Representative:</span>
                  <span className="font-bold text-[#F5F3ED] block">{investorName}</span>
                  <span className="text-[#C9A84C] font-semibold block text-[10px]">
                    ✓ Digital Verification Stamp
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#2A2A3E] bg-[#0A0A0F] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-[#1A1A2E] hover:bg-[#25253A] border border-[#3A3A52] text-xs font-semibold text-[#F5F3ED] flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? "Copied Markdown!" : "Copy Legal Text"}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-[#1A1A2E] hover:bg-[#25253A] border border-[#3A3A52] text-xs font-semibold text-[#F5F3ED] flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSigned(true);
              setTimeout(() => onClose(), 1500);
            }}
            className="px-6 py-2.5 rounded-xl bg-[#C9A84C] hover:opacity-90 text-[#0A0A0F] font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#C9A84C]/25 transition cursor-pointer"
          >
            {signed ? (
              <>
                <CheckCircle2 size={16} />
                <span>SAFE Agreement Stamped!</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Stamp & Save to Deal Room</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
