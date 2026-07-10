export const PLANS = [
  {
    id: "pro",
    name: "Pro",
    price: 49,
    features: ["Unlimited messaging", "Meeting booking", "Analytics access", "NDA templates", "Priority search placement"],
    notIncluded: ["AI startup scoring", "Private deal rooms", "Portfolio tracker"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 79,
    features: ["Everything in Pro", "AI startup scoring", "Private deal rooms", "Portfolio tracker", "Anonymous mode", "Priority investor introductions", "Featured listing placement"],
    notIncluded: [],
  },
] as const;