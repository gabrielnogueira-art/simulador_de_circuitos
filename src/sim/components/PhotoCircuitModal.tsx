import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, Upload, CheckCircle2, Sparkles, X, Plus, Trash2, Edit3, Image as ImageIcon, Move, Settings2, Sliders } from 'lucide-react';
import { CircuitVision, DetectedElement, VisionCircuitResult } from '../engine/circuitVision';
import { CircuitComponent, ComponentParams, ComponentType, Wire } from '../schematic/types';
import { ConfigureNewComponentModal } from './ConfigureNewComponentModal';

interface PhotoCircuitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySchematic: (components: CircuitComponent[], wires: Wire[]) => void;
}

const COMPONENT_OPTIONS: { type: ComponentType; label: string }[] = [
  { type: 'RESISTOR', label: 'Resistor (R)' },
  { type: 'CAPACITOR', label: 'Capacitor (C)' },
  { type: 'INDUCTOR', label: 'Indutor (L)' },
  { type: 'DIODE', label: 'Diodo (D)' },
  { type: 'DC_VOLTAGE', label: 'Fonte DC (Vdc)' },
  { type: 'AC_VOLTAGE', label: 'Fonte AC (Vac)' },
  { type: 'PULSE_VOLTAGE', label: 'Fonte PWM' },
  { type: 'SWITCH', label: 'Chave (SW)' },
  { type: 'GROUND', label: 'Terra (GND)' },
  { type: 'PORT_TERMINAL', label: 'Terminal Zab (Porta a/b)' },
  { type: 'VOLTMETER', label: 'Voltímetro' },
  { type: 'AMMETER', label: 'Amperímetro' }
];

function deriveParamsFromElement(el: DetectedElement): Partial<ComponentParams> {
  if (el.params) return { ...el.params };
  const p: Partial<ComponentParams> = { label: el.label };
  const text = (el.valueText || '').toLowerCase().trim();
  const isJ = text.includes('j');
  const numMatch = text.match(/[-+]?\d*\.?\d+/);
  const num = numMatch ? parseFloat(numMatch[0]) : 0;

  switch (el.type) {
    case 'RESISTOR':
      if (text.includes('k')) p.resistance = (num || 1) * 1e3;
      else if (text.includes('m') && !text.includes('mhz') && !text.includes('mv')) p.resistance = (num || 1) * 1e6;
      else p.resistance = num || 1000;
      break;

    case 'INDUCTOR':
      if (isJ || text.includes('ohm') || text.includes('ω') || text.includes('Ω')) {
        p.reactance = Math.abs(num) || 6;
      } else {
        p.inductance = num ? (text.includes('m') ? num * 1e-3 : num) : 6;
      }
      break;

    case 'CAPACITOR':
      if (isJ || text.includes('ohm') || text.includes('ω') || text.includes('Ω')) {
        p.reactance = -Math.abs(num || 16);
      } else {
        p.capacitance = num ? (text.includes('u') ? num * 1e-6 : num) : 10e-6;
      }
      break;

    case 'PORT_TERMINAL':
      p.portName = text.includes('b') || el.label.toLowerCase() === 'b' ? 'b' : 'a';
      p.label = p.portName;
      break;

    case 'DC_VOLTAGE':
      p.voltage = num || 12;
      break;

    case 'AC_VOLTAGE':
      p.amplitude = num || 120;
      break;
  }
  return p;
}

