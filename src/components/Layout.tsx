import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, ClipboardList, DollarSign, Calculator, BarChart3, Timer, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/', label: 'Calendar', icon: Calendar },
  { path: '/orders', label: 'Orders', icon: ClipboardList },
  { path: '/production', label: 'Production', icon: Timer },
  { path: '/payments', label: 'Payments', icon: DollarSign },
  { path: '/calculator', label: 'Calculator', icon: Calculator },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b-0.5">
        <Logo />
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="md:hidden bg-card border-b-0.5 px-4 pb-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-card border-r-0.5 p-4 shrink-0">
        <div className="mb-8">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}

function Logo() {
  return (
    <h1 className="text-2xl font-display">
      Cake<span className="italic text-dusty-rose">Cal</span>
    </h1>
  );
}
