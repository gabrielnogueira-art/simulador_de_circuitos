import React from "react";
import { Printer, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Solution } from "../solvers/core";

interface Props {
  solution: Solution | null;
  onClose?: () => void;
}

export const SolutionPanel: React.FC<Props> = ({ solution, onClose }) => {
  if (!solution) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-6 text-slate-500 text-xs">
        Preencha os dados e clique em <span className="mx-1 text-cyan-400 font-semibold">Resolver</span> para ver o
        cálculo completo, passo a passo.
      </div>
    );
  }

  if (solution.error) {
    return (
      <div className="flex-1 p-4">
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200 text-xs">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{solution.error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div id="solution-print" className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100">{solution.title}</h3>
            <p className="text-[11px] text-cyan-400 font-medium">Método: {solution.method}</p>
          </div>
          <div className="flex items-center gap-1.5 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200"
              title="Exportar a resolução em PDF (imprimir → salvar como PDF)"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              PDF
            </button>
            {onClose && (
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <ol className="space-y-2.5">
          {solution.steps.map((s, i) => (
            <li key={i} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="text-[11px] font-bold text-slate-100">{s.label}</div>
              {s.formula && (
                <div className="mt-1 font-mono text-[11px] text-cyan-300 whitespace-pre-wrap">{s.formula}</div>
              )}
              {s.substitution && (
                <div className="mt-1 font-mono text-[11px] text-slate-300 whitespace-pre-wrap">{s.substitution}</div>
              )}
              {s.result && (
                <div className="mt-1.5 font-mono text-[11px] font-semibold text-emerald-300 whitespace-pre-wrap">
                  {s.result}
                </div>
              )}
              {s.note && <div className="mt-1 text-[10px] text-slate-400 italic">{s.note}</div>}
            </li>
          ))}
        </ol>

        {solution.answers.length > 0 && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" /> Resposta
            </div>
            <ul className="mt-1.5 space-y-1">
              {solution.answers.map((a, i) => (
                <li key={i} className="font-mono text-[11px] text-emerald-100">
                  {a}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-emerald-200/70">
              Resultados apresentados com 4 casas decimais, conforme exigido nas listas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
