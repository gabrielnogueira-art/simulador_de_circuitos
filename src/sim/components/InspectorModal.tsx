import React from 'react';
import { CircuitComponent } from '../schematic/types';
import { RotateCw, Trash2, Sliders, X } from 'lucide-react';
import { parseSourceFunctionOrPhasor } from '../solvers/phasors';
import { branchTerminalPair } from '../ai/circuitDirections';

interface InspectorModalProps {
  component: CircuitComponent | null;
  onUpdateParams: (compId: string, newParams: Record<string, any>) => void;
  onRotate: (compId: string) => void;
  onDelete: (compId: string) => void;
  onClose: () => void;
}

export const InspectorModal: React.FC<InspectorModalProps> = ({
  component,
  onUpdateParams,
  onRotate,
  onDelete,
  onClose
}) => {
  if (!component) return null;

  const { type, params } = component;
  const currentPair = branchTerminalPair(component);
  const terminalName = (id: string) => component.terminals.find(terminal => terminal.id === id)?.name || id;

  const handleChange = (key: string, value: any) => {
    const updated: Record<string, any> = { ...params, [key]: value };
    if (value === undefined) {
      delete updated[key];
    }
    onUpdateParams(component.id, updated);
  };

  const handleSelectInductorMode = (mode: 'REACTANCE' | 'PHYSICAL') => {
    const updated = { ...params, mode };
    if (mode === 'REACTANCE') {
      updated.reactance = Math.abs(params.reactance ?? 6);
    } else {
      delete updated.reactance;
      if (updated.inductance === undefined) updated.inductance = 10e-3;
    }
    onUpdateParams(component.id, updated);
  };

  const handleSelectCapacitorMode = (mode: 'REACTANCE' | 'PHYSICAL') => {
    const updated = { ...params, mode };
    if (mode === 'REACTANCE') {
      updated.reactance = -Math.abs(params.reactance ?? 16);
    } else {
      delete updated.reactance;
      if (updated.capacitance === undefined) updated.capacitance = 10e-6;
    }
    onUpdateParams(component.id, updated);
  };

  return (
    <div className="absolute top-16 right-4 z-20 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-xl p-4 text-slate-200 select-none animate-in fade-in zoom-in-95 duration-150">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            Propriedades do Bloco
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 text-xs">
        {/* Rótulo / Nome */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Rótulo / Identificador</label>
          <input
            type="text"
            value={params.label || ''}
            onChange={e => handleChange('label', e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>

        {currentPair && (
          <div className="space-y-2 rounded-lg border border-cyan-500/25 bg-slate-950/60 p-2.5">
            <div>
              <span className="block font-medium text-slate-300">Sentido indicado da corrente</span>
              <span className="text-[10px] text-slate-500">Use quando o enunciado já mostrar uma seta neste ramo.</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {([
                { value: 'AUTO', label: 'Automático' },
                { value: 'FORWARD', label: `${terminalName(currentPair[0])} → ${terminalName(currentPair[1])}` },
                { value: 'REVERSE', label: `${terminalName(currentPair[1])} → ${terminalName(currentPair[0])}` },
              ] as const).map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange('currentDirection', option.value)}
                  className={`min-h-8 rounded border px-2 text-left font-mono text-[11px] transition-colors ${
                    (params.currentDirection ?? 'AUTO') === option.value
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Campos Específicos por Tipo */}
        {type === 'RESISTOR' && (
          <div>
            <label className="block text-slate-400 font-medium mb-1">Resistência (Ω)</label>
            <input
              type="number"
              step="any"
              value={params.resistance ?? 1000}
              onChange={e => handleChange('resistance', parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}

        {type === 'CAPACITOR' && (
          <div className="space-y-2.5 p-2.5 bg-slate-950/60 rounded-xl border border-cyan-500/20">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Modo de Especificação:</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectCapacitorMode('REACTANCE')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    params.reactance !== undefined
                      ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  -jX (Reatância Ω)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectCapacitorMode('PHYSICAL')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    params.reactance === undefined
                      ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  C (Capacitância F)
                </button>
              </div>
            </div>

            {params.reactance !== undefined ? (
              <div>
                <label className="block text-cyan-300 font-medium mb-1">Reatância Direta (-jX Ω)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-cyan-400 font-mono font-bold text-xs">-j</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ex: 4 ou 16"
                    value={Math.abs(params.reactance)}
                    onChange={e => handleChange('reactance', e.target.value === '' ? undefined : -Math.abs(parseFloat(e.target.value)))}
                    className="w-full pl-7 pr-7 py-1.5 bg-slate-950 border border-cyan-500/50 rounded-lg text-cyan-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <span className="absolute right-2.5 top-1.5 text-slate-500 text-xs font-mono">Ω</span>
                </div>
                <span className="text-[10px] text-cyan-300/70 mt-1 block">Usado diretamente no cálculo fasorial Zab (-j{Math.abs(params.reactance)} Ω)</span>
              </div>
            ) : (
              <div>
                <label className="block text-slate-300 font-medium mb-1">Capacitância Física (F - ex: 100e-6)</label>
                <input
                  type="number"
                  step="any"
                  value={params.capacitance ?? 10e-6}
                  onChange={e => handleChange('capacitance', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Convertido no Zab usando Z_C = -j/(ω·C)</span>
              </div>
            )}
          </div>
        )}

        {type === 'INDUCTOR' && (
          <div className="space-y-2.5 p-2.5 bg-slate-950/60 rounded-xl border border-purple-500/20">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Modo de Especificação:</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectInductorMode('REACTANCE')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    params.reactance !== undefined
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  +jX (Reatância Ω)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectInductorMode('PHYSICAL')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    params.reactance === undefined
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  L (Indutância H)
                </button>
              </div>
            </div>

            {params.reactance !== undefined ? (
              <div>
                <label className="block text-purple-300 font-medium mb-1">Reatância Direta (+jX Ω)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-purple-400 font-mono font-bold text-xs">+j</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ex: 6 ou 8"
                    value={Math.abs(params.reactance)}
                    onChange={e => handleChange('reactance', e.target.value === '' ? undefined : Math.abs(parseFloat(e.target.value)))}
                    className="w-full pl-7 pr-7 py-1.5 bg-slate-950 border border-purple-500/50 rounded-lg text-purple-200 font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                  <span className="absolute right-2.5 top-1.5 text-slate-500 text-xs font-mono">Ω</span>
                </div>
                <span className="text-[10px] text-purple-300/70 mt-1 block">Usado diretamente no cálculo fasorial Zab (+j{Math.abs(params.reactance)} Ω)</span>
              </div>
            ) : (
              <div>
                <label className="block text-slate-300 font-medium mb-1">Indutância Física (H - ex: 6 ou 1e-3)</label>
                <input
                  type="number"
                  step="any"
                  value={params.inductance ?? 10e-3}
                  onChange={e => handleChange('inductance', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Convertido no Zab usando Z_L = j·ω·L</span>
              </div>
            )}
          </div>
        )}

        {type === 'PORT_TERMINAL' && (
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Função do Terminal</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleChange('portName', 'a');
                    handleChange('label', 'a');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                    (params.portName || 'a').toLowerCase() === 'a'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Terminal &quot;a&quot; (Entrada)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleChange('portName', 'b');
                    handleChange('label', 'b');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                    (params.portName || 'a').toLowerCase() === 'b'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-md shadow-amber-500/20 ring-1 ring-amber-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Terminal &quot;b&quot; (Ref / Retorno)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Identificador da Porta (ex: a ou b)</label>
              <input
                type="text"
                value={params.portName || 'a'}
                onChange={e => {
                  handleChange('portName', e.target.value);
                  handleChange('label', e.target.value);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500 text-xs"
                placeholder="Ex: a ou b"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Conecte este terminal por meio de um fio ao ponto do circuito onde deseja medir a impedância Zab.
              </span>
            </div>
          </div>
        )}

        {type === 'DC_VOLTAGE' && (
          <div>
            <label className="block text-slate-400 font-medium mb-1">Tensão DC (Volts)</label>
            <input
              type="number"
              step="any"
              value={params.voltage ?? 12}
              onChange={e => handleChange('voltage', parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}

        {(type === 'AC_VOLTAGE' || type === 'AC_CURRENT') && (
          <div className="space-y-2.5 p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/40">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-indigo-300 text-xs">
                {type === 'AC_VOLTAGE' ? 'Fonte AC de Tensão' : 'Fonte AC de Corrente'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {type === 'AC_VOLTAGE' ? 'v(t) / V' : 'i(t) / I'}
              </span>
            </div>

            {/* Campo de Expressão / Função / Fasor */}
            <div>
              <label className="block text-slate-300 font-medium mb-1 text-[11px]">
                Expressão Matemática / Fasor Direto:
              </label>
              <input
                type="text"
                value={params.waveformFunction || ''}
                onChange={e => {
                  const expr = e.target.value;
                  const isCur = type === 'AC_CURRENT';
                  const parsed = parseSourceFunctionOrPhasor(expr, isCur ? 'CURRENT' : 'VOLTAGE');
                  const updated = {
                    ...params,
                    waveformFunction: expr,
                    amplitude: parsed.amplitude,
                    omega: parsed.omega,
                    frequency: parsed.frequency,
                    phase: parsed.phaseDeg,
                    complexValue: { r: parsed.real, i: parsed.imag },
                    current: parsed.amplitude,
                  };
                  onUpdateParams(component.id, updated);
                }}
                placeholder={type === 'AC_VOLTAGE' ? 'Ex: 10cos(2t) V ou 60 ∠ 0° V' : 'Ex: 60cos(10.000t) mA ou 40+j80 mA'}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-indigo-500/50 rounded-lg text-indigo-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Presets Rápidos */}
            <div className="flex flex-wrap gap-1">
              {type === 'AC_VOLTAGE' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const expr = '10cos(2t) V';
                      const parsed = parseSourceFunctionOrPhasor(expr, 'VOLTAGE');
                      onUpdateParams(component.id, {
                        ...params,
                        waveformFunction: expr,
                        amplitude: parsed.amplitude,
                        omega: parsed.omega,
                        frequency: parsed.frequency,
                        phase: parsed.phaseDeg,
                        complexValue: { r: parsed.real, i: parsed.imag },
                      });
                    }}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 hover:text-cyan-300 hover:border-cyan-500 font-mono cursor-pointer"
                  >
                    10cos(2t) V
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const expr = '60 ∠ 0° V';
                      const parsed = parseSourceFunctionOrPhasor(expr, 'VOLTAGE');
                      onUpdateParams(component.id, {
                        ...params,
                        waveformFunction: expr,
                        amplitude: parsed.amplitude,
                        omega: parsed.omega,
                        frequency: parsed.frequency,
                        phase: parsed.phaseDeg,
                        complexValue: { r: parsed.real, i: parsed.imag },
                      });
                    }}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 hover:text-cyan-300 hover:border-cyan-500 font-mono cursor-pointer"
                  >
                    60 ∠ 0° V
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const expr = '8.3726 ∠ 29.32° V';
                      const parsed = parseSourceFunctionOrPhasor(expr, 'VOLTAGE');
                      onUpdateParams(component.id, {
                        ...params,
                        waveformFunction: expr,
                        amplitude: parsed.amplitude,
                        omega: parsed.omega,
                        frequency: parsed.frequency,
                        phase: parsed.phaseDeg,
                        complexValue: { r: parsed.real, i: parsed.imag },
                      });
                    }}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 hover:text-cyan-300 hover:border-cyan-500 font-mono cursor-pointer"
                  >
                    8.37∠29.3° V
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const expr = '60cos(10.000t) mA';
                      const parsed = parseSourceFunctionOrPhasor(expr, 'CURRENT');
                      onUpdateParams(component.id, {
                        ...params,
                        waveformFunction: expr,
                        amplitude: parsed.amplitude,
                        omega: parsed.omega,
                        frequency: parsed.frequency,
                        phase: parsed.phaseDeg,
                        complexValue: { r: parsed.real, i: parsed.imag },
                        current: parsed.amplitude,
                      });
                    }}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 hover:text-cyan-300 hover:border-cyan-500 font-mono cursor-pointer"
                  >
                    60cos(10.000t) mA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const expr = '40 + j80 mA';
                      const parsed = parseSourceFunctionOrPhasor(expr, 'CURRENT');
                      onUpdateParams(component.id, {
                        ...params,
                        waveformFunction: expr,
                        amplitude: parsed.amplitude,
                        omega: parsed.omega,
                        frequency: parsed.frequency,
                        phase: parsed.phaseDeg,
                        complexValue: { r: parsed.real, i: parsed.imag },
                        current: parsed.amplitude,
                      });
                    }}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 hover:text-cyan-300 hover:border-cyan-500 font-mono cursor-pointer"
                  >
                    40 + j80 mA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const expr = '40 ∠ 0° mA';
                      const parsed = parseSourceFunctionOrPhasor(expr, 'CURRENT');
                      onUpdateParams(component.id, {
                        ...params,
                        waveformFunction: expr,
                        amplitude: parsed.amplitude,
                        omega: parsed.omega,
                        frequency: parsed.frequency,
                        phase: parsed.phaseDeg,
                        complexValue: { r: parsed.real, i: parsed.imag },
                        current: parsed.amplitude,
                      });
                    }}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 hover:text-cyan-300 hover:border-cyan-500 font-mono cursor-pointer"
                  >
                    40 ∠ 0° mA
                  </button>
                </>
              )}
            </div>

            {/* Parâmetros Individuais */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
              <div>
                <label className="block text-slate-400 text-[10px] mb-0.5">
                  Amplitude ({type === 'AC_VOLTAGE' ? 'V' : 'A'})
                </label>
                <input
                  type="number"
                  step="any"
                  value={params.amplitude ?? (type === 'AC_VOLTAGE' ? 120 : 0.06)}
                  onChange={e => handleChange('amplitude', parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] mb-0.5">Frequência ω (rad/s)</label>
                <input
                  type="number"
                  step="any"
                  value={params.omega ?? 10000}
                  onChange={e => {
                    const om = parseFloat(e.target.value) || 1;
                    const upd = { ...params, omega: om, frequency: om / (2 * Math.PI) };
                    onUpdateParams(component.id, upd);
                  }}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 text-[10px] mb-0.5">Fase θ (graus)</label>
                <input
                  type="number"
                  step="any"
                  value={params.phase ?? 0}
                  onChange={e => handleChange('phase', parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] mb-0.5">Frequência f (Hz)</label>
                <input
                  type="number"
                  step="any"
                  value={params.frequency ? Number(params.frequency.toFixed(2)) : 60}
                  onChange={e => {
                    const fr = parseFloat(e.target.value) || 1;
                    const upd = { ...params, frequency: fr, omega: 2 * Math.PI * fr };
                    onUpdateParams(component.id, upd);
                  }}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {type === 'PULSE_VOLTAGE' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 font-medium mb-1">V Alto (V)</label>
                <input
                  type="number"
                  step="any"
                  value={params.vHigh ?? 12}
                  onChange={e => handleChange('vHigh', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">V Baixo (V)</label>
                <input
                  type="number"
                  step="any"
                  value={params.vLow ?? 0}
                  onChange={e => handleChange('vLow', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Frequência (Hz)</label>
                <input
                  type="number"
                  step="any"
                  value={params.frequency ?? 1000}
                  onChange={e => handleChange('frequency', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Duty Cycle (0 a 1)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={params.dutyCycle ?? 0.5}
                  onChange={e => handleChange('dutyCycle', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </>
        )}

        {type === 'SWITCH' && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-medium text-slate-300">Estado da Chave:</span>
            <button
              onClick={() => handleChange('closed', !(params.closed ?? true))}
              className={`px-3 py-1 rounded text-xs font-semibold tracking-wider transition-colors ${
                (params.closed ?? true)
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
            >
              {(params.closed ?? true) ? 'FECHADO' : 'ABERTO'}
            </button>
          </div>
        )}

        {type === 'SPDT_SWITCH' && (
          <div className="space-y-2.5 p-2.5 bg-slate-950/60 rounded-xl border border-amber-500/20">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Posição da chave:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['a', 'b'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleChange('position', p)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                      (params.position ?? 'a') === p
                        ? 'bg-amber-500/25 text-amber-300 border-amber-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Posição {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Instante de comutação t (s)</label>
              <input
                type="number"
                step="any"
                value={params.switchTime ?? 0}
                onChange={e => handleChange('switchTime', parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Antes desse instante a chave fica no outro contato; depois vai para a posição escolhida.
              </p>
            </div>
          </div>
        )}

        {type === 'DEPENDENT_SOURCE' && (
          <div className="space-y-2.5 p-2.5 bg-slate-950/60 rounded-xl border border-fuchsia-500/20">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Tipo de fonte controlada:</label>
              <select
                value={params.depType ?? 'VCVS'}
                onChange={e => handleChange('depType', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-fuchsia-500"
              >
                <option value="VCVS">Tensão controlada por tensão (μ·v)</option>
                <option value="VCCS">Corrente controlada por tensão (g·v)</option>
                <option value="CCVS">Tensão controlada por corrente (r·i)</option>
                <option value="CCCS">Corrente controlada por corrente (β·i)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Ganho</label>
              <input
                type="number"
                step="any"
                value={params.gain ?? 1}
                onChange={e => handleChange('gain', parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-fuchsia-500"
              />
            </div>
            {(params.depType === 'CCVS' || params.depType === 'CCCS') && (
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Rótulo do elemento de controle (corrente)
                </label>
                <input
                  type="text"
                  value={params.controlLabel || ''}
                  onChange={e => handleChange('controlLabel', e.target.value)}
                  placeholder="ex.: R1"
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-fuchsia-500"
                />
              </div>
            )}
            <p className="text-[10px] text-slate-500">
              Nas fontes controladas por tensão, ligue os dois pinos tracejados (C+ e C−) ao par de pontos
              que fornece a tensão de controle.
            </p>
          </div>
        )}

        {type === 'DIODE' && (
          <div>
            <label className="block text-slate-400 font-medium mb-1">Queda Direta Vf (V)</label>
            <input
              type="number"
              step="0.05"
              value={params.vDrop ?? 0.7}
              onChange={e => handleChange('vDrop', parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={() => onRotate(component.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            Girar 90° (R)
          </button>
          <button
            onClick={() => onDelete(component.id)}
            className="flex items-center justify-center p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-400 transition-colors"
            title="Excluir componente"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
