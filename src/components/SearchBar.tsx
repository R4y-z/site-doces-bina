import { Search, X } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-500" />
      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar no cardápio... (ex: brigadeiro)"
        className="w-full rounded-2xl border border-black/5 bg-white py-3 pl-10 pr-9 text-sm text-ink-900 shadow-card outline-none ring-brand-300 placeholder:text-ink-500/70 focus:ring-2"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-500 hover:bg-black/5"
          aria-label="Limpar busca"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
