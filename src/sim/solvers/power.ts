// Lista 3 — Análise de potência CA: potência complexa, fator de potência, correção e máxima transferência.
import { CM, Complex, Solution, Step, both, fromPolar, num, polar, rect, step } from "./core";

export type AmplitudeConvention = "PEAK" | "RMS";

export interface PowerRequest {
  vMag: number;
  vAng: number;
  iMag: number;
  iAng: number;
  convention: AmplitudeConvention;
}

/** S = V·I conjugado (eficazes) ou metade disso quando os valores são de pico. */
export function solveComplexPower(req: PowerRequest): Solution {
  const steps: Step[] = [];
  const V = fromPolar(req.vMag, req.vAng);
  const I = fromPolar(req.iMag, req.iAng);
  const peak = req.convention === "PEAK";

  steps.push(
    step(
      "1. Fasores de tensão e corrente",
      "V = Vm ∠ θv,  I = Im ∠ θi",
      `V = ${num(req.vMag)} ∠ ${num(req.vAng)}° = ${rect(V, "V")}\nI = ${num(req.iMag)} ∠ ${num(req.iAng)}° = ${rect(I, "A")}`,
      peak ? "Valores informados como amplitude de pico." : "Valores informados como eficazes (RMS).",
    ),
  );

  const vRms = peak ? req.vMag / Math.SQRT2 : req.vMag;
  const iRms = peak ? req.iMag / Math.SQRT2 : req.iMag;
  if (peak) {
    steps.push(
      step(
        "2. Converter para valores eficazes",
        "V_rms = Vm/√2,  I_rms = Im/√2",
        `V_rms = ${num(req.vMag)}/√2 = ${num(vRms)} V\nI_rms = ${num(req.iMag)}/√2 = ${num(iRms)} A`,
      ),
    );
  }

  const Iconj = CM.create(I.r, -I.i);
  const S = peak ? CM.div(CM.mul(V, Iconj), CM.create(2, 0)) : CM.mul(V, Iconj);
  const theta = req.vAng - req.iAng;
  const fp = Math.cos((theta * Math.PI) / 180);

  steps.push(
    step(
      `${peak ? 3 : 2}. Potência complexa`,
      peak ? "S = ½ · V · I*" : "S = V · I*",
      `I* = ${rect(Iconj, "A")}\nS = ${peak ? "½ · " : ""}(${polar(V, "V")})·(${num(req.iMag)} ∠ ${num(-req.iAng)}°)`,
      `S = ${both(S, "VA")}`,
    ),
  );
  steps.push(
    step(
      `${peak ? 4 : 3}. Separar P e Q`,
      "S = P + jQ,  P = V_rms·I_rms·cos θ,  Q = V_rms·I_rms·sen θ",
      `θ = θv − θi = ${num(req.vAng)}° − (${num(req.iAng)}°) = ${num(theta)}°`,
      `P = ${num(S.r)} W\nQ = ${num(S.i)} var\n|S| = ${num(CM.mag(S))} VA`,
    ),
  );
  steps.push(
    step(
      `${peak ? 5 : 4}. Fator de potência`,
      "fp = cos θ = P/|S|",
      `fp = cos(${num(theta)}°) = ${num(fp)}`,
      `${fp >= 0.9999 ? "Carga resistiva" : theta > 0 ? "Atrasado (indutivo)" : "Adiantado (capacitivo)"}`,
    ),
  );

  return {
    title: "Potência complexa, P, Q e fator de potência",
    method: "Método fasorial — S = V·I*",
    steps,
    answers: [
      `S = ${rect(S, "VA")} = ${polar(S, "VA")}`,
      `P = ${num(S.r)} W,  Q = ${num(S.i)} var`,
      `fp = ${num(fp)} ${theta > 0 ? "atrasado" : theta < 0 ? "adiantado" : ""}`,
    ],
  };
}

