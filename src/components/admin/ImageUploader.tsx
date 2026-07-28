import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
}

export default function ImageUploader({ value, onChange, folder = "products", label = "Imagem" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<{ url: string }>(`/admin/upload?folder=${folder}`, formData);
      onChange(res.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-cream-100">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-ink-500" />
          ) : value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5 text-ink-500" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-black/5"
          >
            {value ? "Trocar imagem" : "Enviar imagem"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-red-500"
            >
              <X className="h-3 w-3" /> Remover
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
