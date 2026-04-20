import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface UpdatePriceParams {
  id: string;
  newPrice: number;
  newPremiumMin?: number;
  newPremiumMax?: number;
  note?: string;
}

export function useUpdatePriceGrid() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: UpdatePriceParams) => {
      const { error } = await (supabase.rpc as any)('update_price_grid', {
        p_id: params.id,
        p_new_price: params.newPrice,
        p_new_premium_min: params.newPremiumMin ?? null,
        p_new_premium_max: params.newPremiumMax ?? null,
        p_note: params.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-price-grid'] });
      queryClient.invalidateQueries({ queryKey: ['price-grid-log'] });
      toast({ title: t('admin.tspPrices.priceUpdated') });
    },
    onError: () => {
      toast({ title: t('admin.tspPrices.priceError'), variant: 'destructive' });
    },
  });
}