function formatValueText(type: ComponentType, params: ComponentParams): string {
  switch (type) {
    case 'RESISTOR': {
      const r = params.resistance ?? 1000;
      if (r >= 1e6) return `${(r / 1e6).toFixed(1)} MΩ`;
      if (r >= 1e3) return `${(r / 1e3).toFixed(1)} kΩ`;
      return `${r} Ω`;
    }

    case 'INDUCTOR':
      if (params.reactance !== undefined) return `j${Math.abs(params.reactance)} Ω`;
      if ((params.inductance ?? 1e-3) >= 1) return `${params.inductance} H`;
      if ((params.inductance ?? 1e-3) >= 1e-3) return `${((params.inductance ?? 1e-3) * 1e3).toFixed(1)} mH`;
      return `${((params.inductance ?? 1e-3) * 1e6).toFixed(1)} µH`;

    case 'CAPACITOR':
      if (params.reactance !== undefined) return `-j${Math.abs(params.reactance)} Ω`;
      if ((params.capacitance ?? 10e-6) >= 1) return `${params.capacitance} F`;
      if ((params.capacitance ?? 10e-6) >= 1e-3) return `${((params.capacitance ?? 10e-6) * 1e3).toFixed(1)} mF`;
      if ((params.capacitance ?? 10e-6) >= 1e-6) return `${((params.capacitance ?? 10e-6) * 1e6).toFixed(1)} µF`;
      if ((params.capacitance ?? 10e-6) >= 1e-9) return `${((params.capacitance ?? 10e-6) * 1e9).toFixed(1)} nF`;
      return `${((params.capacitance ?? 10e-6) * 1e12).toFixed(1)} pF`;

    case 'PORT_TERMINAL':
      return `Terminal "${params.portName || 'a'}"`;

    case 'DC_VOLTAGE':
      return `${params.voltage ?? 12} V`;

    case 'AC_VOLTAGE':
      return `${params.amplitude ?? 120} V`;

    case 'SWITCH':
      return (params.closed ?? true) ? 'Fechado' : 'Aberto';

    case 'DIODE':
      return `Diodo (${params.vDrop ?? 0.7}V)`;

    default:
      return params.label || '';
  }
}

