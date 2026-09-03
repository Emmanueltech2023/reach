import { useState, useEffect } from "react";
import { X, Lock, ShieldCheck, FileText, Download, Check, Eye } from "lucide-react";

type DocumentViewerProps = {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentTitle?: string;
  userName: string;
  companyName?: string;
  projectId?: string;
  founderId?: string;
};

export default function DocumentWatermarkViewer({
  isOpen,
  onClose,
  documentUrl,
  documentTitle = "Confidential Pitch Deck",
  userName,
  companyName = "REACH Startup Workspace",
  projectId,
  founderId,
}: DocumentViewerProps) {
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && projectId) {
      void fetch("/api/analytics/deck-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          founderId,
          documentTitle,
          viewerName: userName,
        }),
      }).catch((err) => console.warn("Deck telemetry notice:", err));
    }
  }, [isOpen, projectId, founderId, documentTitle, userName]);

  if (!isOpen) return null;

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const watermarkText = `CONFIDENTIAL · PREPARED FOR ${userName.toUpperCase()} ON ${currentDate.toUpperCase()} · REACH VERIFIED DEAL ROOM`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in duration-200">
      <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3A3A52] bg-[#0F0F1A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C]">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F3ED]">{documentTitle}</h3>
              <p className="text-xs text-[#C9A84C] font-semibold flex items-center gap-1">
                <ShieldCheck size={13} />
                {companyName} · Watermark Protected
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        {!ndaAccepted ? (
          <div className="p-8 sm:p-12 flex flex-col items-center text-center space-y-6 max-w-lg mx-auto my-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C] shadow-lg shadow-[#C9A84C]/10">
              <Lock size={32} />
            </div>

            <div>
              <h4 className="text-xl font-bold text-[#F5F3ED] mb-2">Confidentiality Agreement</h4>
              <p className="text-xs text-[#A8A6B8] leading-relaxed">
                This document contains proprietary information belonging to <strong className="text-white">{companyName}</strong>. 
                By clicking below, you agree not to distribute, copy, or disclose its contents outside of the REACH Deal Room platform.
              </p>
            </div>

            <div className="w-full p-4 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-left text-xs text-[#5C5A70] space-y-2">
              <div className="flex items-center gap-2 text-[#C9A84C] font-semibold">
                <ShieldCheck size={14} />
                Dynamic Security Watermarking
              </div>
              <p>
                Your verified identity (<strong className="text-[#A8A6B8]">{userName}</strong>) and timestamp will be embedded on all document pages to preserve deal integrity.
              </p>
            </div>

            <button
              onClick={() => setNdaAccepted(true)}
              className="w-full py-3.5 rounded-xl bg-[#C9A84C] hover:opacity-90 text-[#0A0A0F] font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-[#C9A84C]/20"
            >
              <Check size={18} /> Accept NDA & Open Document
            </button>
          </div>
        ) : (
          <div className="relative flex-1 bg-[#0A0A0F] overflow-hidden flex items-center justify-center min-h-[500px]">
            
            {/* Watermark Overlay Stack */}
            <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-8 select-none overflow-hidden opacity-35">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="text-center font-mono font-bold text-[11px] sm:text-xs text-[#C9A84C] tracking-[4px] uppercase transform -rotate-12 whitespace-nowrap drop-shadow-md"
                >
                  {watermarkText}
                </div>
              ))}
            </div>

            {/* Document Viewer Frame */}
            {documentUrl.endsWith(".pdf") ? (
              <iframe
                src={`${documentUrl}#toolbar=0`}
                className="w-full h-full border-none z-10 min-h-[550px]"
                title={documentTitle}
              />
            ) : (
              <div className="relative z-10 max-h-full p-6 overflow-auto">
                <img
                  src={documentUrl}
                  alt={documentTitle}
                  className="max-h-[70vh] object-contain rounded-xl border border-[#3A3A52] mx-auto shadow-2xl"
                />
              </div>
            )}

            {/* Footer Control Bar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-[#1A1A2E]/90 backdrop-blur-md border border-[#3A3A52] rounded-full px-5 py-2 flex items-center gap-4 shadow-xl">
              <span className="text-[11px] text-[#A8A6B8] font-mono">
                Watermarked for <span className="text-[#C9A84C] font-semibold">{userName}</span>
              </span>
              <a
                href={documentUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#C9A84C] hover:underline font-semibold"
              >
                <Download size={14} /> Download Copy
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
