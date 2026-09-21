// Listas 4 e 5 — Circuitos trifásicos equilibrados e desequilibrados.
import { CM, Complex, Solution, Step, both, fromPolar, num, polar, rect, step } from "./core";

export type Sequence = "ABC" | "ACB";
export type Conn = "Y" | "DELTA";

export interface BalancedRequest {
  /** Tensão de linha eficaz (V) */
  vLine: number;
  /** Ângulo de referência de V_AB (fonte Δ) ou V_AN (fonte Y) */
  refAngle: number;
  refIsPhase: boolean; // true = valor informado é de fase
  sequence: Sequence;
  sourceConn: Conn;
  loadConn: Conn;
  zLoad: Complex; // impedância por fase da carga
  zLine: Complex; // impedância da linha (0 se desprezível)
}

const S3 = Math.sqrt(3);

function triple(mag: number, ang: number, seq: Sequence): [Complex, Complex, Complex] {
  const d = seq === "ABC" ? -120 : 120;
  return [fromPolar(mag, ang), fromPolar(mag, ang + d), fromPolar(mag, ang + 2 * d)];
}

export function solveBalanced(req: BalancedRequest): Solution {
  const steps: Step[] = [];
  let n = 0;
  const S = (label: string, f?: string, sub?: string, res?: string, note?: string) => {
    n++;
    steps.push(step(`${n}. ${label}`, f, sub, res, note));
  };

  const vPhaseMag = req.refIsPhase ? req.vLine : req.vLine / S3;
  const vLineMag = req.refIsPhase ? req.vLine * S3 : req.vLine;
  const vanAngle = req.refIsPhase ? req.refAngle : req.refAngle - 30;

  S(
    "Tensões da fonte",
    "V_linha = √3 · V_fase (fonte Y);  V_AB adianta V_AN em 30° na sequência ABC",
    `V_fase = ${num(vPhaseMag)} V,  V_linha = ${num(vLineMag)} V`,
    `V_AN = ${num(vPhaseMag)} ∠ ${num(vanAngle)}° V`,
    `Sequência ${req.sequence}`,
  );

  const [Van, Vbn, Vcn] = triple(vPhaseMag, vanAngle, req.sequence);
  S(
    "Sistema equilibrado de tensões de fase",
    "As três tensões têm mesmo módulo e 120° de defasagem",
    `V_AN = ${polar(Van, "V")}\nV_BN = ${polar(Vbn, "V")}\nV_CN = ${polar(Vcn, "V")}`,
  );

  let zY = req.zLoad;
  if (req.loadConn === "DELTA") {
    zY = CM.div(req.zLoad, CM.create(3, 0));
    S(
      "Converter a carga Δ em Y equivalente",
      "Z_Y = Z_Δ / 3",
      `Z_Δ = ${rect(req.zLoad, "Ω")} → Z_Y = ${rect(zY, "Ω")}`,
      undefined,
      "Assim o circuito por fase pode ser resolvido em Y.",
    );
  }

  const zTotal = CM.add(zY, req.zLine);
  S(
    "Impedância total por fase",
    "Z_total = Z_linha + Z_Y",
    `Z_total = ${rect(req.zLine, "Ω")} + ${rect(zY, "Ω")}`,
    `Z_total = ${both(zTotal, "Ω")}`,
  );

  const Ia = CM.div(Van, zTotal);
  const [IaC, IbC, IcC] = triple(CM.mag(Ia), CM.phaseDeg(Ia), req.sequence);
  S(
    "Corrente de linha pelo circuito monofásico equivalente",
    "I_A = V_AN / Z_total",
    `I_A = ${polar(Van, "V")} / ${polar(zTotal, "Ω")}`,
    `I_A = ${both(IaC, "A")}\nI_B = ${polar(IbC, "A")}\nI_C = ${polar(IcC, "A")}`,
  );

  let iPhase = IaC;
  if (req.loadConn === "DELTA") {
    iPhase = CM.div(IaC, fromPolar(S3, req.sequence === "ABC" ? -30 : 30));
    S(
      "Corrente de fase na carga Δ",
      "I_fase = I_linha / (√3 ∠ ∓30°)",
      `I_AB = ${polar(IaC, "A")} / (√3 ∠ ${req.sequence === "ABC" ? "−30" : "+30"}°)`,
      `I_AB = ${both(iPhase, "A")}`,
    );
  }

  const vLoad = CM.mul(iPhase, req.loadConn === "DELTA" ? req.zLoad : zY);
  S(
    "Tensão sobre a carga",
    req.loadConn === "DELTA" ? "V_AB(carga) = I_AB · Z_Δ" : "V_AN(carga) = I_A · Z_Y",
    `= ${polar(iPhase, "A")} · ${polar(req.loadConn === "DELTA" ? req.zLoad : zY, "Ω")}`,
    `= ${both(vLoad, "V")}`,
  );

  const sPhase = CM.mul(vLoad, CM.create(iPhase.r, -iPhase.i));
  const sTotal = CM.mul(CM.create(3, 0), sPhase);
  const fp = Math.cos((CM.phaseDeg(sTotal) * Math.PI) / 180);
  S(
    "Potências (por fase e totais)",
    "S_fase = V_fase · I_fase*,   S_total = 3 · S_fase = √3 · V_L · I_L ∠ θ",
    `S_fase = ${rect(sPhase, "VA")}`,
    `S_total = ${rect(sTotal, "VA")} = ${polar(sTotal, "VA")}\nP = ${num(sTotal.r)} W,  Q = ${num(sTotal.i)} var,  fp = ${num(fp)}`,
  );

  return {
    title: `Circuito trifásico equilibrado ${req.sourceConn === "Y" ? "Y" : "Δ"}–${req.loadConn === "Y" ? "Y" : "Δ"}`,
    method: "Circuito monofásico equivalente por fase (sequência " + req.sequence + ")",
    steps,
    answers: [
      `I_linha = ${polar(IaC, "A")}`,
      req.loadConn === "DELTA" ? `I_fase (carga) = ${polar(iPhase, "A")}` : `V_fase (carga) = ${polar(vLoad, "V")}`,
      `S_total = ${rect(sTotal, "VA")} (P = ${num(sTotal.r)} W, Q = ${num(sTotal.i)} var, fp = ${num(fp)})`,
    ],
  };
}

