import { MapPin, Clock } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { StoreSettings } from "@/types";

export default function Header({ settings }: { settings: StoreSettings }) {
  return (
    <header className="relative">
      <div
        className="h-40 w-full bg-gradient-to-br from-brand-300 via-brand-400 to-brand-600 sm:h-56"
        style={
          settings.bannerUrl
            ? { backgroundImage: `url(${settings.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      />

      <div className="mx-auto -mt-10 max-w-3xl px-4 sm:-mt-14">
        <div className="flex items-end gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-cream-50 bg-white shadow-soft sm:h-28 sm:w-28">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.storeName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl sm:text-4xl">🍰</span>
            )}
          </div>
          <div className="mb-1 flex-1">
            <div className="mb-1">
              <StatusBadge isOpen={settings.isOpen} />
            </div>
            <h1 className="font-display text-2xl font-semibold leading-tight text-ink-900 sm:text-3xl">
              {settings.storeName}
            </h1>
          </div>
        </div>

        {settings.tagline && <p className="mt-3 text-sm text-ink-500 sm:text-base">{settings.tagline}</p>}

        <div className="mt-3 flex flex-col gap-1.5 text-sm text-ink-700 sm:flex-row sm:items-center sm:gap-4">
          {settings.address && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-brand-500" />
              {settings.address}
            </span>
          )}
          {settings.hoursText && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 shrink-0 text-brand-500" />
              {settings.hoursText}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
