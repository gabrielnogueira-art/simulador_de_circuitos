import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { ScopeSignal, SimulationMetrics } from '../schematic/types';
import {
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  X,
  Sliders,
  Activity,
  Download,
  Clock,
  RotateCcw,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Check,
} from 'lucide-react';

interface PlecsScopeProps {
  signals: Map<string, ScopeSignal>;
  isOpen: boolean;
  onClose: () => void;
  currentTime: number;
}

// Passos padrão para escala de tempo (1-2-5 sequence)
const TIME_STEPS = [
  1e-7, 2e-7, 5e-7,
  1e-6, 2e-6, 5e-6,
  1e-5, 2e-5, 5e-5,
  1e-4, 2e-4, 5e-4,
  1e-3, 2e-3, 5e-3,
  1e-2, 2e-2, 5e-2,
  0.1, 0.2, 0.5,
  1, 2, 5, 10
];

// Passos padrão para amplitude (1-2-5 sequence)
const AMP_STEPS = [
  1e-5, 2e-5, 5e-5,
  1e-4, 2e-4, 5e-4,
  1e-3, 2e-3, 5e-3,
  1e-2, 2e-2, 5e-2,
  0.1, 0.2, 0.5,
  1, 2, 5,
  10, 20, 50,
  100, 200, 500,
  1000, 2000, 5000
];

function getNextStep(current: number, steps: number[], direction: 'up' | 'down'): number {
  if (direction === 'up') {
    for (const s of steps) {
      if (s > current * 1.05) return s;
    }
    return current * 2;
  } else {
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i] < current * 0.95) return steps[i];
    }
    return Math.max(1e-9, current / 2);
  }
}

