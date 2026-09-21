import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { CircuitComponent, CurrentArrowConfig, Point, Wire } from '../schematic/types';
import { CanvasRenderer, ViewportTransform } from '../schematic/canvasRenderer';
import { getTerminalAbsPosition } from '../schematic/componentDefs';
import { StepResult } from '../engine/mnaSolver';
import { WireRouting, WireSegment } from '../schematic/wireRouting';
import { Trash2, RotateCcw, RotateCw, Activity, X, Layers, ArrowRight, ArrowLeft, Tag } from 'lucide-react';

interface SchematicCanvasProps {
  components: CircuitComponent[];
  wires: Wire[];
  selectedCompId: string | null;
  selectedCompIds?: string[];
  selectedWireId: string | null;
  onSelectComponent: (id: string | null) => void;
  onSelectComponents?: (ids: string[]) => void;
  onSelectWire: (id: string | null) => void;
  onUpdateComponentPosition: (id: string, x: number, y: number) => void;
  onUpdateComponentsPositions?: (updates: { id: string; x: number; y: number }[]) => void;
  onAddWire: (wire: Wire) => void;
  onUpdateWire: (wireId: string, waypoints: Point[]) => void;
  onRotateComponent: (id: string) => void;
  onDeleteSelected: () => void;
  onToggleSwitch: (id: string) => void;
  onDoubleClickComponent: (comp: CircuitComponent) => void;
  latestResult: StepResult | null;
  onConnectWireToWire?: (fromCompId: string, fromTerminalId: string, targetWireId: string, junctionPt: Point) => void;
  onInsertJunctionOnWire?: (wireId: string, pt: Point) => void;
  onUpdateWireArrow?: (wireId: string, arrow: CurrentArrowConfig | undefined) => void;
}

