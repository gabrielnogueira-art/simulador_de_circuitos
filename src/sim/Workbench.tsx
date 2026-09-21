import { useState, useEffect, useRef, useMemo } from 'react';
import { CircuitComponent, ComponentParams, ComponentType, CurrentArrowConfig, Point, Wire, SystemMode } from './schematic/types';
import { createComponent } from './schematic/componentDefs';
import { PRESET_CIRCUITS, PresetCircuit } from './presets';
import { SimulationEngine } from './engine/simulationEngine';
import { HeaderToolbar } from './components/HeaderToolbar';
import { ComponentPalette } from './components/ComponentPalette';
import { SchematicCanvas } from './components/SchematicCanvas';
import { PlecsScope } from './components/PlecsScope';
import { InspectorModal } from './components/InspectorModal';
import { PhotoCircuitModal } from './components/PhotoCircuitModal';
import { ImpedanceModal } from './components/ImpedanceModal';
import { AnalysisPanel } from './components/AnalysisPanel';
import { CircuitLibraryModal } from './components/CircuitLibraryModal';
import { ConfigureNewComponentModal } from './components/ConfigureNewComponentModal';
import { AccountMenu } from './components/AccountMenu';
import { AiSolveModal } from './components/AiSolveModal';
import { PuAnalysisModal } from './components/gtdc/PuAnalysisModal';
import { YBusModal } from './components/gtdc/YBusModal';
import { LtAnalysisModal } from './components/gtdc/LtAnalysisModal';


