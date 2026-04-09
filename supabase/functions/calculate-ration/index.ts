/**
 * AgOS Edge Function: calculate_ration
 * D87: NASEM-based ration optimization (simplified greedy solver).
 *
 * Slice 8 Part B: Dual context support (ADR-FEED-02, D-S8-3)
 *   - Farm context:       farm_id required → loads from farm_feed_inventory → rpc_save_ration
 *   - Consulting context: consulting_project_id required → loads from feed_items catalog
 *                         by feed_item_ids selection → rpc_save_consulting_ration
 *
 * Backward compatible: existing farm callers unchanged (farm_id still works).
 * P-AI-1: All writes through RPC. P-AI-2: organization_id required.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RationRequest {
  organization_id: string;
  animal_category_id: string;
  avg_weight_kg: number;
  head_count: number;

  // Farm context (one of the two must be provided)
  farm_id?: string;
  herd_group_id?: string;
  breed_id?: string;
  period_type_id?: string;
  ration_id?: string;

  // Consulting context (alternative to farm_id)
  consulting_project_id?: string;
  feed_item_ids?: string[]; // explicit feed selection for consulting mode

  // Shared optional
  objective?: string;
  shelter_type?: string;
  target_daily_gain_kg?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const body: RationRequest = await req.json();

    // Validate context — exactly one must be provided
    const isFarmCtx = !!body.farm_id;
    const isConsultingCtx = !!body.consulting_project_id;

    if (!body.organization_id || !body.animal_category_id) {
      return jsonResponse({ error: "Missing required fields: organization_id, animal_category_id" }, 400);
    }
    if (!isFarmCtx && !isConsultingCtx) {
      return jsonResponse({ error: "Either farm_id or consulting_project_id is required" }, 400);
    }
    if (!body.avg_weight_kg || body.avg_weight_kg <= 0) {
      return jsonResponse({ error: "avg_weight_kg must be > 0" }, 400);
    }

    // 1. Load feeds — different source per context
    let feeds: any[] = [];

    if (isFarmCtx) {
      // Farm context: load from farm inventory
      const { data: inventory, error: invError } = await supabase
        .from("farm_feed_inventory")
        .select(`feed_item_id, quantity_kg,
          feed_items!inner (id, code, name_ru, nutrient_composition, is_validated,
            feed_prices (price_per_kg))`)
        .eq("farm_id", body.farm_id)
        .eq("organization_id", body.organization_id)
        .gt("quantity_kg", 0);

      if (invError) return jsonResponse({ error: invError.message }, 500);
      if (!inventory?.length) return jsonResponse({ error: "NO_FEEDS" }, 400);

      feeds = inventory.map((inv: any) => {
        const fi = inv.feed_items;
        return {
          id: fi.id, code: fi.code, name_ru: fi.name_ru,
          nc: fi.nutrient_composition || {}, available_kg: inv.quantity_kg,
          price: fi.feed_prices?.[0]?.price_per_kg || 0,
          is_validated: fi.is_validated,
          is_roughage: ROUGHAGE_CODES.has(fi.code),
        };
      });
    } else {
      // Consulting context: load from feed_items catalog (by selection or all active)
      let query = supabase
        .from("feed_items")
        .select(`id, code, name_ru, nutrient_composition, is_validated,
          feed_prices (price_per_kg, region_id, valid_from, valid_to, is_active)`)
        .eq("is_active", true);

      if (body.feed_item_ids?.length) {
        query = query.in("id", body.feed_item_ids);
      }

      const { data: items, error: itemsError } = await query;
      if (itemsError) return jsonResponse({ error: itemsError.message }, 500);
      if (!items?.length) return jsonResponse({ error: "NO_FEEDS" }, 400);

      feeds = items.map((fi: any) => {
        // Pick most recent active price (no region filter for consulting)
        const activePrice = fi.feed_prices
          ?.filter((p: any) => p.is_active && !p.region_id)
          ?.sort((a: any, b: any) => b.valid_from?.localeCompare(a.valid_from))[0];
        return {
          id: fi.id, code: fi.code, name_ru: fi.name_ru,
          nc: fi.nutrient_composition || {},
          available_kg: Infinity, // no inventory constraint in consulting
          price: activePrice?.price_per_kg || 0,
          is_validated: fi.is_validated,
          is_roughage: ROUGHAGE_CODES.has(fi.code),
        };
      });
    }

    // 2. Load nutrient requirements
    const { data: reqData } = await supabase
      .from("nutrient_requirements")
      .select("requirements, reference_weight_kg")
      .eq("animal_category_id", body.animal_category_id)
      .limit(1).single();

    const refWeight = reqData?.reference_weight_kg || 300;
    const weightRatio = body.avg_weight_kg / refWeight;
    const reqs = reqData?.requirements || {
      dm_kg_per_100kg_bw: 2.5, me_mj_per_day: 52, cp_g_per_day: 800,
      ndf_pct_dm_min: 25, ca_g_per_day: 20, p_g_per_day: 14,
    };

    const scaled = {
      dm_kg: (reqs.dm_kg_per_100kg_bw * body.avg_weight_kg) / 100,
      me_mj: reqs.me_mj_per_day * weightRatio,
      cp_g: reqs.cp_g_per_day * weightRatio,
      ndf_pct_min: reqs.ndf_pct_dm_min || 25,
      ca_g: (reqs.ca_g_per_day || 20) * weightRatio,
      p_g: (reqs.p_g_per_day || 14) * weightRatio,
    };

    // 3. Greedy allocation: roughage first (50% DM), then concentrates
    let remaining = scaled.dm_kg;
    let roughageAlloc = 0;
    const roughageTarget = scaled.dm_kg * 0.5;
    const rationItems: any[] = [];

    // Roughage pass
    for (const f of feeds.filter((f: any) => f.is_roughage).sort((a: any, b: any) =>
      (b.nc.me_mj_per_kg_dm || 0) / (b.price || 0.01) -
      (a.nc.me_mj_per_kg_dm || 0) / (a.price || 0.01))) {
      if (remaining <= 0 || roughageAlloc >= roughageTarget) break;
      const dm = (f.nc.dm_pct || 88) / 100;
      const availDm = isFarmCtx
        ? (f.available_kg / body.head_count) * dm
        : roughageTarget; // no constraint in consulting
      const maxDm = Math.min(availDm, roughageTarget - roughageAlloc, remaining);
      if (maxDm <= 0) continue;
      const kg = maxDm / dm;
      rationItems.push({
        feed_item_id: f.id, feed_item_code: f.code,
        quantity_kg_per_day: round2(kg), price_override_per_kg: null,
        effective_price_per_kg: f.price, cost_per_day: round2(kg * f.price),
      });
      remaining -= maxDm;
      roughageAlloc += maxDm;
    }

    // Concentrate pass
    for (const f of feeds.filter((f: any) => !f.is_roughage).sort((a: any, b: any) =>
      (b.nc.me_mj_per_kg_dm || 0) / (b.price || 0.01) -
      (a.nc.me_mj_per_kg_dm || 0) / (a.price || 0.01))) {
      if (remaining <= 0.1) break;
      const dm = (f.nc.dm_pct || 88) / 100;
      const availDm = isFarmCtx
        ? (f.available_kg / body.head_count) * dm
        : remaining; // no constraint in consulting
      const maxDm = Math.min(availDm, remaining);
      if (maxDm <= 0) continue;
      const kg = maxDm / dm;
      rationItems.push({
        feed_item_id: f.id, feed_item_code: f.code,
        quantity_kg_per_day: round2(kg), price_override_per_kg: null,
        effective_price_per_kg: f.price, cost_per_day: round2(kg * f.price),
      });
      remaining -= maxDm;
    }

    // 4. Compute nutrient totals
    let totDm = 0, totMe = 0, totCp = 0, totNdf = 0, totCa = 0, totP = 0, totCost = 0;
    for (const item of rationItems) {
      const f = feeds.find((x: any) => x.id === item.feed_item_id);
      if (!f) continue;
      const dm = item.quantity_kg_per_day * ((f.nc.dm_pct || 88) / 100);
      totDm += dm; totMe += dm * (f.nc.me_mj_per_kg_dm || 0);
      totCp += dm * (f.nc.cp_pct_dm || 0) * 10;
      totNdf += dm * ((f.nc.ndf_pct_dm || 0) / 100);
      totCa += dm * (f.nc.ca_g_per_kg_dm || 0);
      totP += dm * (f.nc.p_g_per_kg_dm || 0);
      totCost += item.cost_per_day;
    }

    const roughPct = totDm > 0 ? (roughageAlloc / totDm) * 100 : 0;
    const met = {
      dm_kg: totDm >= scaled.dm_kg * 0.9, me_mj: totMe >= scaled.me_mj * 0.9,
      cp_g: totCp >= scaled.cp_g * 0.9, ndf_pct: roughPct >= scaled.ndf_pct_min,
      ca_g: totCa >= scaled.ca_g * 0.8, p_g: totP >= scaled.p_g * 0.8,
    };

    const deficiencies: string[] = [];
    if (!met.dm_kg) deficiencies.push("СВ"); if (!met.me_mj) deficiencies.push("ОЭ");
    if (!met.cp_g) deficiencies.push("СП"); if (!met.ndf_pct) deficiencies.push("НДК");
    if (!met.ca_g) deficiencies.push("Ca"); if (!met.p_g) deficiencies.push("P");

    const unvalidated = feeds
      .filter((f: any) => !f.is_validated && rationItems.some((i: any) => i.feed_item_id === f.id))
      .map((f: any) => f.id);
    const solverStatus = deficiencies.length === 0 ? "optimal" : rationItems.length > 0 ? "feasible" : "infeasible";

    const results = {
      total_cost_per_day: round2(totCost),
      total_cost_per_month: round2(totCost * 30),
      total_dm_kg: round2(totDm),
      nutrients_met: met,
      nutrient_values: {
        dm_kg: round2(totDm), me_mj: round2(totMe), cp_g: round2(totCp),
        ndf_pct_dm: round1(roughPct), ca_g: round2(totCa), p_g: round2(totP),
      },
      nutrient_requirements: {
        dm_kg: round2(scaled.dm_kg), me_mj: round2(scaled.me_mj), cp_g: round2(scaled.cp_g),
        ndf_pct_dm_min: scaled.ndf_pct_min, ca_g: round2(scaled.ca_g), p_g: round2(scaled.p_g),
      },
      roughage_pct_dm: round1(roughPct),
      deficiencies,
      warnings: unvalidated.length > 0 ? ["Q37: корма без валидации зоотехника"] : [],
      solver_status: solverStatus,
      feed_items_unvalidated: unvalidated,
      // Consulting helpers for feeding_model.py
      calc_avg_weight_kg: body.avg_weight_kg,
      calc_head_count: body.head_count,
      objective: body.objective || "growth",
    };

    // 5. Save via appropriate RPC based on context
    if (isFarmCtx) {
      // Farm context → rpc_save_ration (existing, unchanged)
      const { data: saveResult, error: saveError } = await supabase.rpc("rpc_save_ration", {
        p_organization_id: body.organization_id,
        p_farm_id: body.farm_id,
        p_herd_group_id: body.herd_group_id || null,
        p_animal_category_id: body.animal_category_id,
        p_breed_id: body.breed_id || null,
        p_period_type_id: body.period_type_id || null,
        p_avg_weight_kg: body.avg_weight_kg,
        p_head_count: body.head_count || 1,
        p_objective: body.objective || "growth",
        p_shelter_type: body.shelter_type || "combined",
        p_target_daily_gain_kg: body.target_daily_gain_kg || null,
        p_ration_id: body.ration_id || null,
        p_items: rationItems,
        p_results: results,
        p_calculated_by: "edge_function",
      });
      if (saveError) return jsonResponse({ error: saveError.message }, 500);
      return jsonResponse({ ...saveResult, items: rationItems, results });

    } else {
      // Consulting context → rpc_save_consulting_ration (Slice 8 C-RPC-09)
      const { data: saveResult, error: saveError } = await supabase.rpc("rpc_save_consulting_ration", {
        p_organization_id: body.organization_id,
        p_consulting_project_id: body.consulting_project_id,
        p_animal_category_id: body.animal_category_id,
        p_items: rationItems,
        p_results: results,
      });
      if (saveError) return jsonResponse({ error: saveError.message }, 500);
      return jsonResponse({ ...saveResult, items: rationItems, results });
    }

  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

const ROUGHAGE_CODES = new Set([
  "HAY_MIXED_GRASS", "HAY_TIMOTHY", "STRAW_WHEAT", "HAYLAGE_GRASS",
  "PASTURE_SPRING", "PASTURE_SUMMER",
]);

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round1(n: number): number { return Math.round(n * 10) / 10; }
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
