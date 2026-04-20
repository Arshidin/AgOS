import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("BITRIX24_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("BITRIX24_WEBHOOK_URL not configured");
    }

    const body = await req.json();
    const { full_name, phone, email, role, region, bin_iin, company_name } = body;

    // Split full_name into parts
    const nameParts = (full_name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Build Bitrix24 fields
    const fields: Record<string, any> = {
      TITLE: `TURAN — ${company_name || full_name || "Новый лид"}`,
      NAME: firstName,
      LAST_NAME: lastName,
      COMMENTS: `Роль: ${role || "—"}\nРегион: ${region || "—"}\nБИН/ИИН: ${bin_iin || "—"}\nКомпания: ${company_name || "—"}`,
    };

    if (phone) {
      fields["PHONE"] = [{ VALUE: phone, VALUE_TYPE: "WORK" }];
    }
    if (email) {
      fields["EMAIL"] = [{ VALUE: email, VALUE_TYPE: "WORK" }];
    }

    const url = `${webhookUrl.replace(/\/+$/, "")}/crm.lead.add.json`;

    const bitrixRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    const result = await bitrixRes.json();

    console.log("Bitrix24 lead created:", JSON.stringify(result));

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Bitrix24 lead error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
