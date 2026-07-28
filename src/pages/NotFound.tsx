import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-50 px-6 text-center">
      <span className="text-6xl">🍰</span>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Página não encontrada</h1>
      <p className="text-ink-500">O endereço acessado não existe ou foi movido.</p>
      <Link to="/" className="mt-2 rounded-full bg-brand-500 px-6 py-2.5 font-medium text-white shadow-soft">
        Voltar ao cardápio
      </Link>
    </div>
  );
}
