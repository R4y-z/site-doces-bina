import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { LayoutDashboard, ClipboardList, Cake, Tags, Settings, LogOut, Menu, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";

const NAV_ITEMS = [
  { to: "/admin", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/admin/pedidos", label: "Pedidos", icon: ClipboardList, end: false },
  { to: "/admin/produtos", label: "Produtos", icon: Cake, end: false },
  { to: "/admin/categorias", label: "Categorias", icon: Tags, end: false },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings, end: false },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    api
      .get<{ admin: { username: string } }>("/auth/me")
      .then((res) => setUsername(res.admin.username))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/admin/login", { replace: true });
        }
      })
      .finally(() => setChecking(false));
  }, [navigate]);

  async function handleLogout() {
    await api.post("/auth/logout");
    navigate("/admin/login", { replace: true });
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50">
        <span className="animate-pulse text-2xl">🍰</span>
      </div>
    );
  }

  if (!username) return null;

  return (
    <div className="min-h-screen bg-cream-50 lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-black/5 bg-white p-5 lg:flex">
        <SidebarContent username={username} onLogout={handleLogout} />
      </aside>

      <div className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-3 lg:hidden">
        <span className="font-display font-semibold text-ink-900">🍰 Painel</span>
        <button onClick={() => setMobileNavOpen(true)} aria-label="Abrir menu">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setMobileNavOpen(false)} />
          <div className="relative z-10 flex w-64 flex-col bg-white p-5">
            <button onClick={() => setMobileNavOpen(false)} className="mb-4 self-end" aria-label="Fechar menu">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent username={username} onLogout={handleLogout} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}

function SidebarContent({
  username,
  onLogout,
  onNavigate,
}: {
  username: string;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="mb-6 hidden items-center gap-2 lg:flex">
        <span className="text-2xl">🍰</span>
        <span className="font-display font-semibold text-ink-900">Painel</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-brand-50"
              )
            }
          >
            <Icon className="h-4.5 w-4.5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 border-t border-black/5 pt-4">
        <p className="mb-2 truncate text-xs text-ink-500">Logado como {username}</p>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4.5 w-4.5" />
          Sair
        </button>
      </div>
    </>
  );
}
