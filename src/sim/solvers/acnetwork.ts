// Lista 2 — Análise de circuitos CA: análise nodal fasorial, divisor de tensão/corrente.
import { CM, Complex, Solution, Step, both, fromPolar, num, polar, rect, solveComplex, step } from "./core";

export interface Branch {
  from: number; // nó (0 = terra)
  to: number;
  z: Complex; // impedância em Ω
  label?: string;
}

export interface CurrentSource {
  from: number; // sai deste nó
  to: number; // entra neste nó
  mag: number;
  ang: number;
  label?: string;
}

export interface VoltageSource {
  node: number; // nó com tensão conhecida em relação ao terra
  mag: number;
  ang: number;
  label?: string;
}

export interface NodalRequest {
  nodeCount: number; // número de nós além do terra
  branches: Branch[];
  currentSources: CurrentSource[];
  voltageSources: VoltageSource[];
  omega?: number; // frequência angular em rad/s
}

export function solveNodal(req: NodalRequest): Solution {
  const steps: Step[] = [];
  const N = req.nodeCount;
  let n = 0;
  const S = (label: string, f?: string, sub?: string, res?: string, note?: string) => {
    n++;
    steps.push(step(`${n}. ${label}`, f, sub, res, note));
  };

  if (N < 1) {
    return {
      title: "Análise nodal fasorial",
      method: "Método nodal",
      steps,
      answers: [],
      error: "Informe pelo menos um nó além do terra.",
    };
  }

  S(
    "Montar o circuito no domínio da frequência",
    "Cada elemento vira impedância; cada fonte vira fasor",
    [
      ...req.branches.map((b, i) => `${b.label ?? `Z${i + 1}`}: nó ${b.from} → nó ${b.to},  Z = ${rect(b.z, "Ω")}`),
      ...req.currentSources.map(
        (s, i) => `${s.label ?? `I${i + 1}`}: injeta ${num(s.mag)} ∠ ${num(s.ang)}° A do nó ${s.from} para o nó ${s.to}`,
      ),
      ...req.voltageSources.map((s, i) => `${s.label ?? `V${i + 1}`}: nó ${s.node} = ${num(s.mag)} ∠ ${num(s.ang)}° V`),
    ].join("\n"),
    undefined,
    "Nó 0 é o terra (referência).",
  );

  const Y: Complex[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => CM.create(0, 0)));
  const I: Complex[] = Array.from({ length: N }, () => CM.create(0, 0));

  for (const b of req.branches) {
    const y = CM.inv(b.z);
    const p = b.from - 1;
    const q = b.to - 1;
    if (p >= 0) Y[p][p] = CM.add(Y[p][p], y);
    if (q >= 0) Y[q][q] = CM.add(Y[q][q], y);
    if (p >= 0 && q >= 0) {
      Y[p][q] = CM.sub(Y[p][q], y);
      Y[q][p] = CM.sub(Y[q][p], y);
    }
  }
  for (const s of req.currentSources) {
    const phasor = fromPolar(s.mag, s.ang);
    if (s.to - 1 >= 0) I[s.to - 1] = CM.add(I[s.to - 1], phasor);
    if (s.from - 1 >= 0) I[s.from - 1] = CM.sub(I[s.from - 1], phasor);
  }

  S(
    "Escrever a matriz de admitâncias nodais",
    "Y_kk = Σ admitâncias ligadas ao nó k;  Y_kj = −Y entre k e j;  Y·V = I",
    Y.map((row, i) => `Linha ${i + 1}: [ ${row.map((c) => rect(c, "")).join(" , ")} ]  |  I = ${rect(I[i], "A")}`).join("\n"),
  );

  // Fontes de tensão fixam nós: substitui a linha por V_k = valor
  const fixed = new Map<number, Complex>();
  req.voltageSources.forEach((s) => {
    if (s.node >= 1 && s.node <= N) fixed.set(s.node - 1, fromPolar(s.mag, s.ang));
  });

  if (fixed.size > 0) {
    fixed.forEach((val, idx) => {
      for (let j = 0; j < N; j++) Y[idx][j] = CM.create(idx === j ? 1 : 0, 0);
      I[idx] = val;
    });
    S(
      "Aplicar as tensões conhecidas (fontes de tensão para o terra)",
      "A equação do nó é substituída por V_k = valor da fonte",
      Array.from(fixed.entries())
        .map(([idx, val]) => `V${idx + 1} = ${polar(val, "V")}`)
        .join("\n"),
    );
  }

  const V = solveComplex(Y, I);
  if (!V) {
    return {
      title: "Análise nodal fasorial",
      method: "Método nodal",
      steps,
      answers: [],
      error: "Sistema sem solução única — verifique se todos os nós têm caminho para o terra.",
    };
  }

  S(
    "Resolver o sistema linear complexo",
    "V = Y⁻¹ · I (eliminação de Gauss com pivoteamento)",
    V.map((v, i) => `V${i + 1} = ${both(v, "V")}`).join("\n"),
  );

  const currents = req.branches.map((b, i) => {
    const vp = b.from - 1 >= 0 ? V[b.from - 1] : CM.create(0, 0);
    const vq = b.to - 1 >= 0 ? V[b.to - 1] : CM.create(0, 0);
    const cur = CM.div(CM.sub(vp, vq), b.z);
    return { label: b.label ?? `Z${i + 1}`, cur, drop: CM.sub(vp, vq) };
  });

  S(
    "Correntes de cada ramo pela lei de Ohm",
    "I_ramo = (V_p − V_q)/Z",
    currents
      .map(
        (c, i) =>
          `I(${c.label}) = ${rect(c.drop, "V")} / ${rect(req.branches[i].z, "Ω")} = ${both(c.cur, "A")}`,
      )
      .join("\n"),
  );

  const timeAnswers: string[] = [];
  if (req.omega && req.omega > 0) {
    const vTime = V.map((v, i) => {
      const mag = CM.mag(v);
      const ang = CM.phaseDeg(v);
      const angStr = ang >= 0 ? `+ ${num(ang, 2)}°` : `- ${num(Math.abs(ang), 2)}°`;
      return `v${i + 1}(t) = ${num(mag, 4)}·cos(${num(req.omega!, 0)}t ${angStr}) V`;
    });
    const iTime = currents.map((c) => {
      const mag = CM.mag(c.cur);
      const ang = CM.phaseDeg(c.cur);
      const angStr = ang >= 0 ? `+ ${num(ang, 2)}°` : `- ${num(Math.abs(ang), 2)}°`;
      return `i_${c.label}(t) = ${num(mag, 4)}·cos(${num(req.omega!, 0)}t ${angStr}) A`;
    });

    S(
      "Expressões no Domínio do Tempo (Regime Permanente CA)",
      "v(t) = V_m · cos(ωt + θ_v)  |  i(t) = I_m · cos(ωt + θ_i)",
      [...vTime, ...iTime].join("\n"),
      undefined,
      `Calculado para frequência angular ω = ${num(req.omega, 0)} rad/s.`,
    );

    timeAnswers.push(...vTime, ...iTime);
  }

  return {
    title: "Análise nodal fasorial",
    method: "Método nodal (Y·V = I) no domínio da frequência",
    steps,
    answers: [
      ...V.map((v, i) => `V${i + 1} = ${polar(v, "V")}`),
      ...currents.map((c) => `I(${c.label}) = ${polar(c.cur, "A")}`),
      ...timeAnswers,
    ],
  };
}

