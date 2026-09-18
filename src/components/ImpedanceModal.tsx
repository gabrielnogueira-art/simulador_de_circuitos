import React, { useState, useMemo } from 'react';
import { CircuitComponent, Wire } from '../schematic/types';
import { ImpedanceSolver, ImpedanceResult } from '../engine/impedanceSolver';
import { Calculator, X, Sparkles, HelpCircle, ArrowRight, Zap } from 'lucide-react';

interface ImpedanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: CircuitComponent[];
  wires: Wire[];
  onLoadImpedancePreset: () => void;
}

export const ImpedanceModal: React.FC<ImpedanceModalProps> = ({
  isOpen,
  onClose,
  components,
  wires,
  onLoadImpedancePreset
}) => {
  const [omega, setOmega] = useState<number>(1); // Frequência angular rad/s

  // Identifica terminais candidatos para a e b
  const terminalOptions = useMemo(() => {
    const list: { compId: string; terminalId: string; label: string }[] = [];
    for (const c of components) {
      for (const t of c.terminals) {
        const pLabel = c.params.label || c.type;
        list.push({
          compId: c.id,
          terminalId: t.id,
          label: `${pLabel} [Terminal ${t.name || t.id}]`
        });
      }
    }
    return list;
  }, [components]);

  // Busca se existem portas dedicadas 'a' e 'b' ou usa primeiro/segundo terminal
  const defaultTermA = useMemo(() => {
    const portA = components.find(c => c.type === 'PORT_TERMINAL' && (c.params.portName === 'a' || c.params.label === 'a'));
    if (portA) return { compId: portA.id, terminalId: 'pin' };
    const r1 = components.find(c => c.params.label === '8Ω' || c.params.label === 'R1');
    if (r1) return { compId: r1.id, terminalId: 't1' };
    return terminalOptions[0] ? { compId: terminalOptions[0].compId, terminalId: terminalOptions[0].terminalId } : null;
  }, [components, terminalOptions]);

  const defaultTermB = useMemo(() => {
    const portB = components.find(c => c.type === 'PORT_TERMINAL' && (c.params.portName === 'b' || c.params.label === 'b'));
    if (portB) return { compId: portB.id, terminalId: 'pin' };
    const gnd = components.find(c => c.type === 'GROUND');
    if (gnd) return { compId: gnd.id, terminalId: 'gnd' };
    return terminalOptions[1] ? { compId: terminalOptions[1].compId, terminalId: terminalOptions[1].terminalId } : null;
  }, [components, terminalOptions]);

  const [selectedTermA, setSelectedTermA] = useState<string>(
    defaultTermA ? `${defaultTermA.compId}:${defaultTermA.terminalId}` : ''
  );
  const [selectedTermB, setSelectedTermB] = useState<string>(
    defaultTermB ? `${defaultTermB.compId}:${defaultTermB.terminalId}` : ''
  );

  // Calcula a impedância equivalente
  const impedanceResult: ImpedanceResult | null = useMemo(() => {
    const keyA = selectedTermA || (defaultTermA ? `${defaultTermA.compId}:${defaultTermA.terminalId}` : '');
    const keyB = selectedTermB || (defaultTermB ? `${defaultTermB.compId}:${defaultTermB.terminalId}` : '');
    if (!keyA || !keyB) return null;

    const [cIdA, tIdA] = keyA.split(':');
    const [cIdB, tIdB] = keyB.split(':');

    return ImpedanceSolver.calculateImpedance(
      components,
      wires,
      { compId: cIdA, terminalId: tIdA },
      { compId: cIdB, terminalId: tIdB },
      omega
    );
  }, [components, wires, selectedTermA, selectedTermB, defaultTermA, defaultTermB, omega]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Cálculo de Impedância de Entrada (Z_ab)
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold uppercase">
                  Thévenin AC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Impedância equivalente complexa vista entre os terminais a e b
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Seletor de Terminais a e b */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-cyan-400 mb-1.5">
                Terminal a (Entrada Positiva):
              </label>
              <select
                value={selectedTermA || (defaultTermA ? `${defaultTermA.compId}:${defaultTermA.terminalId}` : '')}
                onChange={e => setSelectedTermA(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              >
                {terminalOptions.map(t => (
                  <option key={`${t.compId}:${t.terminalId}`} value={`${t.compId}:${t.terminalId}`}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-400 mb-1.5">
                Terminal b (Referência / Retorno):
              </label>
              <select
                value={selectedTermB || (defaultTermB ? `${defaultTermB.compId}:${defaultTermB.terminalId}` : '')}
                onChange={e => setSelectedTermB(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              >
                {terminalOptions.map(t => (
                  <option key={`${t.compId}:${t.terminalId}`} value={`${t.compId}:${t.terminalId}`}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cartão de Exibição dos Resultados */}
          {impedanceResult ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-cyan-500/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Resultado da Análise Fasorial
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    impedanceResult.nature === 'CAPACITIVE'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : impedanceResult.nature === 'INDUCTIVE'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {impedanceResult.nature === 'CAPACITIVE'
                    ? 'CARGA CAPACITIVA (X < 0)'
                    : impedanceResult.nature === 'INDUCTIVE'
                    ? 'CARGA INDUTIVA (X > 0)'
                    : 'CARGA RESISTIVA PURA'}
                </span>
              </div>

              {/* Forma Retangular (Destacada) */}
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-medium">Forma Retangular (R + jX):</span>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300">
                  Z_ab = {impedanceResult.rectString}
                </div>
              </div>

              {/* Forma Polar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">Forma Polar (|Z| ∠ θ):</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {impedanceResult.polarString}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">Admitância Equivalente (Y = 1/Z):</span>
                  <span className="text-xs font-mono text-slate-300">
                    {impedanceResult.admittance.r.toFixed(5)} {impedanceResult.admittance.i >= 0 ? '+' : '-'} j{Math.abs(impedanceResult.admittance.i).toFixed(5)} S
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs bg-slate-950/50 rounded-xl border border-slate-800">
              Selecione os dois terminais do circuito para calcular a impedância Z_ab.
            </div>
          )}

          {/* Botão de Atalho para o Circuito do Exercício */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  Circuito de Exemplo do Exercício
                </h4>
                <p className="text-[11px] text-slate-400">
                  Rede com 8Ω, -j12Ω, 20Ω, j15Ω, 10Ω, -j16Ω e resposta esperada 34,68836 - j6,9301 Ω
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onLoadImpedancePreset();
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Carregar Circuito do Exercício</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
