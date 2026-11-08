<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules

- All transmission-line mathematics lives in `src/lib/transline/` and runs entirely client-side — no server functions, database, or auth. The shared config model is `LineConfig` (metres internally; unit selectors convert at the input edge).
- Keep line-performance complex arithmetic in the standalone `src/lib/transline/performance.ts` module so those models remain independently testable and do not alter the inductance/capacitance calculator.
- UI copy must not cite textbooks by name or chapter (e.g. "Grainger & Stevenson, Ch. 4 & 5") — describe methods in plain words instead. Per-user preference.
- Buttons and button-like controls use the default arrow cursor, not the pointing-hand cursor. Per-user preference.