/** Divisor de tensão: V_x = V_total · Z_x / ΣZ */
export function solveVoltageDivider(
  vMag: number,
  vAng: number,
  zx: Complex,
  zOthers: Complex[],
): Solution {
  const steps: Step[] = [];
  let total = zx;
  zOthers.forEach((z) => {
    total = CM.add(total, z);
  });
  const V = fromPolar(vMag, vAng);
  const ratio = CM.div(zx, total);
  const vx = CM.mul(V, ratio);
  steps.push(
    step("1. Somar as impedâncias em série", "ΣZ = Z₁ + Z₂ + ...", `ΣZ = ${rect(zx, "Ω")} + ${zOthers.map((z) => rect(z, "Ω")).join(" + ")}`, `ΣZ = ${both(total, "Ω")}`),
    step("2. Aplicar o divisor de tensão", "V_x = V · Z_x/ΣZ", `Z_x/ΣZ = ${rect(zx, "Ω")}/${rect(total, "Ω")} = ${both(ratio, "")}`, `V_x = ${polar(V, "V")} · ${polar(ratio, "")} = ${both(vx, "V")}`),
  );
  return {
    title: "Divisor de tensão fasorial",
    method: "Divisor de tensão no domínio da frequência",
    steps,
    answers: [`V_x = ${rect(vx, "V")}`, `V_x = ${polar(vx, "V")}`],
  };
}

/** Divisor de corrente: I_x = I_total · (Z_eq_paralelo / Z_x) */
export function solveCurrentDivider(iMag: number, iAng: number, zx: Complex, zOther: Complex): Solution {
  const I = fromPolar(iMag, iAng);
  const ratio = CM.div(zOther, CM.add(zx, zOther));
  const ix = CM.mul(I, ratio);
  const steps: Step[] = [
    step("1. Impedância dos dois ramos", "Ramos em paralelo Z_x e Z_y", `Z_x = ${rect(zx, "Ω")},  Z_y = ${rect(zOther, "Ω")}`),
    step("2. Aplicar o divisor de corrente", "I_x = I · Z_y/(Z_x + Z_y)", `Z_y/(Z_x+Z_y) = ${both(ratio, "")}`, `I_x = ${polar(I, "A")} · ${polar(ratio, "")} = ${both(ix, "A")}`),
  ];
  return {
    title: "Divisor de corrente fasorial",
    method: "Divisor de corrente no domínio da frequência",
    steps,
    answers: [`I_x = ${rect(ix, "A")}`, `I_x = ${polar(ix, "A")}`],
  };
}
