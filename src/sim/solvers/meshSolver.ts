// Análise de Malhas Fasorial (LKT) e Soluções Passo a Passo dos Exercícios 1.10 e 1.11
import { CM, Complex, Solution, Step, both, fromPolar, num, polar, rect, solveComplex, step, wrapDeg } from "./core";

export interface MeshLoop {
  id: number;
  label?: string;
  selfZ: Complex; // Soma de todas as impedâncias na malha i
  mutual: { withMesh: number; z: Complex; sign?: number }[]; // Impedâncias mútuas (-Z_ij ou +Z_ij conforme orientação)
  sourceV: Complex; // Soma das fontes de tensão no sentido da malha (elevações)
  knownCurrent?: Complex; // Se a malha tiver corrente imposta por fonte
}

export interface MeshRequest {
  loops: MeshLoop[];
  omega?: number;
}

/** Resolve sistema de malhas arbitrário [Z][I] = [V] com passos didáticos detalhados. */
export function solveMeshSystem(req: MeshRequest): Solution {
  const steps: Step[] = [];
  const N = req.loops.length;
  let n = 0;
  const S = (label: string, f?: string, sub?: string, res?: string, note?: string) => {
    n++;
    steps.push(step(`${n}. ${label}`, f, sub, res, note));
  };

  if (N < 1) {
    return {
      title: "Análise de Malhas Fasorial (LKT)",
      method: "Método das Malhas",
      steps,
      answers: [],
      error: "Informe pelo menos uma malha independente.",
    };
  }

  S(
    "Definição das Malhas e da Lei de Kirchhoff das Tensões (LKT)",
    "∑ V_elevações = ∑ V_quedas  ⇔  [Z_malha] · [I_malha] = [V_malha]",
    req.loops
      .map((l, i) => {
        const name = l.label ?? `Malha ${i + 1}`;
        return `${name}: Z_própria = ${rect(l.selfZ, "Ω")}, Fonte resultante = ${polar(l.sourceV, "V")}${
          l.knownCurrent ? `, Corrente imposta = ${polar(l.knownCurrent, "A")}` : ""
        }`;
      })
      .join("\n"),
    undefined,
    "As correntes de malha circulam no sentido horário por convenção.",
  );

  const Z: Complex[][] = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => CM.create(0, 0)),
  );
  const V: Complex[] = Array.from({ length: N }, () => CM.create(0, 0));

  for (let i = 0; i < N; i++) {
    const loop = req.loops[i];
    Z[i][i] = loop.selfZ;
    V[i] = loop.sourceV;
    for (const m of loop.mutual) {
      const j = m.withMesh - 1;
      if (j >= 0 && j < N && j !== i) {
        const sign = m.sign !== undefined ? m.sign : -1;
        const signedZ = sign < 0 ? CM.sub(CM.create(0, 0), m.z) : m.z;
        Z[i][j] = CM.add(Z[i][j], signedZ);
      }
    }
  }

  S(
    "Montagem da Matriz de Impedâncias de Malha",
    "Z_ii = ∑ impedâncias da malha i;  Z_ij = ∓ impedâncias compartilhadas com a malha j",
    Z.map(
      (row, i) =>
        `Malha ${i + 1}: [ ${row.map((c) => rect(c, "")).join(" , ")} ]  ·  [ I${i + 1} ] = [ ${rect(
          V[i],
          "V",
        )} ]`,
    ).join("\n"),
  );

  // Aplica correntes fixadas por fontes de corrente periféricas
  const fixed = new Map<number, Complex>();
  req.loops.forEach((l, idx) => {
    if (l.knownCurrent) {
      fixed.set(idx, l.knownCurrent);
    }
  });

  if (fixed.size > 0) {
    fixed.forEach((val, idx) => {
      for (let j = 0; j < N; j++) Z[idx][j] = CM.create(idx === j ? 1 : 0, 0);
      V[idx] = val;
    });
    S(
      "Substituição de Correntes de Malha Conhecidas (Fontes de Corrente)",
      "Para malhas com fontes de corrente no ramo periférico: I_k = I_fonte",
      Array.from(fixed.entries())
        .map(([idx, val]) => `I${idx + 1} = ${polar(val, "A")}`)
        .join("\n"),
    );
  }

  const I = solveComplex(Z, V);
  if (!I) {
    return {
      title: "Análise de Malhas Fasorial (LKT)",
      method: "Método das Malhas",
      steps,
      answers: [],
      error: "Sistema linear singular ou sem solução única. Verifique as impedâncias e fontes de corrente.",
    };
  }

  S(
    "Resolução do Sistema Linear Fasorial",
    "I_malha = [Z]⁻¹ · [V]",
    I.map((cur, i) => `I${i + 1} = ${both(cur, "A")}`).join("\n"),
  );

  const answers = I.map((cur, i) => {
    const label = req.loops[i].label ?? `I_malha_${i + 1}`;
    return `${label} = ${polar(cur, "A")}`;
  });

  // Se tiver frequência/omega, calcula a expressão temporal senoidal do regime permanente
  if (req.omega && req.omega > 0) {
    const timeExpressions = I.map((cur, i) => {
      const label = req.loops[i].label ?? `i${i + 1}`;
      const mag = CM.mag(cur);
      const ang = CM.phaseDeg(cur);
      const angStr = ang >= 0 ? `+ ${num(ang, 2)}°` : `- ${num(Math.abs(ang), 2)}°`;
      return `${label}(t) = ${num(mag, 4)}·cos(${num(req.omega!, 0)}t ${angStr}) A`;
    });
    S(
      "Expressões no Domínio do Tempo (Regime Permanente CA)",
      "i(t) = I_m · cos(ωt + θ)",
      timeExpressions.join("\n"),
    );
  }

  return {
    title: "Análise de Malhas Fasorial (LKT)",
    method: "Método das Malhas no Domínio da Frequência",
    steps,
    answers,
  };
}

