import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BIRD_API_URL = "https://api.bird.com";
const BIRD_WORKSPACE_ID = Deno.env.get("BIRD_WORKSPACE_ID")!;
const BIRD_CHANNEL_ID = Deno.env.get("BIRD_CHANNEL_ID")!;
const BIRD_USE_NAVIGATOR = Deno.env.get("BIRD_USE_NAVIGATOR") === "true";
const BIRD_ACCESS_KEY = Deno.env.get("BIRD_ACCESS_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Mirror of src/lib/auth-utils.ts
function phoneToFakeEmail(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  let normalized: string;
  if (digits.length === 10) normalized = "7" + digits;
  else if (digits.length === 11 && digits.startsWith("7")) normalized = digits;
  else if (digits.length === 11 && digits.startsWith("8"))
    normalized = "7" + digits.slice(1);
  else normalized = "7" + digits.slice(-10);
  return `${normalized}@phone.turan.kz`;
}

const birdHeaders = {
  Authorization: `AccessKey ${BIRD_ACCESS_KEY}`,
  "Content-Type": "application/json",
};

async function sendOtp(phone: string): Promise<string> {
  const step = BIRD_USE_NAVIGATOR
    ? { navigatorId: BIRD_CHANNEL_ID }
    : { channelId: BIRD_CHANNEL_ID };

  const res = await fetch(
    `${BIRD_API_URL}/workspaces/${BIRD_WORKSPACE_ID}/verify`,
    {
      method: "POST",
      headers: birdHeaders,
      body: JSON.stringify({
        identifier: { phonenumber: phone },
        steps: [step],
        locale: "ru",
        codeLength: 6,
        timeout: 300,
        maxAttempts: 3,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Ошибка отправки кода");
  }
  const data = await res.json();
  return data.id as string;
}

async function checkOtp(verificationId: string, code: string): Promise<boolean> {
  const res = await fetch(
    `${BIRD_API_URL}/workspaces/${BIRD_WORKSPACE_ID}/verify/${verificationId}`,
    {
      method: "POST",
      headers: birdHeaders,
      body: JSON.stringify({ code }),
    }
  );
  return res.ok;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { action, phone, verificationId, code, pin, newPin } = body;

  try {
    // ── send ──────────────────────────────────────────────────────────────────
    if (action === "send") {
      if (!phone) return json({ error: "phone required" }, 400);
      const id = await sendOtp(phone);
      return json({ verificationId: id });
    }

    // ── check ─────────────────────────────────────────────────────────────────
    if (action === "check") {
      if (!verificationId || !code)
        return json({ error: "verificationId and code required" }, 400);
      const verified = await checkOtp(verificationId, code);
      if (!verified) return json({ verified: false }, 400);
      return json({ verified: true });
    }

    // ── register ──────────────────────────────────────────────────────────────
    // OTP already verified in Contact step. Creates Supabase user with PIN as password.
    if (action === "register") {
      if (!phone || !pin) return json({ error: "phone and pin required" }, 400);

      const email = phoneToFakeEmail(phone);
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: pin,
        email_confirm: true,
        user_metadata: { phone },
      });

      if (error) {
        const alreadyExists =
          error.message.toLowerCase().includes("already") ||
          error.message.toLowerCase().includes("duplicate") ||
          (error as unknown as { status?: number }).status === 422;
        return json(
          { error: alreadyExists ? "Этот номер уже зарегистрирован" : error.message },
          400
        );
      }
      return json({ success: true });
    }

    // ── reset_pin ─────────────────────────────────────────────────────────────
    // OTP already verified in ForgotPin step. Updates existing user's password.
    if (action === "reset_pin") {
      if (!phone || !newPin)
        return json({ error: "phone and newPin required" }, 400);

      const email = phoneToFakeEmail(phone);
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: { users }, error: listErr } =
        await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listErr) return json({ error: listErr.message }, 500);

      const user = users.find((u) => u.email === email);
      if (!user)
        return json({ error: "Пользователь с этим номером не найден" }, 404);

      const { error: updateErr } =
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: newPin,
        });
      if (updateErr) return json({ error: updateErr.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return json({ error: msg }, 500);
  }
});
