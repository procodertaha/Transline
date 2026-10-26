import type { LineConfig } from "./types";

export interface FormulaCard {
  title: string;
  tex: string;
  note?: string;
}

const R = String.raw;

/** The correct formulas for the chosen combination, for the given tab. */
export function formulaCards(cfg: LineConfig, tab: "ind" | "cap"): FormulaCard[] {
  const isDouble = cfg.circuit === "double";
  const cards: FormulaCard[] = [];

  if (tab === "ind") {
    if (isDouble) {
      cards.push({
        title: "GMR of each phase group",
        note: "Two parallel conductors per phase behave like a 2-strand bundle.",
        tex: R`D_{s_x} = \sqrt{D_s\,D_{aa'}},\qquad D_{s_y} = \sqrt{D_s\,D_{bb'}}`,
      });
      if (cfg.system === "single") {
        cards.push({
          title: "GMD and loop inductance",
          tex: R`D_m = \sqrt[4]{D_{ab}\,D_{ab'}\,D_{a'b}\,D_{a'b'}} \\[4pt] L_x = 2\times10^{-7}\ln\frac{D_m}{D_{s_x}},\qquad L_{\text{loop}} = L_x + L_y = 4\times10^{-7}\ln\frac{D_m}{D_s}\ (\text{symmetric})`,
        });
      } else {
        cards.push({
          title: "GMD between phase groups and equivalent GMR",
          tex: R`D_{AB} = \sqrt[4]{D_{ab}\,D_{ab'}\,D_{a'b}\,D_{a'b'}}\ \ (\text{likewise } D_{BC},\,D_{CA}) \\[4pt] D_{s_{eq}} = \sqrt[3]{D_{s_A}\,D_{s_B}\,D_{s_C}},\qquad D_{eq} = \sqrt[3]{D_{AB}\,D_{BC}\,D_{CA}}`,
        });
        cards.push({
          title: "Inductance per phase (fully transposed)",
          tex: R`L = 2\times10^{-7}\ln\frac{D_{eq}}{D_{s_{eq}}}\ \ \tfrac{\text{H}}{\text{m}},\qquad L\,[\tfrac{\text{mH}}{\text{km}}] = 0.2\ln\frac{D_{eq}}{D_{s_{eq}}}`,
        });
      }
    } else if (cfg.system === "single") {
      cards.push({
        title: "Loop inductance (two-wire line)",
        tex: R`L = 2\times10^{-7}\ln\frac{D}{D_s}\ \tfrac{\text{H}}{\text{m}}\ \ (\text{per conductor}),\qquad L_{\text{loop}} = 4\times10^{-7}\ln\frac{D}{D_s}\ \tfrac{\text{H}}{\text{m}}`,
      });
    } else {
      cards.push({
        title: "Equivalent spacing (transposed)",
        tex: R`D_{eq} = \sqrt[3]{D_{12}\,D_{23}\,D_{31}}\quad (\text{equilateral: } D_{eq}=D;\ \text{horizontal: } D_{eq}\approx 1.26\,D)`,
      });
      cards.push({
        title: "Inductance per phase",
        tex: R`L = 2\times10^{-7}\ln\frac{D_{eq}}{D_s}\ \tfrac{\text{H}}{\text{m}},\qquad L\,[\tfrac{\text{mH}}{\text{km}}] = 0.2\ln\frac{D_{eq}}{D_s}`,
      });
    }
    cards.push({
      title: "Reactance",
      tex: R`X_L = 2\pi f L\ \ [\Omega/\text{m}]`,
    });
    if (cfg.conductorType === "bundled") {
      cards.push({
        title: "Bundle GMR (replace Ds by Ds_b)",
        tex: R`n=2:\ D_{s_b} = \sqrt{D_s\,d}\qquad n=3:\ D_{s_b} = \sqrt[3]{D_s\,d^2}\qquad n=4:\ D_{s_b} = 1.09\,(D_s\,d^3)^{1/4}`,
      });
    }
    if (cfg.conductorType === "acsr") {
      cards.push({
        title: "ACSR conductors",
        note: "For commercial ACSR the internal flux linkage depends on the steel/aluminium lay-up — take Ds directly from the manufacturer table. No table value? Tick the option to use r' = 0.7788·r instead.",
        tex: R`D_s = \text{GMR from data table (ft or m)}`,
      });
    }
  } else {
    if (isDouble) {
      cards.push({
        title: "Group GMR for capacitance (r replaces Ds)",
        tex: R`D_{s_x}^C = \sqrt{r\,D_{aa'}},\qquad D_{s_y}^C = \sqrt{r\,D_{bb'}}`,
      });
      if (cfg.system === "single") {
        cards.push({
          title: "Capacitance",
          tex: R`C_{ab} = \frac{\pi\varepsilon_0}{\ln\left(D_m/\sqrt{D_{s_x}^C D_{s_y}^C}\right)},\qquad C_n = 2\,C_{ab}`,
        });
      } else {
        cards.push({
          title: "Capacitance to neutral (fully transposed)",
          tex: R`D_{s_{eq}}^C = \sqrt[3]{D_{s_A}^C D_{s_B}^C D_{s_C}^C},\qquad C_n = \frac{2\pi\varepsilon_0}{\ln(D_{eq}/D_{s_{eq}}^C)}`,
        });
      }
    } else if (cfg.system === "single") {
      cards.push({
        title: "Capacitance (two-wire line)",
        tex: R`C_{ab} = \frac{\pi\varepsilon_0}{\ln(D/r)},\qquad C_n = \frac{2\pi\varepsilon_0}{\ln(D/r)} = 2\,C_{ab}`,
      });
    } else {
      cards.push({
        title: "Capacitance to neutral (transposed)",
        tex: R`C_n = \frac{2\pi\varepsilon_0}{\ln(D_{eq}/r)}\ \tfrac{\text{F}}{\text{m}},\qquad C_n\,[\tfrac{\text{\textmu F}}{\text{km}}] \approx \frac{0.0556}{\ln(D_{eq}/r)}`,
      });
      cards.push({
        title: "With earth effect (image method)",
        tex: R`C_n = \frac{2\pi\varepsilon_0}{\ln(D_{eq}/r) - \ln\left(\sqrt[3]{\dfrac{H_{12}H_{23}H_{31}}{H_1H_2H_3}}\right)},\qquad H_{ij} = \sqrt{D_{ij}^2 + 4H_iH_j}`,
        note: "Heights H above ground and image distances Hij (usually a small correction).",
      });
    }
    cards.push({
      title: "Capacitive reactance and charging",
      tex: R`X_C = \frac{1}{2\pi f C_n},\qquad I_{\text{chg}} = 2\pi f C_n V_{LN},\qquad Q_c = 3V_{LN}^2\,(2\pi f C_n) = V_{LL}^2\,(2\pi f C_n)`,
    });
    if (cfg.conductorType === "bundled") {
      cards.push({
        title: "Bundle GMR for capacitance (r replaces Ds)",
        tex: R`n=2:\ \sqrt{r\,d}\qquad n=3:\ \sqrt[3]{r\,d^2}\qquad n=4:\ 1.09\,(r\,d^3)^{1/4}`,
      });
    }
  }
  return cards;
}
