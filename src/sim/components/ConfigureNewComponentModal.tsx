import React, { useState, useEffect, useMemo } from 'react';
import { ComponentType, ComponentParams, CircuitComponent } from '../schematic/types';
import { parseSourceFunctionOrPhasor } from '../solvers/phasors';
import { 
  Zap, 
  Boxes, 
  CircleDot, 
  Waves, 
  Activity, 
  ToggleLeft, 
  ArrowRightLeft, 
  Gauge, 
  Minus, 
  X, 
  Check, 
  RotateCw, 
  Plus, 
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface ConfigureNewComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType: ComponentType;
  initialParams?: Partial<ComponentParams>;
  components: CircuitComponent[];
  onConfirm: (type: ComponentType, params: ComponentParams, rotation: number) => void;
  alwaysPreconfigure: boolean;
  onToggleAlwaysPreconfigure: (val: boolean) => void;
}

interface ComponentTypeOption {
  type: ComponentType;
  name: string;
  symbol: string;
  icon: React.ReactNode;
  category: 'passives' | 'sources' | 'semiconductors' | 'instruments';
}

const COMPONENT_OPTIONS: ComponentTypeOption[] = [
  { type: 'RESISTOR', name: 'Resistor', symbol: 'R', icon: <Boxes className="w-4 h-4 text-emerald-400" />, category: 'passives' },
  { type: 'CAPACITOR', name: 'Capacitor', symbol: 'C', icon: <Boxes className="w-4 h-4 text-cyan-400" />, category: 'passives' },
  { type: 'INDUCTOR', name: 'Indutor', symbol: 'L', icon: <Boxes className="w-4 h-4 text-purple-400" />, category: 'passives' },
  { type: 'SWITCH', name: 'Chave / Switch', symbol: 'SW', icon: <ToggleLeft className="w-4 h-4 text-amber-400" />, category: 'passives' },
  { type: 'DC_VOLTAGE', name: 'Fonte DC', symbol: 'Vdc', icon: <CircleDot className="w-4 h-4 text-sky-400" />, category: 'sources' },
  { type: 'AC_VOLTAGE', name: 'Fonte Tens. AC', symbol: 'Vac', icon: <Waves className="w-4 h-4 text-indigo-400" />, category: 'sources' },
  { type: 'AC_CURRENT', name: 'Fonte Corr. AC', symbol: 'Iac', icon: <Waves className="w-4 h-4 text-emerald-400" />, category: 'sources' },
  { type: 'JUNCTION_DOT', name: 'Nó / Emenda', symbol: '•', icon: <CircleDot className="w-4 h-4 text-cyan-400" />, category: 'passives' },
  { type: 'PULSE_VOLTAGE', name: 'Gerador PWM', symbol: 'PWM', icon: <Activity className="w-4 h-4 text-pink-400" />, category: 'sources' },
  { type: 'GROUND', name: 'Terra (GND)', symbol: '0V', icon: <Minus className="w-4 h-4 text-slate-400" />, category: 'sources' },
  { type: 'PORT_TERMINAL', name: 'Terminal Zab', symbol: 'a/b', icon: <CircleDot className="w-4 h-4 text-cyan-400" />, category: 'instruments' },
  { type: 'DIODE', name: 'Diodo', symbol: 'D', icon: <ArrowRightLeft className="w-4 h-4 text-rose-400" />, category: 'semiconductors' },
  { type: 'VOLTMETER', name: 'Voltímetro', symbol: 'V', icon: <Gauge className="w-4 h-4 text-cyan-400" />, category: 'instruments' },
  { type: 'AMMETER', name: 'Amperímetro', symbol: 'A', icon: <Gauge className="w-4 h-4 text-amber-400" />, category: 'instruments' },
];

