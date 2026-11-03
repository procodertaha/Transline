# TransLine Calculator — Roadmap

- [x] Fix remaining TypeScript strict-index errors in calc.ts / ConductorDiagram.tsx
- [x] Calculation engine + tests (self-check example passes)
- [x] Wizard, Learn pages written (Stability page removed on user request)
- [x] User request: conductor type auto-selects its GMR; add option to use r' = e^(-1/4)·r when GMR is not from the table (ACSR)
- [x] User request: bundled conductor gets the same GMR choice — table Ds per sub-conductor or r' = 0.7788·r
- [x] User request: buttons show the arrow cursor, not the hand cursor
- [x] User request: remove book references from all pages; use plain wording
- [x] Full verification: typecheck clean, 13 tests pass, build OK, browser screenshots of all pages
- [x] User request: 3-subconductor bundles get an arrangement choice — straight line (d, 2d, …) or equilateral triangle; reference problem reproduces Ds = 0.0824 m
- [x] User request: double-circuit conductors are freely placeable (draggable diagram dots, custom coords); reference two-row problem reproduces Deq = 10.33 m, L = 8.43e-4 mH/km
- [x] Verification after both fixes: 21 tests pass, typecheck clean, drag + bundle option confirmed in the live preview
