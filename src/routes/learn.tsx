import { createFileRoute } from "@tanstack/react-router";
import { TeX } from "@/components/transline/TeX";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn — Transmission Line Theory | TransLine Calculator" },
      {
        name: "description",
        content:
          "Flux linkage, internal and external inductance, GMR and GMD, transposition, bundling, the effect of ground, and why double circuits reduce reactance.",
      },
      {
        property: "og:title",
        content: "Learn — Transmission Line Theory | TransLine Calculator",
      },
      {
        property: "og:description",
        content:
          "The theory behind transmission line inductance and capacitance, from flux linkage to the equal-area criterion.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Learn,
});

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground [&_p_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

function Learn() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pb-16">
      <header className="pt-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Learn: how line parameters arise
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The theory behind every formula the calculator uses — from flux
          linkage to the equal-area criterion.
        </p>
      </header>

      <Section title="1. Flux linkage and inductance">
        <p>
          A current I flowing in a conductor establishes a magnetic field. The
          flux linkage λ per metre is the integral of the flux density around
          and inside the conductor. Inductance is the ratio of flux linkage to
          current:
        </p>
        <TeX
          block
          math={`L = \\frac{\\lambda}{I}\\ \\ [\\mathrm{H/m}]`}
        />
        <p>
          For an isolated round conductor, the field outside it at distance x
          is <TeX math={`B = \\mu_0 I/(2\\pi x)`} />, and the internal field
          (assuming uniform current density) grows linearly inside. Integrating
          both contributions gives the inductance of one conductor with return
          distance D:
        </p>
        <TeX
          block
          math={`L = 2\\times10^{-7}\\ln\\frac{D}{r'}\\ \\ \\mathrm{H/m},\\qquad r' = e^{-1/4}\\,r = 0.7788\\,r`}
        />
      </Section>

      <Section title="2. Internal vs external inductance — why 0.7788 r">
        <p>
          The total flux linkage splits into an <strong>external</strong> part
          (flux between the conductor surface and the return path) and an{" "}
          <strong>internal</strong> part (flux inside the conductor). For a
          solid round conductor with uniform current the internal term works out
          to μ₀/8π per metre, which is exactly equivalent to pushing the
          external integration radius in by a factor e⁻¹ᐟ⁴:
        </p>
        <TeX
          block
          math={`L_{\\text{ext}} = 2\\times10^{-7}\\ln\\frac{D}{r},\\qquad L_{\\text{int}} = \\frac{\\mu_0}{8\\pi} = 5\\times10^{-8}\\ \\mathrm{H/m}`}
        />
        <p>
          The composite <strong>GMR (geometric mean radius)</strong> Ds = r' =
          0.7788 r folds the internal flux into a single effective radius. At
          60 Hz and above, skin effect pushes current toward the surface, and Ds
          approaches r — but for the low-frequency calculations here, 0.7788 r
          is the textbook value.
        </p>
      </Section>

      <Section title="3. GMR and GMD">
        <p>
          For a conductor made of several strands (or a bundle), the effective
          GMR is the geometric mean of all self and mutual distances among the
          sub-conductors. For a two-wire line the flux linkage uses the{" "}
          <strong>GMD (geometric mean distance)</strong> between the two sides:
          the (mn)-th root of the product of all mn distances between the n
          conductors of side x and the m conductors of side y.
        </p>
        <TeX
          block
          math={`D_{s_x} = \\sqrt[n^{2}]{\\prod \\text{all distances within side x (incl. } D_s \\text{)}}`}
        />
        <TeX
          block
          math={`D_m = \\sqrt[mn]{\\prod \\text{(all distances between side x and side y)}}`}
        />
        <p>
          For stranded conductors the strand lay-up changes the internal flux
          slightly — hence the table factors (0.726 r for 7 strands up to
          0.774 r for 91 strands). Commercial ACSR conductors have a steel core,
          so their GMR must be read from the manufacturer table instead.
        </p>
      </Section>

      <Section title="4. Transposition">
        <p>
          In a real three-phase line the conductor positions are rarely
          equilateral, so each phase would see a different inductance.
          <strong> Transposition</strong> — physically swapping the phase
          positions every third of the route — equalises them. The per-phase
          inductance then depends only on the equivalent spacing:
        </p>
        <TeX
          block
          math={`D_{eq} = \\sqrt[3]{D_{12}\\,D_{23}\\,D_{31}},\\qquad L = 2\\times10^{-7}\\ln\\frac{D_{eq}}{D_s}`}
        />
        <p>
          A horizontal line with equal adjacent spacing D has D₁₂ = D, D₂₃ = D,
          D₃₁ = 2D, so D_eq = ∛2·D ≈ 1.26 D — the shortcut the calculator applies.
        </p>
      </Section>

      <Section title="5. Bundling">
        <p>
          Replacing one conductor per phase by 2–4 sub-conductors on a spacer
          increases the effective GMR without adding metal, which lowers the
          inductance and raises the capacitance — both desirable. The bundle GMR
          uses the sub-conductor spacing d:
        </p>
        <TeX
          block
          math={`D_{s_b} = \\sqrt{D_s\\,d}\\ (n{=}2),\\quad \\sqrt[3]{D_s\\,d^2}\\ (n{=}3,\\ \\text{equilateral}),\\quad 1.09\\,(D_s\\,d^3)^{1/4}\\ (n{=}4,\\ \\text{square})`}
        />
        <p>
          For capacitance the same formulas apply with the actual radius r in
          place of Ds — a reminder that <strong>bundling is one of the few
          practical ways to cut reactance on EHV lines</strong>.
        </p>
      </Section>

      <Section title="6. Capacitance and the effect of ground">
        <p>
          Capacitance comes from the electric field between conductors. The
          line-to-neutral capacitance of a transposed three-phase line is:
        </p>
        <TeX
          block
          math={`C_n = \\frac{2\\pi\\varepsilon_0}{\\ln(D_{eq}/r)}\\ \\ \\mathrm{F/m}`}
        />
        <p>
          Note the crucial difference from inductance:{" "}
          <strong>only the outer radius r appears</strong>, because the electric
          field exists entirely outside the conductor — internal flux plays no
          role. The charged conducting surface is what matters, so the
          capacitance GMR is r itself.
        </p>
        <p>
          The earth acts as a conducting plane and slightly increases C_n. By
          the method of images, each conductor is mirrored below ground and the
          correction subtracts a log term:
        </p>
        <TeX
          block
          math={`C_n = \\frac{2\\pi\\varepsilon_0}{\\ln(D_{eq}/r) - \\ln\\left(\\sqrt[3]{\\frac{H_{12}H_{23}H_{31}}{H_1H_2H_3}}\\right)},\\qquad H_{ij} = \\sqrt{D_{ij}^2 + 4H_iH_j}`}
        />
        <p>
          Because transmission conductors sit many diameters above ground, this
          correction is usually a few percent or less — but it grows for low
          height-to-spacing ratios.
        </p>
      </Section>

      <Section title="7. Why a double circuit reduces reactance">
        <p>
          Two parallel circuits on the same towers put two conductors per phase
          in parallel. Each phase group behaves like a 2-strand bundle, so its
          GMR rises to √(Ds·D_aa′) and the GMD between phase groups is a
          4-conductor geometric mean. The larger ratio D_eq/Ds means:
        </p>
        <TeX
          block
          math={`L = 2\\times10^{-7}\\ln\\frac{D_{eq}}{D_{s_{eq}}} \\;\\longrightarrow\\; \\text{smaller } L \\text{ (and } X_L = 2\\pi f L\\text{)}`}
        />
        <p>
          Lower reactance is not just an operating convenience: it directly
          raises the steady-state stability limit P_max = |E||V|/X. Try both
          circuit types in the calculator to compare their reactance.
        </p>
      </Section>

      <Section title="8. Where this all leads: stability">
        <p>
          The reactance computed here feeds the power–angle equation and the
          swing equation:
        </p>
        <TeX
          block
          math={`P = \\frac{|E|\\,|V|}{X}\\sin\\delta,\\qquad \\frac{2H}{\\omega_s}\\frac{d^2\\delta}{dt^2} = P_m - P_{\\max}\\sin\\delta`}
        />
        <p>
          The equal-area criterion turns the two shaded areas of the P–δ curve
          into a stability test, with the critical clearing angle:
        </p>
        <TeX
          block
          math={`\\delta_{cr} = \\arccos\\left[\\frac{P_m}{P_{\\max}}(\\delta_{\\max} - \\delta_0) + \\cos\\delta_{\\max}\\right]`}
        />
        <p>
          These stability topics go beyond the line parameters this calculator
          computes — the reactance here is the X that feeds them.
        </p>
      </Section>
    </div>
  );
}
