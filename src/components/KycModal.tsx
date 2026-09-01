"use client";

import { useState } from "react";
import { X, Upload, ShieldCheck, Loader2, Check, AlertCircle, FileText, Camera, Shield, Sparkles, Lock } from "lucide-react";

type KycModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userRole?: string;
  actionContext?: string; // e.g. "Identity verification required to sign confidential NDA & Term Sheet"
  onSuccess: () => void;
};

export default function KycModal({ isOpen, onClose, userId, userRole, actionContext, onSuccess }: KycModalProps) {
  const [idType, setIdType] = useState<"passport" | "national_id" | "drivers_license">("passport");
  
  // Cloudinary image URLs
  const [frontUrl, setFrontUrl] = useState("");
  const [backUrl, setBackUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [businessCertUrl, setBusinessCertUrl] = useState("");

  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Cloudinary Image Uploader Helper
  const handleFileUpload = async (file: File, fieldName: string) => {
    setUploadingField(fieldName);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "kyc-documents");

      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Image upload failed");
      }

      if (fieldName === "front") setFrontUrl(data.url);
      if (fieldName === "back") setBackUrl(data.url);
      if (fieldName === "selfie") setSelfieUrl(data.url);
      if (fieldName === "business_cert") setBusinessCertUrl(data.url);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload document photo");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontUrl || !selfieUrl) {
      setErrorMsg("Please upload your Front ID image and Selfie photo.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          idType,
          frontUrl,
          backUrl,
          selfieUrl,
          businessCertUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "KYC submission failed");

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2A1A3E] via-[#1A1A2E] to-[#0A0A0F] border border-[#C9A84C]/40 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(201,168,76,0.15)] overflow-hidden animate-in zoom-in-95 duration-300 relative">
        
        {/* Ambient Top Glow */}
        <div className="absolute w-72 h-72 bg-[#C9A84C]/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
        <div className="absolute w-60 h-60 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none top-0 -right-20" />

        {/* Modal Header */}
        <div className="p-5 border-b border-[#3A3A52]/80 bg-[#0A0A0F]/80 backdrop-blur-md flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#C9A84C]/25 to-[#C9A84C]/5 border border-[#C9A84C]/50 flex items-center justify-center text-[#C9A84C] shadow-lg shadow-[#C9A84C]/10">
                <ShieldCheck size={22} />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C9A84C] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#C9A84C]"></span>
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F3ED]">
                Identity Verification (KYC)
              </h3>
              <p className="text-xs text-[#A8A6B8]">
                {actionContext || "Verify identity documents to unlock dealrooms & features"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] hover:border-[#C9A84C] transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Context Alert */}
        {actionContext && (
          <div className="px-5 py-2.5 bg-[#C9A84C]/10 border-b border-[#C9A84C]/30 text-xs text-[#C9A84C] flex items-center gap-2 font-medium relative z-10">
            <Lock size={14} className="shrink-0" />
            <span>{actionContext}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-5 relative z-10">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-300 flex items-center gap-2 shadow-lg shadow-red-500/5">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ID Type Selection Cards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#A8A6B8] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#C9A84C]" />
                <span>1. Select ID Document Type</span>
              </label>
              <span className="text-[10px] text-[#5C5A70]">Step 1 of 2</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: "passport", label: "Passport", icon: Shield },
                { id: "national_id", label: "National ID", icon: FileText },
                { id: "drivers_license", label: "Driver's License", icon: Camera },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setIdType(item.id as any)}
                  className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    idType === item.id
                      ? "bg-gradient-to-b from-[#C9A84C]/25 to-[#1A1A2E] border-[#C9A84C] text-[#C9A84C] shadow-lg shadow-[#C9A84C]/10 scale-[1.02]"
                      : "bg-[#1A1A2E]/80 border-[#3A3A52] text-[#A8A6B8] hover:text-white hover:border-[#5C5A70]"
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Document Upload Dropzones */}
          <div className="space-y-4 pt-1">
            <label className="text-xs font-bold text-[#A8A6B8] block uppercase tracking-wider flex items-center gap-1.5">
              <Upload size={12} className="text-[#C9A84C]" />
              <span>2. Upload Clear Document Photos</span>
            </label>

            {/* Front ID Upload */}
            <div className="p-4 rounded-2xl bg-[#1A1A2E]/90 border border-[#3A3A52] hover:border-[#C9A84C]/50 transition space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#F5F3ED]">Front ID Photo *</span>
                {frontUrl && <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30"><Check size={12} /> Uploaded</span>}
              </div>
              
              {frontUrl ? (
                <div className="relative h-32 rounded-xl overflow-hidden border border-emerald-500/40 shadow-lg">
                  <img src={frontUrl} alt="Front ID" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFrontUrl("")}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 text-white hover:bg-red-600 transition cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-5 border border-dashed border-[#3A3A52] rounded-xl hover:border-[#C9A84C] transition cursor-pointer bg-[#0F0F1A]/80 hover:bg-[#1A1A2E]">
                  {uploadingField === "front" ? (
                    <Loader2 size={22} className="animate-spin text-[#C9A84C]" />
                  ) : (
                    <>
                      <Upload size={20} className="text-[#C9A84C] mb-1.5" />
                      <span className="text-xs font-medium text-[#F5F3ED]">Upload Front ID Image</span>
                      <span className="text-[10px] text-[#5C5A70] mt-0.5">Passport bio page or ID front (PNG, JPG)</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingField === "front"}
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "front")}
                  />
                </label>
              )}
            </div>

            {/* Back ID Upload */}
            <div className="p-4 rounded-2xl bg-[#1A1A2E]/90 border border-[#3A3A52] hover:border-[#C9A84C]/50 transition space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#F5F3ED]">Back ID Photo (Optional for Passport)</span>
                {backUrl && <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30"><Check size={12} /> Uploaded</span>}
              </div>

              {backUrl ? (
                <div className="relative h-32 rounded-xl overflow-hidden border border-emerald-500/40 shadow-lg">
                  <img src={backUrl} alt="Back ID" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setBackUrl("")}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 text-white hover:bg-red-600 transition cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-5 border border-dashed border-[#3A3A52] rounded-xl hover:border-[#C9A84C] transition cursor-pointer bg-[#0F0F1A]/80 hover:bg-[#1A1A2E]">
                  {uploadingField === "back" ? (
                    <Loader2 size={22} className="animate-spin text-[#C9A84C]" />
                  ) : (
                    <>
                      <Upload size={20} className="text-[#A8A6B8] mb-1.5" />
                      <span className="text-xs font-medium text-[#A8A6B8]">Upload Back ID Image</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingField === "back"}
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "back")}
                  />
                </label>
              )}
            </div>

            {/* Selfie Photo Upload */}
            <div className="p-4 rounded-2xl bg-[#1A1A2E]/90 border border-[#3A3A52] hover:border-[#C9A84C]/50 transition space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#F5F3ED]">Selfie / Liveness Photo *</span>
                {selfieUrl && <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30"><Check size={12} /> Uploaded</span>}
              </div>

              {selfieUrl ? (
                <div className="relative h-32 rounded-xl overflow-hidden border border-emerald-500/40 shadow-lg">
                  <img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setSelfieUrl("")}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 text-white hover:bg-red-600 transition cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-5 border border-dashed border-[#3A3A52] rounded-xl hover:border-[#C9A84C] transition cursor-pointer bg-[#0F0F1A]/80 hover:bg-[#1A1A2E]">
                  {uploadingField === "selfie" ? (
                    <Loader2 size={22} className="animate-spin text-[#C9A84C]" />
                  ) : (
                    <>
                      <Camera size={20} className="text-[#C9A84C] mb-1.5" />
                      <span className="text-xs font-medium text-[#F5F3ED]">Upload Clear Selfie Photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingField === "selfie"}
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "selfie")}
                  />
                </label>
              )}
            </div>

            {/* Founder Real Photo Compliance Rule */}
            <div className="bg-[#0F0F1A] border border-[#C9A84C]/25 rounded-xl p-3 flex items-start gap-2.5 text-xs">
              <ShieldCheck size={16} className="text-[#C9A84C] shrink-0 mt-0.5" />
              <div className="text-[#A8A6B8] leading-relaxed">
                <strong className="text-[#F5F3ED]">Founder Identity Rule:</strong> To pass KYC verification and ensure trust with institutional investors, your founder profile photo must be an authentic human portrait matching your ID. Cartoon avatars, anime, illustrations, and memes will result in verification decline.
              </div>
            </div>

            {/* Business Registration Cert (for Builder/Founder) */}
            {(userRole === "builder" || userRole === "investor") && (
              <div className="p-4 rounded-2xl bg-[#1A1A2E]/90 border border-[#C9A84C]/30 hover:border-[#C9A84C] transition space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#C9A84C]">Business Registration Cert (Founders/Builders)</span>
                  {businessCertUrl && <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30"><Check size={12} /> Uploaded</span>}
                </div>

                {businessCertUrl ? (
                  <div className="relative h-32 rounded-xl overflow-hidden border border-emerald-500/40 shadow-lg">
                    <img src={businessCertUrl} alt="Business Cert" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setBusinessCertUrl("")}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 text-white hover:bg-red-600 transition cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-5 border border-dashed border-[#3A3A52] rounded-xl hover:border-[#C9A84C] transition cursor-pointer bg-[#0F0F1A]/80 hover:bg-[#1A1A2E]">
                    {uploadingField === "business_cert" ? (
                      <Loader2 size={22} className="animate-spin text-[#C9A84C]" />
                    ) : (
                      <>
                        <FileText size={20} className="text-[#C9A84C] mb-1.5" />
                        <span className="text-xs font-medium text-[#C9A84C]">Upload Company Incorporation / Tax Cert</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      disabled={uploadingField === "business_cert"}
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "business_cert")}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !frontUrl || !selfieUrl}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#C9A84C] to-[#E6C665] hover:opacity-95 text-[#0A0A0F] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xl shadow-[#C9A84C]/20 disabled:opacity-50 mt-4"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /> Submit Identity Documents</>}
          </button>
        </form>

      </div>
    </div>
  );
}
