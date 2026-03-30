/**
 * AgOS Edge Function: get_feed_budget
 * D-S3-2: Computes feed budget from active rations + inventory.
 * Dok 6 F18: per-head-per-day + total for period.
 * P-AI-2: organization_id required.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();

    if (!body.organization_id || !body.farm_id)
      return jsonResponse({ error: "Missing organization_id or farm_id" }, 400);

    const periodDays = body.period_days || 30;

    // 1. Load active rations via RPC-24
    const { data: rations, error: rErr } = await supabase.rpc("rpc_get_current_ration", {
      p_organization_id: body.organization_id, p_farm_id: body.farm_id,
    });
    if (rErr) return jsonResponse({ error: rErr.message }, 500);

    // 2. Load inventory
    const { data: inventory, error: iErr } = await supabase
      .from("farm_feed_inventory")
      .select("feed_item_id, quantity_kg, feed_items!inner (id, code, name_ru)")
      .eq("farm_id", body.farm_id).eq("organization_id", body.organization_id);
    if (iErr) return jsonResponse({ error: iErr.message }, 500);

    const invMap = new Map<string, { kg: number; code: string; name: string }>();
    for (const inv of (inventory || [])) {
      const fi = (inv as any).feed_items;
      invMap.set(inv.feed_item_id, { kg: inv.quantity_kg, code: fi.code, name: fi.name_ru });
    }

    // 3. Aggregate daily consumption from all active rations
    const consumption = new Map<string, { daily_kg: number; cost_day: number; code: string; name: string }>();
    let totalHead = 0, totalCostDay = 0;

    for (const r of (rations || [])) {
      const hc = r.head_count || 1;
      totalHead += hc;
      const ver = r.current_version;
      if (!ver?.items) continue;
      for (const item of ver.items) {
        const dailyTotal = (item.quantity_kg_per_day || 0) * hc;
        const costTotal = (item.cost_per_day || 0) * hc;
        const inv = invMap.get(item.feed_item_id);
        const existing = consumption.get(item.feed_item_id);
        if (existing) {
          existing.daily_kg += dailyTotal;
          existing.cost_day += costTotal;
        } else {
          consumption.set(item.feed_item_id, {
            daily_kg: dailyTotal, cost_day: costTotal,
            code: item.feed_item_code || inv?.code || "?",
            name: inv?.name || item.feed_item_code || "?",
          });
        }
        totalCostDay += costTotal;
      }
    }

    // 4. Budget rows
    const feeds: any[] = [];
    let deficitCount = 0;
    for (const [fid, c] of consumption) {
      const avail = invMap.get(fid)?.kg || 0;
      const need = c.daily_kg * periodDays;
      const deficit = Math.max(0, need - avail);
      const daysLeft = c.daily_kg > 0 ? Math.floor(avail / c.daily_kg) : 9999;
      if (deficit > 0) deficitCount++;
      feeds.push({
        feed_item_id: fid, feed_code: c.code, feed_name: c.name,
        daily_kg_total: r2(c.daily_kg), required_kg_period: r2(need),
        available_kg: r2(avail), deficit_kg: r2(deficit),
        cost_estimate: r2(c.cost_day * periodDays), days_left: daysLeft,
      });
    }
    feeds.sort((a, b) => (b.deficit_kg > 0 ? 1 : 0) - (a.deficit_kg > 0 ? 1 : 0) || a.days_left - b.days_left);

    // 5. Per-head breakdown
    const perHead = [...consumption.values()].map(c => ({
      feed_code: c.code, feed_name: c.name,
      cost_per_head_per_day: totalHead > 0 ? r2(c.cost_day / totalHead) : 0,
    }));

    return jsonResponse({
      per_head_per_day: {
        total_cost: totalHead > 0 ? r2(totalCostDay / totalHead) : 0,
        head_count: totalHead, feeds: perHead,
      },
      total_budget: {
        period_days: periodDays, total_cost: r2(totalCostDay * periodDays),
        deficit_count: deficitCount,
        days_until_shortage: feeds.length > 0 ? Math.min(...feeds.map(f => f.days_left)) : 9999,
        feeds,
      },
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

function r2(n: number) { return Math.round(n * 100) / 100; }
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
