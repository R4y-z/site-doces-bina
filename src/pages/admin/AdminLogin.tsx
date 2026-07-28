import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "@/lib/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/login", { username, password });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-soft">
        <div className="mb-5 text-center">
          <span className="text-3xl">🍰</span>
          <h1 className="mt-2 font-display text-xl font-semibold text-ink-900">Painel administrativo</h1>
          <p className="mt-1 text-sm text-ink-500">Entre para gerenciar o cardápio e os pedidos.</p>
        </div>

        <div className="space-y-3">
          <input
            required
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Usuário"
            className="w-full rounded-xl border border-black/10 p-3 text-sm outline-none ring-brand-300 focus:ring-2"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full rounded-xl border border-black/10 p-3 text-sm outline-none ring-brand-300 focus:ring-2"
          />
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-full bg-brand-500 py-3 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
