import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SubmitStartupFormData, AiParsedData } from '@/types/startup';

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60) +
    '-' +
    Date.now().toString(36)
  );
}

/** Upload pitch deck to Supabase Storage. Returns { publicUrl, storagePath }. */
export async function uploadPitchDeck(file: File): Promise<{ publicUrl: string; storagePath: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('startup-decks')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('startup-decks').getPublicUrl(path);
  return { publicUrl: data.publicUrl, storagePath: path };
}

/** Call the Edge Function to parse the pitch deck with AI. */
export async function parsePitchDeck(storagePath: string): Promise<AiParsedData> {
  const { data, error } = await supabase.functions.invoke('parse-pitch-deck', {
    body: { file_path: storagePath },
  });

  if (error) throw new Error(`AI parsing failed: ${error.message}`);
  return (data as AiParsedData) ?? {};
}

interface SubmitPayload {
  formData: SubmitStartupFormData;
  pitchDeckUrl: string;
  coverImageUrl?: string | null;
}

async function submitStartup({ formData, pitchDeckUrl, coverImageUrl }: SubmitPayload) {
  const slug = generateSlug(formData.title);
  const startupId = crypto.randomUUID();

  const { error: insertError } = await supabase
    .from('startups')
    .insert({
      id: startupId,
      slug,
      title: formData.title,
      tagline: formData.tagline || null,
      category: formData.category || 'agritech',
      stage: formData.stage || 'idea',
      description_problem: formData.description_problem || null,
      description_solution: formData.description_solution || null,
      target_market: formData.target_market || null,
      business_model: formData.business_model || null,
      funding_ask: formData.funding_ask ? parseInt(formData.funding_ask, 10) : null,
      funding_instrument: formData.funding_instrument || null,
      funding_status: 'open',
      year_founded: formData.year_founded ? parseInt(formData.year_founded, 10) : null,
      team_size: formData.team_size ? parseInt(formData.team_size, 10) : null,
      location_region: formData.location_region || null,
      website_url: formData.website_url || null,
      contact_email: formData.contact_email || null,
      contact_name: formData.contact_name || null,
      contact_phone: formData.contact_phone || null,
      pitch_deck_url: pitchDeckUrl,
      cover_image_url: coverImageUrl ?? null,
      is_published: false,
      submission_status: 'pending_review',
    } as any);

  if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

  // Insert team members
  if (formData.team_members.length > 0) {
    const members = formData.team_members
      .filter((m) => m.name.trim())
      .map((m, i) => ({
        startup_id: startupId,
        name: m.name.trim(),
        role: m.role.trim() || null,
        order_index: i,
      }));

    if (members.length > 0) {
      const { error } = await supabase.from('startup_team_members').insert(members);
      if (error) console.error('Team insert error:', error);
    }
  }

  // Insert use of funds
  if (formData.use_of_funds.length > 0) {
    const funds = formData.use_of_funds
      .filter((f) => f.item.trim())
      .map((f) => ({
        startup_id: startupId,
        item: f.item.trim(),
        percentage: f.percentage || 0,
      }));

    if (funds.length > 0) {
      const { error } = await supabase.from('startup_use_of_funds').insert(funds);
      if (error) console.error('Funds insert error:', error);
    }
  }

  return startupId;
}

export function useSubmitStartup() {
  return useMutation({
    mutationFn: submitStartup,
  });
}
