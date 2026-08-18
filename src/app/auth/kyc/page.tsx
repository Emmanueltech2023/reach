"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  IdCard,
  Camera,
  Mail,
  Phone,
  CheckCircle,
  Clock,
  Upload,
} from "lucide-react";

const STEPS = [
  {
    id: "id",
    icon: IdCard,
    title: "Government ID",
    description: "Upload a clear photo of your passport, national ID or driver's license.",
  },
  {
    id: "selfie",
    icon: Camera,
    title: "Selfie & Liveness",
    description: "Take a selfie so we can match it to your ID. Liveness check included.",
  },
  {
    id: "email",
    icon: Mail,
    title: "Email Verification",
    description: "Enter the 6-digit code sent to your email address.",
  },
  {
    id: "phone",
    icon: Phone,
    title: "Phone Verification",
    description: "Enter the 6-digit code sent to your phone number.",
  },
];

export default function KYCPage() {
  const router = useRouter();

const supabase = createClient();

const handleComplete = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    router.push("/auth/login");
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "builder") {
    router.push("/dashboard/builder");
  } else if (profile?.role === "talent") {
    router.push("/dashboard/talent");
  } else {
    router.push("/dashboard/investor");
  }
};


  
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState("id");
  const [emailCode, setEmailCode] = useState(["", "", "", "", "", ""]);
  const [phoneCode, setPhoneCode] = useState(["", "", "", "", "", ""]);
  const [idUploaded, setIdUploaded] = useState(false);
  const [selfieCapured, setSelfiecaptured] = useState(false);

  const markDone = (id: string) => {
    if (!completedSteps.includes(id)) {
      setCompletedSteps([...completedSteps, id]);
    }
    const currentIndex = STEPS.findIndex((s) => s.id === id);
    if (currentIndex < STEPS.length - 1) {
      setActiveStep(STEPS[currentIndex + 1].id);
    }
  };

  const allDone = completedSteps.length === STEPS.length;

  const handleCodeChange = (
    val: string,
    index: number,
    arr: string[],
    setArr: (a: string[]) => void,
    stepId: string
  ) => {
    const updated = [...arr];
    updated[index] = val.slice(-1);
    setArr(updated);
    if (val && index < 5) {
      const next = document.getElementById(`${stepId}-${index + 1}`);
      next?.focus();
    }
    if (updated.every((d) => d !== "")) {
      markDone(stepId);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0F0F1A] px-6 py-12">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-wider text-[#F5F3ED] mb-1">
            R<span className="text-[#C9A84C]">EACH</span>
          </h1>
          <p className="text-[#A8A6B8] text-sm">Identity Verification</p>

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className="h-1.5 w-8 rounded-full bg-[#C9A84C]"
              />
            ))}
          </div>
        </div>

        {/* KYC Steps */}
        <div className="flex flex-col gap-3 mb-6">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isDone = completedSteps.includes(step.id);
            const isActive = activeStep === step.id && !isDone;

            return (
              <div
                key={step.id}
                className={`rounded-xl border transition ${
                  isDone
                    ? "border-[#3B6D11] bg-[#EAF3DE10]"
                    : isActive
                    ? "border-[#C9A84C] bg-[#C9A84C08]"
                    : "border-[#3A3A52] bg-[#1A1A2E]"
                }`}
              >
                {/* Step header */}
                <button
                  onClick={() => !isDone && setActiveStep(step.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isDone
                        ? "bg-[#EAF3DE]"
                        : isActive
                        ? "bg-[#C9A84C20]"
                        : "bg-[#2A2A3E]"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle size={18} className="text-[#3B6D11]" />
                    ) : isActive ? (
                      <Clock size={18} className="text-[#C9A84C]" />
                    ) : (
                      <Icon size={18} className="text-[#5C5A70]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div
                      className={`text-sm font-medium ${
                        isDone
                          ? "text-[#3B6D11]"
                          : isActive
                          ? "text-[#C9A84C]"
                          : "text-[#5C5A70]"
                      }`}
                    >
                      {step.title}
                    </div>
                    {isDone && (
                      <div className="text-xs text-[#3B6D11]">Verified ✓</div>
                    )}
                  </div>
                  {isDone && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#EAF3DE] text-[#3B6D11]">
                      Done
                    </span>
                  )}
                </button>

                {/* Step body — only shown when active */}
                {isActive && (
                  <div className="px-4 pb-4">
                    <p className="text-[#A8A6B8] text-xs mb-3 leading-relaxed">
                      {step.description}
                    </p>

                    {/* ID Upload */}
                    {step.id === "id" && (
                      <div>
                        <label
                          htmlFor="id-upload"
                          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-6 cursor-pointer transition ${
                            idUploaded
                              ? "border-[#C9A84C] bg-[#C9A84C10]"
                              : "border-[#3A3A52] hover:border-[#C9A84C]"
                          }`}
                        >
                          <Upload
                            size={22}
                            className={
                              idUploaded ? "text-[#C9A84C]" : "text-[#5C5A70]"
                            }
                          />
                          <span className="text-xs text-[#A8A6B8]">
                            {idUploaded
                              ? "ID uploaded successfully"
                              : "Tap to upload your ID"}
                          </span>
                        </label>
                        <input
                          id="id-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={() => {
                            setIdUploaded(true);
                            setTimeout(() => markDone("id"), 800);
                          }}
                        />
                      </div>
                    )}

                    {/* Selfie */}
                    {step.id === "selfie" && (
                      <button
                        onClick={() => {
                          setSelfiecaptured(true);
                          setTimeout(() => markDone("selfie"), 800);
                        }}
                        className={`w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-6 transition ${
                          selfieCapured
                            ? "border-[#C9A84C] bg-[#C9A84C10]"
                            : "border-[#3A3A52] hover:border-[#C9A84C]"
                        }`}
                      >
                        <Camera
                          size={22}
                          className={
                            selfieCapured ? "text-[#C9A84C]" : "text-[#5C5A70]"
                          }
                        />
                        <span className="text-xs text-[#A8A6B8]">
                          {selfieCapured
                            ? "Selfie captured — liveness passed ✓"
                            : "Tap to open camera"}
                        </span>
                      </button>
                    )}

                    {/* Email OTP */}
                    {step.id === "email" && (
                      <div>
                        <p className="text-[#5C5A70] text-xs mb-3">
                          Code sent to your email address
                        </p>
                        <div className="flex gap-2 justify-between">
                          {emailCode.map((val, i) => (
                            <input
                              key={i}
                              id={`email-${i}`}
                              type="text"
                              maxLength={1}
                              value={val}
                              onChange={(e) =>
                                handleCodeChange(
                                  e.target.value,
                                  i,
                                  emailCode,
                                  setEmailCode,
                                  "email"
                                )
                              }
                              className="w-10 h-11 text-center bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-base font-medium rounded-lg outline-none focus:border-[#C9A84C] transition"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Phone OTP */}
                    {step.id === "phone" && (
                      <div>
                        <p className="text-[#5C5A70] text-xs mb-3">
                          Code sent to your phone number
                        </p>
                        <div className="flex gap-2 justify-between">
                          {phoneCode.map((val, i) => (
                            <input
                              key={i}
                              id={`phone-${i}`}
                              type="text"
                              maxLength={1}
                              value={val}
                              onChange={(e) =>
                                handleCodeChange(
                                  e.target.value,
                                  i,
                                  phoneCode,
                                  setPhoneCode,
                                  "phone"
                                )
                              }
                              className="w-10 h-11 text-center bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-base font-medium rounded-lg outline-none focus:border-[#C9A84C] transition"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Complete button */}
        {allDone && (
  <button
    onClick={handleComplete}
    className="w-full bg-[#C9A84C] text-[#1A1A2E] font-medium text-sm py-3 rounded-lg hover:opacity-90 transition"
  >
    Complete Verification →
  </button>
)}

        {!allDone && (
          <p className="text-center text-[#5C5A70] text-xs">
            Step 4 of 4 — Complete all steps to continue
          </p>
        )}
      </div>
    </main>
  );
}