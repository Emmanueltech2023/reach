import { NextRequest, NextResponse } from "next/server";

// Patterns that indicate attempts to move off-platform
const CONTACT_PATTERNS = [
  // Phone numbers (e.g. +1234567890, 08012345678, 123-456-7890)
  /(\+?[\d\s\-\(\)]{10,15})/g,
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Social & messaging platforms
  /whatsapp|telegram|t\.me\/|instagram|insta|wechat|signal|skype|linkedin/gi,
  // Handles (@name, ig: name, etc.)
  /@\w+/gi,
  // "DM me", "message me", "contact me" + platform
  /(dm|message|contact|reach|hit|text|call)\s*(me|us|you)\s*(on|at|via|through|with)?\s*(whatsapp|telegram|instagram|twitter|email|phone|number|digits)?/gi,
  // Asking for or offering contact info / details (e.g. "can I get your contact", "what is your number", "share your email")
  /(can|could|may|would|should|how|where|please)\s*(i|we|you)?\s*(get|have|share|send|ask|find|take|swap|drop|give)\s*(your|a|my|our)?\s*(contact|number|email|phone|whatsapp|telegram|ig|instagram|digits|address|details|info)/gi,
  /(give|send|share|drop|leave|swap|text|call|ping|reach)\s*(me|us|you)?\s*(your|a|my|our)?\s*(contact|number|email|phone|whatsapp|telegram|ig|instagram|digits|address|details|info)/gi,
  /(what|what's|whats)\s*(is|are)?\s*(your|a)?\s*(contact|number|email|phone|whatsapp|telegram|digits|info|details)/gi,
  // Off-platform intent
  /let('s)?\s*(talk|speak|chat|connect|meet|deal)\s*(off|outside|privately|direct|elsewhere)/gi,
  /take\s*(this|our\s*conversation|deal)\s*(off|outside|elsewhere)/gi,
  /my\s*(number|phone|email|handle|ig|insta|whatsapp|contact)/gi,
  /contact\s*(info|details|number|email|phone)/gi,
];

const WARNING_PATTERNS = [
  /bypass|avoid|skip.*platform/gi,
  /deal.*outside/gi,
  /without.*(reach|ivest)/gi,
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
        reason: "Sharing personal contact details is not allowed on REACH. All communication must happen within the platform to protect both parties.",
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
        reason: "This message suggests moving communication off-platform. REACH protects both parties by keeping all deal discussions here.",
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