import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

type EmbeddingRequest = {
  project_id?: string;
  content?: string;
};

// Initialize Supabase Admin Client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  // 1. Authorization check: Only allow calls from your backend (secret)
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { project_id, content } = (await req.json()) as EmbeddingRequest;

    if (!project_id || !content) {
      return new Response("Missing project_id or content", { status: 400 });
    }

    // 2. Fetch Embedding from OpenAI
    const openAiResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: content,
        model: "text-embedding-3-small",
      }),
    });

    if (!openAiResponse.ok) {
      throw new Error("Failed to fetch embedding from OpenAI");
    }

    const { data } = await openAiResponse.json();
    const embedding = data[0].embedding;

    // 3. Update Project with embedding using Admin client
    const { error } = await supabase
      .from("projects")
      .update({ embedding: embedding })
      .eq("id", project_id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Embedding Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500 });
  }
});