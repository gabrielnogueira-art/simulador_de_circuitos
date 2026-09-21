// Lista 1 — Senoides e fasores: defasagem e combinação de senoides.
import { CM, Complex, Solution, Step, both, fromPolar, num, polar, step, wrapDeg } from "./core";

export interface Sinusoid {
  amplitude: number;
  func: "cos" | "sin";
  omega: number;
  phaseDeg: number;
  raw: string;
}

function normalize(input: string): string {
  return input
    .replace(/[−–]/g, "-")
    .replace(/\s+/g, "")
    .replace(/sen/gi, "sin")
    .replace(/(\d)\.(\d{3})(?!\d)/g, "$1$2") // 1.000 -> 1000 (separador de milhar)
    .replace(/,/g, ".")
    .replace(/°/g, "")
    .toLowerCase();
}

/** Converte uma senoide qualquer para a referência cosseno: A cos(ωt + φ) */
export function toCosine(s: Sinusoid): Sinusoid {
  let A = s.amplitude;
  // A sen(θ) = A cos(θ − 90°)
  let phase = s.func === "sin" ? s.phaseDeg - 90 : s.phaseDeg;
  if (A < 0) {
    A = -A;
    phase += 180;
  }
  return { amplitude: A, func: "cos", omega: s.omega, phaseDeg: wrapDeg(phase), raw: s.raw };
}

export function phasorOf(s: Sinusoid): Complex {
  const c = toCosine(s);
  return fromPolar(c.amplitude, c.phaseDeg);
}

/** Interpreta termos do tipo "8cos(3t-45)" ou "-10sin15t" */
export function parseTerms(input: string): Sinusoid[] {
  const text = normalize(input);
  const re = /([+-]?)(\d*\.?\d*)\*?(cos|sin)\(?([^)+-]*(?:[+-][^)]*)?)\)?/g;
  const out: Sinusoid[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const sign = m[1] === "-" ? -1 : 1;
    const amp = m[2] === "" ? 1 : parseFloat(m[2]);
    const func = m[3] as "cos" | "sin";
    const arg = m[4] ?? "";
    const argMatch = arg.match(/^([\d.]*)t([+-][\d.]+)?/);
    if (!argMatch) continue;
    const omega = argMatch[1] === "" ? 1 : parseFloat(argMatch[1]);
    const phase = argMatch[2] ? parseFloat(argMatch[2]) : 0;
    out.push({
      amplitude: sign * amp,
      func,
      omega,
      phaseDeg: phase,
      raw: m[0],
    });
  }
  return out;
}

function fmtSin(s: Sinusoid, unit: string): string {
  const sign = s.phaseDeg >= 0 ? "+" : "−";
  const ph = Math.abs(s.phaseDeg) < 5e-5 ? "" : ` ${sign} ${num(Math.abs(s.phaseDeg))}°`;
  return `${num(s.amplitude)} ${s.func === "cos" ? "cos" : "sen"}(${num(s.omega, 4)}t${ph}) ${unit}`;
}

