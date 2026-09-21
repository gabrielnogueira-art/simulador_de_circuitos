import React, { useState, useMemo } from 'react';
import { CircuitComponent } from '../../schematic/types';
import { X, Activity, Zap, Check, ArrowRight, Sliders, ShieldCheck } from 'lucide-react';

interface LtAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: CircuitComponent[];
}

export const LtAnalysisModal: React.FC<LtAnalysisModalProps> = ({
  isOpen,
  onClose,
  components
}) => {
  // Parâmetros da Linha de Transmissão
  const [voltageKv, setVoltageKv] = useState<number>(500); // 500 kV
  const [lengthKm, setLengthKm] = useState<number>(300); // 300 km
  const [rPerKm, setRPerKm] = useState<number>(0.03); // 0.03 Ω/km
  const [xPerKm, setXPerKm] = useState<number>(0.32); // 0.32 Ω/km
  const [bPerKm, setBPerKm] = useState<number>(3.5); // 3.5 µS/km
  const [pLoadMw, setPLoadMw] = useState<number>(250); // 250 MW na recepção
  const [fpLoad, setFpLoad] = useState<number>(0.95); // Fator de potência
  const [compSerieFc, setCompSerieFc] = useState<number>(50); // 50% de compensação série

  // Cálculos da Linha e Parâmetros ABCD
  const ltResults = useMemo(() => {
    const l = lengthKm;
    const rTotal = rPerKm * l;
    const xTotal = xPerKm * l;
    const bTotal = (bPerKm * 1e-6) * l; // Siemens total

    // Modelo Pi-Nominal (Linha Média / Longa)
    // A = D = 1 + (Z * Y) / 2
    // B = Z
    // C = Y * (1 + (Z * Y) / 4)
    const zRe = rTotal;
    const zIm = xTotal;
    const yIm = bTotal;

    // Z * Y = (zRe + j zIm) * (j yIm) = -zIm * yIm + j (zRe * yIm)
    const zyRe = -zIm * yIm;
    const zyIm = zRe * yIm;

    // A = 1 + ZY/2
    const aRe = 1 + zyRe / 2;
    const aIm = zyIm / 2;
    const aMag = Math.hypot(aRe, aIm);

    // Tensão em vazio no receptor (Efeito Ferranti)
    // VR(vazio) = VS / A
    const vsFaseKv = voltageKv / Math.sqrt(3);
    const vrVazioFaseKv = vsFaseKv / aMag;
    const vrVazioLinhaKv = vrVazioFaseKv * Math.sqrt(3);
    const ferrantiOvervoltagePercent = ((vrVazioLinhaKv - voltageKv) / voltageKv) * 100;

    // Regulação de Tensão com Carga Plena
    const vrPlenaLinhaKv = voltageKv;
    const regPercent = ((vrVazioLinhaKv - vrPlenaLinhaKv) / vrPlenaLinhaKv) * 100;

    // Reator Shunt Necessário para zerar a sobretensão em vazio (Apostila 6)
    // Para VR(vazio) = VS -> A_novo = 1
    // A_novo = A - j B * B_reator -> B_reator = (A_mag - 1) / B_mag
    const bMag = Math.hypot(zRe, zIm);
    const bReatorShuntTotalS = Math.max(0, (1 - aRe) / (zIm || 1));
    const qReatorMvar = bReatorShuntTotalS * (voltageKv * 1e3) ** 2 / 1e6;

    // Compensação Série: Redução de B e aumento de Pmax (Apostila 6)
    const xCompSerie = xTotal * (compSerieFc / 100);
    const bCompSerie = Math.max(1, xTotal - xCompSerie);
    const pMaxSemComp = (voltageKv * voltageKv) / bMag;
    const pMaxComComp = (voltageKv * voltageKv) / bCompSerie;
    const ganhoPMaxPercent = ((pMaxComComp - pMaxSemComp) / pMaxSemComp) * 100;

    return {
      rTotal,
      xTotal,
      bTotalMicroS: bTotal * 1e6,
      aMag,
      vrVazioLinhaKv,
      ferrantiOvervoltagePercent,
      regPercent,
      qReatorMvar,
      xCompSerie,
      pMaxSemComp,
      pMaxComComp,
      ganhoPMaxPercent
    };
  }, [voltageKv, lengthKm, rPerKm, xPerKm, bPerKm, pLoadMw, fpLoad, compSerieFc]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Análise de Linhas de Transmissão (LT) e Compensação Reativa
                <span className="text-xs px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30 font-semibold">
                  Apostilas 5 e 6 • GTDC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Constantes ABCD, Efeito Ferranti em vazio, Regulação de Tensão e Compensação Shunt & Série
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
          {/* Parâmetros da Linha */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              1. Parâmetros da Linha de Transmissão
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Tensão Nominal (kV):</label>
                <input
                  type="number"
                  value={voltageKv}
                  onChange={e => setVoltageKv(parseFloat(e.target.value) || 500)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Comprimento (km):</label>
                <input
                  type="number"
                  value={lengthKm}
                  onChange={e => setLengthKm(parseFloat(e.target.value) || 300)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">r (Ω/km):</label>
                <input
                  type="number"
                  step="any"
                  value={rPerKm}
                  onChange={e => setRPerKm(parseFloat(e.target.value) || 0.03)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">x (Ω/km):</label>
                <input
                  type="number"
                  step="any"
                  value={xPerKm}
                  onChange={e => setXPerKm(parseFloat(e.target.value) || 0.32)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">b (µS/km):</label>
                <input
                  type="number"
                  step="any"
                  value={bPerKm}
                  onChange={e => setBPerKm(parseFloat(e.target.value) || 3.5)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px] pt-1">
              <span>R_total = <strong className="text-slate-200">{ltResults.rTotal.toFixed(2)} Ω</strong></span>
              <span>X_total = <strong className="text-slate-200">{ltResults.xTotal.toFixed(2)} Ω</strong></span>
              <span>B_total = <strong className="text-slate-200">{ltResults.bTotalMicroS.toFixed(1)} µS</strong></span>
              <span>|A| = <strong className="text-cyan-300">{ltResults.aMag.toFixed(4)}</strong></span>
            </div>
          </div>

          {/* Efeito Ferranti e Regulação de Tensão */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              2. Efeito Ferranti em Vazio e Regulação de Tensão (Apostila 5)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400">Tensão no Receptor em Vazio:</span>
                <div className="text-base font-bold font-mono text-amber-400">
                  {ltResults.vrVazioLinhaKv.toFixed(1)} kV
                </div>
                <div className="text-[10px] text-slate-500">
                  Sobretensão: +{ltResults.ferrantiOvervoltagePercent.toFixed(1)}% acima do nominal
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400">Regulação de Tensão (%):</span>
                <div className="text-base font-bold font-mono text-rose-400">
                  {ltResults.regPercent.toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500">
                  Regulação sem compensação reativa
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400">Reator Shunt para Anular Ferranti:</span>
                <div className="text-base font-bold font-mono text-emerald-400">
                  {ltResults.qReatorMvar.toFixed(1)} MVAr
                </div>
                <div className="text-[10px] text-slate-500">
                  Potência reativa indutiva a instalar no receptor
                </div>
              </div>
            </div>
          </div>

          {/* Compensação Série */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                3. Compensação Série e Elevação de Capacidade Máxima P_max (Apostila 6)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Fator FC:</span>
                <input
                  type="number"
                  value={compSerieFc}
                  onChange={e => setCompSerieFc(Math.max(0, Math.min(80, parseFloat(e.target.value) || 0)))}
                  className="w-16 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs text-center"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400">Reatância do Capacitor Série:</span>
                <div className="text-base font-bold font-mono text-cyan-400">
                  Xc = {ltResults.xCompSerie.toFixed(2)} Ω
                </div>
                <div className="text-[10px] text-slate-500">
                  Compensando {compSerieFc}% de {ltResults.xTotal.toFixed(1)} Ω
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400">Capacidade P_max sem Compensação:</span>
                <div className="text-base font-bold font-mono text-slate-300">
                  {ltResults.pMaxSemComp.toFixed(0)} MW
                </div>
                <div className="text-[10px] text-slate-500">
                  P_max = |Vs||Vr| / |B|
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400">Capacidade P_max com Compensação:</span>
                <div className="text-base font-bold font-mono text-emerald-400">
                  {ltResults.pMaxComComp.toFixed(0)} MW
                </div>
                <div className="text-[10px] text-emerald-300 font-semibold">
                  Aumento de +{ltResults.ganhoPMaxPercent.toFixed(1)}% na transmissão!
                </div>
              </div>
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
