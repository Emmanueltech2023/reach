import { NextRequest, NextResponse } from "next/server";

// Patterns that indicate attempts to move off-platform
const CONTACT_PATTERNS = [
  // Phone numbers
  /(\+?[\d\s\-\(\)]{10,15})/g,
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // WhatsApp mentions
  /whatsapp/gi,
  // Telegram
  /telegram|t\.me\//gi,
  // Instagram
  /instagram|@[a-zA-Z0-9_.]+/gi,
  // "DM me", "message me", "contact me" + platform
  /(dm|message|contact|reach|hit)\s*(me|us)\s*(on|at|via|through)\s*(whatsapp|telegram|instagram|twitter|email)/gi,
  // Direct contact requests
  /let('s)?\s*(talk|speak|chat|connect)\s*(off|outside|privately|direct)/gi,
  /take\s*(this|our\s*conversation)\s*(off|outside|elsewhere)/gi,
  /my\s*(number|phone|email|handle|ig|insta)/gi,
  /send\s*(me|us)\s*(your|a)\s*(number|email|contact)/gi,
];

const WARNING_PATTERNS = [
  /bypass|avoid|skip.*platform/gi,
  /deal.*outside/gi,
  /without.*ivest/gi,
  /directly.*without/gi,
];

export type ModerationResult = {
  flagged: boolean;
  warningOnly: boolean;
  reason: string | null;
  cleanedContent: string | null;
};

export function moderateContent(content: string): ModerationResult {
  if (!content?.trim()) {
    return { flagged: false, warningOnly: false, reason: null, cleanedContent: content };
  }

  // Check for hard blocks — contact sharing
  for (const pattern of CONTACT_PATTERNS) {
    pattern.lastIndex = 0; // Always reset before test
    if (pattern.test(content)) {
      pattern.lastIndex = 0;
      return {
        flagged: true,
        warningOnly: false,
        reason: "Sharing personal contact details is not allowed on iVest. All communication must happen within the platform to protect both parties.",
        cleanedContent: null,
      };
    }
  }

  // Check for soft warnings — off-platform intent
  for (const pattern of WARNING_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      pattern.lastIndex = 0;
      return {
        flagged: true,
        warningOnly: true,
        reason: "This message suggests moving communication off-platform. iVest protects both parties by keeping all deal discussions here.",
        cleanedContent: content,
      };
    }
  }

  return {
    flagged: false,
    warningOnly: false,
    reason: null,
    cleanedContent: content,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    const result = moderateContent(content);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}