/** 1.1) Relação de defasagem entre duas senoides */
export function solvePhaseDifference(exprA: string, exprB: string): Solution {
  const a = parseTerms(exprA)[0];
  const b = parseTerms(exprB)[0];
  const steps: Step[] = [];
  if (!a || !b) {
    return {
      title: "Defasagem entre senoides",
      method: "Referência cosseno",
      steps,
      answers: [],
      error: "Não consegui interpretar as senoides. Use o formato 10cos(3t-47) ou 15sen(3t+51).",
    };
  }
  const ca = toCosine(a);
  const cb = toCosine(b);

  steps.push(
    step(
      "1. Colocar as duas funções na referência cosseno",
      "A sen(ωt + θ) = A cos(ωt + θ − 90°)   e   −A cos(x) = A cos(x ± 180°)",
      `1ª função: ${fmtSin(a, "")} → ${fmtSin(ca, "")}\n2ª função: ${fmtSin(b, "")} → ${fmtSin(cb, "")}`,
    ),
  );
  steps.push(
    step(
      "2. Escrever os fasores",
      "F = A ∠ φ",
      `F₁ = ${num(ca.amplitude)} ∠ ${num(ca.phaseDeg)}°\nF₂ = ${num(cb.amplitude)} ∠ ${num(cb.phaseDeg)}°`,
    ),
  );

  const diff = wrapDeg(ca.phaseDeg - cb.phaseDeg);
  const rel =
    Math.abs(diff) < 5e-5
      ? "as duas estão em fase"
      : diff > 0
        ? `a 1ª está ${num(Math.abs(diff))}° adiantada da 2ª`
        : `a 1ª está ${num(Math.abs(diff))}° atrasada da 2ª`;

  steps.push(
    step(
      "3. Calcular a diferença angular",
      "Δφ = φ₁ − φ₂",
      `Δφ = (${num(ca.phaseDeg)}°) − (${num(cb.phaseDeg)}°) = ${num(wrapDeg(ca.phaseDeg - cb.phaseDeg))}°`,
      rel,
    ),
  );

  if (ca.omega > 0) {
    const dt = (Math.abs(diff) / 360) * ((2 * Math.PI) / ca.omega);
    steps.push(
      step(
        "4. Defasagem em tempo",
        "Δt = (|Δφ| / 360°) · T,  com T = 2π/ω",
        `T = 2π/${num(ca.omega, 4)} = ${num((2 * Math.PI) / ca.omega, 6)} s → Δt = ${num(dt * 1e6, 4)} µs = ${num(dt * 1e3, 4)} ms`,
      ),
    );
  }

  return {
    title: "Defasagem entre senoides",
    method: "Conversão para referência cosseno + subtração de fases",
    steps,
    answers: [`Δφ = ${num(diff)}° — ${rel}`],
  };
}

/** 1.2) Combinação de várias senoides de mesma frequência em uma única senoide */
export function solveCombine(expr: string, unit = "V"): Solution {
  const terms = parseTerms(expr);
  const steps: Step[] = [];
  if (terms.length === 0) {
    return {
      title: "Combinação de senoides",
      method: "Soma fasorial",
      steps,
      answers: [],
      error: "Não consegui interpretar a expressão. Exemplo: 8cos(3t-45) - 15sen(3t+80)",
    };
  }
  const omega = terms[0].omega;
  const cosTerms = terms.map(toCosine);

  steps.push(
    step(
      "1. Converter todos os termos para cosseno",
      "A sen(ωt+θ) = A cos(ωt+θ−90°);  −A cos(x) = A cos(x+180°)",
      cosTerms.map((c, i) => `Termo ${i + 1}: ${fmtSin(terms[i], unit)} → ${fmtSin(c, unit)}`).join("\n"),
    ),
  );

  const phasors = cosTerms.map((c) => fromPolar(c.amplitude, c.phaseDeg));
  steps.push(
    step(
      "2. Escrever cada termo como fasor (polar → retangular)",
      "A ∠ φ = A cos φ + j A sen φ",
      phasors
        .map((p, i) => `F${i + 1} = ${num(cosTerms[i].amplitude)} ∠ ${num(cosTerms[i].phaseDeg)}° = ${both(p, "")}`)
        .join("\n"),
    ),
  );

  let sum = CM.create(0, 0);
  phasors.forEach((p) => {
    sum = CM.add(sum, p);
  });
  steps.push(
    step(
      "3. Somar as partes reais e imaginárias",
      "F = ΣFₖ",
      `Real: ${phasors.map((p) => num(p.r)).join(" + ")} = ${num(sum.r)}\nImag: ${phasors
        .map((p) => num(p.i))
        .join(" + ")} = ${num(sum.i)}`,
      `F = ${both(sum, "")}`,
    ),
  );

  const mag = CM.mag(sum);
  const ang = CM.phaseDeg(sum);
  steps.push(
    step(
      "4. Voltar ao domínio do tempo",
      "f(t) = |F| cos(ωt + ∠F)",
      `|F| = ${num(mag)},  ∠F = ${num(ang)}°`,
      `f(t) = ${num(mag)} cos(${num(omega, 4)}t ${ang >= 0 ? "+" : "−"} ${num(Math.abs(ang))}°) ${unit}`,
    ),
  );

  return {
    title: "Combinação de senoides em uma única senoide",
    method: "Soma fasorial (domínio da frequência)",
    steps,
    answers: [
      `Fasor resultante: ${polar(sum, "")}`,
      `f(t) = ${num(mag)} cos(${num(omega, 4)}t ${ang >= 0 ? "+" : "−"} ${num(Math.abs(ang))}°) ${unit}`,
    ],
  };
}

