import React, { useState, useMemo } from 'react';
import { CircuitComponent } from '../../schematic/types';
import { X, Calculator, ArrowRight, Zap, Check, BookOpen, Layers } from 'lucide-react';

interface PuAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: CircuitComponent[];
}

export const PuAnalysisModal: React.FC<PuAnalysisModalProps> = ({
  isOpen,
  onClose,
  components
}) => {
  // Base Global
  const [sBaseMva, setSBaseMva] = useState<number>(100); // 100 MVA

  // Setores de Tensão
  const [vBaseGenKv, setVBaseGenKv] = useState<number>(13.8); // Setor 1: Geração
  const [vBaseTransKv, setVBaseTransKv] = useState<number>(500); // Setor 2: Transmissão
  const [vBaseDistKv, setVBaseDistKv] = useState<number>(13.8); // Setor 3: Distribuição

  // Calculadora Rápida de Mudança de Base
  const [calcZOld, setCalcZOld] = useState<number>(0.15);
  const [calcVOld, setCalcVOld] = useState<number>(13.2);
  const [calcVNew, setCalcVNew] = useState<number>(13.8);
  const [calcSOld, setCalcSOld] = useState<number>(50);
  const [calcSNew, setCalcSNew] = useState<number>(100);

  // Grandezas Base Calculadas
  const baseSectors = useMemo(() => {
    const calcSector = (name: string, vKv: number) => {
      const vVolts = vKv * 1e3;
      const sVa = sBaseMva * 1e6;
      const iBaseA = sVa / (Math.sqrt(3) * vVolts);
      const zBaseOhms = (vVolts * vVolts) / sVa;
      return { name, vKv, iBaseA, zBaseOhms };
    };

    return [
      calcSector('Geração (BT/MT)', vBaseGenKv),
      calcSector('Transmissão (AT/EAT)', vBaseTransKv),
      calcSector('Distribuição (MT)', vBaseDistKv)
    ];
  }, [sBaseMva, vBaseGenKv, vBaseTransKv, vBaseDistKv]);

  // Resultado da Mudança de Base
  const zNewResult = useMemo(() => {
    if (calcVNew === 0 || calcSOld === 0) return 0;
    const vRatio = calcVOld / calcVNew;
    const sRatio = calcSNew / calcSOld;
    return calcZOld * (vRatio * vRatio) * sRatio;
  }, [calcZOld, calcVOld, calcVNew, calcSOld, calcSNew]);

  // Tabela dos componentes do circuito em PU
  const puComponentsList = useMemo(() => {
    return components.map(c => {
      let zOhms = 0;
      let sectorName = 'Transmissão';
      let zBase = (vBaseTransKv * 1e3) ** 2 / (sBaseMva * 1e6);

      if (c.type === 'RESISTOR') {
        zOhms = c.params.resistance ?? 1000;
      } else if (c.type === 'INDUCTOR') {
        zOhms = 2 * Math.PI * 60 * (c.params.inductance ?? 0.01);
      } else if (c.type === 'TRANSMISSION_LINE') {
        const r = c.params.resistance ?? (c.params.rPerKm ?? 0.03) * (c.params.lengthKm ?? 300);
        const x = (c.params.xPerKm ?? 0.32) * (c.params.lengthKm ?? 300);
        zOhms = Math.hypot(r, x);
      } else if (c.type === 'POWER_TRANSFORMER') {
        const xcc = c.params.xccPercent ?? 10;
        const sNom = c.params.mvaRating ?? 100;
        const vNom = c.params.nominalKv ?? 500;
        const zBaseEq = (vNom * 1e3) ** 2 / (sNom * 1e6);
        zOhms = (xcc / 100) * zBaseEq;
      } else if (c.type === 'SYNCHRONOUS_GENERATOR') {
        sectorName = 'Geração';
        zBase = (vBaseGenKv * 1e3) ** 2 / (sBaseMva * 1e6);
        zOhms = 1.5; // Xd aproximado
      } else if (c.type === 'POWER_LOAD') {
        zOhms = c.params.resistance ?? 1000;
      }

      const zPu = zBase > 0 ? zOhms / zBase : 0;

      return {
        id: c.id,
        label: c.params.label || c.type,
        type: c.type,
        zOhms,
        sectorName,
        zBase,
        zPu
      };
    });
  }, [components, sBaseMva, vBaseGenKv, vBaseTransKv]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Análise em Por Unidade (PU)
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  Apostila 3 • GTDC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Padronização das grandezas elétricas para a mesma base de potência e tensão
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-200 text-xs">
          {/* Definição de Bases Globais */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              1. Definição das Grandezas Base do SEP
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                  S_base (Trifásica Global):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={sBaseMva}
                    onChange={e => setSBaseMva(Math.max(1, parseFloat(e.target.value) || 100))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                  <span className="text-slate-400 font-mono">MVA</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                  V_base Geração (Setor 1):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={vBaseGenKv}
                    onChange={e => setVBaseGenKv(Math.max(0.1, parseFloat(e.target.value) || 13.8))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                  <span className="text-slate-400 font-mono">kV</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                  V_base Transmissão (Setor 2):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={vBaseTransKv}
                    onChange={e => setVBaseTransKv(Math.max(0.1, parseFloat(e.target.value) || 500))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                  <span className="text-slate-400 font-mono">kV</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                  V_base Distribuição (Setor 3):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={vBaseDistKv}
                    onChange={e => setVBaseDistKv(Math.max(0.1, parseFloat(e.target.value) || 13.8))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                  <span className="text-slate-400 font-mono">kV</span>
                </div>
              </div>
            </div>

            {/* Tabela de Grandezas Base Calculadas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {baseSectors.map((sec, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1 font-mono">
                  <div className="text-[11px] font-bold text-amber-300">{sec.name}</div>
                  <div className="text-[10px] text-slate-400">V_base: <strong className="text-slate-200">{sec.vKv} kV</strong></div>
                  <div className="text-[10px] text-slate-400">I_base: <strong className="text-cyan-300">{sec.iBaseA.toFixed(1)} A</strong></div>
                  <div className="text-[10px] text-slate-400">Z_base: <strong className="text-emerald-300">{sec.zBaseOhms.toFixed(2)} Ω</strong></div>
                </div>
              ))}
            </div>
          </div>

          {/* Calculadora Oficial de Mudança de Base de Impedâncias */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              2. Fórmula Oficial de Mudança de Base (Apostila 3)
            </h3>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center font-mono text-sm text-cyan-300 font-bold">
              Z_pu(novo) = Z_pu(antigo) × [ V_base(antigo) / V_base(novo) ]² × [ S_base(novo) / S_base(antigo) ]
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Z_pu (antigo):</label>
                <input
                  type="number"
                  step="any"
                  value={calcZOld}
                  onChange={e => setCalcZOld(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">V_base antigo (kV):</label>
                <input
                  type="number"
                  step="any"
                  value={calcVOld}
                  onChange={e => setCalcVOld(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">V_base novo (kV):</label>
                <input
                  type="number"
                  step="any"
                  value={calcVNew}
                  onChange={e => setCalcVNew(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">S_base antigo (MVA):</label>
                <input
                  type="number"
                  step="any"
                  value={calcSOld}
                  onChange={e => setCalcSOld(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">S_base novo (MVA):</label>
                <input
                  type="number"
                  step="any"
                  value={calcSNew}
                  onChange={e => setCalcSNew(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
              <span className="font-semibold text-emerald-300">
                Resultado na Nova Base:
              </span>
              <span className="font-mono text-base font-black text-emerald-400">
                Z_pu(novo) = {zNewResult.toFixed(4)} pu
              </span>
            </div>
          </div>

          {/* Tabela do Circuito Atual em PU */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span>3. Elementos do Circuito Convertidos em PU</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {puComponentsList.length} elementos detectados
              </span>
            </h3>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2">Elemento</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Setor</th>
                    <th className="p-2">Valor Real (Ω)</th>
                    <th className="p-2">Z_base (Ω)</th>
                    <th className="p-2 text-cyan-300 font-bold">Impedância em PU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {puComponentsList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50">
                      <td className="p-2 font-bold text-slate-100">{item.label}</td>
                      <td className="p-2 text-slate-400 text-[10px]">{item.type}</td>
                      <td className="p-2 text-amber-300/80">{item.sectorName}</td>
                      <td className="p-2">{item.zOhms > 0 ? `${item.zOhms.toFixed(2)} Ω` : '—'}</td>
                      <td className="p-2 text-slate-400">{item.zBase.toFixed(1)} Ω</td>
                      <td className="p-2 font-bold text-cyan-300">
                        {item.zPu > 0 ? `${item.zPu.toFixed(4)} pu` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all"
          >
            Fechar Análise
          </button>
        </div>
      </div>
    </div>
  );
};
