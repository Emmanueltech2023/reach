// ─── REACH Automated Concierge Intelligence ──────────────────────────────────
// Provides 24/7 instant guidance, FAQ support, and deal assistance inside Direct Messages.

export type ConciergeResponse = {
  reply: string;
  quickActions?: { label: string; actionUrl: string }[];
};

export function handleConciergeQuery(messageContent: string): ConciergeResponse {
  const query = messageContent.toLowerCase().trim();

  // 1. KYC & Verification
  if (query.includes("kyc") || query.includes("verify") || query.includes("identity") || query.includes("badge")) {
    return {
      reply: "Welcome to REACH Verification! Identity verification unlocks your Verified Badge ✓ and boosts investor trust score. You can complete verification in under 2 minutes by uploading your Government ID and taking a quick selfie.",
      quickActions: [
        { label: "Verify Identity Now", actionUrl: "/dashboard/profile" },
      ],
    };
  }

  // 2. Post a Job / Hire Talent
  if (query.includes("job") || query.includes("hire") || query.includes("recruiter") || query.includes("talent")) {
    return {
      reply: "Looking to hire top Web2 & Web3 talent? You can post jobs directly to the REACH Talent Network or search our candidate matrix.",
      quickActions: [
        { label: "Post a Job", actionUrl: "/dashboard/jobs/post" },
        { label: "Search Talent Matrix", actionUrl: "/dashboard/talent-search" },
      ],
    };
  }

  // 3. Investment & Deals
  if (query.includes("deal") || query.includes("invest") || query.includes("capital") || query.includes("pitch")) {
    return {
      reply: "REACH connects verified founders with accredited investors. All deals are tracked from NDA to Closing inside our Confidential Deal Rooms.",
      quickActions: [
        { label: "Browse Projects", actionUrl: "/dashboard/investor" },
        { label: "View Deal Pipeline", actionUrl: "/dashboard/deals" },
      ],
    };
  }

  // 4. Upgrade & Subscription
  if (query.includes("pro") || query.includes("upgrade") || query.includes("tier") || query.includes("premium")) {
    return {
      reply: "Upgrading to Pro or Premium unlocks unlimited direct messaging, priority visibility to investors & recruiters, verified badges, and early deal access.",
      quickActions: [
        { label: "Explore Pro Plans", actionUrl: "/dashboard/upgrade" },
      ],
    };
  }

  // Default Concierge Response
  return {
    reply: "Hello! I am your REACH Platform Concierge. I'm here 24/7 to help you navigate our global startup & talent ecosystem. How can I assist you today?",
    quickActions: [
      { label: "Browse Startup Projects", actionUrl: "/dashboard/investor" },
      { label: "Search Talent Candidate Matrix", actionUrl: "/dashboard/talent-search" },
      { label: "Upgrade Profile", actionUrl: "/dashboard/upgrade" },
    ],
  };
}
