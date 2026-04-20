import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { formatKzt } from '@/lib/subsidies/calculator';
import { useIsMobile } from '@/hooks/use-mobile';
import type { InvestmentPassport, InvestmentItem } from '@/types/subsidy';

function usePassportsBySubsidy(subsidyId: string | undefined) {
  return useQuery({
    queryKey: ['investment-passports', 'by-subsidy', subsidyId],
    queryFn: async () => {
      if (!subsidyId) return [];
      const { data, error } = await supabase
        .from('subsidy_investment_passports' as any)
        .select('*')
        .eq('subsidy_id', subsidyId)
        .order('passport_number');
      if (error) throw error;
      return (data ?? []) as unknown as InvestmentPassport[];
    },
    enabled: !!subsidyId,
    staleTime: 10 * 60 * 1000,
  });
}

function useItemsByPassport(passportId: string | undefined) {
  return useQuery({
    queryKey: ['investment-items', passportId],
    queryFn: async () => {
      if (!passportId) return [];
      const { data, error } = await supabase
        .from('subsidy_investment_items' as any)
        .select('*')
        .eq('passport_id', passportId)
        .order('order_index');
      if (error) throw error;
      return (data ?? []) as unknown as InvestmentItem[];
    },
    enabled: !!passportId,
    staleTime: 10 * 60 * 1000,
  });
}

/* ─── Mobile card for a single investment item ─── */
function ItemCard({ item }: { item: InvestmentItem }) {
  return (
    <div className="py-3 border-b border-[#2B180A]/5 last:border-0">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[13px] font-medium text-[#2B180A] leading-snug flex-1">
          {item.name_ru}
        </p>
        {item.reimbursement_rate_pct != null && (
          <span className="text-xs font-semibold text-[#E8730C] whitespace-nowrap shrink-0">
            {item.reimbursement_rate_pct}%
          </span>
        )}
      </div>
      {item.note_ru && (
        <p className="text-[11px] text-[#2B180A]/45 italic mb-1.5">{item.note_ru}</p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#2B180A]/55">
        {item.position_code && (
          <span className="font-mono">{item.position_code}</span>
        )}
        {item.unit && <span>{item.unit}</span>}
        {item.max_cost_kzt != null && (
          <span className="font-medium text-[#2B180A]/70">
            макс. {formatKzt(item.max_cost_kzt)}
          </span>
        )}
      </div>
    </div>
  );
}

function PassportItemsTable({ passportId }: { passportId: string }) {
  const { data: items = [], isLoading } = useItemsByPassport(passportId);
  const [search, setSearch] = useState('');
  const isMobile = useIsMobile();

  const filtered = search.trim()
    ? items.filter((i) =>
        i.name_ru.toLowerCase().includes(search.toLowerCase()) ||
        (i.position_code?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : items;

  if (isLoading) {
    return <div className="py-4 text-center text-[#2B180A]/40 text-sm">Загрузка…</div>;
  }

  return (
    <div>
      {items.length > 6 && (
        <div className="mb-3 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#2B180A]/40" />
          <Input
            placeholder="Поиск по наименованию или коду…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm rounded-xl"
          />
        </div>
      )}

      {/* Mobile: card list */}
      {isMobile ? (
        <div>
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-[#2B180A]/40 text-sm">Нет позиций</div>
          ) : (
            filtered.map((item) => <ItemCard key={item.id} item={item} />)
          )}
        </div>
      ) : (
        /* Desktop: table */
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[#2B180A]/50 border-b border-[#2B180A]/10">
                <th className="py-2 px-2 whitespace-nowrap">Код</th>
                <th className="py-2 px-2">Наименование</th>
                <th className="py-2 px-2 whitespace-nowrap">Ед. изм.</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">% возм.</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">Макс. стоимость</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#2B180A]/40 text-sm">
                    Нет позиций
                  </td>
                </tr>
              )}
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-[#2B180A]/5 last:border-0 hover:bg-[#fdf6ee]/60">
                  <td className="py-1.5 px-2 font-mono text-xs text-[#2B180A]/50 whitespace-nowrap">
                    {item.position_code || '—'}
                  </td>
                  <td className="py-1.5 px-2 text-[#2B180A]">
                    {item.name_ru}
                    {item.note_ru && (
                      <span className="text-[11px] text-[#2B180A]/45 italic block mt-0.5">{item.note_ru}</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-[#2B180A]/60 whitespace-nowrap">{item.unit}</td>
                  <td className="py-1.5 px-2 text-right text-[#E8730C] font-semibold whitespace-nowrap">
                    {item.reimbursement_rate_pct != null ? `${item.reimbursement_rate_pct}%` : '—'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-medium text-[#2B180A] whitespace-nowrap">
                    {item.max_cost_kzt != null ? formatKzt(item.max_cost_kzt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface Props {
  subsidyId: string;
}

export default function InvestmentPassportsSection({ subsidyId }: Props) {
  const { data: passports = [], isLoading } = usePassportsBySubsidy(subsidyId);

  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl p-4 md:p-6 border border-[#2B180A]/10 mb-4 md:mb-6">
        <Skeleton className="h-7 w-64 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }
  if (passports.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl p-4 md:p-6 border border-[#2B180A]/10 mb-4 md:mb-6">
      <h2 className="font-serif text-lg md:text-2xl font-bold text-[#2B180A] mb-2 md:mb-4">
        Паспорта инвестиционных проектов
      </h2>
      <p className="text-xs md:text-sm text-[#2B180A]/60 mb-3 md:mb-4">
        {passports.length} паспорт{passports.length > 4 ? 'ов' : passports.length > 1 ? 'а' : ''} — раскройте для просмотра позиций
      </p>

      <Accordion type="single" collapsible className="space-y-2">
        {passports.map((p) => (
          <AccordionItem
            key={p.id}
            value={p.id}
            className="border border-[#2B180A]/8 rounded-xl px-3 md:px-4 data-[state=open]:bg-[#fdf6ee]/40"
          >
            <AccordionTrigger className="hover:no-underline gap-2 md:gap-3 py-2.5 md:py-3">
              <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-left">
                <Badge variant="secondary" className="font-mono text-[10px] md:text-xs shrink-0">
                  №{p.passport_number}
                </Badge>
                {p.default_rate_pct != null && (
                  <Badge variant="outline" className="text-[10px] md:text-xs shrink-0">
                    {p.default_rate_pct}%
                  </Badge>
                )}
                <span className="font-medium text-xs md:text-sm text-[#2B180A] leading-snug basis-full md:basis-auto mt-1 md:mt-0">
                  {p.name_ru}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <PassportItemsTable passportId={p.id} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
