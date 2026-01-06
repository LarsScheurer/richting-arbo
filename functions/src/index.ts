import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OpenAI } from "https://esm.sh/openai@4.28.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Setup Clients
    const { query } = await req.json();
    
    // Supabase client setup
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // OpenAI client setup
    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY"),
    });

    // 3. Create Embedding for the question
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const embedding = embeddingResponse.data[0].embedding;

    // 4. Search in Supabase (The "MacGyver" part: direct RPC call)
    const { data: documents, error: searchError } = await supabaseClient
      .rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.5, // Pas aan indien nodig (0.0 tot 1.0)
        match_count: 5,       // Aantal stukjes tekst dat hij ophaalt
      });

    if (searchError) throw searchError;

    // 5. Build the Context String
    const contextText = documents
      ?.map((doc: any) => doc.content)
      .join("\n---\n") || "Geen relevante informatie gevonden.";

    // 6. Send to OpenAI for the answer
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Of gpt-3.5-turbo / gpt-4
      messages: [
        {
          role: "system",
          content: `Je bent een behulpzame assistent. Gebruik de volgende context om de vraag van de gebruiker te beantwoorden. Als je het antwoord niet weet op basis van de context, zeg dat dan eerlijk.
          
          Context:
          ${contextText}`
        },
        { role: "user", content: query }
      ],
      stream: true,
    });

    // 7. Stream the response back
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          controller.enqueue(new TextEncoder().encode(content));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});