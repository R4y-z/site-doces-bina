import clsx from "clsx";

export default function StatusBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur",
        isOpen ? "bg-emerald-500/90 text-white" : "bg-ink-900/80 text-white"
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", isOpen ? "bg-white" : "bg-white/60")} />
      {isOpen ? "Aberto agora" : "Fechado no momento"}
    </span>
  );
}
