import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Config ────────────────────────────────────────────────────────────────────
const MOBIZON_API_KEY = Deno.env.get("MOBIZON_API_KEY")!;
const MOBIZON_API_URL = "https://api.mobizon.kz/service";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const OTP_TTL_SECONDS = 300; // 5 минут
const MAX_ATTEMPTS = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── SMS Transport (Mobizon.kz) ────────────────────────────────────────────────
// To switch provider: replace only this function.
async function sendSms(phone: string, code: string): Promise<void> {
  // Mobizon expects digits only, no +
  const recipient = phone.replace(/\D/g, "");
  const text = `Код подтверждения TURAN: ${code}`;

  const params = new URLSearchParams({
    apiKey: MOBIZON_API_KEY,
    recipient,
    text,
    output: "json",
    api: "v1",
  });

  const res = await fetch(
    `${MOBIZON_API_URL}/Message/SendSmsMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    throw new Error(`Mobizon HTTP error: ${res.status}`);
  }

  const data = await res.json();
  // code: 0 = success, anything else = error
  if (data.code !== 0) {
    throw new Error(data.message || `Mobizon error code: ${data.code}`);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
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
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ── send ────────────────────────────────────────────────────────────────
    if (action === "send") {
      if (!phone) return json({ error: "phone required" }, 400);

      const otpCode = generateCode();
      const expiresAt = new Date(
        Date.now() + OTP_TTL_SECONDS * 1000
      ).toISOString();

      // Upsert: один активный код на номер
      const { error: dbErr } = await supabaseAdmin
        .from("otp_codes")
        .upsert(
          { phone, code: otpCode, expires_at: expiresAt, attempts: 0 },
          { onConflict: "phone" }
        );

      if (dbErr) return json({ error: "Ошибка сохранения кода" }, 500);

      await sendSms(phone, otpCode);

      // verificationId = phone (провайдер не выдаёт внешний ID)
      return json({ verificationId: phone });
    }

    // ── check ────────────────────────────────────────────────────────────────
    if (action === "check") {
      if (!verificationId || !code)
        return json({ error: "verificationId and code required" }, 400);

      const targetPhone = verificationId; // verificationId === phone

      const { data: row, error: dbErr } = await supabaseAdmin
        .from("otp_codes")
        .select("*")
        .eq("phone", targetPhone)
        .single();

      if (dbErr || !row)
        return json({ verified: false, error: "Код не найден — запросите новый" });

      // Истёк?
      if (new Date(row.expires_at) < new Date()) {
        await supabaseAdmin
          .from("otp_codes")
          .delete()
          .eq("phone", targetPhone);
        return json({ verified: false, error: "Код истёк — запросите новый" });
      }

      // Превышены попытки?
      if (row.attempts >= MAX_ATTEMPTS) {
        await supabaseAdmin
          .from("otp_codes")
          .delete()
          .eq("phone", targetPhone);
        return json({ verified: false, error: "Превышено число попыток — запросите новый код" });
      }

      // Неверный код?
      if (row.code !== code) {
        await supabaseAdmin
          .from("otp_codes")
          .update({ attempts: row.attempts + 1 })
          .eq("phone", targetPhone);
        return json({ verified: false, error: "Неверный код — попробуйте ещё раз" });
      }

      // Успех — удаляем использованный код
      await supabaseAdmin
        .from("otp_codes")
        .delete()
        .eq("phone", targetPhone);
      return json({ verified: true });
    }

    // ── register ─────────────────────────────────────────────────────────────
    // OTP уже проверен на шаге Contact. Создаём Supabase пользователя с PIN.
    if (action === "register") {
      if (!phone || !pin) return json({ error: "phone and pin required" }, 400);

      const email = phoneToFakeEmail(phone);
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
        return json({
          error: alreadyExists
            ? "Этот номер уже зарегистрирован"
            : error.message,
        });
      }
      return json({ success: true });
    }

    // ── reset_pin ─────────────────────────────────────────────────────────────
    // OTP уже проверен на шаге ForgotPin. Обновляем пароль через admin.
    if (action === "reset_pin") {
      if (!phone || !newPin)
        return json({ error: "phone and newPin required" });

      const email = phoneToFakeEmail(phone);
      const {
        data: { users },
        error: listErr,
      } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listErr) return json({ error: listErr.message }, 500);

      const user = users.find((u) => u.email === email);
      if (!user)
        return json({ error: "Пользователь с этим номером не найден" });

      const { error: updateErr } =
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: newPin,
        });
      if (updateErr) return json({ error: updateErr.message });
      return json({ success: true });
    }

    return json({ error: "Unknown action" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return json({ error: msg }, 500);
  }
});
