import React, { useState } from "react";
import { Calculator, Waves, Sigma, Zap, Grid3x3, FunctionSquare, X } from "lucide-react";
import { SolutionPanel } from "./SolutionPanel";
import type { Complex, Solution } from "../solvers/core";
import { fromPolar } from "../solvers/core";
import { solveCombine, solvePhaseDifference } from "../solvers/phasors";
import { solveDeltaWye, solveImpedance, type ElementInput, type ElementKind } from "../solvers/impedance";
import { solveCurrentDivider, solveNodal, solveVoltageDivider, type Branch } from "../solvers/acnetwork";
import { solveMeshSystem, solveExercise1_10, solveExercise1_11, type MeshLoop } from "../solvers/meshSolver";
import { solveComplexPower, solveMaxPower, solvePfCorrection } from "../solvers/power";
import { solveBalanced, solveUnbalanced, type Conn, type Sequence } from "../solvers/threephase";
import { solveInverseLaplace, solveRlcStep } from "../solvers/laplace";

/** Interpreta "6", "j12", "-j2", "3+j4", "5-j0.5" em número complexo. */
export function parseComplexInput(text: string): Complex {
  const s = (text || "0").replace(/\s+/g, "").replace(",", ".").replace(/[−–]/g, "-").toLowerCase();
  const m = s.match(/^([+-]?\d*\.?\d*)?(([+-])?j(\d*\.?\d*))?$/);
  if (m && (m[1] || m[2])) {
    const re = m[1] && m[1] !== "+" && m[1] !== "-" ? parseFloat(m[1]) : m[2] ? 0 : 0;
    let im = 0;
    if (m[2]) {
      const sign = m[3] === "-" ? -1 : m[1] === "-" && !m[3] ? -1 : 1;
      const mag = m[4] === "" ? 1 : parseFloat(m[4]);
      im = sign * mag;
    }
    // caso "-j2" (sem parte real explícita)
    if (!m[1] && /^-j/.test(s)) return { r: 0, i: -(m[4] === "" ? 1 : parseFloat(m[4])) };
    return { r: isNaN(re) ? 0 : re, i: im };
  }
  const nums = s.match(/^([+-]?\d*\.?\d+)?([+-]j\d*\.?\d*)?$/);
  if (nums) return { r: parseFloat(nums[1] ?? "0") || 0, i: 0 };
  return { r: parseFloat(s) || 0, i: 0 };
}

const n = (v: string, fallback = 0) => {
  const x = parseFloat((v || "").replace(",", "."));
  return isNaN(x) ? fallback : x;
};

const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <label className="block">
    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
    {children}
    {hint && <span className="mt-0.5 block text-[10px] text-slate-500">{hint}</span>}
  </label>
);

const inputCls =
  "mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-500";

const Btn: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-cyan-400"
  >
    <Calculator className="w-3.5 h-3.5" /> {children}
  </button>
);

