import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Home, Leaf, Stethoscope, User, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { key: 'home', icon: Home, label: 'Главная', route: '/cabinet' },
  { key: 'farm', icon: Leaf, label: 'Ферма', route: '/cabinet/farm' },
  { key: 'vet', icon: Stethoscope, label: 'Вет.помощь', route: '/cabinet/vet/new' },
]

export function CabinetLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/register')
  }

  return (
    <div className="min-h-screen bg-[#fdf6ee] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-[#e8ddd0] bg-white/80 backdrop-blur-sm shrink-0">
        <h1 className="text-base font-semibold text-[#2B180A] font-serif">
          TURAN
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#6b5744]">
            {user?.phone || ''}
          </span>
          <button
            onClick={handleSignOut}
            className="p-2 text-[#6b5744] hover:text-[#2B180A] transition-colors"
            title="Выйти"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-6 pb-20">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e8ddd0] bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-around h-14 max-w-[640px] mx-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive =
              item.route === '/cabinet'
                ? location.pathname === '/cabinet'
                : location.pathname.startsWith(item.route)

            return (
              <button
                key={item.key}
                onClick={() => navigate(item.route)}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[60px] min-h-[44px] transition-colors',
                  isActive
                    ? 'text-[hsl(24,73%,54%)]'
                    : 'text-[#6b5744]/60'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </button>
            )
          })}
          <button
            onClick={() => navigate('/cabinet/farm')}
            className={cn(
              'flex flex-col items-center justify-center min-w-[60px] min-h-[44px] transition-colors',
              location.pathname === '/cabinet/farm'
                ? 'text-[hsl(24,73%,54%)]'
                : 'text-[#6b5744]/60'
            )}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 font-medium">Профиль</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
