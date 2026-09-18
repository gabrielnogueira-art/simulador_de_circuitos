import React, { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle2, Sparkles, X, Plus, Trash2, Edit3, Image as ImageIcon } from 'lucide-react';
import { CircuitVision, DetectedElement, VisionCircuitResult } from '../engine/circuitVision';
import { CircuitComponent, ComponentType, Wire } from '../schematic/types';

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
  { type: 'VOLTMETER', label: 'Voltímetro' },
  { type: 'AMMETER', label: 'Amperímetro' }
];

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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleAddElement = () => {
    const newEl: DetectedElement = {
      id: `det_custom_${Date.now().toString(36)}`,
      type: 'RESISTOR',
      label: `R_${elements.length + 1}`,
      valueText: '1 kΩ',
      confidence: 1.0,
      box: { x: 45, y: 45, width: 14, height: 18 },
      connectedTo: []
    };
    setElements(prev => [...prev, newEl]);
    setSelectedElemId(newEl.id);
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
              {/* Pré-visualização da Imagem com Caixas Delimitadoras */}
              <div className="lg:col-span-7 flex flex-col space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Foto & Elementos Detectados:</span>
                  <button
                    onClick={() => {
                      setImageSrc(null);
                      setResult(null);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    Trocar Foto
                  </button>
                </div>

                <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                  <img
                    src={imageSrc}
                    alt="Circuito Fotográfico"
                    className="w-full h-full object-contain"
                  />

                  {/* Animação de Varredura Laser durante análise */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-cyan-500/10 backdrop-blur-[1px] flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
                      <span className="text-xs font-mono font-semibold text-cyan-300 tracking-wider">
                        ANALISANDO TOPOLOGIA DO CIRCUITO...
                      </span>
                    </div>
                  )}

                  {/* Caixas delimitadoras sobrepostas na foto */}
                  {!isAnalyzing &&
                    elements.map(el => {
                      const isSel = el.id === selectedElemId;
                      return (
                        <div
                          key={el.id}
                          onClick={() => setSelectedElemId(el.id)}
                          style={{
                            left: `${el.box.x}%`,
                            top: `${el.box.y}%`,
                            width: `${el.box.width}%`,
                            height: `${el.box.height}%`
                          }}
                          className={`absolute cursor-pointer transition-all rounded border-2 flex items-center justify-center ${
                            isSel
                              ? 'border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/40 z-20'
                              : 'border-emerald-400/80 bg-emerald-500/10 hover:border-cyan-300 hover:bg-cyan-500/15'
                          }`}
                        >
                          <span className="text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-slate-950/80 text-white shadow-sm -mt-6">
                            {el.label}
                          </span>
                        </div>
                      );
                    })}
                </div>
                <div className="text-[11px] text-slate-500">
                  Dica: Clique nas caixas verdes/azuis sobre a imagem para selecionar e editar o bloco ao lado.
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
                    onClick={handleAddElement}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
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
                              ({(el.confidence * 100).toFixed(0)}% confiança)
                            </span>
                          </div>
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
    </div>
  );
};