export function App() {
  const initialPreset = PRESET_CIRCUITS[0];

  const [components, setComponents] = useState<CircuitComponent[]>(initialPreset.components);
  const [wires, setWires] = useState<Wire[]>(initialPreset.wires);

  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [selectedCompIds, setSelectedCompIds] = useState<string[]>([]);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [inspectorComp, setInspectorComp] = useState<CircuitComponent | null>(null);
  const [isScopeOpen, setIsScopeOpen] = useState(true);

  // Estados dos modais
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isImpedanceModalOpen, setIsImpedanceModalOpen] = useState(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isAiSolveOpen, setIsAiSolveOpen] = useState(false);
  const [isPreconfigureModalOpen, setIsPreconfigureModalOpen] = useState(false);
  const [preconfigureType, setPreconfigureType] = useState<ComponentType>('RESISTOR');
  const [preconfigureParams, setPreconfigureParams] = useState<Partial<ComponentParams> | undefined>(undefined);
  const [currentSavedCircuit, setCurrentSavedCircuit] = useState<{ id: string; name: string } | null>(null);
  // Modais especializados de GTDC
  const [systemMode, setSystemMode] = useState<SystemMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('circuit_system_mode') as SystemMode;
      if (stored === 'gtdc' || stored === 'circuitos_ii') return stored;
    }
    return 'circuitos_ii';
  });
  const [isPuModalOpen, setIsPuModalOpen] = useState(false);
  const [isYBusModalOpen, setIsYBusModalOpen] = useState(false);
  const [isLtModalOpen, setIsLtModalOpen] = useState(false);

  const handleSelectSystemMode = (mode: SystemMode) => {
    setSystemMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('circuit_system_mode', mode);
    }
  };

  const [alwaysPreconfigure, setAlwaysPreconfigure] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('circuit_preconfigure_component');
      return stored !== 'false';
    }
    return true;
  });


  // Instância do motor de simulação
  const engineRef = useRef<SimulationEngine>(new SimulationEngine(initialPreset.components, initialPreset.wires));
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [, setTick] = useState(0);

  useEffect(() => {
    const engine = engineRef.current;
    engine.init(components, wires);
    engine.setOnUpdate(() => {
      setCurrentTime(engine.currentTime);
      setTick(t => t + 1);
    });
  }, [components, wires]);

  useEffect(() => {
    return () => {
      engineRef.current.pause();
    };
  }, []);

  const handleToggleAlwaysPreconfigure = (val: boolean) => {
    setAlwaysPreconfigure(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('circuit_preconfigure_component', String(val));
    }
  };

  const handleRequestPreconfigure = (type: ComponentType, initialParams?: Partial<ComponentParams>) => {
    setPreconfigureType(type);
    setPreconfigureParams(initialParams);
    setIsPreconfigureModalOpen(true);
  };

  const handleConfirmPreconfiguredComponent = (type: ComponentType, params: ComponentParams, rotation: number) => {
    const offset = (components.length % 5) * 30;
    const newComp = createComponent(type, 380 + offset, 240 + offset, rotation);
    newComp.params = { ...newComp.params, ...params };
    setComponents(prev => [...prev, newComp]);
    setSelectedCompId(newComp.id);
  };

  // Adicionar novo componente
  const handleAddComponent = (type: ComponentType, initialParams?: Partial<ComponentParams>) => {
    const offset = (components.length % 5) * 30;
    const newComp = createComponent(type, 380 + offset, 240 + offset);
    if (initialParams) {
      newComp.params = { ...newComp.params, ...initialParams };
    } else if (type === 'PORT_TERMINAL') {
      const hasA = components.some(c => c.type === 'PORT_TERMINAL' && (c.params.portName === 'a' || c.params.label === 'a'));
      if (hasA) {
        newComp.params.portName = 'b';
        newComp.params.label = 'b';
      }
    }
    setComponents(prev => [...prev, newComp]);
    setSelectedCompId(newComp.id);
  };

  // Adicionar fio
  const handleAddWire = (newWire: Wire) => {
    const exists = wires.some(
      w =>
        (w.fromCompId === newWire.fromCompId &&
          w.fromTerminalId === newWire.fromTerminalId &&
          w.toCompId === newWire.toCompId &&
          w.toTerminalId === newWire.toTerminalId) ||
        (w.fromCompId === newWire.toCompId &&
          w.fromTerminalId === newWire.toTerminalId &&
          w.toCompId === newWire.fromCompId &&
          w.toTerminalId === newWire.fromTerminalId)
    );
    if (!exists) {
      setWires(prev => [...prev, newWire]);
      setSelectedWireId(newWire.id);
    }
  };

  // Conectar fio em outro fio existente (criação automática de nó em T com Junction Dot)
  const handleConnectWireToWire = (
    fromCompId: string,
    fromTerminalId: string,
    targetWireId: string,
    junctionPt: Point
  ) => {
    const targetWire = wires.find(w => w.id === targetWireId);
    if (!targetWire) return;

    // 1. Cria o componente de nó elétrico
    const junction = createComponent('JUNCTION_DOT', junctionPt.x, junctionPt.y);
    junction.params.label = '';

    // 2. Divide o fio alvo em duas seções conectadas ao nó
    const wireA: Wire = {
      id: `wire_${Date.now().toString(36)}_a`,
      fromCompId: targetWire.fromCompId,
      fromTerminalId: targetWire.fromTerminalId,
      toCompId: junction.id,
      toTerminalId: 'pin'
    };

    const wireB: Wire = {
      id: `wire_${Date.now().toString(36)}_b`,
      fromCompId: junction.id,
      fromTerminalId: 'pin',
      toCompId: targetWire.toCompId,
      toTerminalId: targetWire.toTerminalId
    };

    // 3. Fio derivado conectando a nova origem ao nó
    const wireNew: Wire = {
      id: `wire_${Date.now().toString(36)}_c`,
      fromCompId: fromCompId,
      fromTerminalId: fromTerminalId,
      toCompId: junction.id,
      toTerminalId: 'pin'
    };

    setComponents(prev => [...prev, junction]);
    setWires(prev => [...prev.filter(w => w.id !== targetWireId), wireA, wireB, wireNew]);
    setSelectedCompId(junction.id);
  };

  // Inserir nó de junção diretamente no fio (por duplo clique ou painel flutuante)
  const handleInsertJunctionOnWire = (wireId: string, pt: Point) => {
    const targetWire = wires.find(w => w.id === wireId);
    if (!targetWire) return;

    const junction = createComponent('JUNCTION_DOT', pt.x, pt.y);
    junction.params.label = '';

    const wireA: Wire = {
      id: `wire_${Date.now().toString(36)}_ja`,
      fromCompId: targetWire.fromCompId,
      fromTerminalId: targetWire.fromTerminalId,
      toCompId: junction.id,
      toTerminalId: 'pin'
    };

    const wireB: Wire = {
      id: `wire_${Date.now().toString(36)}_jb`,
      fromCompId: junction.id,
      fromTerminalId: 'pin',
      toCompId: targetWire.toCompId,
      toTerminalId: targetWire.toTerminalId
    };

    setComponents(prev => [...prev, junction]);
    setWires(prev => [...prev.filter(w => w.id !== wireId), wireA, wireB]);
    setSelectedCompId(junction.id);
  };

  // Atualizar pontos intermediários (waypoints) do fio editável
  const handleUpdateWire = (wireId: string, waypoints: Point[]) => {
    setWires(prev =>
      prev.map(w => (w.id === wireId ? { ...w, waypoints } : w))
    );
  };

  // Atualizar seta indicativa de sentido de corrente no fio
  const handleUpdateWireArrow = (wireId: string, arrow: CurrentArrowConfig | undefined) => {
    setWires(prev =>
      prev.map(w => (w.id === wireId ? { ...w, currentArrow: arrow } : w))
    );
  };

  // Seleção unificada individual e múltipla
  const handleSelectComponent = (id: string | null) => {
    setSelectedCompId(id);
    setSelectedCompIds(id ? [id] : []);
    if (id) {
      const comp = components.find(c => c.id === id);
      if (comp) setInspectorComp(comp);
    }
  };

  const handleSelectComponents = (ids: string[]) => {
    setSelectedCompIds(ids);
    if (ids.length === 1) {
      setSelectedCompId(ids[0]);
      const comp = components.find(c => c.id === ids[0]);
      if (comp) setInspectorComp(comp);
    } else if (ids.length === 0) {
      setSelectedCompId(null);
    } else {
      setSelectedCompId(ids[0]);
    }
  };

  // Atualizar posições de múltiplos componentes (arrasto em lote/área)
  const handleUpdateComponentsPositions = (updates: { id: string; x: number; y: number }[]) => {
    const updateMap = new Map(updates.map(u => [u.id, u]));
    setComponents(prev =>
      prev.map(c => {
        const u = updateMap.get(c.id);
        return u ? { ...c, x: u.x, y: u.y } : c;
      })
    );
  };

  // Atualizar posição de componente individual
  const handleUpdateComponentPosition = (id: string, x: number, y: number) => {
    setComponents(prev => prev.map(c => (c.id === id ? { ...c, x, y } : c)));
  };

  // Girar componente em 90 graus
  const handleRotateComponent = (id: string) => {
    setComponents(prev =>
      prev.map(c => (c.id === id ? { ...c, rotation: (c.rotation + 90) % 360 } : c))
    );
  };

  // Excluir seleção (múltiplos componentes, componente individual ou fio condutor)
  const handleDeleteSelected = () => {
    if (selectedCompIds.length > 0) {
      const idsToDelete = new Set(selectedCompIds);
      setComponents(prev => prev.filter(c => !idsToDelete.has(c.id)));
      setWires(prev => prev.filter(w => !idsToDelete.has(w.fromCompId) && !idsToDelete.has(w.toCompId)));
      setSelectedCompIds([]);
      setSelectedCompId(null);
      if (inspectorComp && idsToDelete.has(inspectorComp.id)) {
        setInspectorComp(null);
      }
    } else if (selectedCompId) {
      setComponents(prev => prev.filter(c => c.id !== selectedCompId));
      setWires(prev => prev.filter(w => w.fromCompId !== selectedCompId && w.toCompId !== selectedCompId));
      setSelectedCompId(null);
      setSelectedCompIds([]);
      if (inspectorComp?.id === selectedCompId) {
        setInspectorComp(null);
      }
    } else if (selectedWireId) {
      setWires(prev => prev.filter(w => w.id !== selectedWireId));
      setSelectedWireId(null);
    }
  };

  // Alternar estado da chave
  const handleToggleSwitch = (id: string) => {
    setComponents(prev =>
      prev.map(c => {
        if (c.id === id && c.type === 'SWITCH') {
          const nextState = !(c.params.closed ?? true);
          return { ...c, params: { ...c.params, closed: nextState } };
        }
        return c;
      })
    );
    engineRef.current.toggleSwitch(id);
  };

  // Atualizar parâmetros pelo inspector
  const handleUpdateParams = (compId: string, newParams: Record<string, any>) => {
    setComponents(prev =>
      prev.map(c => (c.id === compId ? { ...c, params: newParams } : c))
    );
    setInspectorComp(prev => (prev?.id === compId ? { ...prev, params: newParams } : prev));
  };

  // Controles de Simulação
  const handleToggleRun = () => {
    const engine = engineRef.current;
    if (isRunning) {
      engine.pause();
      setIsRunning(false);
    } else {
      engine.start();
      setIsRunning(true);
    }
  };

  const handleStep = () => {
    const engine = engineRef.current;
    engine.stepOnce();
    setCurrentTime(engine.currentTime);
    setTick(t => t + 1);
  };

  const handleReset = () => {
    const engine = engineRef.current;
    engine.reset();
    setIsRunning(false);
    setCurrentTime(0);
    setTick(t => t + 1);
  };

  const handleBatchRun = () => {
    const engine = engineRef.current;
    engine.runBatch(0.02, 5e-6);
    setCurrentTime(engine.currentTime);
    setIsScopeOpen(true);
    setTick(t => t + 1);
  };

  // Carregar preset de circuito
  const handleLoadPreset = (preset: PresetCircuit) => {
    engineRef.current.reset();
    setIsRunning(false);
    setCurrentSavedCircuit(null);
    setComponents(preset.components);
    setWires(preset.wires);
    setSelectedCompId(null);
    setSelectedCompIds([]);
    setSelectedWireId(null);
    setInspectorComp(null);
    setTimeout(() => {
      engineRef.current.init(preset.components, preset.wires);
      engineRef.current.runBatch(preset.runDuration, preset.timeStep);
      setIsScopeOpen(true);
      setCurrentTime(engineRef.current.currentTime);
      setTick(t => t + 1);
    }, 50);
  };

  // Aplicar circuito reconhecido por foto
  const handleApplyPhotoSchematic = (newComponents: CircuitComponent[], newWires: Wire[]) => {
    engineRef.current.reset();
    setIsRunning(false);
    setCurrentSavedCircuit(null);
    setComponents(newComponents);
    setWires(newWires);
    setSelectedCompId(null);
    setSelectedCompIds([]);
    setSelectedWireId(null);
    setInspectorComp(null);

    setTimeout(() => {
      engineRef.current.init(newComponents, newWires);
      engineRef.current.runBatch(0.02, 5e-6);
      setIsScopeOpen(true);
      setCurrentTime(engineRef.current.currentTime);
      setTick(t => t + 1);
    }, 50);
  };

  // Iniciar Novo Projeto em Branco
  const handleNewProject = () => {
    if (components.length > 0) {
      const confirmNew = window.confirm('Deseja iniciar um novo projeto em branco? O circuito atual será limpo.');
      if (!confirmNew) return;
    }
    engineRef.current.reset();
    setIsRunning(false);
    setCurrentTime(0);
    setCurrentSavedCircuit(null);
    setComponents([]);
    setWires([]);
    setSelectedCompIds([]);
    setSelectedCompId(null);
    setSelectedWireId(null);
    setInspectorComp(null);
  };

  // Limpar esquemático
  const handleClear = () => {
    handleNewProject();
  };

  // Exportar circuito como JSON
  const handleExport = () => {
    const data = JSON.stringify({ components, wires }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circuito_plecs_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importar circuito JSON
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          if (Array.isArray(parsed.components) && Array.isArray(parsed.wires)) {
            engineRef.current.reset();
            setIsRunning(false);
            setComponents(parsed.components);
            setWires(parsed.wires);
          }
        } catch (err) {
          alert('Arquivo JSON inválido.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const selectedComponentObj = useMemo(
    () => components.find(c => c.id === selectedCompId) || null,
    [components, selectedCompId]
  );

  return (
    <div className="flex flex-col w-full h-full bg-[#0b0f19] text-slate-100 overflow-hidden select-none">
      {/* Barra de Ferramentas Superior */}
      <HeaderToolbar
        isRunning={isRunning}
        currentTime={currentTime}
        onToggleRun={handleToggleRun}
        onStep={handleStep}
        onReset={handleReset}
        onBatchRun={handleBatchRun}
        onLoadPreset={handleLoadPreset}
        onClear={handleClear}
        onNewProject={handleNewProject}
        onExport={handleExport}
        onImport={handleImport}
        isScopeOpen={isScopeOpen}
        onToggleScope={() => setIsScopeOpen(!isScopeOpen)}
        onOpenPhotoModal={() => setIsPhotoModalOpen(true)}
        onOpenImpedanceModal={() => setIsImpedanceModalOpen(true)}
        onToggleMobilePalette={() => setIsMobilePaletteOpen(prev => !prev)}
        onOpenAnalysis={() => setIsAnalysisOpen(true)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenAiSolve={() => setIsAiSolveOpen(true)}
        accountSlot={<AccountMenu />}
        systemMode={systemMode}
        onSelectSystemMode={handleSelectSystemMode}
        onOpenPuModal={() => setIsPuModalOpen(true)}
        onOpenYBusModal={() => setIsYBusModalOpen(true)}
        onOpenLtModal={() => setIsLtModalOpen(true)}
      />


      {/* Área Principal de Trabalho */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Paleta Lateral de Componentes (com suporte a gaveta mobile) */}
        <ComponentPalette
          systemMode={systemMode}
          onAddComponent={handleAddComponent}
          onRequestPreconfigure={handleRequestPreconfigure}
          alwaysPreconfigure={alwaysPreconfigure}
          onToggleAlwaysPreconfigure={handleToggleAlwaysPreconfigure}
          isOpenMobile={isMobilePaletteOpen}
          onCloseMobile={() => setIsMobilePaletteOpen(false)}
          onOpenPhotoModal={() => setIsPhotoModalOpen(true)}
          onNewProject={handleNewProject}
        />

        {/* Canvas Central CAD Interativo */}
        <SchematicCanvas
          components={components}
          wires={wires}
          selectedCompId={selectedCompId}
          selectedCompIds={selectedCompIds}
          selectedWireId={selectedWireId}
          onSelectComponent={handleSelectComponent}
          onSelectComponents={handleSelectComponents}
          onSelectWire={setSelectedWireId}
          onUpdateComponentPosition={handleUpdateComponentPosition}
          onUpdateComponentsPositions={handleUpdateComponentsPositions}
          onAddWire={handleAddWire}
          onUpdateWire={handleUpdateWire}
          onRotateComponent={handleRotateComponent}
          onDeleteSelected={handleDeleteSelected}
          onToggleSwitch={handleToggleSwitch}
          onDoubleClickComponent={comp => {
            handleSelectComponent(comp.id);
          }}
          latestResult={engineRef.current.latestResult}
          onConnectWireToWire={handleConnectWireToWire}
          onInsertJunctionOnWire={handleInsertJunctionOnWire}
          onUpdateWireArrow={handleUpdateWireArrow}
        />

        {/* Modal de Inspeção de Propriedades */}
        {inspectorComp && (
          <InspectorModal
            component={selectedComponentObj || inspectorComp}
            onUpdateParams={handleUpdateParams}
            onRotate={handleRotateComponent}
            onDelete={handleDeleteSelected}
            onClose={() => setInspectorComp(null)}
          />
        )}

        {/* Osciloscópio PLECS Scope Multicanal */}
        <PlecsScope
          signals={engineRef.current.signals}
          isOpen={isScopeOpen}
          onClose={() => setIsScopeOpen(false)}
          currentTime={currentTime}
        />

        {/* Modal de Reconhecimento de Circuitos por Foto */}
        <PhotoCircuitModal
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          onApplySchematic={handleApplyPhotoSchematic}
        />

        {/* Modal de Pré-configuração de Novo Componente */}
        <ConfigureNewComponentModal
          isOpen={isPreconfigureModalOpen}
          onClose={() => setIsPreconfigureModalOpen(false)}
          initialType={preconfigureType}
          initialParams={preconfigureParams}
          components={components}
          onConfirm={handleConfirmPreconfiguredComponent}
          alwaysPreconfigure={alwaysPreconfigure}
          onToggleAlwaysPreconfigure={handleToggleAlwaysPreconfigure}
        />

        {/* Modal de Cálculo da Impedância de Entrada Zab */}
        <ImpedanceModal
          isOpen={isImpedanceModalOpen}
          onClose={() => setIsImpedanceModalOpen(false)}
          components={components}
          wires={wires}
          onLoadImpedancePreset={() => handleLoadPreset(PRESET_CIRCUITS[0])}
        />

        {/* Painel de Resolução Analítica (listas 1 a 6) */}
        <AnalysisPanel isOpen={isAnalysisOpen} onClose={() => setIsAnalysisOpen(false)} />

        {/* Resolução por IA com base no circuito montado */}
        <AiSolveModal
          isOpen={isAiSolveOpen}
          onClose={() => setIsAiSolveOpen(false)}
          components={components}
          wires={wires}
        />

        {/* Modais Especializados de GTDC / Sistemas Elétricos de Potência */}
        <PuAnalysisModal
          isOpen={isPuModalOpen}
          onClose={() => setIsPuModalOpen(false)}
          components={components}
        />
        <YBusModal
          isOpen={isYBusModalOpen}
          onClose={() => setIsYBusModalOpen(false)}
          components={components}
          wires={wires}
        />
        <LtAnalysisModal
          isOpen={isLtModalOpen}
          onClose={() => setIsLtModalOpen(false)}
          components={components}
        />

        {/* Biblioteca de circuitos salvos na conta do usuário */}
        <CircuitLibraryModal
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          components={components}
          wires={wires}
          currentSavedCircuit={currentSavedCircuit}
          onLoad={(comps, ws, meta) => {
            setIsRunning(false);
            setComponents(comps);
            setWires(ws);
            setSelectedCompIds([]);
            setSelectedCompId(null);
            setSelectedWireId(null);
            setInspectorComp(null);
            if (meta) {
              setCurrentSavedCircuit(meta);
            } else {
              setCurrentSavedCircuit(null);
            }
            engineRef.current.init(comps, ws);
            setCurrentTime(0);
          }}
          onGoToAuth={() => {
            window.location.href = '/auth';
          }}
        />

      </div>
    </div>
  );
}

export default App;
