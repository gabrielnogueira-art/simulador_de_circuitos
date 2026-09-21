// Lista 6 — Análise de circuitos por transformada de Laplace.
import { CM, Complex, Solution, Step, num, polar, polyRoots, rect, step } from "./core";

export interface LaplaceRequest {
  /** Coeficientes do numerador, do maior grau para o menor */
  numerator: number[];
  /** Coeficientes do denominador, do maior grau para o menor */
  denominator: number[];
}

function polyString(c: number[], v = "s"): string {
  const n = c.length - 1;
  const parts: string[] = [];
  c.forEach((coef, idx) => {
    if (Math.abs(coef) < 1e-12) return;
    const p = n - idx;
    const sign = parts.length === 0 ? (coef < 0 ? "−" : "") : coef < 0 ? " − " : " + ";
    const a = Math.abs(coef);
    const av = p === 0 || Math.abs(a - 1) > 1e-12 ? num(a, 4) : "";
    const pv = p === 0 ? "" : p === 1 ? v : `${v}^${p}`;
    parts.push(`${sign}${av}${av && pv ? "·" : ""}${pv}`);
  });
  return parts.length ? parts.join("") : "0";
}

function evalPoly(c: number[], z: Complex): Complex {
  let acc = CM.create(0, 0);
  for (const coef of c) acc = CM.add(CM.mul(acc, z), CM.create(coef, 0));
  return acc;
}

function derivative(c: number[]): number[] {
  const n = c.length - 1;
  return c.slice(0, -1).map((coef, i) => coef * (n - i));
}

/** Expansão em frações parciais (polos simples, reais ou complexos conjugados) → f(t) */
export function solveInverseLaplace(req: LaplaceRequest): Solution {
  const steps: Step[] = [];
  const nume = req.numerator;
  const den = req.denominator;

  steps.push(
    step(
      "1. Função no domínio s",
      "F(s) = N(s)/D(s)",
      `N(s) = ${polyString(nume)}\nD(s) = ${polyString(den)}`,
    ),
  );

  const roots = polyRoots(den);
  if (roots.length === 0) {
    return {
      title: "Transformada inversa de Laplace",
      method: "Frações parciais",
      steps,
      answers: [],
      error: "Denominador inválido — informe pelo menos um polo.",
    };
  }

  steps.push(
    step(
      "2. Raízes do denominador (polos)",
      "D(s) = 0",
      roots.map((r, i) => `s${i + 1} = ${rect(r, "")}`).join("\n"),
      roots.some((r) => Math.abs(r.i) > 1e-8)
        ? "Há polos complexos conjugados → resposta oscilatória amortecida."
        : "Todos os polos são reais → soma de exponenciais.",
    ),
  );

  // Detecta polos repetidos
  let repeated = false;
  for (let i = 0; i < roots.length; i++)
    for (let j = i + 1; j < roots.length; j++)
      if (CM.mag(CM.sub(roots[i], roots[j])) < 1e-6) repeated = true;

  const dDen = derivative(den);
  const residues = roots.map((p) => CM.div(evalPoly(nume, p), evalPoly(dDen, p)));

  steps.push(
    step(
      "3. Resíduos (coeficientes das frações parciais)",
      "K_k = N(s)/D'(s) avaliado em s = s_k",
      roots
        .map((p, i) => `K${i + 1} = N(${rect(p, "")})/D'(${rect(p, "")}) = ${rect(residues[i], "")} = ${polar(residues[i], "")}`)
        .join("\n"),
      repeated ? "Atenção: há polos repetidos; o resultado é aproximado para este caso." : undefined,
    ),
  );

  steps.push(
    step(
      "4. Escrever F(s) em frações parciais",
      "F(s) = Σ K_k/(s − s_k)",
      roots.map((p, i) => `${rect(residues[i], "")} / (s − (${rect(p, "")}))`).join("  +  "),
    ),
  );

  // Monta f(t)
  const used = new Set<number>();
  const terms: string[] = [];
  roots.forEach((p, i) => {
    if (used.has(i)) return;
    if (Math.abs(p.i) < 1e-8) {
      used.add(i);
      terms.push(`${num(residues[i].r)}·e^(${num(p.r)}t)`);
      return;
    }
    // par conjugado
    const j = roots.findIndex((q, k) => k !== i && !used.has(k) && Math.abs(q.r - p.r) < 1e-6 && Math.abs(q.i + p.i) < 1e-6);
    used.add(i);
    if (j >= 0) used.add(j);
    const mag = 2 * CM.mag(residues[i]);
    const ang = CM.phaseDeg(residues[i]);
    terms.push(
      `${num(mag)}·e^(${num(p.r)}t)·cos(${num(Math.abs(p.i))}t ${ang >= 0 ? "+" : "−"} ${num(Math.abs(ang))}°)`,
    );
  });

  const ft = terms.join(" + ");
  steps.push(
    step(
      "5. Transformada inversa termo a termo",
      "K/(s−a) → K·e^(at)u(t);   par conjugado → 2|K|·e^(σt)·cos(ωt + ∠K)",
      terms.join("\n"),
      `f(t) = [ ${ft} ] u(t)`,
    ),
  );

  return {
    title: "Transformada inversa de Laplace",
    method: "Expansão em frações parciais",
    steps,
    answers: [`f(t) = [ ${ft} ] u(t)`],
  };
}

