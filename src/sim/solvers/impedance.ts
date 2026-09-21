// Lista 1 e 2 — Impedância/admitância equivalente com redução série-paralelo passo a passo.
import { CM, Complex, Solution, Step, both, num, polar, rect, step } from "./core";

export type ElementKind = "R" | "L" | "C" | "ZL" | "ZC" | "Z";

export interface ElementInput {
  label: string; // Z1, Z2, ...
  kind: ElementKind;
  value: number; // Ω, H, F  (ZL/ZC = reatância em Ω)
  imag?: number; // usado quando kind = 'Z'
}

export interface ImpedanceRequest {
  omega: number; // rad/s
  elements: ElementInput[];
  /** Expressão de associação, ex.: "Z1 + (Z2 || Z3) + 5 - j2" */
  expression: string;
  wantAdmittance?: boolean;
  unitScale?: 1 | 1e-3; // 1 = Ω, 1e-3 = kΩ etc. (mantido em Ω internamente)
}

function elementImpedance(e: ElementInput, omega: number): { z: Complex; how: string } {
  switch (e.kind) {
    case "R":
      return { z: CM.create(e.value, 0), how: `R = ${num(e.value)} Ω → Z = ${num(e.value)} Ω` };
    case "L":
      return {
        z: CM.create(0, omega * e.value),
        how: `Z_L = jωL = j·${num(omega, 4)}·${num(e.value, 6)} = j${num(omega * e.value)} Ω`,
      };
    case "C": {
      const x = -1 / (omega * e.value);
      return {
        z: CM.create(0, x),
        how: `Z_C = −j/(ωC) = −j/(${num(omega, 4)}·${num(e.value, 9)}) = −j${num(Math.abs(x))} Ω`,
      };
    }
    case "ZL":
      return { z: CM.create(0, Math.abs(e.value)), how: `Z_L = j${num(Math.abs(e.value))} Ω` };
    case "ZC":
      return { z: CM.create(0, -Math.abs(e.value)), how: `Z_C = −j${num(Math.abs(e.value))} Ω` };
    default:
      return {
        z: CM.create(e.value, e.imag ?? 0),
        how: `Z = ${rect(CM.create(e.value, e.imag ?? 0), "Ω")}`,
      };
  }
}

// ---------------- Parser de expressão ----------------
// expr   := term (('+'|'-') term)*
// term   := factor ('||' factor)*
// factor := '(' expr ')' | jNUM | NUM | LABEL

interface ParseCtx {
  src: string;
  pos: number;
  vars: Map<string, Complex>;
  steps: Step[];
  counter: { n: number };
}

function skip(ctx: ParseCtx) {
  while (ctx.pos < ctx.src.length && /\s/.test(ctx.src[ctx.pos])) ctx.pos++;
}

function parseFactor(ctx: ParseCtx): Complex {
  skip(ctx);
  const ch = ctx.src[ctx.pos];
  if (ch === "(") {
    ctx.pos++;
    const v = parseExpr(ctx);
    skip(ctx);
    if (ctx.src[ctx.pos] === ")") ctx.pos++;
    return v;
  }
  if (ch === "-") {
    ctx.pos++;
    const v = parseFactor(ctx);
    return CM.sub(CM.create(0, 0), v);
  }
  const rest = ctx.src.slice(ctx.pos);
  const jm = rest.match(/^j\s*(\d*\.?\d*)/i);
  if (jm) {
    ctx.pos += jm[0].length;
    return CM.create(0, jm[1] === "" ? 1 : parseFloat(jm[1]));
  }
  const lm = rest.match(/^[a-zA-Z][a-zA-Z0-9_]*/);
  if (lm) {
    ctx.pos += lm[0].length;
    const v = ctx.vars.get(lm[0].toUpperCase());
    if (!v) throw new Error(`Elemento "${lm[0]}" não definido na lista de elementos.`);
    return { ...v };
  }
  const nm = rest.match(/^\d*\.?\d+/);
  if (nm) {
    ctx.pos += nm[0].length;
    const value = parseFloat(nm[0]);
    // permite "5j"
    if (/^\s*j/i.test(ctx.src.slice(ctx.pos))) {
      ctx.pos += ctx.src.slice(ctx.pos).indexOf("j") + 1;
      return CM.create(0, value);
    }
    return CM.create(value, 0);
  }
  throw new Error(`Não entendi a expressão perto de "${rest.slice(0, 10)}".`);
}

function parseTerm(ctx: ParseCtx): Complex {
  let acc = parseFactor(ctx);
  for (;;) {
    skip(ctx);
    if (ctx.src.startsWith("||", ctx.pos)) {
      ctx.pos += 2;
      const rhs = parseFactor(ctx);
      const prod = CM.mul(acc, rhs);
      const sum = CM.add(acc, rhs);
      const res = CM.div(prod, sum);
      ctx.counter.n++;
      ctx.steps.push(
        step(
          `${ctx.counter.n}. Associação em PARALELO`,
          "Z_eq = (Z_a · Z_b) / (Z_a + Z_b)",
          `Z_a = ${rect(acc, "Ω")},  Z_b = ${rect(rhs, "Ω")}\nZ_a·Z_b = ${rect(prod, "Ω²")}\nZ_a + Z_b = ${rect(sum, "Ω")}`,
          `Z_eq = ${both(res, "Ω")}`,
        ),
      );
      acc = res;
    } else break;
  }
  return acc;
}

