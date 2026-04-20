import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: { startup_id: string; mode: "describe" | "generate"; prompt?: string } = { startup_id: "", mode: "describe" };
  try { body = await req.json(); } catch { /* no body */ }

  if (!body.startup_id) {
    return new Response(JSON.stringify({ error: "startup_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: startup } = await supabase
    .from("startups")
    .select("id, title, pitch_deck_url")
    .eq("id", body.startup_id)
    .single();

  if (!startup?.pitch_deck_url) {
    return new Response(JSON.stringify({ error: "Startup not found or no pitch deck" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Download pitch deck
  const pitchDeckUrl = startup.pitch_deck_url as string;
  const ext = pitchDeckUrl.split(".").pop()?.toLowerCase() || "pdf";
  let mediaType = "application/pdf";
  if (ext === "pptx") {
    mediaType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }

  if (body.mode === "describe") {
    // Step 1: Download and describe first slide
    const fileResp = await fetch(pitchDeckUrl);
    if (!fileResp.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch pitch deck" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await fileResp.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const CHUNK = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const base64 = btoa(binary);

    const descResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are analyzing the first/title slide of a startup pitch deck. 
Describe the visual design of ONLY the first slide for image generation: 
background colors, headline text, logo/icon, layout, color palette.
Return a detailed image generation prompt (150-200 words) starting with "A professional startup pitch deck title slide:"`,
          },
          {
            role: "user",
            content: [
              {
                type: "file",
                file: { filename: `deck.${ext}`, file_data: `data:${mediaType};base64,${base64}` },
              },
              { type: "text", text: "Describe the visual design of the first/title slide for image generation." },
            ],
          },
        ],
      }),
    });

    if (!descResponse.ok) {
      const t = await descResponse.text();
      return new Response(JSON.stringify({ error: "AI description failed", details: t }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const descResult = await descResponse.json();
    const prompt = descResult.choices?.[0]?.message?.content;
    return new Response(JSON.stringify({ prompt }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (body.mode === "generate" && body.prompt) {
    // Step 2: Generate image from description
    const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: body.prompt + " Ultra high resolution, 16:9 aspect ratio, professional slide design.",
          },
        ],
      }),
    });

    if (!imgResponse.ok) {
      const t = await imgResponse.text();
      return new Response(JSON.stringify({ error: "Image generation failed", details: t }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imgResult = await imgResponse.json();
    console.log("Image model response structure:", JSON.stringify(imgResult).slice(0, 1000));
    const parts = imgResult.choices?.[0]?.message?.content;
    console.log("Parts type:", typeof parts, "is array:", Array.isArray(parts));
    if (Array.isArray(parts)) {
      console.log("Parts count:", parts.length, "first part keys:", JSON.stringify(Object.keys(parts[0] || {})));
    }

    let imageBase64: string | null = null;
    if (Array.isArray(parts)) {
      for (const part of parts) {
        if (part.type === "image_url" && part.image_url?.url?.startsWith("data:image")) {
          imageBase64 = part.image_url.url.split(",")[1];
        }
        // Also try inlineData format (Gemini native)
        if (part.inlineData?.data) {
          imageBase64 = part.inlineData.data;
        }
      }
    } else if (typeof parts === "string" && parts.includes("data:image")) {
      const match = parts.match(/data:image\/\w+;base64,([A-Za-z0-9+/=]+)/);
      if (match) imageBase64 = match[1];
    }

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image returned from AI", raw: JSON.stringify(parts).slice(0, 500) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to storage
    const coverPath = `startup-covers/${crypto.randomUUID()}.png`;
    const coverBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
    const coverBlob = new Blob([coverBytes], { type: "image/png" });

    const { error: uploadError } = await supabase.storage
      .from("news-covers")
      .upload(coverPath, coverBlob, { contentType: "image/png", upsert: false });

    if (uploadError) {
      return new Response(JSON.stringify({ error: "Upload failed", details: uploadError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage.from("news-covers").getPublicUrl(coverPath);
    const coverUrl = urlData.publicUrl;

    await supabase.from("startups").update({ cover_image_url: coverUrl }).eq("id", body.startup_id);

    return new Response(
      JSON.stringify({ cover_image_url: coverUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ error: "Invalid mode" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