const Sub: React.FC<{ options: string[]; value: string; onChange: (v: string) => void }> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((o) => (
      <button
        key={o}
        onClick={() => onChange(o)}
        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
          value === o ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
        }`}
      >
        {o}
      </button>
    ))}
  </div>
);

const TABS = [
  { id: "L1", label: "Senoides e fasores", icon: Waves },
  { id: "IMP", label: "Impedância / Δ-Y", icon: Sigma },
  { id: "L2", label: "Circuitos CA", icon: Grid3x3 },
  { id: "L3", label: "Potência CA", icon: Zap },
  { id: "L45", label: "Trifásico", icon: Grid3x3 },
  { id: "L6", label: "Laplace", icon: FunctionSquare },
] as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalysisPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("L1");
  const [solution, setSolution] = useState<Solution | null>(null);

  // Lista 1
  const [mode1, setMode1] = useState("Defasagem");
  const [f1, setF1] = useState("10cos(3t-47)");
  const [f2, setF2] = useState("15sen(3t+51)");
  const [combo, setCombo] = useState("8cos(3t-45) - 15sen(3t+80)");
  const [unit1, setUnit1] = useState("V");

  // Impedância
  const [omega, setOmega] = useState("2000");
  const [elements, setElements] = useState<ElementInput[]>([
    { label: "Z1", kind: "R", value: 20 },
    { label: "Z2", kind: "L", value: 5e-3 },
    { label: "Z3", kind: "R", value: 5 },
    { label: "Z4", kind: "C", value: 25e-6 },
  ]);
  const [expr, setExpr] = useState("(Z1 || Z2) + Z3 + Z4");
  const [wantY, setWantY] = useState(false);
  const [modeImp, setModeImp] = useState("Equivalente");
  const [dyMode, setDyMode] = useState<"DELTA_TO_WYE" | "WYE_TO_DELTA">("DELTA_TO_WYE");
  const [dy, setDy] = useState(["10+j0", "0+j10", "10-j5"]);

  // Lista 2
  const [mode2, setMode2] = useState("Nodal");
  const [nodeCount, setNodeCount] = useState("2");
  const [branchText, setBranchText] = useState("1 0 6+j0\n1 2 0-j2\n2 0 4+j3");
  const [isrcText, setIsrcText] = useState("0 1 5 0");
  const [vsrcText, setVsrcText] = useState("");
  const [omegaNodal, setOmegaNodal] = useState("10000");
  const [meshText, setMeshText] = useState("1 145+j40 8.3726 29.32\n2 160-j80 0 0");
  const [meshMutualText, setMeshMutualText] = useState("1 2 120+j40");
  const [omegaMesh, setOmegaMesh] = useState("1000");
  const [ex10, setEx10] = useState({
    za_r: "120",
    za_x: "40",
    ia_mA: "40",
    ia_ang: "0",
    zb_r: "160",
    zb_x: "-80",
    rc: "25",
    is_r_mA: "40",
    is_i_mA: "80",
    omega: "1000",
  });
  const [ex11, setEx11] = useState({
    ig_mA: "60",
    omega: "10000",
    r1: "50",
    l1_mH: "10",
    r2: "100",
    c2_uF: "2",
  });
  const [divV, setDivV] = useState({ mag: "100", ang: "0", zx: "0-j5", others: "6+j0, 0+j8" });
  const [divI, setDivI] = useState({ mag: "10", ang: "0", zx: "5+j0", zy: "0+j5" });

  // Lista 3
  const [mode3, setMode3] = useState("Potência complexa");
  const [pw, setPw] = useState({ v: "120", va: "0", i: "5", ia: "-30", conv: "RMS" });
  const [pf, setPf] = useState({ p: "10000", fp1: "0.7", fp2: "0.95", v: "220", f: "60" });
  const [mp, setMp] = useState({ v: "20", a: "0", z: "4+j3", conv: "PEAK" });

  // Listas 4/5
  const [mode45, setMode45] = useState("Equilibrado");
  const [bal, setBal] = useState({
    vLine: "220",
    ref: "0",
    refIsPhase: false,
    seq: "ABC" as Sequence,
    src: "Y" as Conn,
    load: "Y" as Conn,
    z: "10+j8",
    zl: "0.5+j1",
  });
  const [unb, setUnb] = useState({
    vLine: "220",
    ref: "0",
    refIsPhase: false,
    seq: "ABC" as Sequence,
    topology: "Y_Y_4W" as "Y_Y_4W" | "Y_Y_3W" | "DELTA_LOAD",
    za: "10+j0",
    zb: "0+j10",
    zc: "5-j5",
    zl: "0+j0",
  });

  // Lista 6
  const [mode6, setMode6] = useState("F(s) → f(t)");
  const [numer, setNumer] = useState("10 0");
  const [denom, setDenom] = useState("1 4 20");
  const [rlc, setRlc] = useState({ r: "200", l: "0.05", c: "2e-6", vs: "10", kind: "SERIES" as "SERIES" | "PARALLEL" });

  if (!isOpen) return null;

  const parseList = (text: string) => text.trim().split(/[\s,]+/).filter(Boolean).map((v) => n(v));

  const run = () => {
    try {
      if (tab === "L1") {
        setSolution(mode1 === "Defasagem" ? solvePhaseDifference(f1, f2) : solveCombine(combo, unit1));
      } else if (tab === "IMP") {
        if (modeImp === "Equivalente") {
          setSolution(solveImpedance({ omega: n(omega, 1), elements, expression: expr, wantAdmittance: wantY }));
        } else {
          setSolution(
            solveDeltaWye(dyMode, parseComplexInput(dy[0]), parseComplexInput(dy[1]), parseComplexInput(dy[2])),
          );
        }
      } else if (tab === "L2") {
        if (mode2 === "Nodal") {
          const branches: Branch[] = branchText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .map((l, i) => {
              const parts = l.split(/\s+/);
              return {
                from: parseInt(parts[0] ?? "0", 10),
                to: parseInt(parts[1] ?? "0", 10),
                z: parseComplexInput(parts[2] ?? "1"),
                label: parts[3] ?? `Z${i + 1}`,
              };
            });
          const currentSources = isrcText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .map((l, i) => {
              const p = l.split(/\s+/);
              return {
                from: parseInt(p[0] ?? "0", 10),
                to: parseInt(p[1] ?? "0", 10),
                mag: n(p[2] ?? "0"),
                ang: n(p[3] ?? "0"),
                label: `I${i + 1}`,
              };
            });
          const voltageSources = vsrcText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .map((l, i) => {
              const p = l.split(/\s+/);
              return { node: parseInt(p[0] ?? "1", 10), mag: n(p[1] ?? "0"), ang: n(p[2] ?? "0"), label: `V${i + 1}` };
            });
          setSolution(
            solveNodal({
              nodeCount: parseInt(nodeCount, 10) || 1,
              branches,
              currentSources,
              voltageSources,
              omega: n(omegaNodal),
            }),
          );
        } else if (mode2 === "Malhas") {
          const loops: MeshLoop[] = meshText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .map((l, i) => {
              const p = l.split(/\s+/);
              const id = parseInt(p[0] ?? `${i + 1}`, 10);
              const selfZ = parseComplexInput(p[1] ?? "1");
              const vMag = n(p[2] ?? "0");
              const vAng = n(p[3] ?? "0");
              const sourceV = fromPolar(vMag, vAng);
              let knownCurrent: Complex | undefined = undefined;
              if (p[4] !== undefined) {
                knownCurrent = fromPolar(n(p[4]), n(p[5] ?? "0"));
              }
              return { id, label: `Malha ${id}`, selfZ, mutual: [], sourceV, knownCurrent };
            });

          meshMutualText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .forEach((l) => {
              const p = l.split(/\s+/);
              const m1 = parseInt(p[0] ?? "1", 10);
              const m2 = parseInt(p[1] ?? "2", 10);
              const z = parseComplexInput(p[2] ?? "0");
              const sign = p[3] === "+" ? 1 : -1;
              const loop1 = loops.find((lp) => lp.id === m1);
              const loop2 = loops.find((lp) => lp.id === m2);
              if (loop1) loop1.mutual.push({ withMesh: m2, z, sign });
              if (loop2) loop2.mutual.push({ withMesh: m1, z, sign });
            });

          setSolution(solveMeshSystem({ loops, omega: n(omegaMesh) }));
        } else if (mode2 === "Exercício 1.10") {
          setSolution(
            solveExercise1_10({
              Za_r: n(ex10.za_r),
              Za_x: n(ex10.za_x),
              Ia_mag: n(ex10.ia_mA) / 1000,
              Ia_ang: n(ex10.ia_ang),
              Zb_r: n(ex10.zb_r),
              Zb_x: n(ex10.zb_x),
              Rc: n(ex10.rc),
              Is_r: n(ex10.is_r_mA) / 1000,
              Is_i: n(ex10.is_i_mA) / 1000,
              omega: n(ex10.omega),
            }),
          );
        } else if (mode2 === "Exercício 1.11") {
          setSolution(
            solveExercise1_11({
              Ig_mag_mA: n(ex11.ig_mA),
              omega: n(ex11.omega),
              R1: n(ex11.r1),
              L1_mH: n(ex11.l1_mH),
              R2: n(ex11.r2),
              C2_uF: n(ex11.c2_uF),
            }),
          );
        } else if (mode2 === "Divisor de tensão") {
          setSolution(
            solveVoltageDivider(
              n(divV.mag),
              n(divV.ang),
              parseComplexInput(divV.zx),
              divV.others.split(",").map((t) => parseComplexInput(t)),
            ),
          );
        } else {
          setSolution(solveCurrentDivider(n(divI.mag), n(divI.ang), parseComplexInput(divI.zx), parseComplexInput(divI.zy)));
        }
      } else if (tab === "L3") {
        if (mode3 === "Potência complexa") {
          setSolution(
            solveComplexPower({
              vMag: n(pw.v),
              vAng: n(pw.va),
              iMag: n(pw.i),
              iAng: n(pw.ia),
              convention: pw.conv === "PEAK" ? "PEAK" : "RMS",
            }),
          );
        } else if (mode3 === "Correção de fp") {
          setSolution(solvePfCorrection({ p: n(pf.p), fp1: n(pf.fp1), fp2: n(pf.fp2), vRms: n(pf.v), freq: n(pf.f) }));
        } else {
          setSolution(solveMaxPower(n(mp.v), n(mp.a), parseComplexInput(mp.z), mp.conv === "PEAK" ? "PEAK" : "RMS"));
        }
      } else if (tab === "L45") {
        if (mode45 === "Equilibrado") {
          setSolution(
            solveBalanced({
              vLine: n(bal.vLine),
              refAngle: n(bal.ref),
              refIsPhase: bal.refIsPhase,
              sequence: bal.seq,
              sourceConn: bal.src,
              loadConn: bal.load,
              zLoad: parseComplexInput(bal.z),
              zLine: parseComplexInput(bal.zl),
            }),
          );
        } else {
          setSolution(
            solveUnbalanced({
              vLine: n(unb.vLine),
              refAngle: n(unb.ref),
              refIsPhase: unb.refIsPhase,
              sequence: unb.seq,
              topology: unb.topology,
              za: parseComplexInput(unb.za),
              zb: parseComplexInput(unb.zb),
              zc: parseComplexInput(unb.zc),
              zLine: parseComplexInput(unb.zl),
            }),
          );
        }
      } else {
        if (mode6 === "F(s) → f(t)") {
          setSolution(solveInverseLaplace({ numerator: parseList(numer), denominator: parseList(denom) }));
        } else {
          setSolution(solveRlcStep({ r: n(rlc.r), l: n(rlc.l), c: n(rlc.c), vs: n(rlc.vs), kind: rlc.kind }));
        }
      }
    } catch (err) {
      setSolution({
        title: "Erro no cálculo",
        method: "-",
        steps: [],
        answers: [],
        error: err instanceof Error ? err.message : "Verifique os dados informados.",
      });
    }
  };

  const updateElement = (i: number, patch: Partial<ElementInput>) =>
    setElements((prev) => prev.map((e, k) => (k === i ? { ...e, ...patch } : e)));

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-slate-950/70">
      <div className="flex h-full w-full max-w-5xl flex-col border-l border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-100">Resolução analítica passo a passo</h2>
            <p className="text-[10px] text-slate-500">Circuitos Elétricos II — listas 1 a 6 · 4 casas decimais</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto border-b border-slate-800 px-3 py-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  tab === t.id ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Entradas */}
          <div className="w-full space-y-3 overflow-y-auto border-b border-slate-800 p-4 lg:w-[46%] lg:border-b-0 lg:border-r">
            {tab === "L1" && (
              <>
                <Sub options={["Defasagem", "Combinar senoides"]} value={mode1} onChange={setMode1} />
                {mode1 === "Defasagem" ? (
                  <>
                    <Field label="1ª função" hint="Ex.: 10cos(3t-47) ou -50cos(200t+65)">
                      <input className={inputCls} value={f1} onChange={(e) => setF1(e.target.value)} />
                    </Field>
                    <Field label="2ª função" hint="Ex.: 15sen(3t+51) ou -10sen15t">
                      <input className={inputCls} value={f2} onChange={(e) => setF2(e.target.value)} />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Expressão" hint="Ex.: 50cos(200t-60) - 25sen(200t+70) - 75cos(200t-100)">
                      <input className={inputCls} value={combo} onChange={(e) => setCombo(e.target.value)} />
                    </Field>
                    <Field label="Unidade">
                      <input className={inputCls} value={unit1} onChange={(e) => setUnit1(e.target.value)} />
                    </Field>
                  </>
                )}
                <Btn onClick={run}>Resolver</Btn>
              </>
            )}

            {tab === "IMP" && (
              <>
                <Sub options={["Equivalente", "Δ ↔ Y"]} value={modeImp} onChange={setModeImp} />
                {modeImp === "Equivalente" ? (
                  <>
                    <Field label="ω (rad/s)" hint="Use ω = 2πf para dados em hertz">
                      <input className={inputCls} value={omega} onChange={(e) => setOmega(e.target.value)} />
                    </Field>
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Elementos
                      </span>
                      {elements.map((el, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <input
                            className="w-16 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 font-mono text-xs text-slate-100"
                            value={el.label}
                            onChange={(e) => updateElement(i, { label: e.target.value })}
                          />
                          <select
                            className="rounded-lg bg-slate-950 border border-slate-700 px-1.5 py-1.5 text-xs text-slate-100"
                            value={el.kind}
                            onChange={(e) => updateElement(i, { kind: e.target.value as ElementKind })}
                          >
                            <option value="R">R (Ω)</option>
                            <option value="L">L (H)</option>
                            <option value="C">C (F)</option>
                            <option value="ZL">jX_L (Ω)</option>
                            <option value="ZC">-jX_C (Ω)</option>
                            <option value="Z">Z (R+jX)</option>
                          </select>
                          <input
                            className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 font-mono text-xs text-slate-100"
                            value={String(el.value)}
                            onChange={(e) => updateElement(i, { value: n(e.target.value) })}
                          />
                          {el.kind === "Z" && (
                            <input
                              className="w-20 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 font-mono text-xs text-slate-100"
                              placeholder="jX"
                              value={String(el.imag ?? 0)}
                              onChange={(e) => updateElement(i, { imag: n(e.target.value) })}
                            />
                          )}
                          <button
                            onClick={() => setElements((prev) => prev.filter((_, k) => k !== i))}
                            className="p-1.5 text-slate-500 hover:text-rose-400"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          setElements((prev) => [...prev, { label: `Z${prev.length + 1}`, kind: "R", value: 10 }])
                        }
                        className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
                      >
                        + elemento
                      </button>
                    </div>
                    <Field label="Associação" hint="Use + para série, || para paralelo. Também aceita literais: 6, j12, -j2">
                      <input className={inputCls} value={expr} onChange={(e) => setExpr(e.target.value)} />
                    </Field>
                    <label className="flex items-center gap-2 text-[11px] text-slate-300">
                      <input type="checkbox" checked={wantY} onChange={(e) => setWantY(e.target.checked)} />
                      Calcular também a admitância Y (mS)
                    </label>
                  </>
                ) : (
                  <>
                    <Sub
                      options={["Δ → Y", "Y → Δ"]}
                      value={dyMode === "DELTA_TO_WYE" ? "Δ → Y" : "Y → Δ"}
                      onChange={(v) => setDyMode(v === "Δ → Y" ? "DELTA_TO_WYE" : "WYE_TO_DELTA")}
                    />
                    {[0, 1, 2].map((i) => (
                      <Field key={i} label={dyMode === "DELTA_TO_WYE" ? ["Z_ab", "Z_bc", "Z_ca"][i] : ["Z₁", "Z₂", "Z₃"][i]}>
                        <input
                          className={inputCls}
                          value={dy[i]}
                          onChange={(e) => setDy((prev) => prev.map((v, k) => (k === i ? e.target.value : v)))}
                        />
                      </Field>
                    ))}
                  </>
                )}
                <Btn onClick={run}>Resolver</Btn>
              </>
            )}

            {tab === "L2" && (
              <>
                <Sub
                  options={["Nodal", "Malhas", "Exercício 1.10", "Exercício 1.11", "Divisor de tensão", "Divisor de corrente"]}
                  value={mode2}
                  onChange={(val) => {
                    setMode2(val);
                    if (val === "Exercício 1.10") {
                      setSolution(
                        solveExercise1_10({
                          Za_r: n(ex10.za_r),
                          Za_x: n(ex10.za_x),
                          Ia_mag: n(ex10.ia_mA) / 1000,
                          Ia_ang: n(ex10.ia_ang),
                          Zb_r: n(ex10.zb_r),
                          Zb_x: n(ex10.zb_x),
                          Rc: n(ex10.rc),
                          Is_r: n(ex10.is_r_mA) / 1000,
                          Is_i: n(ex10.is_i_mA) / 1000,
                          omega: n(ex10.omega),
                        }),
                      );
                    } else if (val === "Exercício 1.11") {
                      setSolution(
                        solveExercise1_11({
                          Ig_mag_mA: n(ex11.ig_mA),
                          omega: n(ex11.omega),
                          R1: n(ex11.r1),
                          L1_mH: n(ex11.l1_mH),
                          R2: n(ex11.r2),
                          C2_uF: n(ex11.c2_uF),
                        }),
                      );
                    }
                  }}
                />
                {mode2 === "Nodal" ? (
                  <>
                    <Field label="Número de nós (fora do terra)">
                      <input className={inputCls} value={nodeCount} onChange={(e) => setNodeCount(e.target.value)} />
                    </Field>
                    <Field label="Ramos: nó1 nó2 impedância" hint="Uma linha por ramo. Ex.: 1 2 0-j2">
                      <textarea rows={4} className={inputCls} value={branchText} onChange={(e) => setBranchText(e.target.value)} />
                    </Field>
                    <Field label="Fontes de corrente: nóDe nóPara módulo ângulo" hint="Ex.: 0 1 5 0 (5∠0° A entrando no nó 1)">
                      <textarea rows={2} className={inputCls} value={isrcText} onChange={(e) => setIsrcText(e.target.value)} />
                    </Field>
                    <Field label="Fontes de tensão ao terra: nó módulo ângulo" hint="Deixe vazio se não houver">
                      <textarea rows={2} className={inputCls} value={vsrcText} onChange={(e) => setVsrcText(e.target.value)} />
                    </Field>
                    <Field label="Frequência angular ω (rad/s) opcional" hint="Preencha para obter equações senoidais do regime permanente">
                      <input className={inputCls} value={omegaNodal} onChange={(e) => setOmegaNodal(e.target.value)} placeholder="Ex.: 10000" />
                    </Field>
                  </>
                ) : mode2 === "Malhas" ? (
                  <>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <div className="font-semibold text-cyan-400">Instruções para Análise de Malhas:</div>
                      <div>• Cada linha de malha: <code>[id] [Z_própria] [V_módulo] [V_ângulo] [I_fixada_módulo] [I_fixada_ângulo]</code></div>
                      <div>• Mútuas: <code>[malha1] [malha2] [Z_mútua]</code></div>
                    </div>
                    <Field label="Malhas: id Z_própria V_fonte_módulo V_fonte_ângulo" hint="Ex.: 1 145+j40 8.3726 29.32">
                      <textarea rows={3} className={inputCls} value={meshText} onChange={(e) => setMeshText(e.target.value)} />
                    </Field>
                    <Field label="Impedâncias Compartilhadas (Mútuas): malha1 malha2 Zmútua" hint="Ex.: 1 2 120+j40">
                      <textarea rows={2} className={inputCls} value={meshMutualText} onChange={(e) => setMeshMutualText(e.target.value)} />
                    </Field>
                    <Field label="Frequência angular ω (rad/s) opcional" hint="Gera i(t) = Im·cos(ωt + θ)">
                      <input className={inputCls} value={omegaMesh} onChange={(e) => setOmegaMesh(e.target.value)} placeholder="Ex.: 1000" />
                    </Field>
                  </>
                ) : mode2 === "Exercício 1.10" ? (
                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/40 text-[11px] text-slate-200">
                      <strong className="text-indigo-300">Exercício 1.10 (Circuito CA com Fontes e Fasores):</strong>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        Circuito com ramos Za, Zb, Rc, fonte de corrente Is e fonte Vg. Calcula İb, İc, Vg fasoriais e expressões temporais.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Za Real (Ω)">
                        <input className={inputCls} value={ex10.za_r} onChange={(e) => setEx10({ ...ex10, za_r: e.target.value })} />
                      </Field>
                      <Field label="Za Imag (+jΩ)">
                        <input className={inputCls} value={ex10.za_x} onChange={(e) => setEx10({ ...ex10, za_x: e.target.value })} />
                      </Field>
                      <Field label="Zb Real (Ω)">
                        <input className={inputCls} value={ex10.zb_r} onChange={(e) => setEx10({ ...ex10, zb_r: e.target.value })} />
                      </Field>
                      <Field label="Zb Imag (-jΩ)">
                        <input className={inputCls} value={ex10.zb_x} onChange={(e) => setEx10({ ...ex10, zb_x: e.target.value })} />
                      </Field>
                      <Field label="Rc (Ω)">
                        <input className={inputCls} value={ex10.rc} onChange={(e) => setEx10({ ...ex10, rc: e.target.value })} />
                      </Field>
                      <Field label="Ia Amplitude (mA)">
                        <input className={inputCls} value={ex10.ia_mA} onChange={(e) => setEx10({ ...ex10, ia_mA: e.target.value })} />
                      </Field>
                      <Field label="Is Real (mA)">
                        <input className={inputCls} value={ex10.is_r_mA} onChange={(e) => setEx10({ ...ex10, is_r_mA: e.target.value })} />
                      </Field>
                      <Field label="Is Imag (+j mA)">
                        <input className={inputCls} value={ex10.is_i_mA} onChange={(e) => setEx10({ ...ex10, is_i_mA: e.target.value })} />
                      </Field>
                    </div>
                  </div>
                ) : mode2 === "Exercício 1.11" ? (
                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-[11px] text-slate-200">
                      <strong className="text-emerald-300">Exercício 1.11 (Análise Nodal e Resposta Temporal):</strong>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        Fonte ig(t) = 60cos(10.000t) mA, ramo 1 (50Ω + 10mH), ramo 2 (100Ω + 2µF). Calcula vo(t) e atraso temporal Δt (78.54 µs).
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="ig(t) Amplitude (mA)">
                        <input className={inputCls} value={ex11.ig_mA} onChange={(e) => setEx11({ ...ex11, ig_mA: e.target.value })} />
                      </Field>
                      <Field label="ω (rad/s)">
                        <input className={inputCls} value={ex11.omega} onChange={(e) => setEx11({ ...ex11, omega: e.target.value })} />
                      </Field>
                      <Field label="R1 (Ω)">
                        <input className={inputCls} value={ex11.r1} onChange={(e) => setEx11({ ...ex11, r1: e.target.value })} />
                      </Field>
                      <Field label="L1 (mH)">
                        <input className={inputCls} value={ex11.l1_mH} onChange={(e) => setEx11({ ...ex11, l1_mH: e.target.value })} />
                      </Field>
                      <Field label="R2 (Ω)">
                        <input className={inputCls} value={ex11.r2} onChange={(e) => setEx11({ ...ex11, r2: e.target.value })} />
                      </Field>
                      <Field label="C2 (µF)">
                        <input className={inputCls} value={ex11.c2_uF} onChange={(e) => setEx11({ ...ex11, c2_uF: e.target.value })} />
                      </Field>
                    </div>
                  </div>
                ) : mode2 === "Divisor de tensão" ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="V (módulo)">
                        <input className={inputCls} value={divV.mag} onChange={(e) => setDivV({ ...divV, mag: e.target.value })} />
                      </Field>
                      <Field label="V (ângulo °)">
                        <input className={inputCls} value={divV.ang} onChange={(e) => setDivV({ ...divV, ang: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="Z sobre a qual se quer a tensão">
                      <input className={inputCls} value={divV.zx} onChange={(e) => setDivV({ ...divV, zx: e.target.value })} />
                    </Field>
                    <Field label="Demais impedâncias em série" hint="Separadas por vírgula">
                      <input className={inputCls} value={divV.others} onChange={(e) => setDivV({ ...divV, others: e.target.value })} />
                    </Field>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="I (módulo)">
                        <input className={inputCls} value={divI.mag} onChange={(e) => setDivI({ ...divI, mag: e.target.value })} />
                      </Field>
                      <Field label="I (ângulo °)">
                        <input className={inputCls} value={divI.ang} onChange={(e) => setDivI({ ...divI, ang: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="Z do ramo desejado">
                      <input className={inputCls} value={divI.zx} onChange={(e) => setDivI({ ...divI, zx: e.target.value })} />
                    </Field>
                    <Field label="Z do outro ramo">
                      <input className={inputCls} value={divI.zy} onChange={(e) => setDivI({ ...divI, zy: e.target.value })} />
                    </Field>
                  </>
                )}
                <Btn onClick={run}>Resolver</Btn>
              </>
            )}

            {tab === "L3" && (
              <>
                <Sub
                  options={["Potência complexa", "Correção de fp", "Máxima transferência"]}
                  value={mode3}
                  onChange={setMode3}
                />
                {mode3 === "Potência complexa" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="V (módulo)">
                        <input className={inputCls} value={pw.v} onChange={(e) => setPw({ ...pw, v: e.target.value })} />
                      </Field>
                      <Field label="V (ângulo °)">
                        <input className={inputCls} value={pw.va} onChange={(e) => setPw({ ...pw, va: e.target.value })} />
                      </Field>
                      <Field label="I (módulo)">
                        <input className={inputCls} value={pw.i} onChange={(e) => setPw({ ...pw, i: e.target.value })} />
                      </Field>
                      <Field label="I (ângulo °)">
                        <input className={inputCls} value={pw.ia} onChange={(e) => setPw({ ...pw, ia: e.target.value })} />
                      </Field>
                    </div>
                    <Sub
                      options={["RMS", "PEAK"]}
                      value={pw.conv}
                      onChange={(v) => setPw({ ...pw, conv: v })}
                    />
                    <p className="text-[10px] text-slate-500">RMS = valores eficazes · PEAK = amplitudes de pico</p>
                  </>
                )}
                {mode3 === "Correção de fp" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="P (W)">
                      <input className={inputCls} value={pf.p} onChange={(e) => setPf({ ...pf, p: e.target.value })} />
                    </Field>
                    <Field label="fp atual">
                      <input className={inputCls} value={pf.fp1} onChange={(e) => setPf({ ...pf, fp1: e.target.value })} />
                    </Field>
                    <Field label="fp desejado">
                      <input className={inputCls} value={pf.fp2} onChange={(e) => setPf({ ...pf, fp2: e.target.value })} />
                    </Field>
                    <Field label="V eficaz (V)">
                      <input className={inputCls} value={pf.v} onChange={(e) => setPf({ ...pf, v: e.target.value })} />
                    </Field>
                    <Field label="f (Hz)">
                      <input className={inputCls} value={pf.f} onChange={(e) => setPf({ ...pf, f: e.target.value })} />
                    </Field>
                  </div>
                )}
                {mode3 === "Máxima transferência" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="V_th (módulo)">
                        <input className={inputCls} value={mp.v} onChange={(e) => setMp({ ...mp, v: e.target.value })} />
                      </Field>
                      <Field label="V_th (ângulo °)">
                        <input className={inputCls} value={mp.a} onChange={(e) => setMp({ ...mp, a: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="Z_th" hint="Ex.: 4+j3">
                      <input className={inputCls} value={mp.z} onChange={(e) => setMp({ ...mp, z: e.target.value })} />
                    </Field>
                    <Sub options={["RMS", "PEAK"]} value={mp.conv} onChange={(v) => setMp({ ...mp, conv: v })} />
                  </>
                )}
                <Btn onClick={run}>Resolver</Btn>
              </>
            )}

            {tab === "L45" && (
              <>
                <Sub options={["Equilibrado", "Desequilibrado"]} value={mode45} onChange={setMode45} />
                {mode45 === "Equilibrado" ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Tensão (V)">
                        <input className={inputCls} value={bal.vLine} onChange={(e) => setBal({ ...bal, vLine: e.target.value })} />
                      </Field>
                      <Field label="Ângulo de referência (°)">
                        <input className={inputCls} value={bal.ref} onChange={(e) => setBal({ ...bal, ref: e.target.value })} />
                      </Field>
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={bal.refIsPhase}
                        onChange={(e) => setBal({ ...bal, refIsPhase: e.target.checked })}
                      />
                      A tensão informada é de fase (não de linha)
                    </label>
                    <Sub options={["ABC", "ACB"]} value={bal.seq} onChange={(v) => setBal({ ...bal, seq: v as Sequence })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Fonte">
                        <select
                          className={inputCls}
                          value={bal.src}
                          onChange={(e) => setBal({ ...bal, src: e.target.value as Conn })}
                        >
                          <option value="Y">Y</option>
                          <option value="DELTA">Δ</option>
                        </select>
                      </Field>
                      <Field label="Carga">
                        <select
                          className={inputCls}
                          value={bal.load}
                          onChange={(e) => setBal({ ...bal, load: e.target.value as Conn })}
                        >
                          <option value="Y">Y</option>
                          <option value="DELTA">Δ</option>
                        </select>
                      </Field>
                    </div>
                    <Field label="Z por fase da carga">
                      <input className={inputCls} value={bal.z} onChange={(e) => setBal({ ...bal, z: e.target.value })} />
                    </Field>
                    <Field label="Z da linha" hint="Use 0+j0 se for desprezível">
                      <input className={inputCls} value={bal.zl} onChange={(e) => setBal({ ...bal, zl: e.target.value })} />
                    </Field>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Tensão (V)">
                        <input className={inputCls} value={unb.vLine} onChange={(e) => setUnb({ ...unb, vLine: e.target.value })} />
                      </Field>
                      <Field label="Ângulo de referência (°)">
                        <input className={inputCls} value={unb.ref} onChange={(e) => setUnb({ ...unb, ref: e.target.value })} />
                      </Field>
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={unb.refIsPhase}
                        onChange={(e) => setUnb({ ...unb, refIsPhase: e.target.checked })}
                      />
                      A tensão informada é de fase
                    </label>
                    <Sub options={["ABC", "ACB"]} value={unb.seq} onChange={(v) => setUnb({ ...unb, seq: v as Sequence })} />
                    <Field label="Ligação">
                      <select
                        className={inputCls}
                        value={unb.topology}
                        onChange={(e) => setUnb({ ...unb, topology: e.target.value as typeof unb.topology })}
                      >
                        <option value="Y_Y_4W">Y–Y com neutro (4 fios)</option>
                        <option value="Y_Y_3W">Y–Y sem neutro (3 fios)</option>
                        <option value="DELTA_LOAD">Carga em Δ</option>
                      </select>
                    </Field>
                    <div className="grid grid-cols-3 gap-2">
                      <Field label={unb.topology === "DELTA_LOAD" ? "Z_AB" : "Z_A"}>
                        <input className={inputCls} value={unb.za} onChange={(e) => setUnb({ ...unb, za: e.target.value })} />
                      </Field>
                      <Field label={unb.topology === "DELTA_LOAD" ? "Z_BC" : "Z_B"}>
                        <input className={inputCls} value={unb.zb} onChange={(e) => setUnb({ ...unb, zb: e.target.value })} />
                      </Field>
                      <Field label={unb.topology === "DELTA_LOAD" ? "Z_CA" : "Z_C"}>
                        <input className={inputCls} value={unb.zc} onChange={(e) => setUnb({ ...unb, zc: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="Z da linha">
                      <input className={inputCls} value={unb.zl} onChange={(e) => setUnb({ ...unb, zl: e.target.value })} />
                    </Field>
                  </>
                )}
                <Btn onClick={run}>Resolver</Btn>
              </>
            )}

            {tab === "L6" && (
              <>
                <Sub options={["F(s) → f(t)", "Degrau em RLC"]} value={mode6} onChange={setMode6} />
                {mode6 === "F(s) → f(t)" ? (
                  <>
                    <Field label="Numerador N(s)" hint="Coeficientes do maior para o menor grau. Ex.: 10 0 → 10s">
                      <input className={inputCls} value={numer} onChange={(e) => setNumer(e.target.value)} />
                    </Field>
                    <Field label="Denominador D(s)" hint="Ex.: 1 4 20 → s² + 4s + 20">
                      <input className={inputCls} value={denom} onChange={(e) => setDenom(e.target.value)} />
                    </Field>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="R (Ω)">
                        <input className={inputCls} value={rlc.r} onChange={(e) => setRlc({ ...rlc, r: e.target.value })} />
                      </Field>
                      <Field label="L (H)">
                        <input className={inputCls} value={rlc.l} onChange={(e) => setRlc({ ...rlc, l: e.target.value })} />
                      </Field>
                      <Field label="C (F)">
                        <input className={inputCls} value={rlc.c} onChange={(e) => setRlc({ ...rlc, c: e.target.value })} />
                      </Field>
                      <Field label="Degrau V_s (V)">
                        <input className={inputCls} value={rlc.vs} onChange={(e) => setRlc({ ...rlc, vs: e.target.value })} />
                      </Field>
                    </div>
                    <Sub
                      options={["SERIES", "PARALLEL"]}
                      value={rlc.kind}
                      onChange={(v) => setRlc({ ...rlc, kind: v as "SERIES" | "PARALLEL" })}
                    />
                  </>
                )}
                <Btn onClick={run}>Resolver</Btn>
              </>
            )}
          </div>

          {/* Resolução */}
          <div className="flex w-full flex-1 flex-col overflow-hidden bg-slate-950/40 lg:w-[54%]">
            <SolutionPanel solution={solution} />
          </div>
        </div>
      </div>
    </div>
  );
};
