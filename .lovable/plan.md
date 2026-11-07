# Add Line Performance calculator

## User-facing changes
- Add a separate **Line Performance** page and navigation link without changing the existing Calculator or Learn page behavior.
- Provide short-line, nominal-π, nominal-T, and exact long-line models; accept the requested line and receiving-load inputs, including units and power-factor direction.
- Preload the uploaded class example (100 km, 50 Hz, 100 kV, 20 MW, 0.9 lagging, R = 0.0153 Ω/km, L = 1.21 mH/km, C interpreted as 0.00958 μF/km = 9.58 nF/km), with editable fields and an option to import available inductance/capacitance results.
- Show ABCD constants, complex line quantities, sending-end values, power/efficiency/regulation, no-load charging/Ferranti rise, side-by-side model comparison, phasor sketch, copy results, substitutions, and brief model theory.

## Technical approach
- Keep all new complex arithmetic in a pure client-side module under `src/lib/transline/`; implement explicit complex helpers and the four requested ABCD models there.
- Add a new TanStack leaf route with its own head metadata and focused UI; modify only the shared header to add its link. Use existing design tokens and controls.
- Add focused calculation tests for the exact short-line ABCD invariant, sample inputs, and model comparisons, plus a route matching check. Record the new calculation-module structure in `AGENTS.md`.
- Update `roadmap.md` and verify tests, typecheck/build logs, and the new page's interactive flow in the preview.
