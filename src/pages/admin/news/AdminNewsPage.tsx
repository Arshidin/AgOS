import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/ui/AdminPageHeader';
import NewsFilters from './components/NewsFilters';
import NewsTable from './components/NewsTable';
import { useAdminNewsArticles, type AdminNewsFilters } from '@/hooks/useAdminNewsArticles';
import type { NewsType } from '@/types/news';

export default function AdminNewsPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<NewsType | null>(null);
  const [status, setStatus] = useState<'published' | 'draft' | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const filters: AdminNewsFilters = {
    type,
    status,
    search: debouncedSearch || undefined,
  };

  const { data: articles = [], isLoading } = useAdminNewsArticles(filters);

  return (
    <div className="max-w-6xl mx-auto">
        <AdminPageHeader
          title="Новости и публикации"
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/news/create-media')}
                className="gap-1.5 border-border text-foreground hover:bg-muted"
              >
                <Plus className="h-4 w-4" /> СМИ
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/admin/news/create-article')}
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Статья
              </Button>
            </>
          }
        />

        {/* Filters */}
        <div className="mb-4">
          <NewsFilters
            type={type}
            onTypeChange={setType}
            status={status}
            onStatusChange={setStatus}
            search={search}
            onSearchChange={handleSearchChange}
          />
        </div>

        {/* Table or Empty */}
        {!isLoading && articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-4 rounded-full mb-4 bg-muted">
              <Newspaper className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-1 text-muted-foreground">
              Новостей пока нет
            </p>
            <p className="text-sm mb-4 text-muted-foreground/70">
              Создайте первую новость или добавьте СМИ-публикацию
            </p>
            <Button
              onClick={() => navigate('/admin/news/create-article')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Создать статью
            </Button>
          </div>
        ) : (
          <NewsTable articles={articles} isLoading={isLoading} />
        )}
    </div>
  );
}
