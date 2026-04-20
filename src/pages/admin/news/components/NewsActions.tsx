import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal,
  Pencil,
  Eye,
  EyeOff,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useUpdateNewsArticle } from '@/hooks/useUpdateNewsArticle';
import { useDeleteNewsArticle } from '@/hooks/useDeleteNewsArticle';
import { toast } from 'sonner';
import type { NewsArticle } from '@/types/news';
import { adminDropdownItemClass } from '../constants';

interface NewsActionsProps {
  article: NewsArticle;
}

export default function NewsActions({ article }: NewsActionsProps) {
  const navigate = useNavigate();
  const updateMutation = useUpdateNewsArticle();
  const deleteMutation = useDeleteNewsArticle();

  const togglePublish = async () => {
    try {
      await updateMutation.mutateAsync({
        id: article.id,
        is_published: !article.is_published,
      });
      toast.success(
        article.is_published ? 'Снято с публикации' : 'Опубликовано',
      );
    } catch {
      toast.error('Ошибка при обновлении');
    }
  };

  const toggleFeatured = async () => {
    try {
      await updateMutation.mutateAsync({
        id: article.id,
        is_featured: !article.is_featured,
      });
      toast.success(
        article.is_featured ? 'Убрано из избранного' : 'Отмечено как избранное',
      );
    } catch {
      toast.error('Ошибка при обновлении');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(article.id);
      toast.success('Новость удалена');
    } catch {
      toast.error('Ошибка при удалении');
    }
  };

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground"
            aria-label="Действия"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="dark w-48 bg-muted border-border"
        >
          <DropdownMenuItem
            onClick={() => navigate(`/admin/news/${article.id}/edit`)}
            className={`gap-2 ${adminDropdownItemClass}`}
          >
            <Pencil className="h-4 w-4" /> Редактировать
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={togglePublish}
            className={`gap-2 ${adminDropdownItemClass}`}
          >
            {article.is_published ? (
              <><EyeOff className="h-4 w-4" /> Снять с публикации</>
            ) : (
              <><Eye className="h-4 w-4" /> Опубликовать</>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={toggleFeatured}
            className={`gap-2 ${adminDropdownItemClass}`}
          >
            {article.is_featured ? (
              <><StarOff className="h-4 w-4" /> Убрать из избранного</>
            ) : (
              <><Star className="h-4 w-4" /> В избранное</>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-border" />

          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
              <Trash2 className="h-4 w-4" /> Удалить
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent className="dark bg-secondary border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить новость?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Действие необратимо. Новость «{article.title}» будет удалена навсегда.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-muted border-border">
            Отмена
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