function parseExpr(ctx: ParseCtx): Complex {
  let acc = parseTerm(ctx);
  for (;;) {
    skip(ctx);
    const ch = ctx.src[ctx.pos];
    if (ch === "+" || ch === "-") {
      ctx.pos++;
      const rhs = parseTerm(ctx);
      const before = acc;
      acc = ch === "+" ? CM.add(acc, rhs) : CM.sub(acc, rhs);
      ctx.counter.n++;
      ctx.steps.push(
        step(
          `${ctx.counter.n}. Associação em SÉRIE`,
          "Z_eq = Z_a + Z_b (somam-se partes reais e imaginárias)",
          `${rect(before, "Ω")} ${ch === "+" ? "+" : "−"} ${rect(rhs, "Ω")}`,
          `Z_eq = ${both(acc, "Ω")}`,
        ),
      );
    } else break;
  }
  return acc;
}

export function solveImpedance(req: ImpedanceRequest): Solution {
  const steps: Step[] = [];
  const vars = new Map<string, Complex>();
  const counter = { n: 0 };

  if (req.elements.length > 0) {
    counter.n++;
    steps.push(
      step(
        `${counter.n}. Impedância de cada elemento em ω = ${num(req.omega, 4)} rad/s`,
        "Z_R = R,   Z_L = jωL,   Z_C = −j/(ωC)",
        req.elements
          .map((e) => {
            const { z, how } = elementImpedance(e, req.omega);
            vars.set(e.label.toUpperCase(), z);
            return `${e.label}: ${how}`;
          })
          .join("\n"),
      ),
    );
  }

  try {
    const ctx: ParseCtx = { src: req.expression, pos: 0, vars, steps, counter };
    const z = parseExpr(ctx);
    counter.n++;
    steps.push(
      step(
        `${counter.n}. Resultado final`,
        "Forma retangular e polar",
        `Z_eq = ${rect(z, "Ω")}\nZ_eq = ${polar(z, "Ω")}`,
        z.i > 1e-7
          ? "Caráter INDUTIVO (X > 0)"
          : z.i < -1e-7
            ? "Caráter CAPACITIVO (X < 0)"
            : "Puramente RESISTIVO (X = 0)",
      ),
    );

    const answers = [`Z_eq = ${rect(z, "Ω")}`, `Z_eq = ${polar(z, "Ω")}`];

    if (req.wantAdmittance) {
      const y = CM.inv(z);
      counter.n++;
      steps.push(
        step(
          `${counter.n}. Admitância equivalente`,
          "Y = 1/Z = (R − jX)/(R² + X²)",
          `Y = 1/(${rect(z, "Ω")}) = ${rect(y, "S")}`,
          `Y = ${num(y.r * 1000)} + j${num(y.i * 1000)} mS`,
        ),
      );
      answers.push(`Y_eq = ${num(y.r * 1000)} ${y.i >= 0 ? "+" : "−"} j${num(Math.abs(y.i * 1000))} mS`);
    }

    return {
      title: req.wantAdmittance ? "Admitância equivalente" : "Impedância equivalente",
      method: "Redução série-paralelo no domínio da frequência",
      steps,
      answers,
    };
  } catch (err) {
    return {
      title: "Impedância equivalente",
      method: "Redução série-paralelo",
      steps,
      answers: [],
      error: err instanceof Error ? err.message : "Erro ao interpretar a expressão.",
    };
  }
}

/** Transformação Δ → Y e Y → Δ com passos. */
export function solveDeltaWye(
  mode: "DELTA_TO_WYE" | "WYE_TO_DELTA",
  a: Complex,
  b: Complex,
  c: Complex,
): Solution {
  const steps: Step[] = [];
  if (mode === "DELTA_TO_WYE") {
    const sum = CM.add(CM.add(a, b), c);
    const z1 = CM.div(CM.mul(a, c), sum);
    const z2 = CM.div(CM.mul(a, b), sum);
    const z3 = CM.div(CM.mul(b, c), sum);
    steps.push(
      step("1. Somar as impedâncias do Δ", "ΣZ = Z_ab + Z_bc + Z_ca", `ΣZ = ${rect(sum, "Ω")}`),
      step(
        "2. Aplicar as fórmulas de transformação",
        "Z₁ = Z_ab·Z_ca/ΣZ,  Z₂ = Z_ab·Z_bc/ΣZ,  Z₃ = Z_bc·Z_ca/ΣZ",
        `Z₁ = ${rect(z1, "Ω")}\nZ₂ = ${rect(z2, "Ω")}\nZ₃ = ${rect(z3, "Ω")}`,
      ),
    );
    return {
      title: "Transformação Δ → Y",
      method: "Transformação de três terminais",
      steps,
      answers: [`Z₁ = ${rect(z1, "Ω")}`, `Z₂ = ${rect(z2, "Ω")}`, `Z₃ = ${rect(z3, "Ω")}`],
    };
  }
  const prod = CM.add(CM.add(CM.mul(a, b), CM.mul(b, c)), CM.mul(c, a));
  const zab = CM.div(prod, c);
  const zbc = CM.div(prod, a);
  const zca = CM.div(prod, b);
  steps.push(
    step(
      "1. Calcular o produto cruzado",
      "P = Z₁Z₂ + Z₂Z₃ + Z₃Z₁",
      `P = ${rect(prod, "Ω²")}`,
    ),
    step(
      "2. Dividir pela impedância oposta",
      "Z_ab = P/Z₃,  Z_bc = P/Z₁,  Z_ca = P/Z₂",
      `Z_ab = ${rect(zab, "Ω")}\nZ_bc = ${rect(zbc, "Ω")}\nZ_ca = ${rect(zca, "Ω")}`,
    ),
  );
  return {
    title: "Transformação Y → Δ",
    method: "Transformação de três terminais",
    steps,
    answers: [`Z_ab = ${rect(zab, "Ω")}`, `Z_bc = ${rect(zbc, "Ω")}`, `Z_ca = ${rect(zca, "Ω")}`],
  };
}
