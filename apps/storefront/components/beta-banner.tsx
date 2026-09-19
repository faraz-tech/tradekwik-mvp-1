/** Site-wide notice while TradeKwik is in beta. Remove or gate with an env flag at launch. */
export function BetaBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-900">
      <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center text-xs">
        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
          Beta
        </span>
        <span>Under development — features may change.</span>
        <span aria-hidden className="text-amber-300">·</span>
        <span>
          <span aria-hidden className="mr-1">🇮🇳</span>
          Serving India only for now (Indian mobile numbers).
        </span>
        <a href="mailto:tradekwik.team@gmail.com?subject=TradeKwik%20feedback" className="font-semibold underline">
          Send feedback
        </a>
      </p>
    </div>
  );
}
