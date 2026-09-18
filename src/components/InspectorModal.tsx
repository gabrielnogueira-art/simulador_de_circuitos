import React from 'react';
import { CircuitComponent } from '../schematic/types';
import { RotateCw, Trash2, Sliders, X } from 'lucide-react';

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

  const handleChange = (key: string, value: any) => {
    onUpdateParams(component.id, { ...params, [key]: value });
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
          <div className="space-y-2">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Reatância Direta Xc (-jX Ω)</label>
              <input
                type="number"
                step="any"
                placeholder="Ex: -12 ou -16"
                value={params.reactance ?? ''}
                onChange={e => handleChange('reactance', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500">Usado diretamente no cálculo de impedância Zab</span>
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Capacitância Física (F - ex: 100e-6)</label>
              <input
                type="number"
                step="any"
                value={params.capacitance ?? 10e-6}
                onChange={e => handleChange('capacitance', parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        )}

        {type === 'INDUCTOR' && (
          <div className="space-y-2">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Reatância Direta X_L (+jX Ω)</label>
              <input
                type="number"
                step="any"
                placeholder="Ex: 15"
                value={params.reactance ?? ''}
                onChange={e => handleChange('reactance', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-purple-300 font-mono focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500">Usado diretamente no cálculo de impedância Zab</span>
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Indutância Física (H - ex: 1e-3)</label>
              <input
                type="number"
                step="any"
                value={params.inductance ?? 10e-3}
                onChange={e => handleChange('inductance', parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        )}

        {type === 'PORT_TERMINAL' && (
          <div>
            <label className="block text-slate-400 font-medium mb-1">Identificador do Terminal (ex: a ou b)</label>
            <input
              type="text"
              value={params.portName || 'a'}
              onChange={e => handleChange('portName', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
            />
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

        {type === 'AC_VOLTAGE' && (
          <>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Amplitude de Pico (V)</label>
              <input
                type="number"
                step="any"
                value={params.amplitude ?? 120}
                onChange={e => handleChange('amplitude', parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Frequência (Hz)</label>
              <input
                type="number"
                step="any"
                value={params.frequency ?? 60}
                onChange={e => handleChange('frequency', parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </>
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