export interface PfCorrectionRequest {
  p: number; // W
  fp1: number;
  fp2: number;
  vRms: number; // V
  freq: number; // Hz
  lagging?: boolean;
}

export function solvePfCorrection(req: PfCorrectionRequest): Solution {
  const steps: Step[] = [];
  const th1 = Math.acos(req.fp1);
  const th2 = Math.acos(req.fp2);
  const q1 = req.p * Math.tan(th1);
  const q2 = req.p * Math.tan(th2);
  const qc = q1 - q2;
  const w = 2 * Math.PI * req.freq;
  const c = qc / (w * req.vRms * req.vRms);

  steps.push(
    step(
      "1. Ângulos dos fatores de potência",
      "θ = arccos(fp)",
      `θ₁ = arccos(${num(req.fp1)}) = ${num((th1 * 180) / Math.PI)}°\nθ₂ = arccos(${num(req.fp2)}) = ${num((th2 * 180) / Math.PI)}°`,
    ),
    step(
      "2. Potência reativa antes e depois",
      "Q = P · tg θ",
      `Q₁ = ${num(req.p)}·tg(${num((th1 * 180) / Math.PI)}°) = ${num(q1)} var\nQ₂ = ${num(req.p)}·tg(${num((th2 * 180) / Math.PI)}°) = ${num(q2)} var`,
    ),
    step(
      "3. Reativo que o capacitor deve fornecer",
      "Q_C = Q₁ − Q₂",
      `Q_C = ${num(q1)} − ${num(q2)} = ${num(qc)} var`,
    ),
    step(
      "4. Capacitância em paralelo",
      "C = Q_C / (ω · V_rms²),  ω = 2πf",
      `ω = 2π·${num(req.freq, 4)} = ${num(w)} rad/s\nC = ${num(qc)} / (${num(w)}·${num(req.vRms)}²)`,
      `C = ${num(c * 1e6)} µF`,
    ),
    step(
      "5. Nova potência aparente",
      "|S₂| = P / fp₂",
      `|S₂| = ${num(req.p)}/${num(req.fp2)} = ${num(req.p / req.fp2)} VA`,
    ),
  );

  return {
    title: "Correção do fator de potência",
    method: "Triângulo de potências + capacitor em paralelo",
    steps,
    answers: [`Q_C = ${num(qc)} var`, `C = ${num(c * 1e6)} µF`, `|S₂| = ${num(req.p / req.fp2)} VA`],
  };
}

export function solveMaxPower(
  vthMag: number,
  vthAng: number,
  zth: Complex,
  convention: AmplitudeConvention,
): Solution {
  const zl = CM.create(zth.r, -zth.i);
  const peak = convention === "PEAK";
  const pmax = peak
    ? (vthMag * vthMag) / (8 * zth.r)
    : (vthMag * vthMag) / (4 * zth.r);
  const steps: Step[] = [
    step(
      "1. Condição de máxima transferência",
      "Z_L = Z_th*  (conjugado)",
      `Z_th = ${rect(zth, "Ω")} → Z_L = ${rect(zl, "Ω")}`,
    ),
    step(
      "2. Corrente na carga",
      "I = V_th / (Z_th + Z_L) = V_th / (2R_th)",
      `I = ${num(vthMag)} ∠ ${num(vthAng)}° / (2·${num(zth.r)}) = ${num(vthMag / (2 * zth.r))} ∠ ${num(vthAng)}°`,
    ),
    step(
      "3. Potência máxima",
      peak ? "P_max = |V_th|² / (8 R_th)" : "P_max = |V_th|² / (4 R_th)",
      `P_max = ${num(vthMag)}² / (${peak ? 8 : 4}·${num(zth.r)})`,
      `P_max = ${num(pmax)} W`,
    ),
  ];
  return {
    title: "Máxima transferência de potência",
    method: "Casamento conjugado de impedâncias",
    steps,
    answers: [`Z_L = ${rect(zl, "Ω")}`, `P_max = ${num(pmax)} W`],
  };
}
