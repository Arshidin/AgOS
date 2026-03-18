import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { MembershipBadge } from './MembershipBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { User, LogOut, Globe } from 'lucide-react';

export function CabinetHeader() {
  const { t, i18n } = useTranslation();
  const { organization, membershipStatus, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const switchLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('turan_language', lng);
  };

  return (
    <header className="flex items-center gap-3 px-4 md:px-6 h-14 border-b bg-background/95 backdrop-blur-sm shrink-0">
      <SidebarTrigger className="md:hidden" />

      <div className="flex-1 flex items-center gap-3 min-w-0">
        <h2 className="text-sm font-medium text-foreground truncate">
          {organization?.name || 'TURAN'}
        </h2>
        {membershipStatus && (
          <MembershipBadge status={membershipStatus} />
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Globe className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => switchLanguage('kz')}>
            Қазақша {i18n.language === 'kz' && '✓'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => switchLanguage('ru')}>
            Русский {i18n.language === 'ru' && '✓'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => switchLanguage('en')}>
            English {i18n.language === 'en' && '✓'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <User className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            {user?.phone || user?.email || ''}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/cabinet/profile')}>
            {t('cabinet.header.myProfile')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            {t('cabinet.header.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