export const SchematicCanvas: React.FC<SchematicCanvasProps> = ({
  components,
  wires,
  selectedCompId,
  selectedCompIds = [],
  selectedWireId,
  onSelectComponent,
  onSelectComponents,
  onSelectWire,
  onUpdateComponentPosition,
  onUpdateComponentsPositions,
  onAddWire,
  onUpdateWire,
  onRotateComponent,
  onDeleteSelected,
  onToggleSwitch,
  onDoubleClickComponent,
  latestResult,
  onConnectWireToWire,
  onInsertJunctionOnWire,
  onUpdateWireArrow
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  const [vp, setVp] = useState<ViewportTransform>({
    zoom: 1,
    panX: 80,
    panY: 60
  });

  // Estados de mouse & touch
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Estados de seleção por área (Marquee Box Selection)
  const [selectionBox, setSelectionBox] = useState<{ start: Point; current: Point } | null>(null);

  // Estados de arrasto de componente individual e em grupo
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragGroupStarts, setDragGroupStarts] = useState<Map<string, Point> | null>(null);
  const [dragStartWorld, setDragStartWorld] = useState<Point>({ x: 0, y: 0 });

  // Arrasto ortogonal por trecho
  const [draggingSegment, setDraggingSegment] = useState<{
    wireId: string;
    segmentIndex: number;
    isHorizontal: boolean;
  } | null>(null);

  const [hoveredSegment, setHoveredSegment] = useState<{
    wireId: string;
    segmentIndex: number;
    isHorizontal: boolean;
  } | null>(null);

  const [wiringFrom, setWiringFrom] = useState<{ compId: string; terminalId: string; pt: Point } | null>(null);
  const [wiringMousePos, setWiringMousePos] = useState<Point | null>(null);
  const [hoverTerminalKey, setHoverTerminalKey] = useState<string | null>(null);

  // Controle de pinch-zoom mobile
  const [touchPinchDist, setTouchPinchDist] = useState<number | null>(null);
  const [touchMidpoint, setTouchMidpoint] = useState<Point | null>(null);

  const compMap = useMemo(() => new Map(components.map(c => [c.id, c])), [components]);

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        rendererRef.current = new CanvasRenderer(ctx);
      }
    }
  }, []);

  // Atalhos de teclado (Espaço para Pan, Del para excluir, R para girar, Esc para desmarcar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space') {
        setIsSpacePressed(true);
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCompId || (selectedCompIds && selectedCompIds.length > 0) || selectedWireId) {
          e.preventDefault();
          onDeleteSelected();
        }
      }

      if (e.key === 'r' || e.key === 'R') {
        if (selectedCompIds && selectedCompIds.length > 0) {
          e.preventDefault();
          selectedCompIds.forEach(id => onRotateComponent(id));
        } else if (selectedCompId) {
          e.preventDefault();
          onRotateComponent(selectedCompId);
        }
      }

      if (e.key === 'Escape') {
        onSelectComponent(null);
        if (onSelectComponents) onSelectComponents([]);
        onSelectWire(null);
        setSelectionBox(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedCompId, selectedCompIds, selectedWireId, onDeleteSelected, onRotateComponent, onSelectComponent, onSelectComponents, onSelectWire]);

  // Loop de Renderização contínua
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const renderLoop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const canvas = canvasRef.current;
      const renderer = rendererRef.current;
      if (canvas && renderer) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderer.setContext(ctx);
          renderer.updateParticles(dt);

          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          if (canvas.width !== w * window.devicePixelRatio || canvas.height !== h * window.devicePixelRatio) {
            canvas.width = w * window.devicePixelRatio;
            canvas.height = h * window.devicePixelRatio;
          }

          ctx.save();
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

          // 1. Grade de fundo
          renderer.drawGrid(w, h, vp);

          // 2. Fios e partículas com destaque de trecho
          renderer.drawWires(wires, components, vp, selectedWireId, latestResult, hoveredSegment);

          // 3. Linha guia de fiação
          if (wiringFrom && wiringMousePos) {
            renderer.drawWiringPreview(wiringFrom.pt, wiringMousePos, vp);
          }

          // 4. Componentes com suporte a seleção múltipla
          renderer.drawComponents(components, vp, selectedCompId, hoverTerminalKey, latestResult, selectedCompIds);

          // 5. Caixa de seleção por área (Marquee Box)
          if (selectionBox) {
            renderer.drawSelectionBox(selectionBox, vp);
          }

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [vp, components, wires, selectedCompId, selectedCompIds, selectedWireId, wiringFrom, wiringMousePos, hoverTerminalKey, latestResult, hoveredSegment, selectionBox]);

  // Teclas de atalho
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        setIsSpacePressed(true);
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedCompIds && selectedCompIds.length > 0) {
          selectedCompIds.forEach(id => onRotateComponent(id));
        } else if (selectedCompId) {
          onRotateComponent(selectedCompId);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        onDeleteSelected();
      } else if (e.key === 'Escape') {
        setWiringFrom(null);
        setWiringMousePos(null);
        onSelectComponent(null);
        if (onSelectComponents) onSelectComponents([]);
        onSelectWire(null);
        setDraggingSegment(null);
        setSelectionBox(null);
        setDragGroupStarts(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedCompId, selectedCompIds, onRotateComponent, onDeleteSelected, onSelectComponent, onSelectComponents, onSelectWire]);

  // Achar terminal sob o cursor
  const findTerminalAt = useCallback(
    (worldPt: Point, threshold: number = 18): { compId: string; terminalId: string; pt: Point } | null => {
      for (const comp of components) {
        for (const t of comp.terminals) {
          const p = getTerminalAbsPosition(comp, t.id);
          const dist = Math.hypot(p.x - worldPt.x, p.y - worldPt.y);
          if (dist <= threshold) {
            return { compId: comp.id, terminalId: t.id, pt: p };
          }
        }
      }
      return null;
    },
    [components]
  );

  // Achar componente sob o cursor
  const findComponentAt = useCallback(
    (worldPt: Point, threshold: number = 38): CircuitComponent | null => {
      for (let i = components.length - 1; i >= 0; i--) {
        const comp = components[i];
        const dist = Math.hypot(comp.x - worldPt.x, comp.y - worldPt.y);
        if (dist <= threshold) {
          return comp;
        }
      }
      return null;
    },
    [components]
  );

  // Achar trecho de fio sob o cursor para conexão de nó
  const findWireSegmentNear = useCallback(
    (worldPt: Point, tolerance: number = 14) => {
      for (let i = wires.length - 1; i >= 0; i--) {
        const w = wires[i];
        const seg = WireRouting.findSegmentAt(worldPt, w, compMap, tolerance);
        if (seg) {
          let snapX = worldPt.x;
          let snapY = worldPt.y;
          if (seg.isHorizontal) {
            snapY = seg.p1.y;
            const minX = Math.min(seg.p1.x, seg.p2.x);
            const maxX = Math.max(seg.p1.x, seg.p2.x);
            snapX = Math.max(minX + 8, Math.min(maxX - 8, Math.round(worldPt.x / 20) * 20));
          } else {
            snapX = seg.p1.x;
            const minY = Math.min(seg.p1.y, seg.p2.y);
            const maxY = Math.max(seg.p1.y, seg.p2.y);
            snapY = Math.max(minY + 8, Math.min(maxY - 8, Math.round(worldPt.y / 20) * 20));
          }
          return { wire: w, seg, snapPt: { x: snapX, y: snapY } };
        }
      }
      return null;
    },
    [wires, compMap]
  );

  // Manipulação de Ação Unificada (Mouse ou Touch Inicial)
  const handleActionStart = (screenPt: Point, isTouch: boolean = false, mouseButton: number = 0) => {
    if (!rendererRef.current) return;
    const worldPt = rendererRef.current.toWorld(screenPt, vp);
    const termTolerance = isTouch ? 24 : 18;

    // Pan por botão direito (2), botão do meio (1) ou segurando espaço
    if (mouseButton === 1 || mouseButton === 2 || isSpacePressed) {
      setIsPanning(true);
      setPanStart(screenPt);
      return;
    }

    // 1. Verifica clique em terminal para fiação
    const term = findTerminalAt(worldPt, termTolerance);
    if (term) {
      setWiringFrom(term);
      setWiringMousePos(worldPt);
      return;
    }

    // 2. Verifica clique em trecho de fio (Horizontal ou Vertical) para arrasto ortogonal
    for (let i = wires.length - 1; i >= 0; i--) {
      const w = wires[i];
      const hitSeg = WireRouting.findSegmentAt(worldPt, w, compMap, isTouch ? 18 : 12);
      if (hitSeg) {
        onSelectWire(w.id);
        onSelectComponent(null);
        if (onSelectComponents) onSelectComponents([]);
        setDraggingSegment({
          wireId: w.id,
          segmentIndex: hitSeg.index,
          isHorizontal: hitSeg.isHorizontal
        });
        return;
      }
    }

    // 3. Verifica clique em componente
    const comp = findComponentAt(worldPt, isTouch ? 44 : 38);
    if (comp) {
      const isAlreadyInMulti = selectedCompIds && selectedCompIds.includes(comp.id) && selectedCompIds.length > 1;

      if (isAlreadyInMulti) {
        // Inicia arrasto do grupo completo selecionado
        const starts = new Map<string, Point>();
        selectedCompIds.forEach(id => {
          const c = compMap.get(id);
          if (c) starts.set(id, { x: c.x, y: c.y });
        });
        setDragGroupStarts(starts);
        setDragStartWorld(worldPt);
      } else {
        // Seleção individual direta
        onSelectComponent(comp.id);
        if (onSelectComponents) onSelectComponents([comp.id]);
        onSelectWire(null);

        if (comp.type === 'SWITCH') {
          onToggleSwitch(comp.id);
        }

        setDraggingCompId(comp.id);
        setDragOffset({
          x: comp.x - worldPt.x,
          y: comp.y - worldPt.y
        });
      }
      return;
    }

    // 4. Clique no espaço vazio:
    onSelectComponent(null);
    if (onSelectComponents) onSelectComponents([]);
    onSelectWire(null);

    if (isTouch) {
      // No touch em espaço vazio, move a tela (pan)
      setIsPanning(true);
      setPanStart(screenPt);
    } else {
      // No desktop com botão esquerdo: inicia Caixa de Seleção por Área (Marquee Selection)
      setSelectionBox({
        start: worldPt,
        current: worldPt
      });
    }
  };

  const handleActionMove = (screenPt: Point, isTouch: boolean = false) => {
    if (!rendererRef.current) return;
    const worldPt = rendererRef.current.toWorld(screenPt, vp);
    const termTolerance = isTouch ? 24 : 18;

    const term = findTerminalAt(worldPt, termTolerance);
    setHoverTerminalKey(term ? `${term.compId}:${term.terminalId}` : null);

    // Pan da câmera
    if (isPanning) {
      setVp(prev => ({
        ...prev,
        panX: prev.panX + (screenPt.x - panStart.x),
        panY: prev.panY + (screenPt.y - panStart.y)
      }));
      setPanStart(screenPt);
      return;
    }

    // Demarcação da Caixa de Seleção por Área (Marquee)
    if (selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, current: worldPt } : null);

      const minX = Math.min(selectionBox.start.x, worldPt.x);
      const maxX = Math.max(selectionBox.start.x, worldPt.x);
      const minY = Math.min(selectionBox.start.y, worldPt.y);
      const maxY = Math.max(selectionBox.start.y, worldPt.y);

      // Destaca em tempo real todos os componentes interceptados
      const matched = components.filter(c =>
        c.x >= minX - 35 && c.x <= maxX + 35 &&
        c.y >= minY - 35 && c.y <= maxY + 35
      ).map(c => c.id);

      if (onSelectComponents) {
        onSelectComponents(matched);
      }
      return;
    }

    // Arrastando múltiplos componentes em grupo sincronizado
    if (dragGroupStarts && dragGroupStarts.size > 0 && onUpdateComponentsPositions) {
      const dx = Math.round((worldPt.x - dragStartWorld.x) / 20) * 20;
      const dy = Math.round((worldPt.y - dragStartWorld.y) / 20) * 20;

      const updates: { id: string; x: number; y: number }[] = [];
      dragGroupStarts.forEach((startPos, id) => {
        updates.push({
          id,
          x: startPos.x + dx,
          y: startPos.y + dy
        });
      });
      onUpdateComponentsPositions(updates);
      return;
    }

    // Arrastando trecho ortogonal de fio (horizontal ou vertical mantendo 90°)
    if (draggingSegment) {
      const wire = wires.find(w => w.id === draggingSegment.wireId);
      if (wire) {
        const newCoord = draggingSegment.isHorizontal
          ? Math.round(worldPt.y / 20) * 20
          : Math.round(worldPt.x / 20) * 20;

        const newWaypoints = WireRouting.dragSegment(
          wire,
          compMap,
          draggingSegment.segmentIndex,
          newCoord
        );
        onUpdateWire(wire.id, newWaypoints);
      }
      return;
    }

    // Detecta hover sobre trecho de fio para mudar o cursor (↕ ou ↔)
    let foundHoverSeg: { wireId: string; segmentIndex: number; isHorizontal: boolean } | null = null;
    for (let i = wires.length - 1; i >= 0; i--) {
      const w = wires[i];
      const seg = WireRouting.findSegmentAt(worldPt, w, compMap, 10);
      if (seg) {
        foundHoverSeg = { wireId: w.id, segmentIndex: seg.index, isHorizontal: seg.isHorizontal };
        break;
      }
    }
    setHoveredSegment(foundHoverSeg);

    if (canvasRef.current) {
      if (isSpacePressed) {
        canvasRef.current.style.cursor = 'grab';
      } else if (selectionBox) {
        canvasRef.current.style.cursor = 'crosshair';
      } else if (foundHoverSeg) {
        canvasRef.current.style.cursor = foundHoverSeg.isHorizontal ? 'row-resize' : 'col-resize';
      } else if (term) {
        canvasRef.current.style.cursor = 'crosshair';
      } else {
        canvasRef.current.style.cursor = 'default';
      }
    }

    // Arrastando componente individual
    if (draggingCompId) {
      const rawX = worldPt.x + dragOffset.x;
      const rawY = worldPt.y + dragOffset.y;
      const snappedX = Math.round(rawX / 20) * 20;
      const snappedY = Math.round(rawY / 20) * 20;
      onUpdateComponentPosition(draggingCompId, snappedX, snappedY);
      return;
    }

    // Puxando fio
    if (wiringFrom) {
      if (term && term.compId !== wiringFrom.compId) {
        setWiringMousePos(term.pt);
      } else {
        const wireHit = findWireSegmentNear(worldPt, 16);
        if (wireHit && wireHit.wire.fromCompId !== wiringFrom.compId && wireHit.wire.toCompId !== wiringFrom.compId) {
          setWiringMousePos(wireHit.snapPt);
        } else {
          setWiringMousePos(worldPt);
        }
      }
    }
  };

  const handleActionEnd = (screenPt: Point, isTouch: boolean = false) => {
    if (!rendererRef.current) return;
    const worldPt = rendererRef.current.toWorld(screenPt, vp);
    const termTolerance = isTouch ? 24 : 18;

    // Finaliza Caixa de Seleção por Área
    if (selectionBox) {
      const minX = Math.min(selectionBox.start.x, worldPt.x);
      const maxX = Math.max(selectionBox.start.x, worldPt.x);
      const minY = Math.min(selectionBox.start.y, worldPt.y);
      const maxY = Math.max(selectionBox.start.y, worldPt.y);

      // Se a caixa teve um arraste intencional (> 5px)
      if (maxX - minX > 5 || maxY - minY > 5) {
        const matched = components.filter(c =>
          c.x >= minX - 35 && c.x <= maxX + 35 &&
          c.y >= minY - 35 && c.y <= maxY + 35
        ).map(c => c.id);

        if (matched.length > 0) {
          if (onSelectComponents) onSelectComponents(matched);
          onSelectComponent(matched[0]);
        } else {
          onSelectComponent(null);
          if (onSelectComponents) onSelectComponents([]);
        }
      }
      setSelectionBox(null);
    }

    if (wiringFrom) {
      const targetTerm = findTerminalAt(worldPt, termTolerance);
      if (
        targetTerm &&
        (targetTerm.compId !== wiringFrom.compId || targetTerm.terminalId !== wiringFrom.terminalId)
      ) {
        onAddWire({
          id: `wire_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          fromCompId: wiringFrom.compId,
          fromTerminalId: wiringFrom.terminalId,
          toCompId: targetTerm.compId,
          toTerminalId: targetTerm.terminalId
        });
      } else {
        // Conexão direta em outro fio (derivação em nó T)
        const wireHit = findWireSegmentNear(worldPt, termTolerance + 4);
        if (
          wireHit &&
          wireHit.wire.fromCompId !== wiringFrom.compId &&
          wireHit.wire.toCompId !== wiringFrom.compId &&
          onConnectWireToWire
        ) {
          onConnectWireToWire(
            wiringFrom.compId,
            wiringFrom.terminalId,
            wireHit.wire.id,
            wireHit.snapPt
          );
        }
      }
      setWiringFrom(null);
      setWiringMousePos(null);
    }

    setIsPanning(false);
    setDraggingCompId(null);
    setDragGroupStarts(null);
    setDraggingSegment(null);
  };

  // Eventos de Mouse
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    handleActionStart({ x: e.clientX - rect.left, y: e.clientY - rect.top }, false, e.button);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    handleActionMove({ x: e.clientX - rect.left, y: e.clientY - rect.top }, false);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    handleActionEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top }, false);
  };

  // Zoom pelo mouse
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(vp.zoom * zoomFactor, 0.4), 2.5);

    setVp(prev => ({
      zoom: newZoom,
      panX: mouseX - (mouseX - prev.panX) * (newZoom / prev.zoom),
      panY: mouseY - (mouseY - prev.panY) * (newZoom / prev.zoom)
    }));
  };

  // Eventos de Toque (Mobile Touch & Pinch Zoom)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();

    if (e.touches.length === 1) {
      const t = e.touches[0];
      handleActionStart({ x: t.clientX - rect.left, y: t.clientY - rect.top }, true);
      setTouchPinchDist(null);
      setTouchMidpoint(null);
    } else if (e.touches.length === 2) {
      // Início de Pinch Zoom com 2 dedos
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const mid = {
        x: (t1.clientX + t2.clientX) / 2 - rect.left,
        y: (t1.clientY + t2.clientY) / 2 - rect.top
      };
      setTouchPinchDist(dist);
      setTouchMidpoint(mid);
      setIsPanning(false);
      setWiringFrom(null);
      setDraggingCompId(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();

    if (e.touches.length === 1 && touchPinchDist === null) {
      const t = e.touches[0];
      handleActionMove({ x: t.clientX - rect.left, y: t.clientY - rect.top }, true);
    } else if (e.touches.length === 2 && touchPinchDist !== null && touchMidpoint !== null) {
      // Processa gesto de pinça (Pinch Zoom) e Pan com 2 dedos
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const currentMid = {
        x: (t1.clientX + t2.clientX) / 2 - rect.left,
        y: (t1.clientY + t2.clientY) / 2 - rect.top
      };

      const scaleChange = currentDist / touchPinchDist;
      const newZoom = Math.min(Math.max(vp.zoom * scaleChange, 0.4), 2.5);

      setVp(prev => ({
        zoom: newZoom,
        panX: currentMid.x - (touchMidpoint.x - prev.panX) * (newZoom / prev.zoom),
        panY: currentMid.y - (touchMidpoint.y - prev.panY) * (newZoom / prev.zoom)
      }));

      setTouchPinchDist(currentDist);
      setTouchMidpoint(currentMid);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      handleActionEnd({ x: t.clientX - rect.left, y: t.clientY - rect.top }, true);
    }
    setTouchPinchDist(null);
    setTouchMidpoint(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = rendererRef.current.toWorld(screenPt, vp);

    const comp = findComponentAt(worldPt);
    if (comp) {
      onDoubleClickComponent(comp);
      return;
    }

    const wireHit = findWireSegmentNear(worldPt, 16);
    if (wireHit && onInsertJunctionOnWire) {
      onInsertJunctionOnWire(wireHit.wire.id, wireHit.snapPt);
    }
  };

  // Informações do fio selecionado para a mini-barra flutuante
  const selectedWireObj = useMemo(() => {
    if (!selectedWireId) return null;
    return wires.find(w => w.id === selectedWireId) || null;
  }, [wires, selectedWireId]);

  return (
    <div
      className="flex-1 relative w-full h-full overflow-hidden select-none bg-[#0b0f19] touch-none"
      style={{ cursor: isSpacePressed ? 'grab' : isPanning ? 'grabbing' : 'default' }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="w-full h-full block"
      />

      {/* Mini-painel flutuante quando MÚLTIPLOS componentes estão selecionados */}
      {selectedCompIds && selectedCompIds.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 shadow-2xl rounded-xl text-xs font-mono text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>{selectedCompIds.length} componentes selecionados</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-700" />

          <button
            onClick={() => {
              selectedCompIds.forEach(id => onRotateComponent(id));
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            title="Girar componentes selecionados 90° (R)"
          >
            <RotateCw className="w-3 h-3 text-cyan-400" />
            <span>Girar (R)</span>
          </button>

          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 font-medium transition-colors cursor-pointer"
            title="Excluir componentes selecionados (Del)"
          >
            <Trash2 className="w-3 h-3" />
            <span>Excluir (Del)</span>
          </button>

          <button
            onClick={() => {
              onSelectComponent(null);
              if (onSelectComponents) onSelectComponents([]);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Desmarcar seleção (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Desmarcar</span>
          </button>
        </div>
      )}

      {/* Mini-painel flutuante quando um Fio está selecionado */}
      {selectedWireObj && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 shadow-2xl rounded-xl text-xs font-mono text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fio Selecionado</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-700" />

          {/* Botão de Sentido da Corrente (Enunciado/Exercício) */}
          {onUpdateWireArrow && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (!selectedWireObj.currentArrow) {
                    onUpdateWireArrow(selectedWireObj.id, { direction: 'forward', label: 'ix' });
                  } else if (selectedWireObj.currentArrow.direction === 'forward') {
                    onUpdateWireArrow(selectedWireObj.id, { direction: 'reverse', label: selectedWireObj.currentArrow.label });
                  } else {
                    onUpdateWireArrow(selectedWireObj.id, undefined);
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-all cursor-pointer ${
                  selectedWireObj.currentArrow
                    ? 'bg-rose-950/80 hover:bg-rose-900 border-rose-500/80 text-rose-200 font-bold shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
                title="Indicar sentido da corrente no trecho (enunciado)"
              >
                {selectedWireObj.currentArrow ? (
                  <>
                    {selectedWireObj.currentArrow.direction === 'forward' ? (
                      <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <ArrowLeft className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span>
                      {selectedWireObj.currentArrow.label || 'i'} ({selectedWireObj.currentArrow.direction === 'forward' ? '→' : '←'})
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span>+ Seta Corrente</span>
                  </>
                )}
              </button>

              {selectedWireObj.currentArrow && (
                <button
                  type="button"
                  onClick={() => {
                    const newLabel = window.prompt(
                      'Rótulo da corrente deste trecho (ex: ix, io, i1, Ia):',
                      selectedWireObj.currentArrow?.label || 'ix'
                    );
                    if (newLabel !== null) {
                      onUpdateWireArrow(selectedWireObj.id, {
                        direction: selectedWireObj.currentArrow?.direction || 'forward',
                        label: newLabel.trim() || 'ix'
                      });
                    }
                  }}
                  className="p-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
                  title="Renomear corrente do trecho"
                >
                  <Tag className="w-3 h-3 text-cyan-400" />
                </button>
              )}
            </div>
          )}

          {onInsertJunctionOnWire && (
            <button
              onClick={() => {
                const segs = WireRouting.getSegments(selectedWireObj, compMap);
                if (segs.length > 0) {
                  const midPt = {
                    x: Math.round(((segs[0].p1.x + segs[0].p2.x) / 2) / 20) * 20,
                    y: Math.round(((segs[0].p1.y + segs[0].p2.y) / 2) / 20) * 20,
                  };
                  onInsertJunctionOnWire(selectedWireObj.id, midPt);
                }
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-700/60 text-cyan-300 font-semibold transition-colors cursor-pointer"
              title="Criar um nó de emenda neste fio para derivar outras ligações"
            >
              <span>+ Criar Nó</span>
            </button>
          )}

          <button
            onClick={() => onUpdateWire(selectedWireObj.id, [])}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Resetar traçado para padrão ortogonal"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Resetar Rota</span>
          </button>

          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 font-medium transition-colors"
            title="Excluir este fio condutor"
          >
            <Trash2 className="w-3 h-3" />
            <span>Excluir</span>
          </button>
        </div>
      )}

      {/* Dica de interação flutuante discreta */}
      <div className="absolute bottom-3 left-3 pointer-events-none px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-slate-800 text-[11px] text-slate-400 font-medium shadow-lg flex flex-wrap items-center gap-2 sm:gap-3">
        <span>Zoom: <strong>{Math.round(vp.zoom * 100)}%</strong></span>
        <span>•</span>
        <span className="hidden sm:inline">Arraste para selecionar em área • Botão direito para mover tela</span>
        <span className="sm:hidden">Arraste para selecionar área</span>
        <span>•</span>
        <span>Del: Excluir • R: Girar</span>
      </div>
    </div>
  );
};
