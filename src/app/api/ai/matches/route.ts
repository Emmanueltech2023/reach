import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const investorId = searchParams.get("investorId");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!investorId) {
      return NextResponse.json({ error: "Missing investorId" }, { status: 400 });
    }

    // Get investor profile
    const { data: investor, error: invError } = await supabase
      .from("profiles")
      .select("embedding, investment_focus, min_ticket_size, max_ticket_size, country, subscription_tier")
      .eq("id", investorId)
      .single();

    if (invError || !investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    // Get all published projects
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select(`
        id, name, short_description, category, sector,
        funding_goal, equity_offered, amount_raised, tier,
        country, stage, logo_url, embedding,
        profiles!projects_founder_id_fkey(id, full_name, is_verified, trust_score)
      `)
      .eq("is_published", true);

    if (projectsError) {
      console.error("Projects fetch error:", projectsError);
      return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Check cache (valid for 6 hours)
    const { data: cachedMatches } = await supabase
      .from("match_scores")
      .select("project_id, score, reasons")
      .eq("investor_id", investorId)
      .gte("computed_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .order("score", { ascending: false })
      .limit(limit);

    if (cachedMatches && cachedMatches.length >= 3) {
      const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));
      const matchesWithData = cachedMatches
        .map((m) => ({
          ...projectMap[m.project_id],
          match_score: Math.round(m.score * 100),
          match_reasons: m.reasons || [],
        }))
        .filter((m) => m.id);

      return NextResponse.json({ matches: matchesWithData, cached: true });
    }

    // Parse investor embedding if available
    let investorEmbedding: number[] | null = null;
    if (investor.embedding) {
      try {
        investorEmbedding = typeof investor.embedding === "string"
          ? JSON.parse(investor.embedding)
          : investor.embedding;
      } catch {
        investorEmbedding = null;
      }
    }

    // Score each project using rule-based engine (no OpenAI needed)
    const scored = projects.map((project) => {
      let score = 0;
      const reasons: string[] = [];

      // 1. Vector similarity — only if both embeddings exist
      if (investorEmbedding && project.embedding) {
        try {
          const projectEmbedding = typeof project.embedding === "string"
            ? JSON.parse(project.embedding)
            : project.embedding;
          const similarity = cosineSimilarity(investorEmbedding, projectEmbedding);
          score += similarity * 40;
          if (similarity > 0.75) reasons.push("Strong content match");
          else if (similarity > 0.5) reasons.push("Good content match");
        } catch {
          // skip if parse fails
        }
      }

      // 2. Investment focus / sector match
      const investorFocus: string[] = investor.investment_focus || [];
      if (investorFocus.length > 0) {
        if (investorFocus.includes(project.sector)) {
          score += 30;
          reasons.push(`Matches your ${project.sector} focus`);
        } else {
          const focusLower = investorFocus.map((f) => f.toLowerCase());
          if (focusLower.some((f) =>
            f.includes(project.sector?.toLowerCase()) ||
            project.sector?.toLowerCase().includes(f)
          )) {
            score += 15;
            reasons.push("Related to your investment focus");
          }
        }
      } else {
        score += 20;
        reasons.push("Explore this opportunity");
      }

      // 3. Ticket size compatibility
      const minTicket = investor.min_ticket_size;
      const maxTicket = investor.max_ticket_size;
      const goal = project.funding_goal;
      if (minTicket && maxTicket && goal) {
        if (goal >= minTicket && goal <= maxTicket * 5) {
          score += 20;
          reasons.push("Within your ticket size range");
        } else if (goal >= minTicket * 0.5 && goal <= maxTicket * 10) {
          score += 8;
          reasons.push("Near your ticket size range");
        }
      } else if (!minTicket && !maxTicket) {
        score += 10;
      }

      // 4. Listing tier
      if (project.tier === "premium") {
        score += 6;
        reasons.push("Premium listing");
      } else if (project.tier === "pro") {
        score += 3;
      }

      // 5. Verified founder — profiles can be array or object
      const profileData = Array.isArray(project.profiles)
        ? project.profiles[0]
        : project.profiles;

      if (profileData?.is_verified) {
        score += 5;
        reasons.push("Verified founder");
      }

      // 6. Trust score
      const trustScore = profileData?.trust_score || 0;
      if (trustScore >= 40) {
        score += 5;
        reasons.push("High trust score");
      } else if (trustScore >= 20) {
        score += 2;
      }

      // 7. Regional match
      if (investor.country && project.country) {
        if (
          project.country.toLowerCase().includes(investor.country.toLowerCase()) ||
          investor.country.toLowerCase().includes(project.country.toLowerCase())
        ) {
          score += 5;
          reasons.push("Same region");
        }
      }

      return {
        ...project,
        profiles: profileData || null,
        match_score: Math.min(Math.round(score), 99),
        match_reasons: reasons.length > 0 ? reasons : ["Curated for you"],
      };
    });

    // Sort by score, filter zeros
    const sorted = scored
      .filter((m) => m.match_score > 0)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, limit);

    // Cache results
    if (sorted.length > 0) {
      const cacheInserts = sorted.map((m) => ({
        investor_id: investorId,
        project_id: m.id,
        score: m.match_score / 100,
        reasons: m.match_reasons,
        computed_at: new Date().toISOString(),
      }));

      supabase
        .from("match_scores")
        .upsert(cacheInserts, { onConflict: "investor_id,project_id" })
        .then(({ error }) => {
          if (error) console.error("Cache upsert error:", error);
        });
    }

    return NextResponse.json({ matches: sorted });
  } catch (err: unknown) {
    console.error("Match Engine Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}