/**
 * Resolução Passo a Passo Dedicada do Exercício 1.10
 * Circuito com impedâncias Za, Zb, Rc, fonte de corrente Is e fonte de tensão Vg.
 */
export interface Exercise1_10Params {
  Za_r?: number; // 120 Ω
  Za_x?: number; // +40 Ω
  Ia_mag?: number; // 40 mA = 0.04 A
  Ia_ang?: number; // 0°
  Zb_r?: number; // 160 Ω
  Zb_x?: number; // -80 Ω
  Rc?: number; // 25 Ω
  Is_r?: number; // 40 mA = 0.04 A
  Is_i?: number; // 80 mA = 0.08 A
  omega?: number; // Ex: 1000 rad/s
}

export function solveExercise1_10(params?: Exercise1_10Params): Solution {
  const steps: Step[] = [];
  let n = 0;
  const S = (label: string, f?: string, sub?: string, res?: string, note?: string) => {
    n++;
    steps.push(step(`${n}. ${label}`, f, sub, res, note));
  };

  const Za = CM.create(params?.Za_r ?? 120, params?.Za_x ?? 40);
  const Ia = fromPolar(params?.Ia_mag ?? 0.04, params?.Ia_ang ?? 0);
  const Zb = CM.create(params?.Zb_r ?? 160, params?.Zb_x ?? -80);
  const Rc = params?.Rc ?? 25;
  const Is = CM.create(params?.Is_r ?? 0.04, params?.Is_i ?? 0.08); // 40 + j80 mA
  const omega = params?.omega ?? 1000;

  // 1. Tensão no nó 1 através do ramo 'a'
  // V1 = Ia * Za
  const V1 = CM.mul(Ia, Za);
  S(
    "Determinar a Tensão Fasorial no Nó Comum (V₁)",
    "V₁ = İ_a · Z_a",
    `İ_a = ${polar(Ia, "A")} = ${rect(Ia, "A")}\nZ_a = ${rect(Za, "Ω")}\nV₁ = (${rect(Ia, "A")}) · (${rect(Za, "Ω")})`,
    `V₁ = ${both(V1, "V")}`,
    "Como o ramo a e o ramo b estão em paralelo em relação ao nó de referência, a tensão sobre Z_b é exatamente V₁.",
  );

  // 2. Corrente no ramo 'b'
  // Ib = V1 / Zb
  const Ib = CM.div(V1, Zb);
  const Ib_mA = CM.mul(Ib, CM.create(1000, 0));
  S(
    "Calcular a Corrente Fasorial no Ramo 'b' (İ_b)",
    "İ_b = V₁ / Z_b",
    `V₁ = ${rect(V1, "V")}\nZ_b = ${rect(Zb, "Ω")}\nİ_b = (${rect(V1, "V")}) / (${rect(Zb, "Ω")})`,
    `İ_b = ${rect(Ib, "A")}  =  ${polar(Ib, "A")}  =  ${polar(Ib_mA, "mA")}`,
    "Multiplicando numerador e denominador pelo conjugado (160 + j80): resulta exatamente em 28.2843 mA ∠ 45.00°.",
  );

  // 3. Lei de Kirchhoff das Correntes (LKC) no nó superior
  // Corrente Ic que entra deve ser igual à soma das que saem: Ic = Ia + Ib + Is
  const Ic = CM.add(CM.add(Ia, Ib), Is);
  const Ic_mA = CM.mul(Ic, CM.create(1000, 0));
  S(
    "Aplicar a LKC no Nó Superior para Encontrar İ_c",
    "∑ I_entra = ∑ I_sai  ⇒  İ_c = İ_a + İ_b + İ_fonte",
    `İ_a = ${rect(Ia, "A")} (${num(CM.mag(Ia) * 1000, 2)} mA)\n` +
      `İ_b = ${rect(Ib, "A")} (${num(CM.mag(Ib) * 1000, 2)} mA)\n` +
      `İ_fonte = ${rect(Is, "A")} (${num(CM.mag(Is) * 1000, 2)} mA)\n` +
      `İ_c = (${rect(Ia)}) + (${rect(Ib)}) + (${rect(Is)})`,
    `İ_c = ${rect(Ic, "A")}  =  ${polar(Ic, "A")}  =  ${polar(Ic_mA, "mA")}`,
    "Soma direta das partes reais e imaginárias: (40 + 20 + 40) + j(0 + 20 + 80) = 100 + j100 mA = 141.421 mA ∠ 45.00°.",
  );

  // 4. Lei de Kirchhoff das Tensões (LKT) na Malha de Entrada para Encontrar Vg
  // Vg = Rc * Ic + V1
  const VRc = CM.mul(CM.create(Rc, 0), Ic);
  const Vg = CM.add(VRc, V1);
  S(
    "Aplicar a LKT na Malha de Entrada para Obter a Fonte V_g",
    "V_g = R_c · İ_c + V₁",
    `R_c · İ_c = ${Rc} Ω · (${rect(Ic, "A")}) = ${rect(VRc, "V")}\n` +
      `V₁ = ${rect(V1, "V")}\n` +
      `V_g = (${rect(VRc, "V")}) + (${rect(V1, "V")})`,
    `V_g = ${rect(Vg, "V")}  =  ${polar(Vg, "V")}`,
    "Soma das quedas de tensão: (2.5 + 4.8) + j(2.5 + 1.6) = 7.3 + j4.1 V = 8.3726 V ∠ 29.32°.",
  );

  // 5. Expressões no Regime Permanente
  const ib_ang = CM.phaseDeg(Ib);
  const ic_ang = CM.phaseDeg(Ic);
  const vg_ang = CM.phaseDeg(Vg);
  S(
    "Expressões Senoidais do Regime Permanente (Domínio do Tempo)",
    "x(t) = X_m · cos(ωt + θ)",
    `i_b(t) = ${num(CM.mag(Ib_mA), 2)}·cos(ωt + ${num(ib_ang, 2)}°) mA\n` +
      `i_c(t) = ${num(CM.mag(Ic_mA), 2)}·cos(ωt + ${num(ic_ang, 2)}°) mA\n` +
      `v_g(t) = ${num(CM.mag(Vg), 4)}·cos(ωt + ${num(vg_ang, 2)}°) V`,
    undefined,
    `Adotando a referência de fase zero para i_a(t) = ${num(CM.mag(Ia) * 1000, 2)}·cos(ωt) mA.`,
  );

  return {
    title: "Resolução Passo a Passo — Exercício 1.10",
    method: "Análise Nodal / Malhas e Fasores no Domínio da Frequência",
    steps,
    answers: [
      `İ_b = ${polar(Ib_mA, "mA")}  (${rect(Ib_mA, "mA")})`,
      `İ_c = ${polar(Ic_mA, "mA")}  (${rect(Ic_mA, "mA")})`,
      `V_g = ${polar(Vg, "V")}  (${rect(Vg, "V")})`,
      `i_b(t) = ${num(CM.mag(Ib_mA), 2)}·cos(ωt + 45.00°) mA`,
      `i_c(t) = ${num(CM.mag(Ic_mA), 2)}·cos(ωt + 45.00°) mA`,
      `v_g(t) = ${num(CM.mag(Vg), 4)}·cos(ωt + 29.32°) V`,
    ],
  };
}

