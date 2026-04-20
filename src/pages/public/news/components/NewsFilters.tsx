import { useTranslation } from "react-i18next";
import type { NewsType } from "@/types/news";

interface NewsFiltersProps {
  activeType: NewsType | undefined;
  onTypeChange: (type: NewsType | undefined) => void;
}

const NewsFilters = ({ activeType, onTypeChange }: NewsFiltersProps) => {
  const { t } = useTranslation();

  const filters: { label: string; value: NewsType | undefined }[] = [
    { label: t("news.filters.all"), value: undefined },
    { label: t("news.filters.association"), value: "association" },
    { label: t("news.filters.media"), value: "media" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const isActive = activeType === filter.value;
        return (
          <button
            key={filter.value ?? "all"}
            onClick={() => onTypeChange(filter.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-foreground text-background shadow-sm"
                : "bg-black/5 text-foreground/70 hover:bg-black/10"
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
};

export default NewsFilters;