export const PlecsScope: React.FC<PlecsScopeProps> = ({ signals, isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCursors, setShowCursors] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Posição normalizada dos cursores (0 a 1 da largura do gráfico)
  const [cursorX1Norm, setCursorX1Norm] = useState(0.25);
  const [cursorX2Norm, setCursorX2Norm] = useState(0.75);
  const [draggedTarget, setDraggedTarget] = useState<'c1' | 'c2' | 'panTime' | 'offsetYLeft' | 'offsetYRight' | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Visibilidade dos canais
  const [visibleChannels, setVisibleChannels] = useState<Record<string, boolean>>({});

  // --- Controles de Escala de Tempo (Horizontal) ---
  const [timeScaleMode, setTimeScaleMode] = useState<'auto' | 'manual'>('auto');
  const [manualTimeDiv, setManualTimeDiv] = useState<number>(0.005); // Segundos por divisão (10 divs)
  const [timePanOffset, setTimePanOffset] = useState<number>(0); // Deslocamento horizontal no tempo

  // --- Controles de Escala Vertical Esquerda (Grandeza 1) ---
  const [isManualYLeft, setIsManualYLeft] = useState<boolean>(false);
  const [manualYDivLeft, setManualYDivLeft] = useState<number>(5.0); // Valor por divisão (8 divs)
  const [manualYOffsetLeft, setManualYOffsetLeft] = useState<number>(0.0); // Offset vertical central

  // --- Controles de Escala Vertical Direita (Grandeza 2) ---
  const [isManualYRight, setIsManualYRight] = useState<boolean>(false);
  const [manualYDivRight, setManualYDivRight] = useState<number>(1.0); // Valor por divisão (8 divs)
  const [manualYOffsetRight, setManualYOffsetRight] = useState<number>(0.0); // Offset vertical central

  // Sincroniza canais visíveis quando novos sinais aparecem
  useEffect(() => {
    setVisibleChannels(prev => {
      const updated = { ...prev };
      for (const id of signals.keys()) {
        if (updated[id] === undefined) {
          updated[id] = true;
        }
      }
      return updated;
    });
  }, [signals]);

  const toggleChannel = (id: string) => {
    setVisibleChannels(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const signalList = useMemo(() => Array.from(signals.values()), [signals]);

  const visibleSignals = useMemo(() => {
    return signalList.filter(s => visibleChannels[s.id] !== false);
  }, [signalList, visibleChannels]);

  // --- Separação das Grandezas e Ativação do Eixo Duplo (Dual Y-Axis) ---
  // Quando duas grandezas forem apresentadas ao mesmo tempo, apresenta escala na esquerda e outra na direita!
  const { leftSignals, rightSignals, isDualAxis } = useMemo(() => {
    if (visibleSignals.length < 2) {
      return {
        leftSignals: visibleSignals,
        rightSignals: [] as ScopeSignal[],
        isDualAxis: false,
      };
    }

    const vSigs = visibleSignals.filter(s => s.unit === 'V');
    const aSigs = visibleSignals.filter(s => s.unit === 'A');

    // Se temos grandezas físicas distintas (ex: Tensão 'V' e Corrente 'A')
    if (vSigs.length > 0 && aSigs.length > 0) {
      const otherSigs = visibleSignals.filter(s => s.unit !== 'V' && s.unit !== 'A');
      return {
        leftSignals: [...vSigs, ...otherSigs],
        rightSignals: aSigs,
        isDualAxis: true,
      };
    }

    // Se forem dois canais da mesma grandeza ou sinais genéricos, separa canal 1 na esquerda e canal 2 na direita
    return {
      leftSignals: [visibleSignals[0]],
      rightSignals: visibleSignals.slice(1),
      isDualAxis: true,
    };
  }, [visibleSignals]);

  // --- Limites do Eixo Horizontal (Tempo) ---
  const timeBounds = useMemo(() => {
    let rawMinT = Infinity;
    let rawMaxT = -Infinity;

    for (const sig of visibleSignals) {
      if (sig.data.length === 0) continue;
      if (sig.data[0].time < rawMinT) rawMinT = sig.data[0].time;
      const lastT = sig.data[sig.data.length - 1].time;
      if (lastT > rawMaxT) rawMaxT = lastT;
    }

    if (rawMinT === Infinity) {
      rawMinT = 0;
      rawMaxT = 0.05;
    }
    if (rawMaxT <= rawMinT) {
      rawMaxT = rawMinT + 0.01;
    }

    let minT = rawMinT;
    let maxT = rawMaxT;
    let timeDiv = (rawMaxT - rawMinT) / 10;

    if (timeScaleMode === 'manual') {
      timeDiv = Math.max(1e-9, manualTimeDiv);
      const totalSpan = timeDiv * 10;
      const rightEdge = rawMaxT - timePanOffset;
      maxT = rightEdge;
      minT = maxT - totalSpan;
    }

    const span = Math.max(1e-9, maxT - minT);

    return {
      minT,
      maxT,
      span,
      timeDiv: span / 10,
      rawMinT,
      rawMaxT,
    };
  }, [visibleSignals, timeScaleMode, manualTimeDiv, timePanOffset]);

  // --- Limites do Eixo Vertical Esquerdo (Grandeza 1 / Tensão / Canal 1) ---
  const leftBounds = useMemo(() => {
    let rawMin = Infinity;
    let rawMax = -Infinity;

    for (const sig of leftSignals) {
      for (const pt of sig.data) {
        if (pt.time >= timeBounds.minT && pt.time <= timeBounds.maxT) {
          if (pt.value < rawMin) rawMin = pt.value;
          if (pt.value > rawMax) rawMax = pt.value;
        }
      }
    }

    if (rawMin === Infinity) {
      rawMin = -10;
      rawMax = 10;
    }
    if (rawMax <= rawMin) {
      rawMin -= 1;
      rawMax += 1;
    }

    let minV: number;
    let maxV: number;
    let yDiv: number;

    if (isManualYLeft) {
      yDiv = Math.max(1e-9, manualYDivLeft);
      const totalSpan = yDiv * 8; // 8 divisões verticais
      minV = manualYOffsetLeft - totalSpan / 2;
      maxV = manualYOffsetLeft + totalSpan / 2;
    } else {
      const rawSpan = rawMax - rawMin;
      const center = (rawMax + rawMin) / 2;
      const paddedSpan = rawSpan > 1e-6 ? rawSpan * 1.25 : 2;
      minV = center - paddedSpan / 2;
      maxV = center + paddedSpan / 2;
      yDiv = (maxV - minV) / 8;
    }

    const unit = leftSignals[0]?.unit || 'V';
    const name = leftSignals.map(s => s.name).join(', ') || 'Canal 1';
    const color = leftSignals[0]?.color || '#00e5ff';

    return {
      minV,
      maxV,
      span: Math.max(1e-9, maxV - minV),
      yDiv,
      unit,
      name,
      color,
    };
  }, [leftSignals, timeBounds, isManualYLeft, manualYDivLeft, manualYOffsetLeft]);

  // --- Limites do Eixo Vertical Direito (Grandeza 2 / Corrente / Canal 2) ---
  const rightBounds = useMemo(() => {
    if (!isDualAxis || rightSignals.length === 0) return null;

    let rawMin = Infinity;
    let rawMax = -Infinity;

    for (const sig of rightSignals) {
      for (const pt of sig.data) {
        if (pt.time >= timeBounds.minT && pt.time <= timeBounds.maxT) {
          if (pt.value < rawMin) rawMin = pt.value;
          if (pt.value > rawMax) rawMax = pt.value;
        }
      }
    }

    if (rawMin === Infinity) {
      rawMin = -2;
      rawMax = 2;
    }
    if (rawMax <= rawMin) {
      rawMin -= 0.5;
      rawMax += 0.5;
    }

    let minV: number;
    let maxV: number;
    let yDiv: number;

    if (isManualYRight) {
      yDiv = Math.max(1e-9, manualYDivRight);
      const totalSpan = yDiv * 8;
      minV = manualYOffsetRight - totalSpan / 2;
      maxV = manualYOffsetRight + totalSpan / 2;
    } else {
      const rawSpan = rawMax - rawMin;
      const center = (rawMax + rawMin) / 2;
      const paddedSpan = rawSpan > 1e-6 ? rawSpan * 1.25 : 1;
      minV = center - paddedSpan / 2;
      maxV = center + paddedSpan / 2;
      yDiv = (maxV - minV) / 8;
    }

    const unit = rightSignals[0]?.unit || 'A';
    const name = rightSignals.map(s => s.name).join(', ') || 'Canal 2';
    const color = rightSignals[0]?.color || '#ffeb3b';

    return {
      minV,
      maxV,
      span: Math.max(1e-9, maxV - minV),
      yDiv,
      unit,
      name,
      color,
    };
  }, [isDualAxis, rightSignals, timeBounds, isManualYRight, manualYDivRight, manualYOffsetRight]);

  // --- Formatação Inteligente de Ticks sem Repetições ---
  const formatSmartTimeTick = useCallback((t: number, span: number): string => {
    const tickStep = span / 10;
    if (tickStep < 1e-6) {
      return `${(t * 1e9).toFixed(1)}ns`;
    }
    if (tickStep < 1e-3) {
      const p = tickStep < 1e-4 ? 2 : 1;
      return `${(t * 1e6).toFixed(p)}µs`;
    }
    if (tickStep < 0.1) {
      const p = tickStep < 0.005 ? 2 : 1;
      return `${(t * 1e3).toFixed(p)}ms`;
    }
    if (tickStep < 1) {
      return `${t.toFixed(3)}s`;
    }
    if (tickStep < 10) {
      return `${t.toFixed(2)}s`;
    }
    return `${t.toFixed(1)}s`;
  }, []);

  const formatSmartValueTick = useCallback((v: number, span: number): string => {
    if (Math.abs(v) < 1e-12) return '0.0';
    const tickStep = span / 8;
    if (tickStep < 1e-4) return v.toExponential(2);
    if (tickStep < 0.001) return v.toFixed(4);
    if (tickStep < 0.01) return v.toFixed(3);
    if (tickStep < 0.1) return v.toFixed(2);
    if (tickStep < 2) return v.toFixed(1);
    if (tickStep < 100) return v.toFixed(1);
    return v.toFixed(0);
  }, []);

  const formatDivisionBadge = useCallback((divVal: number, unit: string): string => {
    if (divVal < 1e-6) return `${(divVal * 1e9).toFixed(1)} n${unit}/div`;
    if (divVal < 1e-3) return `${(divVal * 1e6).toFixed(1)} µ${unit}/div`;
    if (divVal < 1) return `${(divVal * 1e3).toFixed(1)} m${unit}/div`;
    if (divVal >= 1000) return `${(divVal / 1000).toFixed(1)} k${unit}/div`;
    return `${divVal.toFixed(2)} ${unit}/div`;
  }, []);

  // --- Handlers de Ajuste da Escala de Tempo ---
  const handleStepTimeScale = (direction: 'zoomIn' | 'zoomOut') => {
    setTimeScaleMode('manual');
    const current = timeBounds.timeDiv;
    // zoomIn significa ver menor tempo por divisão (mais detalhe) -> step down
    // zoomOut significa ver mais tempo por divisão -> step up
    const newDiv = getNextStep(current, TIME_STEPS, direction === 'zoomIn' ? 'down' : 'up');
    setManualTimeDiv(newDiv);
  };

  const handlePanTime = (direction: 'left' | 'right') => {
    setTimeScaleMode('manual');
    const step = timeBounds.timeDiv * 2;
    setTimePanOffset(prev => prev + (direction === 'left' ? step : -step));
  };

  const handleResetTimeScale = () => {
    setTimeScaleMode('auto');
    setTimePanOffset(0);
  };

  // --- Handlers de Ajuste da Escala Vertical Esquerda ---
  const handleStepYLeft = (direction: 'zoomIn' | 'zoomOut') => {
    setIsManualYLeft(true);
    const current = leftBounds.yDiv;
    const newDiv = getNextStep(current, AMP_STEPS, direction === 'zoomIn' ? 'down' : 'up');
    setManualYDivLeft(newDiv);
    if (!isManualYLeft) {
      setManualYOffsetLeft((leftBounds.maxV + leftBounds.minV) / 2);
    }
  };

  const handleOffsetYLeft = (direction: 'up' | 'down') => {
    setIsManualYLeft(true);
    const step = leftBounds.yDiv * 1.0;
    setManualYOffsetLeft(prev => prev + (direction === 'up' ? step : -step));
  };

  const handleResetYLeft = () => {
    setIsManualYLeft(false);
    setManualYOffsetLeft(0.0);
  };

  // --- Handlers de Ajuste da Escala Vertical Direita ---
  const handleStepYRight = (direction: 'zoomIn' | 'zoomOut') => {
    if (!rightBounds) return;
    setIsManualYRight(true);
    const current = rightBounds.yDiv;
    const newDiv = getNextStep(current, AMP_STEPS, direction === 'zoomIn' ? 'down' : 'up');
    setManualYDivRight(newDiv);
    if (!isManualYRight) {
      setManualYOffsetRight((rightBounds.maxV + rightBounds.minV) / 2);
    }
  };

  const handleOffsetYRight = (direction: 'up' | 'down') => {
    if (!rightBounds) return;
    setIsManualYRight(true);
    const step = rightBounds.yDiv * 1.0;
    setManualYOffsetRight(prev => prev + (direction === 'up' ? step : -step));
  };

  const handleResetYRight = () => {
    setIsManualYRight(false);
    setManualYOffsetRight(0.0);
  };

  // Auto-Escala Geral (FIT ALL)
  const handleAutoFitAll = () => {
    handleResetTimeScale();
    handleResetYLeft();
    handleResetYRight();
  };

  // --- Métricas Gerais dos Sinais ---
  const metrics = useMemo(() => {
    const res: Record<string, SimulationMetrics> = {};
    for (const sig of signalList) {
      if (sig.data.length === 0) continue;
      let sum = 0;
      let sumSq = 0;
      let max = -Infinity;
      let min = Infinity;

      for (const pt of sig.data) {
        sum += pt.value;
        sumSq += pt.value * pt.value;
        if (pt.value > max) max = pt.value;
        if (pt.value < min) min = pt.value;
      }

      const count = sig.data.length;
      const mean = sum / count;
      const rms = Math.sqrt(sumSq / count);
      const vpp = max - min;
      res[sig.id] = { vpp, rms, mean, max, min };
    }
    return res;
  }, [signalList]);

  // --- Métricas dos Cursores C1 e C2 ---
  const cursorMetrics = useMemo(() => {
    const tSpan = timeBounds.span;
    const t1 = timeBounds.minT + cursorX1Norm * tSpan;
    const t2 = timeBounds.minT + cursorX2Norm * tSpan;
    const dt = Math.abs(t2 - t1);
    const freq = dt > 1e-9 ? 1 / dt : 0;

    const channelVals: Record<string, { y1: number; y2: number; dy: number }> = {};

    for (const sig of signalList) {
      if (sig.data.length === 0) continue;

      const getYAtT = (tTarget: number) => {
        const data = sig.data;
        if (tTarget <= data[0].time) return data[0].value;
        if (tTarget >= data[data.length - 1].time) return data[data.length - 1].value;

        let low = 0;
        let high = data.length - 1;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          if (data[mid].time < tTarget) low = mid + 1;
          else high = mid - 1;
        }

        const i1 = Math.max(0, high);
        const i2 = Math.min(data.length - 1, low);
        if (i1 === i2) return data[i1].value;

        const frac = (tTarget - data[i1].time) / (data[i2].time - data[i1].time);
        return data[i1].value + frac * (data[i2].value - data[i1].value);
      };

      const y1 = getYAtT(t1);
      const y2 = getYAtT(t2);
      channelVals[sig.id] = { y1, y2, dy: y2 - y1 };
    }

    return { t1, t2, dt, freq, channelVals };
  }, [timeBounds, cursorX1Norm, cursorX2Norm, signalList]);

  // --- Renderização no Canvas (Eixo Duplo, Grid e Traçados) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Margens adaptativas: se dual-axis, reserva espaço em ambos os lados
    const padLeft = 68;
    const padRight = isDualAxis && rightBounds ? 68 : 28;
    const padTop = 28;
    const padBottom = 32;
    const plotW = Math.max(20, width - padLeft - padRight);
    const plotH = Math.max(20, height - padTop - padBottom);

    // Fundo do osciloscópio (estilo PLECS / Tektronix escuro profissional)
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    // Área do traçado
    ctx.fillStyle = '#0a101d';
    ctx.fillRect(padLeft, padTop, plotW, plotH);

    // Borda do display
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // Grid interno (10 divisões horizontais, 8 divisões verticais)
    const xDivs = 10;
    const yDivs = 8;

    // Subdivisões menores do grid
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#141e30';
    for (let i = 0.5; i < xDivs; i += 1) {
      const x = padLeft + (i / xDivs) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();
    }
    for (let j = 0.5; j < yDivs; j += 1) {
      const y = padTop + (j / yDivs) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
    }

    // Linhas principais do grid
    ctx.lineWidth = 0.75;
    ctx.strokeStyle = '#1e293b';
    for (let i = 1; i < xDivs; i++) {
      const x = padLeft + (i / xDivs) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();
    }

    for (let j = 1; j < yDivs; j++) {
      const y = padTop + (j / yDivs) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
    }

    // --- Linha de Referência de Zero (GND) - Eixo Esquerdo ---
    if (leftBounds.minV <= 0 && leftBounds.maxV >= 0) {
      const zeroY = padTop + plotH - ((0 - leftBounds.minV) / leftBounds.span) * plotH;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, zeroY);
      ctx.lineTo(padLeft + plotW, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Marcador de terra (GND 1 ▶) na borda esquerda
      ctx.fillStyle = leftBounds.color;
      ctx.beginPath();
      ctx.moveTo(padLeft - 1, zeroY);
      ctx.lineTo(padLeft - 9, zeroY - 5);
      ctx.lineTo(padLeft - 9, zeroY + 5);
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#060a12';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1', padLeft - 6, zeroY);
    }

    // --- Linha de Referência de Zero (GND) - Eixo Direito (quando Dual Axis) ---
    if (isDualAxis && rightBounds && rightBounds.minV <= 0 && rightBounds.maxV >= 0) {
      const zeroY = padTop + plotH - ((0 - rightBounds.minV) / rightBounds.span) * plotH;
      ctx.strokeStyle = 'rgba(255, 235, 59, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, zeroY);
      ctx.lineTo(padLeft + plotW, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Marcador de terra (◀ 2 GND) na borda direita
      ctx.fillStyle = rightBounds.color;
      ctx.beginPath();
      ctx.moveTo(padLeft + plotW + 1, zeroY);
      ctx.lineTo(padLeft + plotW + 9, zeroY - 5);
      ctx.lineTo(padLeft + plotW + 9, zeroY + 5);
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#060a12';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('2', padLeft + plotW + 6, zeroY);
    }

    // --- Rótulos e Notches do EIXO ESQUERDO (Canal 1 / Grandeza 1) ---
    ctx.font = '10px monospace';
    ctx.fillStyle = isDualAxis ? leftBounds.color : '#94a3b8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let j = 0; j <= yDivs; j += 2) {
      const frac = 1 - j / yDivs;
      const val = leftBounds.minV + frac * leftBounds.span;
      const y = padTop + (j / yDivs) * plotH;

      // Traço notch na borda
      ctx.strokeStyle = isDualAxis ? leftBounds.color : '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padLeft - 5, y);
      ctx.lineTo(padLeft, y);
      ctx.stroke();

      ctx.fillText(`${formatSmartValueTick(val, leftBounds.span)}${leftBounds.unit}`, padLeft - 7, y);
    }

    // Indicador da grandeza do eixo esquerdo no topo esquerdo
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillStyle = leftBounds.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`◀ ${leftBounds.name} (${leftBounds.unit})`, padLeft, padTop - 6);

    // --- Rótulos e Notches do EIXO DIREITO (Canal 2 / Grandeza 2, quando Dual Axis) ---
    if (isDualAxis && rightBounds) {
      ctx.font = '10px monospace';
      ctx.fillStyle = rightBounds.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      for (let j = 0; j <= yDivs; j += 2) {
        const frac = 1 - j / yDivs;
        const val = rightBounds.minV + frac * rightBounds.span;
        const y = padTop + (j / yDivs) * plotH;

        // Traço notch na borda direita
        ctx.strokeStyle = rightBounds.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padLeft + plotW, y);
        ctx.lineTo(padLeft + plotW + 5, y);
        ctx.stroke();

        ctx.fillText(`${formatSmartValueTick(val, rightBounds.span)}${rightBounds.unit}`, padLeft + plotW + 7, y);
      }

      // Indicador da grandeza do eixo direito no topo direito
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillStyle = rightBounds.color;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`(${rightBounds.unit}) ${rightBounds.name} ▶`, padLeft + plotW, padTop - 6);
    }

    // --- Rótulos e Notches do Eixo de Tempo (Horizontal / Fundo) ---
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i <= xDivs; i += 2) {
      const frac = i / xDivs;
      const tVal = timeBounds.minT + frac * timeBounds.span;
      const x = padLeft + frac * plotW;

      // Notch inferior
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, padTop + plotH);
      ctx.lineTo(x, padTop + plotH + 4);
      ctx.stroke();

      ctx.fillText(formatSmartTimeTick(tVal, timeBounds.span), x, padTop + plotH + 6);
    }

    // --- Traçado das Ondas com Clipping Seguro ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, plotH);
    ctx.clip();

    // 1. Sinais do Eixo Esquerdo
    for (const sig of leftSignals) {
      if (sig.data.length < 2) continue;

      ctx.beginPath();
      ctx.strokeStyle = sig.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.shadowColor = sig.color;
      ctx.shadowBlur = 4;

      let first = true;
      for (const pt of sig.data) {
        if (pt.time < timeBounds.minT - timeBounds.span * 0.1) continue;
        if (pt.time > timeBounds.maxT + timeBounds.span * 0.1) break;

        const xFrac = (pt.time - timeBounds.minT) / timeBounds.span;
        const yFrac = (pt.value - leftBounds.minV) / leftBounds.span;

        const px = padLeft + xFrac * plotW;
        const py = padTop + plotH - yFrac * plotH;

        if (first) {
          ctx.moveTo(px, py);
          first = false;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }

    // 2. Sinais do Eixo Direito (se Dual Axis)
    if (isDualAxis && rightBounds) {
      for (const sig of rightSignals) {
        if (sig.data.length < 2) continue;

        ctx.beginPath();
        ctx.strokeStyle = sig.color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.shadowColor = sig.color;
        ctx.shadowBlur = 4;

        let first = true;
        for (const pt of sig.data) {
          if (pt.time < timeBounds.minT - timeBounds.span * 0.1) continue;
          if (pt.time > timeBounds.maxT + timeBounds.span * 0.1) break;

          const xFrac = (pt.time - timeBounds.minT) / timeBounds.span;
          const yFrac = (pt.value - rightBounds.minV) / rightBounds.span;

          const px = padLeft + xFrac * plotW;
          const py = padTop + plotH - yFrac * plotH;

          if (first) {
            ctx.moveTo(px, py);
            first = false;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      }
    }

    // --- Desenho dos Cursores C1 e C2 ---
    if (showCursors) {
      const c1X = padLeft + cursorX1Norm * plotW;
      const c2X = padLeft + cursorX2Norm * plotW;

      // Cursor 1 (Cyan)
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(c1X, padTop);
      ctx.lineTo(c1X, padTop + plotH);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(c1X - 12, padTop - 18, 24, 16);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C1', c1X, padTop - 10);

      // Cursor 2 (Yellow)
      ctx.strokeStyle = '#ffeb3b';
      ctx.setLineDash([4, 3]);
      ctx.shadowColor = '#ffeb3b';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(c2X, padTop);
      ctx.lineTo(c2X, padTop + plotH);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(c2X - 12, padTop - 18, 24, 16);
      ctx.fillStyle = '#000000';
      ctx.fillText('C2', c2X, padTop - 10);
    }

    ctx.restore();
  }, [
    leftSignals,
    rightSignals,
    isDualAxis,
    leftBounds,
    rightBounds,
    timeBounds,
    showCursors,
    cursorX1Norm,
    cursorX2Norm,
    formatSmartTimeTick,
    formatSmartValueTick,
    isExpanded,
  ]);

  // --- Interações do Mouse no Canvas (Arrasto e Zoom) ---
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const padLeft = 68;
    const padRight = isDualAxis && rightBounds ? 68 : 28;
    const plotW = rect.width - padLeft - padRight;

    setDragStartPos({ x: clientX, y: clientY });

    if (showCursors) {
      const c1X = padLeft + cursorX1Norm * plotW;
      const c2X = padLeft + cursorX2Norm * plotW;

      if (Math.abs(x - c1X) < 18) {
        setDraggedTarget('c1');
        return;
      } else if (Math.abs(x - c2X) < 18) {
        setDraggedTarget('c2');
        return;
      }
    }

    // Clique na margem esquerda ajusta offset vertical esquerdo
    if (x < padLeft) {
      setDraggedTarget('offsetYLeft');
      return;
    }

    // Clique na margem direita ajusta offset vertical direito
    if (isDualAxis && rightBounds && x > padLeft + plotW) {
      setDraggedTarget('offsetYRight');
      return;
    }

    // Clique no centro do gráfico faz pan horizontal no tempo
    setDraggedTarget('panTime');
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!canvasRef.current || !draggedTarget) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const padLeft = 68;
    const padRight = isDualAxis && rightBounds ? 68 : 28;
    const plotW = rect.width - padLeft - padRight;
    const plotH = rect.height - 28 - 32;

    if (draggedTarget === 'c1' || draggedTarget === 'c2') {
      const x = clientX - rect.left;
      const norm = Math.max(0, Math.min(1, (x - padLeft) / plotW));
      if (draggedTarget === 'c1') {
        setCursorX1Norm(norm);
      } else {
        setCursorX2Norm(norm);
      }
    } else if (draggedTarget === 'panTime') {
      const dx = clientX - dragStartPos.x;
      setDragStartPos({ x: clientX, y: clientY });
      const dt = -(dx / plotW) * timeBounds.span;
      setTimeScaleMode('manual');
      setTimePanOffset(prev => prev + dt);
    } else if (draggedTarget === 'offsetYLeft') {
      const dy = clientY - dragStartPos.y;
      setDragStartPos({ x: clientX, y: clientY });
      const dVal = (dy / plotH) * leftBounds.span;
      setIsManualYLeft(true);
      setManualYOffsetLeft(prev => prev + dVal);
    } else if (draggedTarget === 'offsetYRight' && rightBounds) {
      const dy = clientY - dragStartPos.y;
      setDragStartPos({ x: clientX, y: clientY });
      const dVal = (dy / plotH) * rightBounds.span;
      setIsManualYRight(true);
      setManualYOffsetRight(prev => prev + dVal);
    }
  };

  const handlePointerUp = () => {
    setDraggedTarget(null);
  };

  // Zoom pelo scroll do mouse de acordo com a área apontada
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padLeft = 68;
    const padRight = isDualAxis && rightBounds ? 68 : 28;
    const plotW = rect.width - padLeft - padRight;

    // Se estiver sobre a margem esquerda -> zoom na escala Y esquerda
    if (x < padLeft) {
      handleStepYLeft(e.deltaY > 0 ? 'zoomOut' : 'zoomIn');
      return;
    }

    // Se estiver sobre a margem direita -> zoom na escala Y direita
    if (isDualAxis && rightBounds && x > padLeft + plotW) {
      handleStepYRight(e.deltaY > 0 ? 'zoomOut' : 'zoomIn');
      return;
    }

    // Se estiver sobre o gráfico ou eixo do tempo:
    if (e.shiftKey) {
      // Pan no tempo
      const factor = e.deltaY > 0 ? 0.05 : -0.05;
      setTimeScaleMode('manual');
      setTimePanOffset(prev => prev + factor * timeBounds.span);
    } else {
      // Zoom no tempo
      handleStepTimeScale(e.deltaY > 0 ? 'zoomOut' : 'zoomIn');
    }
  };

  // Duplo clique na área do gráfico reseta todas as escalas para automático
  const handleDoubleClick = () => {
    handleAutoFitAll();
  };

  const exportCsv = () => {
    if (signalList.length === 0) return;
    let csv = 'Time(s),' + signalList.map(s => `${s.name}(${s.unit})`).join(',') + '\n';
    const firstSig = signalList[0];
    for (let i = 0; i < firstSig.data.length; i++) {
      const t = firstSig.data[i].time;
      const row = [t];
      for (const s of signalList) {
        row.push(s.data[i]?.value ?? 0);
      }
      csv += row.join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plecs_scope_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-30 transition-all duration-300 flex flex-col bg-slate-950 border border-slate-700 shadow-2xl overflow-hidden ${
        isExpanded
          ? 'inset-2 sm:inset-4 rounded-xl'
          : 'bottom-0 left-0 right-0 sm:bottom-4 sm:right-4 sm:left-auto sm:w-[840px] h-[460px] sm:h-[520px] rounded-t-2xl sm:rounded-xl'
      }`}
    >
      {/* 1. Header do PLECS Scope */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-900 border-b border-slate-800 select-none shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide">
            <Activity className="w-3.5 h-3.5" />
            PLECS SCOPE
          </div>
          <span className="hidden sm:inline text-xs text-slate-400">
            {visibleSignals.length} {visibleSignals.length === 1 ? 'canal ativo' : 'canais ativos'}
          </span>
          {isDualAxis && (
            <span className="px-2 py-0.5 rounded bg-indigo-950/90 border border-indigo-500/50 text-[10px] font-bold text-indigo-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Escala Dupla (Esq/Dir)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowCursors(!showCursors)}
            className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${
              showCursors
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Ativar/Desativar Cursores C1 e C2"
          >
            <Sliders className="w-3 h-3" />
            <span>Cursores</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(!showSettingsModal)}
            className={`p-1.5 rounded text-xs transition-colors ${
              showSettingsModal
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Ajuste Numérico de Escalas"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleAutoFitAll}
            className="px-2 py-1 text-[11px] font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors flex items-center gap-1"
            title="Ajustar todas as escalas automaticamente (FIT ALL)"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Auto Tudo</span>
          </button>

          <button
            onClick={exportCsv}
            className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
            title="Exportar dados para CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
            title={isExpanded ? 'Restaurar Tamanho' : 'Maximizar Osciloscópio'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
            title="Fechar Osciloscópio"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Barra de Seleção e Visibilidade dos Canais */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/70 border-b border-slate-800/80 overflow-x-auto shrink-0 select-none">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">CANAIS:</span>
        {signalList.length === 0 ? (
          <span className="text-xs text-slate-500 italic">Nenhum medidor conectado (adicione Voltímetros ou Amperímetros ao circuito)</span>
        ) : (
          signalList.map(sig => {
            const isVis = visibleChannels[sig.id] ?? true;
            return (
              <button
                key={sig.id}
                onClick={() => toggleChannel(sig.id)}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium shrink-0 transition-all ${
                  isVis
                    ? 'bg-slate-800 border border-slate-700 text-slate-100 shadow-sm'
                    : 'bg-slate-900/40 border border-slate-800/40 text-slate-500 opacity-60'
                }`}
                title={isVis ? `Ocultar ${sig.name}` : `Exibir ${sig.name}`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: sig.color, opacity: isVis ? 1 : 0.3 }}
                />
                <span className="font-semibold">{sig.name}</span>
                <span className="text-[10px] opacity-80 font-normal">({sig.unit})</span>
                {isVis ? <Eye className="w-2.5 h-2.5 ml-0.5 text-slate-400" /> : <EyeOff className="w-2.5 h-2.5 ml-0.5" />}
              </button>
            );
          })
        )}
      </div>

      {/* 3. Painel de Controle de Escalas (Tempo, Eixo Esquerdo e Eixo Direito) */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-300 shrink-0 select-none">
        {/* Bloco 1: Escala Horizontal (Tempo / Eixo X) */}
        <div className="flex items-center gap-1 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-400 font-semibold mr-0.5">Tempo:</span>

          <button
            onClick={() => handleStepTimeScale('zoomOut')}
            className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
            title="Mais tempo / Zoom Out (−)"
          >
            −
          </button>

          <span
            className="px-1.5 py-0.5 rounded bg-slate-900 font-mono text-cyan-300 font-semibold border border-slate-800 min-w-[70px] text-center"
            title="Escala de Tempo por Divisão"
          >
            {formatDivisionBadge(timeBounds.timeDiv, 's')}
          </span>

          <button
            onClick={() => handleStepTimeScale('zoomIn')}
            className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
            title="Menos tempo / Zoom In (+)"
          >
            +
          </button>

          <div className="flex items-center ml-1 border-l border-slate-800 pl-1 gap-0.5">
            <button
              onClick={() => handlePanTime('left')}
              className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Rolar no tempo para trás (◀)"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => handlePanTime('right')}
              className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Rolar no tempo para frente (▶)"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={handleResetTimeScale}
            className={`px-1.5 py-0.5 ml-1 rounded text-[10px] font-bold transition-all ${
              timeScaleMode === 'auto'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Ajuste Automático do Tempo"
          >
            Auto
          </button>
        </div>

        {/* Bloco 2: Escala Vertical Esquerda (Grandeza 1 / ex: Tensão) */}
        <div className="flex items-center gap-1 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: leftBounds.color }} />
          <span className="font-semibold mr-0.5 truncate max-w-[90px]" style={{ color: leftBounds.color }} title={leftBounds.name}>
            {isDualAxis ? `Esq (${leftBounds.unit}):` : 'Escala Y:'}
          </span>

          <button
            onClick={() => handleStepYLeft('zoomOut')}
            className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
            title="Reduzir ganho vertical (−)"
          >
            −
          </button>

          <span
            className="px-1.5 py-0.5 rounded bg-slate-900 font-mono font-semibold border border-slate-800 min-w-[70px] text-center"
            style={{ color: leftBounds.color }}
            title="Amplitude por divisão no eixo esquerdo"
          >
            {formatDivisionBadge(leftBounds.yDiv, leftBounds.unit)}
          </span>

          <button
            onClick={() => handleStepYLeft('zoomIn')}
            className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
            title="Ampliar ganho vertical (+)"
          >
            +
          </button>

          <div className="flex items-center ml-1 border-l border-slate-800 pl-1 gap-0.5">
            <button
              onClick={() => handleOffsetYLeft('up')}
              className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Deslocar sinal para cima (▲)"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleOffsetYLeft('down')}
              className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Deslocar sinal para baixo (▼)"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={handleResetYLeft}
            className={`px-1.5 py-0.5 ml-1 rounded text-[10px] font-bold transition-all ${
              !isManualYLeft
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Ajuste Automático do Eixo Esquerdo"
          >
            Auto
          </button>
        </div>

        {/* Bloco 3: Escala Vertical Direita (Grandeza 2 / ex: Corrente, quando Dual Axis) */}
        {isDualAxis && rightBounds && (
          <div className="flex items-center gap-1 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: rightBounds.color }} />
            <span className="font-semibold mr-0.5 truncate max-w-[90px]" style={{ color: rightBounds.color }} title={rightBounds.name}>
              Dir ({rightBounds.unit}):
            </span>

            <button
              onClick={() => handleStepYRight('zoomOut')}
              className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
              title="Reduzir ganho direito (−)"
            >
              −
            </button>

            <span
              className="px-1.5 py-0.5 rounded bg-slate-900 font-mono font-semibold border border-slate-800 min-w-[70px] text-center"
              style={{ color: rightBounds.color }}
              title="Amplitude por divisão no eixo direito"
            >
              {formatDivisionBadge(rightBounds.yDiv, rightBounds.unit)}
            </span>

            <button
              onClick={() => handleStepYRight('zoomIn')}
              className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
              title="Ampliar ganho direito (+)"
            >
              +
            </button>

            <div className="flex items-center ml-1 border-l border-slate-800 pl-1 gap-0.5">
              <button
                onClick={() => handleOffsetYRight('up')}
                className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Deslocar sinal direito para cima (▲)"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleOffsetYRight('down')}
                className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Deslocar sinal direito para baixo (▼)"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            <button
              onClick={handleResetYRight}
              className={`px-1.5 py-0.5 ml-1 rounded text-[10px] font-bold transition-all ${
                !isManualYRight
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Ajuste Automático do Eixo Direito"
            >
              Auto
            </button>
          </div>
        )}
      </div>

      {/* 4. Canvas Principal com Interações */}
      <div className="flex-1 relative cursor-crosshair overflow-hidden touch-none select-none">
        <canvas
          ref={canvasRef}
          onMouseDown={e => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={e => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          onTouchStart={e => e.touches[0] && handlePointerDown(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={e => e.touches[0] && handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={handlePointerUp}
          className="w-full h-full block"
        />

        {/* Modal / Popover de Configuração Numérica Direta de Escalas */}
        {showSettingsModal && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 w-full max-w-md shadow-2xl text-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-sm text-cyan-300 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Configurar Escalas do Osciloscópio
                </span>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tempo */}
              <div className="space-y-1.5 p-2 rounded bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Base de Tempo (Eixo X)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Modo: {timeScaleMode === 'auto' ? 'Automático' : 'Manual'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Tempo/div (s):</label>
                    <input
                      type="number"
                      step="any"
                      value={timeBounds.timeDiv}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          setTimeScaleMode('manual');
                          setManualTimeDiv(val);
                        }
                      }}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Offset de Tempo (s):</label>
                    <input
                      type="number"
                      step="any"
                      value={timePanOffset}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setTimeScaleMode('manual');
                          setTimePanOffset(val);
                        }
                      }}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Eixo Esquerdo */}
              <div className="space-y-1.5 p-2 rounded bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1" style={{ color: leftBounds.color }}>
                    Eixo Esquerdo ({leftBounds.name} - {leftBounds.unit})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Modo: {!isManualYLeft ? 'Automático' : 'Manual'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Valor/div ({leftBounds.unit}):</label>
                    <input
                      type="number"
                      step="any"
                      value={leftBounds.yDiv}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          setIsManualYLeft(true);
                          setManualYDivLeft(val);
                        }
                      }}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Offset Central ({leftBounds.unit}):</label>
                    <input
                      type="number"
                      step="any"
                      value={manualYOffsetLeft}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setIsManualYLeft(true);
                          setManualYOffsetLeft(val);
                        }
                      }}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Eixo Direito */}
              {isDualAxis && rightBounds && (
                <div className="space-y-1.5 p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1" style={{ color: rightBounds.color }}>
                      Eixo Direito ({rightBounds.name} - {rightBounds.unit})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Modo: {!isManualYRight ? 'Automático' : 'Manual'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Valor/div ({rightBounds.unit}):</label>
                      <input
                        type="number"
                        step="any"
                        value={rightBounds.yDiv}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            setIsManualYRight(true);
                            setManualYDivRight(val);
                          }
                        }}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Offset Central ({rightBounds.unit}):</label>
                      <input
                        type="number"
                        step="any"
                        value={manualYOffsetRight}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            setIsManualYRight(true);
                            setManualYOffsetRight(val);
                          }
                        }}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={handleAutoFitAll}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Redefinir Tudo para Automático
                </button>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Concluído
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Painel Inferior de Medições e Leituras dos Cursores */}
      <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 text-xs font-mono select-none shrink-0">
        {showCursors && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-1 mb-1 border-b border-slate-800/80 text-[10px] sm:text-[11px]">
            <div className="text-cyan-400">
              <span className="text-slate-500">C1: </span>
              {formatSmartTimeTick(cursorMetrics.t1, timeBounds.span)}
            </div>
            <div className="text-amber-400">
              <span className="text-slate-500">C2: </span>
              {formatSmartTimeTick(cursorMetrics.t2, timeBounds.span)}
            </div>
            <div className="text-slate-200">
              <span className="text-slate-500">Δt: </span>
              {formatSmartTimeTick(cursorMetrics.dt, timeBounds.span)}
            </div>
            <div className="text-emerald-400">
              <span className="text-slate-500">f: </span>
              {cursorMetrics.freq >= 1e6
                ? `${(cursorMetrics.freq / 1e6).toFixed(2)}MHz`
                : cursorMetrics.freq >= 1e3
                ? `${(cursorMetrics.freq / 1e3).toFixed(2)}kHz`
                : `${cursorMetrics.freq.toFixed(1)}Hz`}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 overflow-x-auto text-[10px] sm:text-[11px]">
          {signalList.filter(s => visibleChannels[s.id] !== false).map(s => {
            const m = metrics[s.id];
            const cv = cursorMetrics.channelVals[s.id];
            if (!m) return null;
            const vpp = m.vpp ?? 0;
            const rms = m.rms ?? 0;
            return (
              <div key={s.id} className="flex items-center gap-2 pr-3 border-r border-slate-800/80 last:border-0 shrink-0">
                <span className="font-semibold" style={{ color: s.color }}>
                  {s.name}:
                </span>
                <span className="text-slate-400">
                  Vpp: <strong className="text-slate-200">{vpp < 1 ? vpp.toFixed(3) : vpp.toFixed(2)}{s.unit}</strong>
                </span>
                <span className="text-slate-400">
                  RMS: <strong className="text-slate-200">{rms < 1 ? rms.toFixed(3) : rms.toFixed(2)}{s.unit}</strong>
                </span>
                {showCursors && cv && (
                  <span className="text-cyan-300">
                    ΔY: <strong>{Math.abs(cv.dy) < 1 ? cv.dy.toFixed(3) : cv.dy.toFixed(2)}{s.unit}</strong>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
