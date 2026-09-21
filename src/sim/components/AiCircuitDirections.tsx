import { useId, useMemo } from 'react';
import { analyzeCircuitDirections } from '../ai/circuitDirections';
import { getTerminalAbsPosition } from '../schematic/componentDefs';
import { CircuitComponent, Point, Wire } from '../schematic/types';

interface AiCircuitDirectionsProps {
  components: CircuitComponent[];
  wires: Wire[];
  showMeshes: boolean;
}

const componentRadius = 16;

function pathFromPoints(points: Point[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export function AiCircuitDirections({ components, wires, showMeshes }: AiCircuitDirectionsProps) {
  const currentMarkerId = `current-${useId().replace(/:/g, '')}`;
  const meshMarkerId = `mesh-${useId().replace(/:/g, '')}`;
  const directions = useMemo(
    () => analyzeCircuitDirections(components, wires),
    [components, wires],
  );
  const componentMap = useMemo(
    () => new Map(components.map(component => [component.id, component])),
    [components],
  );

  const allPoints = components.flatMap(component => [
    { x: component.x, y: component.y },
    ...component.terminals.map(terminal => getTerminalAbsPosition(component, terminal.id)),
  ]);
  if (allPoints.length === 0) return null;

  const minX = Math.min(...allPoints.map(point => point.x)) - 75;
  const maxX = Math.max(...allPoints.map(point => point.x)) + 75;
  const minY = Math.min(...allPoints.map(point => point.y)) - 70;
  const maxY = Math.max(...allPoints.map(point => point.y)) + 70;
  const width = Math.max(240, maxX - minX);
  const height = Math.max(150, maxY - minY);

  return (
    <section aria-label="Referências visuais da resolução" className="mb-5 border-b border-border pb-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase text-foreground">Sentidos de referência</h3>
        <span className="text-[10px] text-muted-foreground">Circuito montado</span>
      </div>
      <div className="overflow-x-auto rounded-md border border-border bg-background/60">
        <svg
          role="img"
          aria-label="Circuito com setas das correntes e sentidos das malhas"
          viewBox={`${minX} ${minY} ${width} ${height}`}
          className="h-auto max-h-72 min-h-44 w-full min-w-[420px] text-foreground"
        >
          <defs>
            <marker id={currentMarkerId} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M 0 0 L 7 3.5 L 0 7 z" className="fill-cyan-400" />
            </marker>
            <marker id={meshMarkerId} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M 0 0 L 7 3.5 L 0 7 z" className="fill-amber-400" />
            </marker>
          </defs>

          {wires.map(wire => {
            const from = componentMap.get(wire.fromCompId);
            const to = componentMap.get(wire.toCompId);
            if (!from || !to) return null;
            const points = [
              getTerminalAbsPosition(from, wire.fromTerminalId),
              ...(wire.waypoints ?? []),
              getTerminalAbsPosition(to, wire.toTerminalId),
            ];
            return <path key={wire.id} d={pathFromPoints(points)} fill="none" className="stroke-slate-500" strokeWidth="2" />;
          })}

          {components.map(component => {
            const label = String(component.params.label || component.id);
            if (component.type === 'JUNCTION_DOT') {
              return <circle key={component.id} cx={component.x} cy={component.y} r="4" className="fill-slate-300" />;
            }
            if (component.type === 'GROUND') {
              return (
                <g key={component.id} className="stroke-slate-300" strokeWidth="2">
                  <path d={`M ${component.x} ${component.y - 20} V ${component.y - 8} M ${component.x - 14} ${component.y - 8} H ${component.x + 14} M ${component.x - 9} ${component.y - 3} H ${component.x + 9} M ${component.x - 4} ${component.y + 2} H ${component.x + 4}`} />
                </g>
              );
            }
            return (
              <g key={component.id}>
                <circle cx={component.x} cy={component.y} r={componentRadius} className="fill-slate-900 stroke-slate-400" strokeWidth="2" />
                <text x={component.x} y={component.y + 4} textAnchor="middle" className="fill-slate-100 text-[11px] font-semibold">
                  {label}
                </text>
              </g>
            );
          })}

          {directions.currents.map((current, index) => {
            const component = componentMap.get(current.componentId);
            if (!component) return null;
            const from = getTerminalAbsPosition(component, current.fromTerminalId);
            const to = getTerminalAbsPosition(component, current.toTerminalId);
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const length = Math.hypot(dx, dy) || 1;
            const nx = dx / length;
            const ny = dy / length;
            const offsetX = -ny * 25;
            const offsetY = nx * 25;
            const start = { x: from.x + nx * 8 + offsetX, y: from.y + ny * 8 + offsetY };
            const end = { x: to.x - nx * 8 + offsetX, y: to.y - ny * 8 + offsetY };
            const labelX = (start.x + end.x) / 2 - ny * 9;
            const labelY = (start.y + end.y) / 2 + nx * 9;
            return (
              <g key={current.componentId}>
                <path
                  d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                  fill="none"
                  className="stroke-cyan-400"
                  strokeWidth="2.5"
                  markerEnd={`url(#${currentMarkerId})`}
                />
                <text x={labelX} y={labelY} textAnchor="middle" className="fill-cyan-300 text-[11px] font-bold">
                  I{index + 1}{current.isUserDefined ? '*' : ''}
                </text>
              </g>
            );
          })}

          {showMeshes && directions.meshes.map(mesh => {
            const points = mesh.componentIds
              .map(id => componentMap.get(id))
              .filter((component): component is CircuitComponent => Boolean(component))
              .map(component => ({ x: component.x, y: component.y }));
            if (points.length < 2) return null;
            const localMinX = Math.min(...points.map(point => point.x)) - 30;
            const localMaxX = Math.max(...points.map(point => point.x)) + 30;
            const localMinY = Math.min(...points.map(point => point.y)) - 30;
            const localMaxY = Math.max(...points.map(point => point.y)) + 30;
            const cx = (localMinX + localMaxX) / 2;
            const cy = (localMinY + localMaxY) / 2;
            const rx = Math.max(28, (localMaxX - localMinX) / 2);
            const ry = Math.max(25, (localMaxY - localMinY) / 2);
            return (
              <g key={mesh.id}>
                <path
                  d={`M ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`}
                  fill="none"
                  className="stroke-amber-400"
                  strokeWidth="2"
                  strokeDasharray="7 5"
                  markerEnd={`url(#${meshMarkerId})`}
                />
                <text x={cx} y={cy + 4} textAnchor="middle" className="fill-amber-300 text-[12px] font-bold">
                  M{mesh.id} ↻
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span><b className="text-cyan-300">I1, I2…</b> correntes de referência</span>
        {directions.currents.some(current => current.isUserDefined) && (
          <span><b className="text-cyan-300">*</b> sentido definido pelo enunciado</span>
        )}
        {showMeshes && <span><b className="text-amber-300">M1, M2… ↻</b> malhas no sentido horário</span>}
        <span>Valor negativo: sentido real oposto à seta.</span>
      </div>
    </section>
  );
}