import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useUploadCoverImage() {
  return useMutation<string, Error, File>({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('news-covers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('news-covers')
        .getPublicUrl(filePath);

      return data.publicUrl;
    },
  });
}