export interface UnbalancedRequest {
  vLine: number;
  refAngle: number;
  refIsPhase: boolean;
  sequence: Sequence;
  topology: "Y_Y_4W" | "Y_Y_3W" | "DELTA_LOAD";
  za: Complex;
  zb: Complex;
  zc: Complex;
  zLine: Complex;
}

export function solveUnbalanced(req: UnbalancedRequest): Solution {
  const steps: Step[] = [];
  let n = 0;
  const S = (label: string, f?: string, sub?: string, res?: string, note?: string) => {
    n++;
    steps.push(step(`${n}. ${label}`, f, sub, res, note));
  };

  const vPhaseMag = req.refIsPhase ? req.vLine : req.vLine / S3;
  const vanAngle = req.refIsPhase ? req.refAngle : req.refAngle - 30;
  const [Van, Vbn, Vcn] = triple(vPhaseMag, vanAngle, req.sequence);

  S(
    "Tensões da fonte (equilibradas)",
    "V_fase = V_linha/√3 para fonte Y",
    `V_AN = ${polar(Van, "V")}\nV_BN = ${polar(Vbn, "V")}\nV_CN = ${polar(Vcn, "V")}`,
    undefined,
    `Sequência ${req.sequence}. A carga é desequilibrada, então cada fase é calculada separadamente.`,
  );

  const zA = CM.add(req.za, req.zLine);
  const zB = CM.add(req.zb, req.zLine);
  const zC = CM.add(req.zc, req.zLine);

  if (req.topology === "Y_Y_4W") {
    S(
      "Impedância total de cada fase",
      "Z_k = Z_linha + Z_carga,k",
      `Z_A = ${rect(zA, "Ω")}\nZ_B = ${rect(zB, "Ω")}\nZ_C = ${rect(zC, "Ω")}`,
      undefined,
      "Com neutro (4 fios) as fases ficam independentes.",
    );
    const Ia = CM.div(Van, zA);
    const Ib = CM.div(Vbn, zB);
    const Ic = CM.div(Vcn, zC);
    const In = CM.sub(CM.create(0, 0), CM.add(CM.add(Ia, Ib), Ic));
    S(
      "Correntes de linha",
      "I_k = V_kN / Z_k",
      `I_A = ${polar(Van, "V")}/${polar(zA, "Ω")} = ${both(Ia, "A")}\nI_B = ${both(Ib, "A")}\nI_C = ${both(Ic, "A")}`,
    );
    S(
      "Corrente de neutro",
      "I_N = −(I_A + I_B + I_C)",
      `Soma = ${rect(CM.add(CM.add(Ia, Ib), Ic), "A")}`,
      `I_N = ${both(In, "A")}`,
    );
    const sa = CM.mul(CM.mul(Ia, req.za), CM.create(Ia.r, -Ia.i));
    const sb = CM.mul(CM.mul(Ib, req.zb), CM.create(Ib.r, -Ib.i));
    const sc = CM.mul(CM.mul(Ic, req.zc), CM.create(Ic.r, -Ic.i));
    const st = CM.add(CM.add(sa, sb), sc);
    S(
      "Potência de cada fase e total",
      "S_k = V_k(carga)·I_k* = |I_k|²·Z_k,   S_total = ΣS_k",
      `S_A = ${rect(sa, "VA")}\nS_B = ${rect(sb, "VA")}\nS_C = ${rect(sc, "VA")}`,
      `S_total = ${rect(st, "VA")} → P = ${num(st.r)} W, Q = ${num(st.i)} var`,
    );
    return {
      title: "Trifásico desequilibrado Y–Y com neutro (4 fios)",
      method: "Fases independentes",
      steps,
      answers: [
        `I_A = ${polar(Ia, "A")}`,
        `I_B = ${polar(Ib, "A")}`,
        `I_C = ${polar(Ic, "A")}`,
        `I_N = ${polar(In, "A")}`,
        `S_total = ${rect(st, "VA")}`,
      ],
    };
  }

  if (req.topology === "Y_Y_3W") {
    const ya = CM.inv(zA);
    const yb = CM.inv(zB);
    const yc = CM.inv(zC);
    const ySum = CM.add(CM.add(ya, yb), yc);
    S(
      "Admitância de cada fase",
      "Y_k = 1/Z_k",
      `Y_A = ${rect(ya, "S")}\nY_B = ${rect(yb, "S")}\nY_C = ${rect(yc, "S")}\nΣY = ${rect(ySum, "S")}`,
    );
    const numer = CM.add(CM.add(CM.mul(Van, ya), CM.mul(Vbn, yb)), CM.mul(Vcn, yc));
    const vnN = CM.div(numer, ySum);
    S(
      "Deslocamento do neutro (teorema de Millman)",
      "V_nN = (V_AN·Y_A + V_BN·Y_B + V_CN·Y_C) / (Y_A + Y_B + Y_C)",
      `Numerador = ${rect(numer, "A")}`,
      `V_nN = ${both(vnN, "V")}`,
      "Sem fio de neutro o ponto n da carga se desloca em relação a N.",
    );
    const Ia = CM.mul(CM.sub(Van, vnN), ya);
    const Ib = CM.mul(CM.sub(Vbn, vnN), yb);
    const Ic = CM.mul(CM.sub(Vcn, vnN), yc);
    S(
      "Correntes de linha",
      "I_k = (V_kN − V_nN)·Y_k",
      `I_A = ${both(Ia, "A")}\nI_B = ${both(Ib, "A")}\nI_C = ${both(Ic, "A")}`,
      `Verificação: I_A + I_B + I_C = ${rect(CM.add(CM.add(Ia, Ib), Ic), "A")} ≈ 0`,
    );
    const va = CM.mul(Ia, req.za);
    const vb = CM.mul(Ib, req.zb);
    const vc = CM.mul(Ic, req.zc);
    S(
      "Tensões sobre cada fase da carga",
      "V_k(carga) = I_k · Z_k",
      `V_A = ${polar(va, "V")}\nV_B = ${polar(vb, "V")}\nV_C = ${polar(vc, "V")}`,
    );
    const st = CM.add(
      CM.add(CM.mul(va, CM.create(Ia.r, -Ia.i)), CM.mul(vb, CM.create(Ib.r, -Ib.i))),
      CM.mul(vc, CM.create(Ic.r, -Ic.i)),
    );
    S("Potência total", "S_total = ΣV_k·I_k*", `S_total = ${rect(st, "VA")}`, `P = ${num(st.r)} W, Q = ${num(st.i)} var`);
    return {
      title: "Trifásico desequilibrado Y–Y a 3 fios",
      method: "Deslocamento de neutro (Millman)",
      steps,
      answers: [
        `V_nN = ${polar(vnN, "V")}`,
        `I_A = ${polar(Ia, "A")}`,
        `I_B = ${polar(Ib, "A")}`,
        `I_C = ${polar(Ic, "A")}`,
        `S_total = ${rect(st, "VA")}`,
      ],
    };
  }

  // Carga em Δ desequilibrada
  const vabMag = req.refIsPhase ? req.vLine * S3 : req.vLine;
  const vabAng = req.refIsPhase ? req.refAngle + 30 : req.refAngle;
  const [Vab, Vbc, Vca] = triple(vabMag, vabAng, req.sequence);
  S(
    "Tensões de linha aplicadas ao Δ",
    "V_AB, V_BC, V_CA formam sistema equilibrado",
    `V_AB = ${polar(Vab, "V")}\nV_BC = ${polar(Vbc, "V")}\nV_CA = ${polar(Vca, "V")}`,
  );
  const Iab = CM.div(Vab, req.za);
  const Ibc = CM.div(Vbc, req.zb);
  const Ica = CM.div(Vca, req.zc);
  S(
    "Correntes de fase (cada ramo do Δ)",
    "I_AB = V_AB/Z_AB, etc.",
    `I_AB = ${both(Iab, "A")}\nI_BC = ${both(Ibc, "A")}\nI_CA = ${both(Ica, "A")}`,
  );
  const Ia = CM.sub(Iab, Ica);
  const Ib = CM.sub(Ibc, Iab);
  const Ic = CM.sub(Ica, Ibc);
  S(
    "Correntes de linha pela LKC nos nós",
    "I_A = I_AB − I_CA,  I_B = I_BC − I_AB,  I_C = I_CA − I_BC",
    `I_A = ${both(Ia, "A")}\nI_B = ${both(Ib, "A")}\nI_C = ${both(Ic, "A")}`,
  );
  const st = CM.add(
    CM.add(CM.mul(Vab, CM.create(Iab.r, -Iab.i)), CM.mul(Vbc, CM.create(Ibc.r, -Ibc.i))),
    CM.mul(Vca, CM.create(Ica.r, -Ica.i)),
  );
  S("Potência total", "S_total = ΣV_fase·I_fase*", `S_total = ${rect(st, "VA")}`, `P = ${num(st.r)} W, Q = ${num(st.i)} var`);
  return {
    title: "Trifásico desequilibrado com carga em Δ",
    method: "Correntes de fase + LKC nos nós",
    steps,
    answers: [
      `I_AB = ${polar(Iab, "A")}`,
      `I_BC = ${polar(Ibc, "A")}`,
      `I_CA = ${polar(Ica, "A")}`,
      `I_A = ${polar(Ia, "A")}, I_B = ${polar(Ib, "A")}, I_C = ${polar(Ic, "A")}`,
      `S_total = ${rect(st, "VA")}`,
    ],
  };
}