export const PhotoCircuitModal: React.FC<PhotoCircuitModalProps> = ({
  isOpen,
  onClose,
  onApplySchematic
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<VisionCircuitResult | null>(null);
  const [selectedElemId, setSelectedElemId] = useState<string | null>(null);
  const [elements, setElements] = useState<DetectedElement[]>([]);
  const [dragAction, setDragAction] = useState<{
    type: 'move' | 'resize';
    elementId: string;
    startPointer: { x: number; y: number };
    origBox: { x: number; y: number; width: number; height: number };
  } | null>(null);

  // Estados para o modal de pré-configuração antes de inserir na foto
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configTargetId, setConfigTargetId] = useState<string | null>(null);
  const [configInitialType, setConfigInitialType] = useState<ComponentType>('RESISTOR');
  const [configInitialParams, setConfigInitialParams] = useState<Partial<ComponentParams> | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  // Escuta global de movimentação e liberação do arraste de caixas sobre a foto
  useEffect(() => {
    if (!dragAction) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!imageContainerRef.current) return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const deltaXPercent = ((clientX - dragAction.startPointer.x) / rect.width) * 100;
      const deltaYPercent = ((clientY - dragAction.startPointer.y) / rect.height) * 100;

      setElements(prev =>
        prev.map(item => {
          if (item.id !== dragAction.elementId) return item;

          if (dragAction.type === 'move') {
            const maxX = Math.max(0, 100 - dragAction.origBox.width);
            const maxY = Math.max(0, 100 - dragAction.origBox.height);
            let nextX = dragAction.origBox.x + deltaXPercent;
            let nextY = dragAction.origBox.y + deltaYPercent;

            nextX = Math.max(0, Math.min(maxX, nextX));
            nextY = Math.max(0, Math.min(maxY, nextY));

            nextX = Math.round(nextX * 10) / 10;
            nextY = Math.round(nextY * 10) / 10;

            return {
              ...item,
              box: {
                ...item.box,
                x: nextX,
                y: nextY
              }
            };
          } else if (dragAction.type === 'resize') {
            let nextW = dragAction.origBox.width + deltaXPercent;
            let nextH = dragAction.origBox.height + deltaYPercent;

            nextW = Math.max(6, Math.min(100 - dragAction.origBox.x, nextW));
            nextH = Math.max(6, Math.min(100 - dragAction.origBox.y, nextH));

            nextW = Math.round(nextW * 10) / 10;
            nextH = Math.round(nextH * 10) / 10;

            return {
              ...item,
              box: {
                ...item.box,
                width: nextW,
                height: nextH
              }
            };
          }

          return item;
        })
      );
    };

    const handlePointerUp = () => {
      setDragAction(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('touchcancel', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('touchcancel', handlePointerUp);
    };
  }, [dragAction]);

  const handleStartDrag = (
    e: React.MouseEvent | React.TouchEvent,
    elementId: string,
    type: 'move' | 'resize'
  ) => {
    e.stopPropagation();
    if ('button' in e && (e as React.MouseEvent).button !== 0) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const el = elements.find(item => item.id === elementId);
    if (!el) return;

    setSelectedElemId(elementId);
    setDragAction({
      type,
      elementId,
      startPointer: { x: clientX, y: clientY },
      origBox: { ...el.box }
    });
  };

  // Gera mockComponents para o ConfigureNewComponentModal
  const mockComponents: CircuitComponent[] = useMemo(() => {
    return elements.map(el => ({
      id: el.id,
      type: el.type,
      x: 0,
      y: 0,
      rotation: el.rotation ?? 0,
      params: el.params || { label: el.label },
      terminals: []
    }));
  }, [elements]);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImageSrc(dataUrl);
      setIsAnalyzing(true);

      // Executa o processamento de visão computacional
      const analysis = await CircuitVision.analyzeImage(dataUrl);
      setResult(analysis);
      setElements(analysis.detectedElements);
      setSelectedElemId(analysis.detectedElements[0]?.id || null);
      setIsAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  // Carrega foto de demonstração para teste imediato
  const handleLoadSamplePhoto = () => {
    // Cria uma imagem sintética estilizada representando um esquemático desenhado à mão
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;

    // Papel milimetrado / desenho de engenharia
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 600, 400);

    // Linhas azuis de caderno/esboço
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let x = 0; x < 600; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 400);
      ctx.stroke();
    }
    for (let y = 0; y < 400; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(600, y);
      ctx.stroke();
    }

    // Traço do circuito feito "à mão" em grafite escuro
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fio superior
    ctx.beginPath();
    ctx.moveTo(80, 150);
    ctx.lineTo(200, 150);
    ctx.lineTo(340, 150);
    ctx.lineTo(480, 150);
    ctx.stroke();

    // Fonte DC (círculo com + e -)
    ctx.beginPath();
    ctx.arc(80, 220, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('+', 75, 212);
    ctx.fillText('-', 77, 235);
    ctx.fillText('24V', 40, 225);

    // Indutor L1 (espiras)
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      ctx.arc(240 + i * 26, 150, 13, Math.PI, 0, false);
    }
    ctx.stroke();
    ctx.fillText('L1 (2mH)', 240, 120);

    // Diodo D1
    ctx.beginPath();
    ctx.moveTo(200, 150);
    ctx.lineTo(200, 280);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(185, 230);
    ctx.lineTo(215, 230);
    ctx.lineTo(200, 200);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(185, 200);
    ctx.lineTo(215, 200);
    ctx.stroke();
    ctx.fillText('D1', 150, 215);

    // Capacitor C1
    ctx.beginPath();
    ctx.moveTo(380, 150);
    ctx.lineTo(380, 280);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(365, 210);
    ctx.lineTo(395, 210);
    ctx.moveTo(365, 220);
    ctx.lineTo(395, 220);
    ctx.stroke();
    ctx.fillText('100uF', 405, 218);

    // Resistor R_Load
    ctx.beginPath();
    ctx.moveTo(480, 150);
    ctx.lineTo(480, 185);
    ctx.lineTo(468, 195);
    ctx.lineTo(492, 205);
    ctx.lineTo(468, 215);
    ctx.lineTo(492, 225);
    ctx.lineTo(480, 235);
    ctx.lineTo(480, 280);
    ctx.stroke();
    ctx.fillText('10Ω', 500, 215);

    // Barramento inferior GND
    ctx.beginPath();
    ctx.moveTo(80, 280);
    ctx.lineTo(480, 280);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(80, 246);
    ctx.lineTo(80, 280);
    ctx.stroke();

    // Símbolo Terra
    ctx.beginPath();
    ctx.moveTo(280, 280);
    ctx.lineTo(280, 310);
    ctx.moveTo(260, 310);
    ctx.lineTo(300, 310);
    ctx.moveTo(270, 318);
    ctx.lineTo(290, 318);
    ctx.moveTo(276, 326);
    ctx.lineTo(284, 326);
    ctx.stroke();

    const sampleUrl = canvas.toDataURL('image/png');
    setImageSrc(sampleUrl);
    setIsAnalyzing(true);
    setTimeout(async () => {
      const analysis = await CircuitVision.analyzeImage(sampleUrl);
      setResult(analysis);
      setElements(analysis.detectedElements);
      setSelectedElemId(analysis.detectedElements[0]?.id || null);
      setIsAnalyzing(false);
    }, 600);
  };

  const handleUpdateElement = (id: string, updates: Partial<DetectedElement>) => {
    setElements(prev => prev.map(el => (el.id === id ? { ...el, ...updates } : el)));
  };

  const handleDeleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedElemId === id) {
      setSelectedElemId(null);
    }
  };


  const handleOpenAddModal = () => {
    setConfigTargetId(null);
    setConfigInitialType('RESISTOR');
    setConfigInitialParams(undefined);
    setIsConfigModalOpen(true);
  };

  const handleOpenConfigForElement = (el: DetectedElement) => {
    setConfigTargetId(el.id);
    setConfigInitialType(el.type);
    setConfigInitialParams(deriveParamsFromElement(el));
    setIsConfigModalOpen(true);
  };

  const handleConfirmConfig = (type: ComponentType, params: ComponentParams, rotation: number) => {
    const formatted = formatValueText(type, params);

    if (configTargetId) {
      // Editando elemento existente
      setElements(prev =>
        prev.map(el => {
          if (el.id !== configTargetId) return el;
          return {
            ...el,
            type,
            label: params.label || el.label,
            valueText: formatted,
            params,
            rotation
          };
        })
      );
    } else {
      // Inserindo novo componente configurado
      const nextIdx = elements.length + 1;
      const newEl: DetectedElement = {
        id: `det_custom_${Date.now().toString(36)}`,
        type,
        label: params.label || `Comp_${nextIdx}`,
        valueText: formatted,
        confidence: 1.0,
        box: { x: 40, y: 40, width: 15, height: 18 },
        connectedTo: [],
        params,
        rotation
      };
      setElements(prev => [...prev, newEl]);
      setSelectedElemId(newEl.id);
    }
  };

  const handleApply = () => {
    if (!result) return;
    const { components, wires } = CircuitVision.generateSchematic(elements, result.suggestedWires);
    onApplySchematic(components, wires);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden text-slate-100">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                Importar Circuito por Foto
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold uppercase">
                  Reconhecimento IA
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tire uma foto ou suba um esquemático para montagem automática com revisão manual
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

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {!imageSrc ? (
            /* Área de Upload e Escolha */
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-center text-center bg-slate-950/50 hover:border-cyan-500/50 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-200 mb-1">
                Envie uma foto do seu circuito
              </h3>
              <p className="text-xs text-slate-400 max-w-md mb-6">
                Pode ser um diagrama desenhado à mão num papel, uma foto de livro ou captura de tela de circuito.
              </p>

              {/* Botões de Ação de Captura */}
              <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
                {/* Câmera Mobile Nativa */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <Camera className="w-4 h-4 stroke-[2.5]" />
                  <span>Usar Câmera</span>
                </button>

                {/* Upload de Arquivo */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-xs sm:text-sm transition-all"
                >
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Escolher Foto</span>
                </button>
              </div>

              {/* Botão de Demonstração Rápida */}
              <button
                onClick={handleLoadSamplePhoto}
                className="mt-4 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-medium transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Experimentar com Foto de Demonstração (Esboço à Mão)</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />
            </div>
          ) : (
            /* Painel Dividido: Foto com Caixas de Reconhecimento + Tabela de Ajuste */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Pré-visualização da Imagem com Caixas Delimitadoras Arrastáveis */}
              <div className="lg:col-span-7 flex flex-col space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-300">Foto & Elementos Detectados:</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                      <Move className="w-2.5 h-2.5" /> Arraste para reposicionar
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setImageSrc(null);
                      setResult(null);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                  >
                    Trocar Foto
                  </button>
                </div>

                {/* Contêiner da Imagem com ajuste exato para evitar distorções de letterbox */}
                <div className="relative min-h-[340px] max-h-[460px] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950/90 flex items-center justify-center p-2">
                  <div
                    ref={imageContainerRef}
                    className="relative inline-block max-w-full max-h-[440px] select-none"
                  >
                    <img
                      src={imageSrc}
                      alt="Circuito Fotográfico"
                      className="max-h-[440px] max-w-full w-auto h-auto block object-contain select-none pointer-events-none rounded-lg"
                      draggable={false}
                    />

                    {/* Animação de Varredura Laser durante análise */}
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-cyan-500/10 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-lg">
                        <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
                        <span className="text-xs font-mono font-semibold text-cyan-300 tracking-wider">
                          ANALISANDO TOPOLOGIA DO CIRCUITO...
                        </span>
                      </div>
                    )}

                    {/* Caixas delimitadoras sobrepostas e livremente arrastáveis */}
                    {!isAnalyzing &&
                      elements.map(el => {
                        const isSel = el.id === selectedElemId;
                        const isDragging = dragAction?.elementId === el.id;

                        return (
                          <div
                            key={el.id}
                            onMouseDown={e => handleStartDrag(e, el.id, 'move')}
                            onTouchStart={e => handleStartDrag(e, el.id, 'move')}
                            onClick={() => setSelectedElemId(el.id)}
                            style={{
                              left: `${el.box.x}%`,
                              top: `${el.box.y}%`,
                              width: `${el.box.width}%`,
                              height: `${el.box.height}%`,
                              touchAction: 'none'
                            }}
                            className={`absolute select-none rounded-lg border-2 flex items-center justify-center transition-shadow group ${
                              isDragging
                                ? 'border-cyan-400 bg-cyan-500/30 shadow-2xl shadow-cyan-500/60 z-30 cursor-grabbing ring-2 ring-cyan-400'
                                : isSel
                                ? 'border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/40 z-20 cursor-grab hover:bg-cyan-500/30'
                                : 'border-emerald-400/80 bg-emerald-500/10 hover:border-cyan-300 hover:bg-cyan-500/20 cursor-grab z-10'
                            }`}
                            title="Clique e arraste para posicionar sobre o circuito"
                          >
                            {/* Rótulo superior */}
                            <div className="absolute -top-6 left-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950/95 border border-slate-700/90 text-white text-[10px] font-mono font-bold shadow-md pointer-events-none whitespace-nowrap">
                              <Move className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                              <span>{el.label}</span>
                            </div>

                            {/* Identificador central */}
                            <div className="text-center pointer-events-none">
                              <span className="text-[11px] font-mono font-black text-slate-100 drop-shadow-md">
                                {el.label}
                              </span>
                              {isDragging && (
                                <div className="text-[9px] font-mono font-bold text-cyan-300 bg-slate-950/90 px-1 py-0.2 rounded mt-0.5 border border-cyan-500/40 shadow">
                                  {Math.round(el.box.x)}%, {Math.round(el.box.y)}%
                                </div>
                              )}
                            </div>

                            {/* Alça de redimensionamento no canto inferior direito */}
                            <div
                              onMouseDown={e => handleStartDrag(e, el.id, 'resize')}
                              onTouchStart={e => handleStartDrag(e, el.id, 'resize')}
                              className={`absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-sm flex items-center justify-center cursor-se-resize transition-all ${
                                isSel
                                  ? 'bg-cyan-400 text-slate-950 shadow-md ring-1 ring-slate-950'
                                  : 'bg-emerald-400/70 hover:bg-cyan-400 text-slate-950 opacity-0 group-hover:opacity-100'
                              }`}
                              title="Arraste para redimensionar"
                              style={{ touchAction: 'none' }}
                            >
                              <div className="w-1.5 h-1.5 border-r border-b border-slate-950" />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950/40 border border-slate-800/80 rounded-lg px-3 py-2">
                  <span className="text-cyan-400 font-bold shrink-0">💡 Dica de Montagem:</span>
                  <span>
                    Arraste as caixas diretamente sobre a foto para posicionar os componentes. A distribuição configurada aqui será refletida exatamente ao clicar em <strong>Montar no Simulador</strong>.
                  </span>
                </div>
              </div>

              {/* Painel de Correção / Edição de Componentes Detectados */}
              <div className="lg:col-span-5 flex flex-col bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex-1">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Revisão dos Componentes</h4>
                    <span className="text-[10px] text-emerald-400">
                      {elements.length} componentes identificados
                    </span>
                  </div>
                  <button
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-xs font-semibold border border-cyan-500/50 transition-all shadow-sm active:scale-95 cursor-pointer"
                    title="Configurar e adicionar novo componente na foto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Configurar &amp; Adicionar</span>
                  </button>
                </div>

                {/* Lista de Componentes com Capacidade de Ajuste */}
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-1">
                  {elements.map(el => {
                    const isSel = el.id === selectedElemId;
                    return (
                      <div
                        key={el.id}
                        onClick={() => setSelectedElemId(el.id)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isSel
                            ? 'bg-slate-800/90 border-cyan-500/60 shadow-md'
                            : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={el.label}
                              onChange={e => handleUpdateElement(el.id, { label: e.target.value })}
                              className="w-20 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-cyan-500"
                            />
                            <span className="text-[10px] text-slate-500">
                              ({(el.confidence * 100).toFixed(0)}%)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleOpenConfigForElement(el);
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-semibold border border-cyan-500/40 transition-colors cursor-pointer"
                              title="Configurar este componente (reatância vs valor físico, rotação) antes de montar"
                            >
                              <Settings2 className="w-3 h-3" />
                              <span>Configurar</span>
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteElement(el.id);
                              }}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Remover componente incorreto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* Tipo do Componente */}
                          <div>
                            <select
                              value={el.type}
                              onChange={e =>
                                handleUpdateElement(el.id, { type: e.target.value as ComponentType })
                              }
                              className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
                            >
                              {COMPONENT_OPTIONS.map(opt => (
                                <option key={opt.type} value={opt.type}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Valor Numérico */}
                          <div>
                            <input
                              type="text"
                              value={el.valueText}
                              placeholder="Ex: 10k, 100uF"
                              onChange={e =>
                                handleUpdateElement(el.id, { valueText: e.target.value })
                              }
                              className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>

                        {/* Posição na foto */}
                        <div className="flex items-center justify-between pt-1.5 mt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1 font-mono text-slate-400">
                            <Move className="w-2.5 h-2.5 text-cyan-400" />
                            <span>Posição na foto:</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-slate-500">X:</span>
                            <input
                              type="number"
                              min={0}
                              max={95}
                              value={Math.round(el.box.x)}
                              onChange={e => {
                                const val = Math.max(0, Math.min(95, parseFloat(e.target.value) || 0));
                                handleUpdateElement(el.id, { box: { ...el.box, x: val } });
                              }}
                              className="w-10 px-1 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-center text-slate-200 text-[10px] focus:outline-none focus:border-cyan-500"
                            />
                            <span className="font-mono text-slate-500">%</span>

                            <span className="font-mono text-slate-500 ml-1.5">Y:</span>
                            <input
                              type="number"
                              min={0}
                              max={95}
                              value={Math.round(el.box.y)}
                              onChange={e => {
                                const val = Math.max(0, Math.min(95, parseFloat(e.target.value) || 0));
                                handleUpdateElement(el.id, { box: { ...el.box, y: val } });
                              }}
                              className="w-10 px-1 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-center text-slate-200 text-[10px] focus:outline-none focus:border-cyan-500"
                            />
                            <span className="font-mono text-slate-500">%</span>
                          </div>
                        </div>

                        {/* Badges de Parâmetros Configurados */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-800/60 text-[10px]">
                          {el.type === 'INDUCTOR' && (
                            (el.params?.reactance !== undefined || el.valueText.includes('j')) ? (
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-medium">
                                Reatância: {el.params?.reactance !== undefined ? `+j${Math.abs(el.params.reactance)} Ω` : el.valueText}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-medium">
                                Indutância: {el.valueText}
                              </span>
                            )
                          )}
                          {el.type === 'CAPACITOR' && (
                            (el.params?.reactance !== undefined || el.valueText.includes('j')) ? (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-medium">
                                Reatância: {el.params?.reactance !== undefined ? `-j${Math.abs(el.params.reactance)} Ω` : el.valueText}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-medium">
                                Capacitância: {el.valueText}
                              </span>
                            )
                          )}
                          {el.type === 'PORT_TERMINAL' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-medium">
                              Terminal &quot;{el.params?.portName || el.label}&quot; (Zab)
                            </span>
                          )}
                          {el.rotation !== undefined && el.rotation > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                              Rot: {el.rotation}°
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Confirmação */}
        {imageSrc && (
          <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Verifique os componentes antes de aplicar ao simulador</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleApply}
                disabled={elements.length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-40 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Montar no Simulador</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Pré-Configuração de Componente antes de Inserir ou Editar na Foto */}
      <ConfigureNewComponentModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        initialType={configInitialType}
        initialParams={configInitialParams}
        components={mockComponents}
        onConfirm={handleConfirmConfig}
        alwaysPreconfigure={true}
        onToggleAlwaysPreconfigure={() => {}}
      />
    </div>
  );
};
