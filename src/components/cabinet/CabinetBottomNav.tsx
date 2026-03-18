import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { hasMinStatus, type MembershipStatus, type UserRole } from '@/types/membership';
import { Home, Shield, Building, Calculator, TrendingUp, Package, FileText, Bell } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const NAV_ITEMS = [
  { key: 'home', icon: Home, labelKey: 'cabinet.nav.home', route: '/cabinet', minStatus: 'applicant' as MembershipStatus },
  { key: 'membership', icon: Shield, labelKey: 'cabinet.nav.membership', route: '/cabinet/membership', minStatus: 'applicant' as MembershipStatus },
  { key: 'profile', icon: Building, labelKey: 'cabinet.nav.profile', route: '/cabinet/profile', minStatus: 'observer' as MembershipStatus },
  { key: 'ration', icon: Calculator, labelKey: 'cabinet.nav.ration', route: '/cabinet/ration', minStatus: 'observer' as MembershipStatus },
  { key: 'market', icon: TrendingUp, labelKey: 'cabinet.nav.market', route: '/cabinet/market', minStatus: 'observer' as MembershipStatus },
  { key: 'batches', icon: Package, labelKey: 'cabinet.nav.batches', route: '/cabinet/batches', minStatus: 'active' as MembershipStatus, forRole: 'farmer' as UserRole },
  { key: 'requests', icon: FileText, labelKey: 'cabinet.nav.requests', route: '/cabinet/requests', minStatus: 'active' as MembershipStatus, forRole: 'mpk' as UserRole },
  { key: 'notifications', icon: Bell, labelKey: 'cabinet.nav.notifications', route: '/cabinet/notifications', minStatus: 'observer' as MembershipStatus },
];

export function CabinetBottomNav() {
  const { t } = useTranslation();
  const { membershipStatus, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.route === '/cabinet'
            ? location.pathname === '/cabinet'
            : location.pathname.startsWith(item.route);
          const hasAccess = membershipStatus && hasMinStatus(membershipStatus, item.minStatus);
          const wrongRole = item.forRole && role !== item.forRole;

          // Hide items meant for a different role entirely
          if (wrongRole) return null;

          const isDisabled = !hasAccess;

          if (isDisabled) {
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <button
                    className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] opacity-40 cursor-not-allowed"
                    disabled
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] mt-0.5">{t(item.labelKey)}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {t('cabinet.nav.comingSoon')}
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <button
              key={item.key}
              onClick={() => navigate(item.route)}
              className={cn(
                'flex flex-col items-center justify-center min-w-[44px] min-h-[44px] transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
