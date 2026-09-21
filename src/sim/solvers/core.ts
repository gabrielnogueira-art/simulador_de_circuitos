// Núcleo analítico: números complexos, formatação com 4 casas decimais e tipos de resolução.
import { Complex, ComplexMath as CM } from "../engine/complex";

export type { Complex };
export { CM };

export const DEC = 4;

export function num(v: number, dec = DEC): string {
  if (!isFinite(v)) return "∞";
  const s = v.toFixed(dec);
  return s === "-" + (0).toFixed(dec) ? (0).toFixed(dec) : s;
}

export function rect(z: Complex, unit = "", dec = DEC): string {
  const r = num(z.r, dec);
  const im = Math.abs(z.i);
  const u = unit ? ` ${unit}` : "";
  if (im < 5e-7) return `${r}${u}`;
  const sign = z.i >= 0 ? "+" : "−";
  return `${r} ${sign} j${num(im, dec)}${u}`;
}

export function polar(z: Complex, unit = "", dec = DEC): string {
  const u = unit ? ` ${unit}` : "";
  return `${num(CM.mag(z), dec)}${u} ∠ ${num(CM.phaseDeg(z), dec)}°`;
}

export function both(z: Complex, unit = ""): string {
  return `${rect(z, unit)}  =  ${polar(z, unit)}`;
}

export function fromPolar(mag: number, angleDeg: number): Complex {
  const a = (angleDeg * Math.PI) / 180;
  return { r: mag * Math.cos(a), i: mag * Math.sin(a) };
}

export function sqrtC(z: Complex): Complex {
  const m = Math.sqrt(CM.mag(z));
  const a = CM.phaseDeg(z) / 2;
  return fromPolar(m, a);
}

export interface Step {
  /** Título curto do passo, ex.: "2. Impedância de fase" */
  label: string;
  /** Expressão/fórmula utilizada */
  formula?: string;
  /** Substituição numérica */
  substitution?: string;
  /** Resultado do passo */
  result?: string;
  /** Comentário didático */
  note?: string;
}

export interface Solution {
  title: string;
  method: string;
  steps: Step[];
  answers: string[];
  error?: string;
}

export function step(
  label: string,
  formula?: string,
  substitution?: string,
  result?: string,
  note?: string,
): Step {
  return { label, formula, substitution, result, note };
}

/** Normaliza ângulo para (-180°, 180°] */
export function wrapDeg(a: number): number {
  let x = a % 360;
  if (x > 180) x -= 360;
  if (x <= -180) x += 360;
  return x;
}

/** Resolve sistema linear complexo A·x = b por eliminação de Gauss com pivoteamento parcial. */
export function solveComplex(A: Complex[][], b: Complex[]): Complex[] | null {
  const n = b.length;
  const M = A.map((row) => row.map((c) => ({ ...c })));
  const y = b.map((c) => ({ ...c }));

  for (let k = 0; k < n; k++) {
    let best = k;
    let bestMag = CM.mag(M[k][k]);
    for (let i = k + 1; i < n; i++) {
      const m = CM.mag(M[i][k]);
      if (m > bestMag) {
        bestMag = m;
        best = i;
      }
    }
    if (bestMag < 1e-12) return null;
    if (best !== k) {
      [M[k], M[best]] = [M[best], M[k]];
      [y[k], y[best]] = [y[best], y[k]];
    }
    const piv = M[k][k];
    for (let i = k + 1; i < n; i++) {
      const f = CM.div(M[i][k], piv);
      M[i][k] = CM.create(0, 0);
      for (let j = k + 1; j < n; j++) M[i][j] = CM.sub(M[i][j], CM.mul(f, M[k][j]));
      y[i] = CM.sub(y[i], CM.mul(f, y[k]));
    }
  }

  const x: Complex[] = Array.from({ length: n }, () => CM.create(0, 0));
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let j = i + 1; j < n; j++) s = CM.sub(s, CM.mul(M[i][j], x[j]));
    x[i] = CM.div(s, M[i][i]);
  }
  return x;
}

/** Raízes de polinômio (coeficientes do maior para o menor grau) — método de Durand-Kerner. */
export function polyRoots(coeffs: number[]): Complex[] {
  const c = [...coeffs];
  while (c.length && Math.abs(c[0]) < 1e-14) c.shift();
  const n = c.length - 1;
  if (n < 1) return [];
  const a = c.map((v) => v / c[0]);
  let roots: Complex[] = Array.from({ length: n }, (_, k) => fromPolar(Math.pow(0.9, 1), 60 * k + 17));
  const evalP = (z: Complex): Complex => {
    let acc = CM.create(a[0], 0);
    for (let i = 1; i <= n; i++) acc = CM.add(CM.mul(acc, z), CM.create(a[i], 0));
    return acc;
  };
  for (let iter = 0; iter < 800; iter++) {
    let maxDelta = 0;
    const next = roots.map((zi, i) => {
      let denom = CM.create(1, 0);
      roots.forEach((zj, j) => {
        if (i !== j) denom = CM.mul(denom, CM.sub(zi, zj));
      });
      const d = CM.div(evalP(zi), denom);
      maxDelta = Math.max(maxDelta, CM.mag(d));
      return CM.sub(zi, d);
    });
    roots = next;
    if (maxDelta < 1e-13) break;
  }
  return roots.map((z) => ({
    r: Math.abs(z.r) < 1e-10 ? 0 : z.r,
    i: Math.abs(z.i) < 1e-10 ? 0 : z.i,
  }));
}