export const ConfigureNewComponentModal: React.FC<ConfigureNewComponentModalProps> = ({
  isOpen,
  onClose,
  initialType,
  initialParams,
  components,
  onConfirm,
  alwaysPreconfigure,
  onToggleAlwaysPreconfigure
}) => {
  const [selectedType, setSelectedType] = useState<ComponentType>(initialType);
  const [rotation, setRotation] = useState<number>(0);

  // Modos de entrada para Indutor e Capacitor ('REACTANCE' vs 'PHYSICAL')
  const [inductorMode, setInductorMode] = useState<'REACTANCE' | 'PHYSICAL'>('REACTANCE');
  const [capacitorMode, setCapacitorMode] = useState<'REACTANCE' | 'PHYSICAL'>('REACTANCE');

  // Valores em campos numéricos amigáveis
  const [label, setLabel] = useState<string>('');
  
  // Resistor
  const [resValue, setResValue] = useState<number>(1000);
  const [resUnit, setResUnit] = useState<number>(1); // 1 = Ohms, 1e3 = kOhms, 1e6 = MOhms

  // Indutor
  const [indReactance, setIndReactance] = useState<number>(6);
  const [indValue, setIndValue] = useState<number>(10);
  const [indUnit, setIndUnit] = useState<number>(1e-3); // 1 = H, 1e-3 = mH, 1e-6 = uH

  // Capacitor
  const [capReactance, setCapReactance] = useState<number>(16);
  const [capValue, setCapValue] = useState<number>(10);
  const [capUnit, setCapUnit] = useState<number>(1e-6); // 1 = F, 1e-3 = mF, 1e-6 = uF, 1e-9 = nF, 1e-12 = pF

  // Porta Terminal Zab
  const [portName, setPortName] = useState<'a' | 'b' | string>('a');

  // Fontes & Outros
  const [dcVoltage, setDcVoltage] = useState<number>(12);
  const [acAmplitude, setAcAmplitude] = useState<number>(120);
  const [acFrequency, setAcFrequency] = useState<number>(60);
  const [acPhase, setAcPhase] = useState<number>(0);
  const [acFunctionExpr, setAcFunctionExpr] = useState<string>('');
  const [acCurrentAmplitude, setAcCurrentAmplitude] = useState<number>(0.06);
  const [acCurrentFrequency, setAcCurrentFrequency] = useState<number>(1591.55);
  const [acCurrentPhase, setAcCurrentPhase] = useState<number>(0);
  const [acOmega, setAcOmega] = useState<number | undefined>(undefined);
  const [acComplexValue, setAcComplexValue] = useState<{ r: number; i: number } | undefined>(undefined);
  const [pwmVHigh, setPwmVHigh] = useState<number>(12);
  const [pwmVLow, setPwmVLow] = useState<number>(0);
  const [pwmFrequency, setPwmFrequency] = useState<number>(1000);
  const [pwmDuty, setPwmDuty] = useState<number>(0.5);
  const [switchClosed, setSwitchClosed] = useState<boolean>(true);
  const [diodeDrop, setDiodeDrop] = useState<number>(0.7);

  const handleFunctionExprChange = (expr: string, isCurrent: boolean) => {
    setAcFunctionExpr(expr);
    const parsed = parseSourceFunctionOrPhasor(expr, isCurrent ? 'CURRENT' : 'VOLTAGE');
    if (isCurrent) {
      setAcCurrentAmplitude(parsed.amplitude);
      setAcCurrentFrequency(parsed.frequency);
      setAcCurrentPhase(parsed.phaseDeg);
    } else {
      setAcAmplitude(parsed.amplitude);
      setAcFrequency(parsed.frequency);
      setAcPhase(parsed.phaseDeg);
    }
    setAcOmega(parsed.omega);
    setAcComplexValue({ r: parsed.real, i: parsed.imag });
  };

  // Sugere o próximo rótulo livre inteligente
  const getNextLabel = (type: ComponentType): string => {
    switch (type) {
      case 'RESISTOR': {
        const count = components.filter(c => c.type === 'RESISTOR').length;
        return `R${count + 1}`;
      }
      case 'CAPACITOR': {
        const count = components.filter(c => c.type === 'CAPACITOR').length;
        return `C${count + 1}`;
      }
      case 'INDUCTOR': {
        const count = components.filter(c => c.type === 'INDUCTOR').length;
        return `L${count + 1}`;
      }
      case 'PORT_TERMINAL': {
        const hasA = components.some(c => c.type === 'PORT_TERMINAL' && (c.params.portName === 'a' || c.params.label === 'a'));
        return hasA ? 'b' : 'a';
      }
      case 'DC_VOLTAGE': {
        const count = components.filter(c => c.type === 'DC_VOLTAGE').length;
        return `V${count + 1}`;
      }
      case 'AC_VOLTAGE': {
        const count = components.filter(c => c.type === 'AC_VOLTAGE').length;
        return `Vac${count + 1}`;
      }
      case 'AC_CURRENT': {
        const count = components.filter(c => c.type === 'AC_CURRENT').length;
        return `I${count + 1}`;
      }
      case 'JUNCTION_DOT': {
        const count = components.filter(c => c.type === 'JUNCTION_DOT').length;
        return `Nó${count + 1}`;
      }
      case 'PULSE_VOLTAGE': {
        const count = components.filter(c => c.type === 'PULSE_VOLTAGE').length;
        return `PWM${count + 1}`;
      }
      case 'DIODE': {
        const count = components.filter(c => c.type === 'DIODE').length;
        return `D${count + 1}`;
      }
      case 'SWITCH': {
        const count = components.filter(c => c.type === 'SWITCH').length;
        return `SW${count + 1}`;
      }
      case 'SPDT_SWITCH': {
        const count = components.filter(c => c.type === 'SPDT_SWITCH').length;
        return `S${count + 1}`;
      }
      case 'DEPENDENT_SOURCE': {
        const count = components.filter(c => c.type === 'DEPENDENT_SOURCE').length;
        return `E${count + 1}`;
      }
      case 'VOLTMETER': {
        const count = components.filter(c => c.type === 'VOLTMETER').length;
        return `V_Meter${count + 1}`;
      }
      case 'AMMETER': {
        const count = components.filter(c => c.type === 'AMMETER').length;
        return `A_Meter${count + 1}`;
      }
      case 'POWER_BUS': {
        const count = components.filter(c => c.type === 'POWER_BUS').length;
        return `Barra ${count + 1}`;
      }
      case 'TRANSMISSION_LINE': {
        const count = components.filter(c => c.type === 'TRANSMISSION_LINE').length;
        return `LT${count + 1}`;
      }
      case 'POWER_TRANSFORMER': {
        const count = components.filter(c => c.type === 'POWER_TRANSFORMER').length;
        return `T${count + 1}`;
      }
      case 'SYNCHRONOUS_GENERATOR': {
        const count = components.filter(c => c.type === 'SYNCHRONOUS_GENERATOR').length;
        return `G${count + 1}`;
      }
      case 'POWER_LOAD': {
        const count = components.filter(c => c.type === 'POWER_LOAD').length;
        return `Carga${count + 1}`;
      }
      case 'SHUNT_REACTOR': {
        const count = components.filter(c => c.type === 'SHUNT_REACTOR').length;
        return `Lsh${count + 1}`;
      }
      case 'SERIES_CAPACITOR': {
        const count = components.filter(c => c.type === 'SERIES_CAPACITOR').length;
        return `Cser${count + 1}`;
      }
      case 'GROUND':
        return 'GND';
      default:
        return `${type}_${components.length + 1}`;
    }
  };

  // Atualiza os dados quando o modal abre ou initialType muda
  useEffect(() => {
    if (!isOpen) return;

    setSelectedType(initialType);
    const nextLab = getNextLabel(initialType);
    setLabel(initialParams?.label || nextLab);

    if (initialType === 'PORT_TERMINAL') {
      const p = initialParams?.portName || (nextLab === 'b' ? 'b' : 'a');
      setPortName(p);
      setLabel(p);
    }

    if (initialParams?.resistance !== undefined) {
      if (initialParams.resistance >= 1e6) {
        setResValue(initialParams.resistance / 1e6);
        setResUnit(1e6);
      } else if (initialParams.resistance >= 1e3) {
        setResValue(initialParams.resistance / 1e3);
        setResUnit(1e3);
      } else {
        setResValue(initialParams.resistance);
        setResUnit(1);
      }
    }

    if (initialParams?.reactance !== undefined) {
      if (initialType === 'INDUCTOR') {
        setInductorMode('REACTANCE');
        setIndReactance(Math.abs(initialParams.reactance));
      } else if (initialType === 'CAPACITOR') {
        setCapacitorMode('REACTANCE');
        setCapReactance(Math.abs(initialParams.reactance));
      }
    } else {
      if (initialParams?.inductance !== undefined) {
        setInductorMode('PHYSICAL');
        if (initialParams.inductance >= 1) {
          setIndValue(initialParams.inductance);
          setIndUnit(1);
        } else if (initialParams.inductance >= 1e-3) {
          setIndValue(initialParams.inductance * 1e3);
          setIndUnit(1e-3);
        } else {
          setIndValue(initialParams.inductance * 1e6);
          setIndUnit(1e-6);
        }
      }
      if (initialParams?.capacitance !== undefined) {
        setCapacitorMode('PHYSICAL');
        if (initialParams.capacitance >= 1) {
          setCapValue(initialParams.capacitance);
          setCapUnit(1);
        } else if (initialParams.capacitance >= 1e-3) {
          setCapValue(initialParams.capacitance * 1e3);
          setCapUnit(1e-3);
        } else if (initialParams.capacitance >= 1e-6) {
          setCapValue(initialParams.capacitance * 1e6);
          setCapUnit(1e-6);
        } else if (initialParams.capacitance >= 1e-9) {
          setCapValue(initialParams.capacitance * 1e9);
          setCapUnit(1e-9);
        } else {
          setCapValue(initialParams.capacitance * 1e12);
          setCapUnit(1e-12);
        }
      }
    }

    if (initialParams?.waveformFunction) {
      setAcFunctionExpr(initialParams.waveformFunction);
    }
    if (initialParams?.amplitude !== undefined) {
      setAcAmplitude(initialParams.amplitude);
      setAcCurrentAmplitude(initialParams.amplitude);
    }
    if (initialParams?.current !== undefined) {
      setAcCurrentAmplitude(initialParams.current);
    }
    if (initialParams?.frequency !== undefined) {
      setAcFrequency(initialParams.frequency);
      setAcCurrentFrequency(initialParams.frequency);
    }
    if (initialParams?.phase !== undefined) {
      setAcPhase(initialParams.phase);
      setAcCurrentPhase(initialParams.phase);
    }
    if (initialParams?.omega !== undefined) {
      setAcOmega(initialParams.omega);
    }
    if (initialParams?.complexValue !== undefined) {
      setAcComplexValue(initialParams.complexValue);
    }
  }, [isOpen, initialType, initialParams]);

  // Ao alterar o tipo manualmente dentro do modal
  const handleTypeChange = (newType: ComponentType) => {
    setSelectedType(newType);
    const lab = getNextLabel(newType);
    setLabel(lab);
    if (newType === 'PORT_TERMINAL') {
      setPortName(lab === 'b' ? 'b' : 'a');
    }
  };

  // Preview formatado
  const previewValue = useMemo(() => {
    switch (selectedType) {
      case 'RESISTOR':
        return `${resValue} ${resUnit === 1e6 ? 'MΩ' : resUnit === 1e3 ? 'kΩ' : 'Ω'}`;
      case 'INDUCTOR':
        if (inductorMode === 'REACTANCE') {
          return `j${Math.abs(indReactance)} Ω`;
        }
        return `${indValue} ${indUnit === 1 ? 'H' : indUnit === 1e-3 ? 'mH' : 'µH'}`;
      case 'CAPACITOR':
        if (capacitorMode === 'REACTANCE') {
          return `-j${Math.abs(capReactance)} Ω`;
        }
        return `${capValue} ${capUnit === 1 ? 'F' : capUnit === 1e-3 ? 'mF' : capUnit === 1e-6 ? 'µF' : capUnit === 1e-9 ? 'nF' : 'pF'}`;
      case 'PORT_TERMINAL':
        return `Terminal "${portName}"`;
      case 'DC_VOLTAGE':
        return `${dcVoltage} V`;
      case 'AC_VOLTAGE':
        if (acFunctionExpr.trim()) return acFunctionExpr.trim();
        return `${acAmplitude} V @ ${acFrequency} Hz`;
      case 'AC_CURRENT':
        if (acFunctionExpr.trim()) return acFunctionExpr.trim();
        return `${acCurrentAmplitude >= 0.001 ? (acCurrentAmplitude * 1000).toFixed(1) + ' mA' : acCurrentAmplitude + ' A'} @ ${acCurrentFrequency.toFixed(1)} Hz`;
      case 'JUNCTION_DOT':
        return 'Emenda de Nó (•)';
      case 'PULSE_VOLTAGE':
        return `${pwmVHigh}V PWM (${(pwmDuty * 100).toFixed(0)}%)`;
      case 'SWITCH':
        return switchClosed ? 'FECHADO' : 'ABERTO';
      case 'DIODE':
        return `Diodo (${diodeDrop} V)`;
      case 'GROUND':
        return 'GND (0V)';
      default:
        return '';
    }
  }, [
    selectedType,
    resValue,
    resUnit,
    inductorMode,
    indReactance,
    indValue,
    indUnit,
    capacitorMode,
    capReactance,
    capValue,
    capUnit,
    portName,
    dcVoltage,
    acAmplitude,
    acFrequency,
    acFunctionExpr,
    acCurrentAmplitude,
    acCurrentFrequency,
    pwmVHigh,
    pwmDuty,
    switchClosed,
    diodeDrop
  ]);

  const handleConfirm = () => {
    const finalParams: ComponentParams = {
      label: label.trim() || getNextLabel(selectedType)
    };

    switch (selectedType) {
      case 'RESISTOR':
        finalParams.resistance = Math.max(resValue * resUnit, 1e-6);
        break;

      case 'INDUCTOR':
        if (inductorMode === 'REACTANCE') {
          finalParams.reactance = Math.abs(indReactance);
          // Valor físico equivalente aproximado para simulador PLECS no domínio do tempo
          finalParams.inductance = Math.max(Math.abs(indReactance) / (2 * Math.PI * 60), 1e-6);
        } else {
          finalParams.inductance = Math.max(indValue * indUnit, 1e-12);
          delete finalParams.reactance; // Garante que usará indutância física no Zab
        }
        break;

      case 'CAPACITOR':
        if (capacitorMode === 'REACTANCE') {
          finalParams.reactance = -Math.abs(capReactance);
          // Valor físico equivalente aproximado para simulador PLECS no domínio do tempo
          finalParams.capacitance = Math.max(1 / (2 * Math.PI * 60 * Math.abs(capReactance)), 1e-12);
        } else {
          finalParams.capacitance = Math.max(capValue * capUnit, 1e-12);
          delete finalParams.reactance; // Garante que usará capacitância física no Zab
        }
        break;

      case 'PORT_TERMINAL':
        finalParams.portName = portName;
        finalParams.label = portName;
        break;

      case 'DC_VOLTAGE':
        finalParams.voltage = dcVoltage;
        break;

      case 'AC_VOLTAGE':
        finalParams.amplitude = acAmplitude;
        finalParams.frequency = acFrequency;
        finalParams.phase = acPhase;
        if (acFunctionExpr.trim()) finalParams.waveformFunction = acFunctionExpr.trim();
        if (acOmega !== undefined) finalParams.omega = acOmega;
        if (acComplexValue !== undefined) finalParams.complexValue = acComplexValue;
        break;

      case 'AC_CURRENT':
        finalParams.amplitude = acCurrentAmplitude;
        finalParams.frequency = acCurrentFrequency;
        finalParams.phase = acCurrentPhase;
        finalParams.current = acCurrentAmplitude;
        if (acFunctionExpr.trim()) finalParams.waveformFunction = acFunctionExpr.trim();
        if (acOmega !== undefined) finalParams.omega = acOmega;
        if (acComplexValue !== undefined) finalParams.complexValue = acComplexValue;
        break;

      case 'JUNCTION_DOT':
        break;

      case 'PULSE_VOLTAGE':
        finalParams.vHigh = pwmVHigh;
        finalParams.vLow = pwmVLow;
        finalParams.frequency = pwmFrequency;
        finalParams.dutyCycle = pwmDuty;
        break;

      case 'SWITCH':
        finalParams.closed = switchClosed;
        break;

      case 'DIODE':
        finalParams.vDrop = diodeDrop;
        break;
    }

    onConfirm(selectedType, finalParams, rotation);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
          } else if (e.key === 'Escape') {
            onClose();
          }
        }}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Configurar Novo Componente
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold uppercase">
                  Pré-configuração
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Ajuste os parâmetros antes de posicionar no esquemático
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

        {/* Conteúdo rolável */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Seletor Rápido de Tipo de Componente */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tipo do Componente
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800">
              {COMPONENT_OPTIONS.map(opt => (
                <button
                  key={opt.type + opt.symbol}
                  type="button"
                  onClick={() => handleTypeChange(opt.type)}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium transition-all ${
                    selectedType === opt.type
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                      : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <div className="shrink-0">{opt.icon}</div>
                  <span className="truncate">{opt.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Rótulo / Nome */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Rótulo / Identificador no Circuito
              </label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Ex: R1, L1, C1, Port_a"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Rotação Inicial */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Orientação Inicial
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[0, 90, 180, 270].map(deg => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setRotation(deg)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      rotation === deg
                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Seção Específica para INDUTOR */}
          {selectedType === 'INDUCTOR' && (
            <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-purple-300 mb-1.5">
                  Formato de Especificação do Indutor:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInductorMode('REACTANCE')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                      inductorMode === 'REACTANCE'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400'
                        : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    <span>Reatância Fasorial (+jX Ω)</span>
                    <span className="text-[10px] font-normal opacity-80">Ex: j6 Ω, j8 Ω (Exercícios AC)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInductorMode('PHYSICAL')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                      inductorMode === 'PHYSICAL'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400'
                        : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    <span>Indutância Física (H)</span>
                    <span className="text-[10px] font-normal opacity-80">Ex: 6 H, 10 mH, 50 µH</span>
                  </button>
                </div>
              </div>

              {inductorMode === 'REACTANCE' ? (
                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-medium">
                    Reatância Direta X_L (+jX em Ohms):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-purple-400 font-mono font-bold text-sm">+j</span>
                    <input
                      type="number"
                      step="any"
                      value={indReactance}
                      onChange={e => setIndReactance(parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 6 ou 8"
                      className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-purple-500/50 rounded-lg text-sm text-purple-200 font-mono focus:outline-none focus:border-purple-400"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 text-xs font-mono">Ω</span>
                  </div>
                  <p className="text-[11px] text-purple-300/80 mt-1.5">
                    O cálculo de Zab usará exatamente <strong>+j{indReactance} Ω</strong> sem depender de frequência.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs text-slate-300 font-medium">
                    Valor da Indutância Física:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={indValue}
                      onChange={e => setIndValue(parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 6 ou 10"
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    />
                    <select
                      value={indUnit}
                      onChange={e => setIndUnit(parseFloat(e.target.value))}
                      className="w-24 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                    >
                      <option value={1}>H (Henry)</option>
                      <option value={1e-3}>mH (10⁻³)</option>
                      <option value={1e-6}>µH (10⁻⁶)</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Calculado no Zab pela fórmula: <strong>Z_L = j · ω · L</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Seção Específica para CAPACITOR */}
          {selectedType === 'CAPACITOR' && (
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-cyan-300 mb-1.5">
                  Formato de Especificação do Capacitor:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCapacitorMode('REACTANCE')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                      capacitorMode === 'REACTANCE'
                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400'
                        : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    <span>Reatância Fasorial (-jX Ω)</span>
                    <span className="text-[10px] font-normal opacity-80">Ex: -j4 Ω, -j16 Ω (Exercícios AC)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapacitorMode('PHYSICAL')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                      capacitorMode === 'PHYSICAL'
                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400'
                        : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    <span>Capacitância Física (F)</span>
                    <span className="text-[10px] font-normal opacity-80">Ex: 100 µF, 10 nF, 1 F</span>
                  </button>
                </div>
              </div>

              {capacitorMode === 'REACTANCE' ? (
                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-medium">
                    Reatância Direta X_C (-jX em Ohms):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-cyan-400 font-mono font-bold text-sm">-j</span>
                    <input
                      type="number"
                      step="any"
                      value={capReactance}
                      onChange={e => setCapReactance(parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 4 ou 16"
                      className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-cyan-500/50 rounded-lg text-sm text-cyan-200 font-mono focus:outline-none focus:border-cyan-400"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 text-xs font-mono">Ω</span>
                  </div>
                  <p className="text-[11px] text-cyan-300/80 mt-1.5">
                    O cálculo de Zab usará exatamente <strong>-j{Math.abs(capReactance)} Ω</strong> sem depender de frequência.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs text-slate-300 font-medium">
                    Valor da Capacitância Física:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={capValue}
                      onChange={e => setCapValue(parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 100 ou 10"
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    />
                    <select
                      value={capUnit}
                      onChange={e => setCapUnit(parseFloat(e.target.value))}
                      className="w-24 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                    >
                      <option value={1e-6}>µF (10⁻⁶)</option>
                      <option value={1e-9}>nF (10⁻⁹)</option>
                      <option value={1e-12}>pF (10⁻¹²)</option>
                      <option value={1e-3}>mF (10⁻³)</option>
                      <option value={1}>F (Farad)</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Calculado no Zab pela fórmula: <strong>Z_C = -j / (ω · C)</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Seção Específica para RESISTOR */}
          {selectedType === 'RESISTOR' && (
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <label className="block text-xs text-emerald-300 font-medium">
                Resistência R:
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  value={resValue}
                  onChange={e => setResValue(parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 1000 ou 4.7"
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
                <select
                  value={resUnit}
                  onChange={e => setResUnit(parseFloat(e.target.value))}
                  className="w-24 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value={1}>Ω (Ohms)</option>
                  <option value={1e3}>kΩ (10³)</option>
                  <option value={1e6}>MΩ (10⁶)</option>
                </select>
              </div>
            </div>
          )}

          {/* Seção Específica para PORT_TERMINAL */}
          {selectedType === 'PORT_TERMINAL' && (
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
              <label className="block text-xs text-cyan-300 font-medium">
                Função do Terminal de Medição Zab:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPortName('a');
                    setLabel('a');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                    portName === 'a'
                      ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-md'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  Terminal &quot;a&quot; (Entrada Positiva)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPortName('b');
                    setLabel('b');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                    portName === 'b'
                      ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-md'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  Terminal &quot;b&quot; (Referência / Retorno)
                </button>
              </div>
            </div>
          )}

          {/* Seção Específica para FONTE DC */}
          {selectedType === 'DC_VOLTAGE' && (
            <div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-500/30 space-y-2">
              <label className="block text-xs text-sky-300 font-medium">
                Tensão DC (V):
              </label>
              <input
                type="number"
                step="any"
                value={dcVoltage}
                onChange={e => setDcVoltage(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-sky-200 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Seção Específica para FONTE AC (Tensão ou Corrente) */}
          {(selectedType === 'AC_VOLTAGE' || selectedType === 'AC_CURRENT') && (
            <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-indigo-400" />
                  {selectedType === 'AC_VOLTAGE' ? 'Fonte AC de Tensão' : 'Fonte AC de Corrente'}
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedType === 'AC_VOLTAGE' ? 'v(t) = Vm·cos(ωt + φ)' : 'i(t) = Im·cos(ωt + φ)'}
                </span>
              </div>

              {/* Expressão Matemática / Fasor */}
              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">
                  Expressão Matemática / Fasor Direto:
                </label>
                <input
                  type="text"
                  value={acFunctionExpr}
                  onChange={e => handleFunctionExprChange(e.target.value, selectedType === 'AC_CURRENT')}
                  placeholder={
                    selectedType === 'AC_VOLTAGE' 
                      ? 'Ex: 10cos(2t) V, 60 ∠ 0° V, 120 ∠ -30°'
                      : 'Ex: 60cos(10.000t) mA, 40+j80 mA, 40 ∠ 0° mA'
                  }
                  className="w-full px-3 py-1.5 bg-slate-950 border border-indigo-500/50 rounded-lg text-xs text-indigo-200 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Botões Rápidos */}
              <div>
                <div className="text-[10px] text-slate-400 mb-1">Predefinições Rápidas de Livro:</div>
                <div className="flex flex-wrap gap-1">
                  {selectedType === 'AC_VOLTAGE' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleFunctionExprChange('10cos(2t) V', false)}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-indigo-300 border border-slate-700 cursor-pointer"
                      >
                        10cos(2t) V
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFunctionExprChange('60 ∠ 0° V', false)}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-indigo-300 border border-slate-700 cursor-pointer"
                      >
                        60 ∠ 0° V
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFunctionExprChange('127 V 60 Hz', false)}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-indigo-300 border border-slate-700 cursor-pointer"
                      >
                        127V 60Hz
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleFunctionExprChange('60cos(10.000t) mA', true)}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-emerald-300 border border-slate-700 cursor-pointer"
                      >
                        60cos(10.000t) mA (Ex 1.11)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFunctionExprChange('40+j80 mA', true)}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-emerald-300 border border-slate-700 cursor-pointer"
                      >
                        40+j80 mA (Ex 1.10)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFunctionExprChange('40 ∠ 0° mA', true)}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-emerald-300 border border-slate-700 cursor-pointer"
                      >
                        40 ∠ 0° mA
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Parâmetros Individuais */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label className="block text-[11px] text-indigo-300 font-medium mb-1">
                    {selectedType === 'AC_VOLTAGE' ? 'Amplitude (V)' : 'Amplitude (A)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={selectedType === 'AC_VOLTAGE' ? acAmplitude : acCurrentAmplitude}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      if (selectedType === 'AC_VOLTAGE') setAcAmplitude(val);
                      else setAcCurrentAmplitude(val);
                    }}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-indigo-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-indigo-300 font-medium mb-1">
                    Freq. (Hz)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={selectedType === 'AC_VOLTAGE' ? acFrequency : acCurrentFrequency}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      if (selectedType === 'AC_VOLTAGE') setAcFrequency(val);
                      else setAcCurrentFrequency(val);
                    }}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-indigo-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-indigo-300 font-medium mb-1">
                    Fase (°)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={selectedType === 'AC_VOLTAGE' ? acPhase : acCurrentPhase}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      if (selectedType === 'AC_VOLTAGE') setAcPhase(val);
                      else setAcCurrentPhase(val);
                    }}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-indigo-200 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Seção para JUNCTION_DOT */}
          {selectedType === 'JUNCTION_DOT' && (
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-1">
              <div className="text-xs text-cyan-300 font-bold flex items-center gap-1.5">
                <CircleDot className="w-4 h-4 text-cyan-400" />
                Ponto de Conexão / Nó de Emenda
              </div>
              <p className="text-[11px] text-slate-400">
                Cria um nó central visível (•) para conectar múltiplos ramos, derivações em &apos;T&apos; e organizar o esquemático.
              </p>
            </div>
          )}

          {/* Seção para CHAVE */}
          {selectedType === 'SWITCH' && (
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
              <span className="text-xs text-amber-300 font-medium">Estado Inicial da Chave:</span>
              <button
                type="button"
                onClick={() => setSwitchClosed(!switchClosed)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  switchClosed
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {switchClosed ? 'FECHADO (Conduz)' : 'ABERTO (Isolado)'}
              </button>
            </div>
          )}

          {/* Card de Pré-visualização do Componente */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400">
                {COMPONENT_OPTIONS.find(o => o.type === selectedType)?.icon}
              </div>
              <div>
                <div className="text-xs text-slate-400">Prévia no Esquemático:</div>
                <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>{label || 'Sem nome'}</span>
                  <span className="text-xs font-mono text-cyan-400 font-semibold">
                    ({previewValue})
                  </span>
                </div>
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-500 px-2 py-1 bg-slate-900 rounded-md border border-slate-800">
              Rot: {rotation}°
            </div>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={alwaysPreconfigure}
              onChange={e => onToggleAlwaysPreconfigure(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
            />
            <span>Sempre abrir esta configuração ao clicar na barra lateral</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancelar (Esc)
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Adicionar ao Circuito (Enter)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
