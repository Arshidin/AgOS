import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import NewsActions from './NewsActions';
import type { NewsArticle } from '@/types/news';
import { ImageIcon } from 'lucide-react';

interface NewsTableProps {
  articles: NewsArticle[];
  isLoading: boolean;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const months = [
    'янв', 'фев', 'мар', 'апр', 'май', 'июн',
    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground">
      {type === 'association' ? 'Ассоциация' : 'СМИ'}
    </span>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
        published ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'
      }`}
    >
      {published ? 'Опубликовано' : 'Черновик'}
    </span>
  );
}

export default function NewsTable({ articles, isLoading }: NewsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-border bg-admin-surface">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border">
            <TableHead className="w-[60px] px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground" />
            <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Заголовок</TableHead>
            <TableHead className="w-[120px] px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Тип</TableHead>
            <TableHead className="w-[100px] px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Статус</TableHead>
            <TableHead className="w-[120px] px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Дата</TableHead>
            <TableHead className="w-[80px] px-4 py-3" />
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border">
          {articles.map((article) => (
            <TableRow
              key={article.id}
              className="admin-table-row-hover transition-colors"
            >
              {/* Thumbnail */}
              <TableCell className="px-4 py-3.5">
                {article.cover_image_url ? (
                  <img
                    src={article.cover_image_url}
                    alt=""
                    className="w-10 h-10 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md flex items-center justify-center bg-muted">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </TableCell>

              {/* Title + summary */}
              <TableCell className="px-4 py-3.5">
                <div className="text-sm font-medium truncate max-w-[400px]">
                  {article.title}
                </div>
                {article.summary && (
                  <div className="text-xs truncate max-w-[400px] text-muted-foreground">
                    {article.summary}
                  </div>
                )}
              </TableCell>

              <TableCell className="px-4 py-3.5"><TypeBadge type={article.type} /></TableCell>
              <TableCell className="px-4 py-3.5"><StatusBadge published={article.is_published} /></TableCell>
              <TableCell className="px-4 py-3.5">
                <span className="text-sm text-muted-foreground">
                  {formatDate(article.published_at)}
                </span>
              </TableCell>
              <TableCell className="px-4 py-3.5"><NewsActions article={article} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