export interface ParsedSourceDef {
  amplitude: number; // Em unidades base (V ou A)
  displayAmplitude: number; // Valor original na unidade informada (ex: 60 para 60 mA)
  unit: 'V' | 'mV' | 'A' | 'mA';
  isMilli: boolean;
  omega: number; // rad/s
  frequency: number; // Hz
  phaseDeg: number; // graus
  real: number; // parte real do fasor na unidade base
  imag: number; // parte imaginária do fasor na unidade base
  polarString: string;
  rectString: string;
  timeFunctionString: string;
  mode: 'TIME_FUNCTION' | 'POLAR_PHASOR' | 'RECT_PHASOR' | 'NUMERIC';
}

/**
 * Parser unificado de fontes para aceitar funções temporais (10cos2t V, 60cos(10.000t) mA),
 * fasores polares (60 ∠ 0°, 40 < 45 mA) e retangulares (40 + j80 mA).
 */
export function parseSourceFunctionOrPhasor(
  input: string,
  defaultKind: 'VOLTAGE' | 'CURRENT' = 'VOLTAGE',
  fallbackOmega: number = 10000
): ParsedSourceDef {
  const raw = (input || '').trim();
  const lower = raw.toLowerCase().replace(/,/g, '.');

  // Detecta se a unidade especificada é mili (mV ou mA)
  const isCurrent = defaultKind === 'CURRENT' || /ma|a\b/i.test(raw);
  const isMilli = /m[av]|mili/i.test(lower) || (isCurrent && !/\b[0-9.]+\s*a\b/i.test(lower));
  const baseUnit = isCurrent ? (isMilli ? 'mA' : 'A') : (isMilli ? 'mV' : 'V');
  const scale = isMilli ? 1e-3 : 1;

  // 1. Tenta interpretar como função temporal (ex: 10cos(2t), 60cos 10.000t mA)
  const sinusoids = parseTerms(raw);
  if (sinusoids.length > 0) {
    const s = toCosine(sinusoids[0]);
    const dispAmp = Math.abs(s.amplitude);
    const ampBase = dispAmp * scale;
    const omega = s.omega > 0 ? s.omega : fallbackOmega;
    const phase = wrapDeg(s.phaseDeg);
    const rad = (phase * Math.PI) / 180;
    const real = ampBase * Math.cos(rad);
    const imag = ampBase * Math.sin(rad);

    const sign = phase >= 0 ? '+' : '-';
    const timeFunc = `${dispAmp} cos(${omega >= 1000 ? omega.toLocaleString('pt-BR') : omega}t ${sign} ${Math.abs(phase).toFixed(1)}°) ${baseUnit}`;

    return {
      amplitude: ampBase,
      displayAmplitude: dispAmp,
      unit: baseUnit,
      isMilli,
      omega,
      frequency: omega / (2 * Math.PI),
      phaseDeg: phase,
      real,
      imag,
      polarString: `${dispAmp} ∠ ${phase.toFixed(2)}° ${baseUnit}`,
      rectString: `${(real / scale).toFixed(4)} ${imag >= 0 ? '+' : '-'} j${Math.abs(imag / scale).toFixed(4)} ${baseUnit}`,
      timeFunctionString: timeFunc,
      mode: 'TIME_FUNCTION',
    };
  }

  // 2. Tenta interpretar como fasor polar (ex: 60 < 0, 60 ∠ 0°, 28.2843 < 45)
  const polarMatch = lower.match(/^([+-]?\d*\.?\d+)\s*(?:<|∠|ang)\s*([+-]?\d*\.?\d+)/);
  if (polarMatch) {
    const dispAmp = parseFloat(polarMatch[1]) || 0;
    const phase = wrapDeg(parseFloat(polarMatch[2]) || 0);
    const ampBase = dispAmp * scale;
    const rad = (phase * Math.PI) / 180;
    const real = ampBase * Math.cos(rad);
    const imag = ampBase * Math.sin(rad);
    const omega = fallbackOmega;

    const sign = phase >= 0 ? '+' : '-';
    const timeFunc = `${dispAmp} cos(${omega >= 1000 ? omega.toLocaleString('pt-BR') : omega}t ${sign} ${Math.abs(phase).toFixed(1)}°) ${baseUnit}`;

    return {
      amplitude: ampBase,
      displayAmplitude: dispAmp,
      unit: baseUnit,
      isMilli,
      omega,
      frequency: omega / (2 * Math.PI),
      phaseDeg: phase,
      real,
      imag,
      polarString: `${dispAmp} ∠ ${phase.toFixed(2)}° ${baseUnit}`,
      rectString: `${(real / scale).toFixed(4)} ${imag >= 0 ? '+' : '-'} j${Math.abs(imag / scale).toFixed(4)} ${baseUnit}`,
      timeFunctionString: timeFunc,
      mode: 'POLAR_PHASOR',
    };
  }

  // 3. Tenta interpretar como fasor retangular (ex: 40 + j80 mA, -10 - j5)
  const rectMatch = lower.replace(/\s+/g, '').match(/^([+-]?\d*\.?\d+)?([+-])?j(\d*\.?\d+)?/);
  if (rectMatch && (rectMatch[1] || rectMatch[3])) {
    const rDisp = rectMatch[1] ? parseFloat(rectMatch[1]) : 0;
    const sign = rectMatch[2] === '-' ? -1 : 1;
    const iDisp = sign * (rectMatch[3] ? parseFloat(rectMatch[3]) : 1);

    const magDisp = Math.hypot(rDisp, iDisp);
    const phase = wrapDeg((Math.atan2(iDisp, rDisp) * 180) / Math.PI);
    const ampBase = magDisp * scale;
    const real = rDisp * scale;
    const imag = iDisp * scale;
    const omega = fallbackOmega;

    const pSign = phase >= 0 ? '+' : '-';
    const timeFunc = `${magDisp.toFixed(4)} cos(${omega >= 1000 ? omega.toLocaleString('pt-BR') : omega}t ${pSign} ${Math.abs(phase).toFixed(1)}°) ${baseUnit}`;

    return {
      amplitude: ampBase,
      displayAmplitude: magDisp,
      unit: baseUnit,
      isMilli,
      omega,
      frequency: omega / (2 * Math.PI),
      phaseDeg: phase,
      real,
      imag,
      polarString: `${magDisp.toFixed(4)} ∠ ${phase.toFixed(2)}° ${baseUnit}`,
      rectString: `${rDisp.toFixed(4)} ${iDisp >= 0 ? '+' : '-'} j${Math.abs(iDisp).toFixed(4)} ${baseUnit}`,
      timeFunctionString: timeFunc,
      mode: 'RECT_PHASOR',
    };
  }

  // 4. Fallback numérico simples (ex: "60", "12")
  const numMatch = lower.match(/^([+-]?\d*\.?\d+)/);
  const dispAmp = numMatch ? parseFloat(numMatch[1]) : 10;
  const ampBase = dispAmp * scale;
  const omega = fallbackOmega;

  return {
    amplitude: ampBase,
    displayAmplitude: dispAmp,
    unit: baseUnit,
    isMilli,
    omega,
    frequency: omega / (2 * Math.PI),
    phaseDeg: 0,
    real: ampBase,
    imag: 0,
    polarString: `${dispAmp} ∠ 0.00° ${baseUnit}`,
    rectString: `${dispAmp} + j0.0000 ${baseUnit}`,
    timeFunctionString: `${dispAmp} cos(${omega >= 1000 ? omega.toLocaleString('pt-BR') : omega}t) ${baseUnit}`,
    mode: 'NUMERIC',
  };
}
