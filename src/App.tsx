import { useState, useEffect, useRef, useMemo } from 'react';
import { CircuitComponent, ComponentType, Point, Wire } from './schematic/types';
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

export function App() {
  const initialPreset = PRESET_CIRCUITS[0];

  const [components, setComponents] = useState<CircuitComponent[]>(initialPreset.components);
  const [wires, setWires] = useState<Wire[]>(initialPreset.wires);

  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [inspectorComp, setInspectorComp] = useState<CircuitComponent | null>(null);
  const [isScopeOpen, setIsScopeOpen] = useState(true);

  // Estados dos novos modais
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isImpedanceModalOpen, setIsImpedanceModalOpen] = useState(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);

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

  // Adicionar novo componente
  const handleAddComponent = (type: ComponentType) => {
    const offset = (components.length % 5) * 30;
    const newComp = createComponent(type, 380 + offset, 240 + offset);
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

  // Atualizar pontos intermediários (waypoints) do fio editável
  const handleUpdateWire = (wireId: string, waypoints: Point[]) => {
    setWires(prev =>
      prev.map(w => (w.id === wireId ? { ...w, waypoints } : w))
    );
  };

  // Atualizar posição do componente
  const handleUpdateComponentPosition = (id: string, x: number, y: number) => {
    setComponents(prev => prev.map(c => (c.id === id ? { ...c, x, y } : c)));
  };

  // Girar componente em 90 graus
  const handleRotateComponent = (id: string) => {
    setComponents(prev =>
      prev.map(c => (c.id === id ? { ...c, rotation: (c.rotation + 90) % 360 } : c))
    );
  };

  // Excluir seleção (componente ou fio condutor)
  const handleDeleteSelected = () => {
    if (selectedCompId) {
      setComponents(prev => prev.filter(c => c.id !== selectedCompId));
      setWires(prev => prev.filter(w => w.fromCompId !== selectedCompId && w.toCompId !== selectedCompId));
      setSelectedCompId(null);
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
    setComponents(preset.components);
    setWires(preset.wires);
    setSelectedCompId(null);
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
    setComponents(newComponents);
    setWires(newWires);
    setSelectedCompId(null);
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

  // Limpar esquemático
  const handleClear = () => {
    if (window.confirm('Deseja limpar todo o esquemático atual?')) {
      engineRef.current.reset();
      setIsRunning(false);
      setComponents([]);
      setWires([]);
      setSelectedCompId(null);
      setSelectedWireId(null);
      setInspectorComp(null);
    }
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
        onExport={handleExport}
        onImport={handleImport}
        isScopeOpen={isScopeOpen}
        onToggleScope={() => setIsScopeOpen(!isScopeOpen)}
        onOpenPhotoModal={() => setIsPhotoModalOpen(true)}
        onOpenImpedanceModal={() => setIsImpedanceModalOpen(true)}
        onToggleMobilePalette={() => setIsMobilePaletteOpen(prev => !prev)}
      />

      {/* Área Principal de Trabalho */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Paleta Lateral de Componentes (com suporte a gaveta mobile) */}
        <ComponentPalette
          onAddComponent={handleAddComponent}
          isOpenMobile={isMobilePaletteOpen}
          onCloseMobile={() => setIsMobilePaletteOpen(false)}
        />

        {/* Canvas Central CAD Interativo */}
        <SchematicCanvas
          components={components}
          wires={wires}
          selectedCompId={selectedCompId}
          selectedWireId={selectedWireId}
          onSelectComponent={id => {
            setSelectedCompId(id);
            if (id) {
              const comp = components.find(c => c.id === id);
              if (comp) setInspectorComp(comp);
            }
          }}
          onSelectWire={setSelectedWireId}
          onUpdateComponentPosition={handleUpdateComponentPosition}
          onAddWire={handleAddWire}
          onUpdateWire={handleUpdateWire}
          onRotateComponent={handleRotateComponent}
          onDeleteSelected={handleDeleteSelected}
          onToggleSwitch={handleToggleSwitch}
          onDoubleClickComponent={comp => {
            setSelectedCompId(comp.id);
            setInspectorComp(comp);
          }}
          latestResult={engineRef.current.latestResult}
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

        {/* Modal de Cálculo da Impedância de Entrada Zab */}
        <ImpedanceModal
          isOpen={isImpedanceModalOpen}
          onClose={() => setIsImpedanceModalOpen(false)}
          components={components}
          wires={wires}
          onLoadImpedancePreset={() => handleLoadPreset(PRESET_CIRCUITS[0])}
        />
      </div>
    </div>
  );
}

export default App;
