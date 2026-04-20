import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DATA_SYSTEM_PROMPT = `You are analyzing a startup pitch deck for an agricultural/livestock industry investment directory in Kazakhstan.

Extract the following structured information from the document. Return ONLY a valid JSON object with these fields (use null for fields you cannot determine):

{
  "tagline": "One-sentence description of the startup",
  "category": "One of: agritech, livestock, feed_nutrition, genetics, cold_chain, processing, digital_platform, sustainability",
  "stage": "One of: idea, pre_seed, seed, series_a, growth",
  "description_problem": "The problem the startup solves (2-4 sentences)",
  "description_solution": "The proposed solution (2-4 sentences)",
  "target_market": "Target market description (1-3 sentences)",
  "business_model": "How the startup makes money (1-3 sentences)",
  "funding_ask": 0,
  "funding_instrument": "Type of investment instrument (e.g., equity, SAFE, convertible note)",
  "year_founded": 2024,
  "team_size": 0,
  "location_region": "Region name in Russian if in Kazakhstan (e.g., 'Алматинская область'), or null",
  "team_members": [
    {"name": "Full Name", "role": "Position/Role"}
  ],
  "use_of_funds": [
    {"item": "Category name", "percentage": 0}
  ]
}

Important rules:
- funding_ask should be a number in KZT (тенге). If the amount is in USD, multiply by 500. If no currency specified, assume KZT.
- category MUST be one of the 8 exact values listed above
- stage MUST be one of the 5 exact values listed above
- location_region should match Kazakhstan oblast names in Russian
- use_of_funds percentages should sum to approximately 100
- team_members should include key team members mentioned in the deck
- Return ONLY the JSON object, no markdown, no explanation`;

const COVER_SYSTEM_PROMPT = `You are extracting the title/cover slide from a startup pitch deck.
Your task: render ONLY the FIRST slide (title slide / cover slide) as a PNG image.
Return a JSON object with a single field "cover_image_base64" containing the base64-encoded PNG of the first slide.
The image should be high quality, at least 1200x675 pixels (16:9 ratio).
Return ONLY valid JSON: {"cover_image_base64": "<base64 string>"}
No markdown, no explanation.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_path } = await req.json();

    if (!file_path) {
      return new Response(
        JSON.stringify({ error: "file_path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download file from Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("startup-decks")
      .download(file_path);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Failed to download file", details: downloadError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // Determine media type
    const ext = file_path.split(".").pop()?.toLowerCase();
    let mediaType = "application/pdf";
    if (ext === "pptx") mediaType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileContent = [
      {
        type: "file",
        file: {
          filename: `pitch-deck.${ext || "pdf"}`,
          file_data: `data:${mediaType};base64,${base64}`,
        },
      },
    ];

    // Run data extraction and cover image extraction in parallel
    const [dataResponse, coverResponse] = await Promise.allSettled([
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: DATA_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                ...fileContent,
                {
                  type: "text",
                  text: "Please analyze this pitch deck and extract the structured information as described.",
                },
              ],
            },
          ],
        }),
      }),
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [
            { role: "system", content: COVER_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                ...fileContent,
                {
                  type: "text",
                  text: "Please render only the first/title slide of this pitch deck as a PNG image and return it as base64.",
                },
              ],
            },
          ],
        }),
      }),
    ]);

    // Handle data extraction result
    let parsedData: Record<string, unknown> = {};
    if (dataResponse.status === "fulfilled" && dataResponse.value.ok) {
      const result = await dataResponse.value.json();
      const textContent = result.choices?.[0]?.message?.content;
      if (textContent) {
        let cleanJson = textContent.trim();
        if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        try {
          parsedData = JSON.parse(cleanJson);
        } catch (e) {
          console.error("Failed to parse data JSON:", e, textContent);
        }
      }
    } else {
      if (dataResponse.status === "fulfilled") {
        const status = dataResponse.value.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errText = await dataResponse.value.text();
        console.error("Data AI error:", status, errText);
      }
    }

    // Handle cover image extraction result
    let coverImageUrl: string | null = null;
    if (coverResponse.status === "fulfilled" && coverResponse.value.ok) {
      try {
        const coverResult = await coverResponse.value.json();
        const coverContent = coverResult.choices?.[0]?.message?.content;
        if (coverContent) {
          let cleanCoverJson = coverContent.trim();
          if (cleanCoverJson.startsWith("```")) {
            cleanCoverJson = cleanCoverJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          }
          const coverParsed = JSON.parse(cleanCoverJson);
          const coverBase64 = coverParsed?.cover_image_base64;

          if (coverBase64) {
            // Upload cover image to news-covers bucket (reuse for startups covers)
            const coverPath = `startup-covers/${crypto.randomUUID()}.png`;
            const coverBytes = Uint8Array.from(atob(coverBase64), (c) => c.charCodeAt(0));
            const coverBlob = new Blob([coverBytes], { type: "image/png" });

            const { error: uploadError } = await supabase.storage
              .from("news-covers")
              .upload(coverPath, coverBlob, {
                contentType: "image/png",
                upsert: false,
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from("news-covers")
                .getPublicUrl(coverPath);
              coverImageUrl = urlData.publicUrl;
            } else {
              console.error("Cover upload error:", uploadError);
            }
          }
        }
      } catch (e) {
        console.error("Cover image processing error:", e);
      }
    } else {
      console.error("Cover response failed:", coverResponse.status === "rejected" ? coverResponse.reason : "HTTP error");
    }

    return new Response(
      JSON.stringify({ ...parsedData, cover_image_url: coverImageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-pitch-deck error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