export interface RlcRequest {
  r: number;
  l: number;
  c: number;
  /** Amplitude do degrau de tensão aplicado (V) */
  vs: number;
  kind: "SERIES" | "PARALLEL";
}

/** Resposta ao degrau de RLC série/paralelo via Laplace, com classificação do amortecimento. */
export function solveRlcStep(req: RlcRequest): Solution {
  const steps: Step[] = [];
  const { r, l, c, vs, kind } = req;
  const w0 = 1 / Math.sqrt(l * c);
  const alpha = kind === "SERIES" ? r / (2 * l) : 1 / (2 * r * c);

  steps.push(
    step(
      "1. Circuito no domínio s",
      "Z_R = R,  Z_L = sL,  Z_C = 1/(sC);  condições iniciais nulas",
      `R = ${num(r)} Ω,  L = ${num(l, 6)} H,  C = ${num(c, 9)} F,  V_s = ${num(vs)} V`,
    ),
    step(
      "2. Parâmetros característicos",
      kind === "SERIES" ? "α = R/(2L),  ω₀ = 1/√(LC)" : "α = 1/(2RC),  ω₀ = 1/√(LC)",
      `α = ${num(alpha)} Np/s\nω₀ = ${num(w0)} rad/s`,
      `ζ = α/ω₀ = ${num(alpha / w0)}`,
    ),
  );

  const disc = alpha * alpha - w0 * w0;
  let regime = "";
  let ft = "";
  if (disc > 1e-9) {
    const s1 = -alpha + Math.sqrt(disc);
    const s2 = -alpha - Math.sqrt(disc);
    regime = "Superamortecido (α > ω₀) — duas raízes reais distintas";
    const a1 = (vs * s2) / (s2 - s1);
    const a2 = (vs * s1) / (s1 - s2);
    ft = `v_C(t) = ${num(vs)} + ${num(a1)}·e^(${num(s1)}t) + ${num(a2)}·e^(${num(s2)}t) V`;
    steps.push(
      step("3. Raízes características", "s² + 2αs + ω₀² = 0", `s₁ = ${num(s1)} , s₂ = ${num(s2)}`, regime),
      step("4. Resposta ao degrau", "v_C(t) = V_s + A₁e^{s₁t} + A₂e^{s₂t}", ft),
    );
  } else if (Math.abs(disc) <= 1e-9) {
    regime = "Criticamente amortecido (α = ω₀) — raiz dupla";
    ft = `v_C(t) = ${num(vs)}·[1 − (1 + ${num(alpha)}t)·e^(−${num(alpha)}t)] V`;
    steps.push(
      step("3. Raiz dupla", "s₁ = s₂ = −α", `s = ${num(-alpha)}`, regime),
      step("4. Resposta ao degrau", "v_C(t) = V_s[1 − (1 + αt)e^{−αt}]", ft),
    );
  } else {
    const wd = Math.sqrt(-disc);
    regime = "Subamortecido (α < ω₀) — raízes complexas conjugadas";
    const ang = (Math.atan2(alpha, wd) * 180) / Math.PI;
    ft = `v_C(t) = ${num(vs)}·[1 − (ω₀/ω_d)·e^(−${num(alpha)}t)·cos(${num(wd)}t − ${num(ang)}°)] V`;
    steps.push(
      step(
        "3. Raízes complexas",
        "s = −α ± jω_d,  ω_d = √(ω₀² − α²)",
        `ω_d = ${num(wd)} rad/s → s = ${num(-alpha)} ± j${num(wd)}`,
        regime,
      ),
      step("4. Resposta ao degrau", "v_C(t) = V_s[1 − (ω₀/ω_d)e^{−αt}cos(ω_d t − φ)]", ft),
    );
  }

  return {
    title: `Resposta ao degrau — RLC ${kind === "SERIES" ? "série" : "paralelo"}`,
    method: "Transformada de Laplace + frações parciais",
    steps,
    answers: [regime, ft, `α = ${num(alpha)} Np/s, ω₀ = ${num(w0)} rad/s`],
  };
}