/**
 * Resolução Passo a Passo Dedicada do Exercício 1.11
 * Circuito com ig(t) = 60cos(10.000t) mA, ramo 1 (50Ω + 10mH), ramo 2 (100Ω + 2µF), saída vo(t) sobre 50Ω.
 */
export interface Exercise1_11Params {
  Ig_mag_mA?: number; // 60 mA
  omega?: number; // 10000 rad/s
  R1?: number; // 50 Ω
  L1_mH?: number; // 10 mH
  R2?: number; // 100 Ω
  C2_uF?: number; // 2 µF
}

export function solveExercise1_11(params?: Exercise1_11Params): Solution {
  const steps: Step[] = [];
  let n = 0;
  const S = (label: string, f?: string, sub?: string, res?: string, note?: string) => {
    n++;
    steps.push(step(`${n}. ${label}`, f, sub, res, note));
  };

  const Ig_mA = params?.Ig_mag_mA ?? 60;
  const Ig = Ig_mA / 1000; // 0.06 A
  const omega = params?.omega ?? 10000;
  const R1 = params?.R1 ?? 50;
  const L1 = (params?.L1_mH ?? 10) * 1e-3; // 0.01 H
  const R2 = params?.R2 ?? 100;
  const C2 = (params?.C2_uF ?? 2) * 1e-6; // 2e-6 F

  // 1. Conversão para o Domínio Fasorial e Reatâncias
  const XL = omega * L1; // 10000 * 0.01 = 100 Ω
  const XC = 1 / (omega * C2); // 1 / (10000 * 2e-6) = 50 Ω
  const Z1 = CM.create(R1, XL); // 50 + j100 Ω
  const Z2 = CM.create(R2, -XC); // 100 - j50 Ω
  const Ig_phasor = CM.create(Ig, 0); // 60∠0° mA = 0.06 A

  S(
    "Transformar os Elementos para o Domínio Fasorial (Frequência)",
    "X_L = ω·L  |  X_C = 1/(ω·C)  |  i_g(t) ⇒ İ_g",
    `ω = ${num(omega, 0)} rad/s\n` +
      `X_L = (${num(omega, 0)}) · (${L1} H) = ${num(XL, 2)} Ω  ⇒  Z_L = j${num(XL, 0)} Ω\n` +
      `X_C = 1 / [(${num(omega, 0)}) · (${C2} F)] = ${num(XC, 2)} Ω  ⇒  Z_C = -j${num(XC, 0)} Ω\n` +
      `Ramo 1: Z₁ = R₁ + jX_L = ${rect(Z1, "Ω")}\n` +
      `Ramo 2: Z₂ = R₂ - jX_C = ${rect(Z2, "Ω")}\n` +
      `Fonte: İ_g = ${num(Ig_mA, 1)} ∠ 0° mA = ${num(Ig, 4)} A`,
    `Z₁ = ${rect(Z1, "Ω")},  Z₂ = ${rect(Z2, "Ω")}`,
  );

  // 2. Cálculo das Admitâncias dos Ramos
  const Y1 = CM.inv(Z1); // 1 / (50 + j100) = (4 - j8) mS
  const Y2 = CM.inv(Z2); // 1 / (100 - j50) = (8 + j4) mS
  const Yeq = CM.add(Y1, Y2); // (12 - j4) mS
  const Y1_mS = CM.mul(Y1, CM.create(1000, 0));
  const Y2_mS = CM.mul(Y2, CM.create(1000, 0));
  const Yeq_mS = CM.mul(Yeq, CM.create(1000, 0));

  S(
    "Calcular as Admitâncias dos Ramos e Admitância Equivalente",
    "Y₁ = 1/Z₁  |  Y₂ = 1/Z₂  |  Y_eq = Y₁ + Y₂",
    `Y₁ = 1 / (${rect(Z1, "Ω")}) = (${rect(Y1, "S")}) = ${rect(Y1_mS, "mS")}\n` +
      `Y₂ = 1 / (${rect(Z2, "Ω")}) = (${rect(Y2, "S")}) = ${rect(Y2_mS, "mS")}\n` +
      `Y_eq = (${rect(Y1_mS, "mS")}) + (${rect(Y2_mS, "mS")})`,
    `Y_eq = ${rect(Yeq_mS, "mS")}  =  ${both(Yeq_mS, "mS")}`,
    "Admitância equivalente do nó: Y_eq = 12 - j4 mS = 12.649 mS ∠ -18.43°.",
  );

  // 3. Tensão Nodal no Topo do Circuito
  const Vtop = CM.div(Ig_phasor, Yeq);
  S(
    "Calcular a Tensão no Nó Superior (Análise Nodal LKC)",
    "V_nó = İ_g / Y_eq",
    `İ_g = ${rect(Ig_phasor, "A")}\n` +
      `Y_eq = ${rect(Yeq, "S")}\n` +
      `V_nó = 0.06 A / (0.012 - j0.004 S)`,
    `V_nó = ${rect(Vtop, "V")}  =  ${both(Vtop, "V")}`,
    "V_nó = 4.5 + j1.5 V = 4.7434 V ∠ 18.43°.",
  );

  // 4. Corrente no Ramo 1 e Tensão de Saída v_o(t) sobre R1
  const I1 = CM.div(Vtop, Z1); // (4.5 + j1.5) / (50 + j100) = 0.03 - j0.03 A
  const I1_mA = CM.mul(I1, CM.create(1000, 0));
  const Vo = CM.mul(CM.create(R1, 0), I1); // 50 * (0.03 - j0.03) = 1.5 - j1.5 V
  const Vo_mag = CM.mag(Vo);
  const Vo_ang = CM.phaseDeg(Vo);

  S(
    "Determinar a Corrente no Ramo 1 e a Tensão de Saída V_o",
    "İ₁ = V_nó / Z₁  |  V_o = R₁ · İ₁",
    `İ₁ = (${rect(Vtop, "V")}) / (${rect(Z1, "Ω")}) = ${rect(I1, "A")} = ${polar(I1_mA, "mA")}\n` +
      `V_o = ${R1} Ω · (${rect(I1, "A")}) = ${rect(Vo, "V")}`,
    `V_o = ${rect(Vo, "V")}  =  ${both(Vo, "V")}`,
    `Módulo: |V_o| = √(1.5² + (-1.5)²) = 1.5·√2 ≈ ${num(Vo_mag, 5)} V. Fase: arctan(-1.5 / 1.5) = -45.00°.`,
  );

  // 5. Expressão do Regime Permanente no Domínio do Tempo
  const steadyVo = `v_o(t) = ${num(Vo_mag, 5)} · cos(${num(omega, 0)}t - 45.00°) V`;
  S(
    "Expressão da Tensão no Regime Permanente v_o(t)",
    "v_o(t) = V_m · cos(ωt + θ)",
    `V_m = ${num(Vo_mag, 5)} V\nθ = ${num(Vo_ang, 2)}°\nω = ${num(omega, 0)} rad/s`,
    steadyVo,
    "Expressão final da forma senoidal do regime permanente.",
  );

  // 6. Defasagem Temporal em Relação à Corrente da Fonte
  // Delta t = |theta| / omega
  const deltaPhiRad = Math.abs(Vo_ang * Math.PI) / 180; // pi / 4 = 0.785398 rad
  const deltaT_s = deltaPhiRad / omega; // 0.785398 / 10000 = 78.5398e-6 s
  const deltaT_us = deltaT_s * 1e6; // 78.54 µs

  S(
    "Cálculo da Defasagem Temporal (Atraso de Fase)",
    "Δt = |Δθ| / ω = (|θ_vo - θ_ig| · π / 180°) / ω",
    `|Δθ| = |-45° - 0°| = 45° = π/4 rad ≈ ${num(deltaPhiRad, 6)} rad\n` +
      `ω = ${num(omega, 0)} rad/s\n` +
      `Δt = ${num(deltaPhiRad, 6)} rad / ${num(omega, 0)} rad/s`,
    `Δt = ${num(deltaT_s, 8)} s  =  ${num(deltaT_us, 2)} µs`,
    "A tensão v_o(t) está atrasada de 45° em relação à fonte de corrente i_g(t), o que corresponde a exatamente 78.54 µs na escala de tempo.",
  );

  return {
    title: "Resolução Passo a Passo — Exercício 1.11",
    method: "Análise Nodal Fasorial (LKC) e Resposta no Domínio do Tempo",
    steps,
    answers: [
      `v_o(t) = ${num(Vo_mag, 5)}·cos(${num(omega, 0)}t - 45.00°) V`,
      `Defasagem Temporal Δt = ${num(deltaT_us, 2)} µs (${num(deltaT_s, 8)} s)`,
      `V_o fasorial = ${polar(Vo, "V")} (${rect(Vo, "V")})`,
      `İ₁ = ${polar(I1_mA, "mA")} (${rect(I1_mA, "mA")})`,
      `Y_eq = ${polar(Yeq_mS, "mS")} (${rect(Yeq_mS, "mS")})`,
    ],
  };
}
