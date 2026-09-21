import React, { useState, useMemo } from 'react';
import { CircuitComponent, Wire } from '../schematic/types';
import { ImpedanceSolver, ImpedanceResult } from '../engine/impedanceSolver';
import { ComplexMath } from '../engine/complex';
import { Calculator, X, Sparkles, HelpCircle, ArrowRight, Zap, Waves } from 'lucide-react';

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
  const [freqMode, setFreqMode] = useState<'OMEGA' | 'HERTZ'>('OMEGA');
  const [hertz, setHertz] = useState<number>(60);
  const [admittanceUnit, setAdmittanceUnit] = useState<'S' | 'mS' | 'uS'>('mS');
  const [timeUnit, setTimeUnit] = useState<'us' | 'ms' | 's'>('us');

  const effectiveOmega = useMemo(() => {
    if (freqMode === 'HERTZ') {
      return Math.max(2 * Math.PI * hertz, 1e-6);
    }
    return Math.max(omega, 1e-6);
  }, [freqMode, omega, hertz]);

  const hasPhysicalComponents = useMemo(() => {
    return components.some(
      c => (c.type === 'INDUCTOR' || c.type === 'CAPACITOR') && c.params.reactance === undefined
    );
  }, [components]);

  // Identifica terminais candidatos para a e b
  const terminalOptions = useMemo(() => {
    const list: { compId: string; terminalId: string; label: string }[] = [];
    for (const c of components) {
      for (const t of c.terminals) {
        const isPort = c.type === 'PORT_TERMINAL';
        const pName = c.params.portName || c.params.label || 'Porta';
        const labelText = isPort
          ? `Terminal "${pName}" (Porta de Medição Zab)`
          : `${c.params.label || c.type} [Terminal ${t.name || t.id}]`;
        list.push({
          compId: c.id,
          terminalId: t.id,
          label: labelText
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
      effectiveOmega
    );
  }, [components, wires, selectedTermA, selectedTermB, defaultTermA, defaultTermB, effectiveOmega]);

  // Conversão escalonada da admitância
  const admittanceDisplay = useMemo(() => {
    if (!impedanceResult) return null;
    const factor = admittanceUnit === 'mS' ? 1e3 : admittanceUnit === 'uS' ? 1e6 : 1;
    const rScaled = impedanceResult.admittance.r * factor;
    const iScaled = impedanceResult.admittance.i * factor;
    const sign = iScaled >= 0 ? '+' : '-';
    return `${rScaled.toFixed(4)} ${sign} j${Math.abs(iScaled).toFixed(4)} ${admittanceUnit}`;
  }, [impedanceResult, admittanceUnit]);

  // Cálculo da defasagem temporal Δt = |θ_rad| / ω
  const timeDelayDisplay = useMemo(() => {
    if (!impedanceResult) return null;
    const phaseRad = (Math.abs(impedanceResult.phaseDeg) * Math.PI) / 180;
    const delaySeconds = phaseRad / effectiveOmega;
    const factor = timeUnit === 'us' ? 1e6 : timeUnit === 'ms' ? 1e3 : 1;
    const valScaled = delaySeconds * factor;
    return `${valScaled.toFixed(2)} ${timeUnit === 'us' ? 'µs' : timeUnit}`;
  }, [impedanceResult, effectiveOmega, timeUnit]);

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
                Cálculo de Impedância e Admitância (Z_ab / Y_ab)
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold uppercase">
                  Fasorial AC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Impedância equivalente, admitância e defasagem temporal entre os nós a e b
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

          {/* Seletor de Frequência de Análise (para componentes com indutância / capacitância física) */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200">
                  Frequência de Análise AC (para componentes físicos L e C):
                </span>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setFreqMode('OMEGA')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono transition-all cursor-pointer ${
                    freqMode === 'OMEGA'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ω (rad/s)
                </button>
                <button
                  type="button"
                  onClick={() => setFreqMode('HERTZ')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono transition-all cursor-pointer ${
                    freqMode === 'HERTZ'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  f (Hz)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {freqMode === 'OMEGA' ? (
                <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                  <span className="text-xs text-indigo-300 font-mono font-bold">ω =</span>
                  <input
                    type="number"
                    step="any"
                    value={omega}
                    onChange={e => setOmega(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-indigo-200 font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="Ex: 1, 2, 4, 10000"
                  />
                  <span className="text-xs text-slate-400 font-mono">rad/s</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                  <span className="text-xs text-indigo-300 font-mono font-bold">f =</span>
                  <input
                    type="number"
                    step="any"
                    value={hertz}
                    onChange={e => setHertz(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-indigo-200 font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="Ex: 60, 50, 1000"
                  />
                  <span className="text-xs text-slate-400 font-mono">Hz</span>
                </div>
              )}

              {/* Presets rápidos */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setFreqMode('OMEGA');
                    setOmega(10000);
                  }}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 hover:text-cyan-300 hover:border-cyan-500 font-mono cursor-pointer"
                  title="Frequência do Exercício 1.11 (ω = 10.000 rad/s)"
                >
                  ω = 10.000
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFreqMode('OMEGA');
                    setOmega(1);
                  }}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 hover:text-cyan-300 hover:border-cyan-500 font-mono cursor-pointer"
                  title="Padrão em exercícios teóricos universitários"
                >
                  ω = 1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFreqMode('HERTZ');
                    setHertz(60);
                  }}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 hover:text-cyan-300 hover:border-cyan-500 font-mono cursor-pointer"
                >
                  60 Hz
                </button>
              </div>
            </div>

            {hasPhysicalComponents ? (
              <div className="text-[11px] text-indigo-300/90 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>
                  Indutâncias (H) e Capacitâncias (F) calculadas com{' '}
                  <strong>ω = {effectiveOmega.toFixed(2)} rad/s</strong>.
                </span>
              </div>
            ) : (
              <div className="text-[10px] text-slate-500">
                ✓ Seus componentes atuais utilizam reatâncias fasoriais diretas (jX Ω).
              </div>
            )}
          </div>

          {/* Dica sobre Terminais a e b */}
          {!components.some(c => c.type === 'PORT_TERMINAL') && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-slate-300">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Dica:</strong> Você pode adicionar <strong>Terminal &quot;a&quot;</strong> e <strong>Terminal &quot;b&quot;</strong> pela <em>Biblioteca de Blocos</em> para fixar as portas de entrada e referência!
              </span>
            </div>
          )}

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
                <span className="text-xs text-slate-400 font-medium">Impedância Equivalente Z_ab (R + jX):</span>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300">
                  Z_ab = {impedanceResult.rectString}
                </div>
              </div>

              {/* Grade de Informações Fasoriais e Temporais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Forma Polar */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 block font-medium">Forma Polar (|Z| ∠ θ):</span>
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    {impedanceResult.polarString}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Defasagem angular: {impedanceResult.phaseDeg >= 0 ? '+' : ''}{impedanceResult.phaseDeg.toFixed(2)}°
                  </div>
                </div>

                {/* Admitância com seletor de unidade S / mS / uS */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Admitância (Y = 1/Z):</span>
                    <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAdmittanceUnit('S')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${admittanceUnit === 'S' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        S
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdmittanceUnit('mS')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${admittanceUnit === 'mS' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        mS
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdmittanceUnit('uS')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${admittanceUnit === 'uS' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        µS
                      </button>
                    </div>
                  </div>
                  <div className="text-xs font-bold font-mono text-cyan-300">
                    Y = {admittanceDisplay}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    |Y| = {(ComplexMath.mag(impedanceResult.admittance) * (admittanceUnit === 'mS' ? 1e3 : admittanceUnit === 'uS' ? 1e6 : 1)).toFixed(4)} {admittanceUnit}
                  </div>
                </div>

                {/* Defasagem Temporal Δt com seletor s / ms / us */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                      <Waves className="w-3.5 h-3.5 text-indigo-400" />
                      Defasagem Temporal (Δt = |θ| / ω):
                    </span>
                    <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setTimeUnit('us')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${timeUnit === 'us' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        µs
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimeUnit('ms')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${timeUnit === 'ms' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        ms
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimeUnit('s')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${timeUnit === 's' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        s
                      </button>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold font-mono text-indigo-300">
                      Δt = {timeDelayDisplay}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({impedanceResult.phaseDeg > 0 ? 'Tensão adianta corrente' : 'Tensão atrasa corrente'})
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Calculado para ω = {effectiveOmega} rad/s (|Δφ| = {Math.abs(impedanceResult.phaseDeg).toFixed(2)}° = {((Math.abs(impedanceResult.phaseDeg) * Math.PI) / 180).toFixed(4)} rad).
                  </div>
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
