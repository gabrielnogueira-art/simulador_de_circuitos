import { CircuitGraph } from '../schematic/circuitGraph';
import { CircuitComponent, Point, Wire } from '../schematic/types';

export interface CurrentReference {
  componentId: string;
  label: string;
  fromTerminalId: string;
  toTerminalId: string;
  fromNode: number;
  toNode: number;
  isUserDefined: boolean;
}

export interface MeshReference {
  id: number;
  componentIds: string[];
}

export interface CircuitDirections {
  currents: CurrentReference[];
  meshes: MeshReference[];
}

type Branch = CurrentReference & { a: number; b: number };

export const branchTerminalPair = (component: CircuitComponent): [string, string] | null => {
  switch (component.type) {
    case 'RESISTOR':
    case 'CAPACITOR':
    case 'INDUCTOR':
    case 'SWITCH':
      return ['t1', 't2'];
    case 'DIODE':
      return ['anode', 'cathode'];
    case 'AMMETER':
      return ['in', 'out'];
    case 'DC_VOLTAGE':
    case 'AC_VOLTAGE':
    case 'AC_CURRENT':
    case 'PULSE_VOLTAGE':
    case 'DEPENDENT_SOURCE':
      return ['pos', 'neg'];
    case 'SPDT_SWITCH':
      return ['com', component.params.position === 'b' ? 'b' : 'a'];
    default:
      return null;
  }
};

export function analyzeCircuitDirections(
  components: CircuitComponent[],
  wires: Wire[],
): CircuitDirections {
  const netlist = CircuitGraph.buildNetlist(components, wires);
  const branches: Branch[] = [];

  for (const component of components) {
    const naturalPair = branchTerminalPair(component);
    if (!naturalPair) continue;
    const pair: [string, string] = component.params.currentDirection === 'REVERSE'
      ? [naturalPair[1], naturalPair[0]]
      : naturalPair;
    const fromNode = netlist.terminalToNode.get(`${component.id}:${pair[0]}`);
    const toNode = netlist.terminalToNode.get(`${component.id}:${pair[1]}`);
    if (fromNode === undefined || toNode === undefined || fromNode === toNode) continue;
    branches.push({
      componentId: component.id,
      label: String(component.params.label || component.id),
      fromTerminalId: pair[0],
      toTerminalId: pair[1],
      fromNode,
      toNode,
      isUserDefined: component.params.currentDirection === 'FORWARD' || component.params.currentDirection === 'REVERSE',
      a: fromNode,
      b: toNode,
    });
  }

  const parent = new Map<number, number>();
  const find = (node: number): number => {
    const current = parent.get(node);
    if (current === undefined) {
      parent.set(node, node);
      return node;
    }
    if (current === node) return node;
    const root = find(current);
    parent.set(node, root);
    return root;
  };
  const union = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  };

  const tree = new Map<number, Array<{ node: number; componentId: string }>>();
  const addTreeEdge = (a: number, b: number, componentId: string) => {
    tree.set(a, [...(tree.get(a) ?? []), { node: b, componentId }]);
    tree.set(b, [...(tree.get(b) ?? []), { node: a, componentId }]);
  };
  const pathComponents = (start: number, goal: number): string[] => {
    const queue = [start];
    const seen = new Set([start]);
    const previous = new Map<number, { node: number; componentId: string }>();
    while (queue.length > 0) {
      const node = queue.shift();
      if (node === undefined || node === goal) break;
      for (const next of tree.get(node) ?? []) {
        if (seen.has(next.node)) continue;
        seen.add(next.node);
        previous.set(next.node, { node, componentId: next.componentId });
        queue.push(next.node);
      }
    }
    if (!seen.has(goal)) return [];
    const result: string[] = [];
    let cursor = goal;
    while (cursor !== start) {
      const step = previous.get(cursor);
      if (!step) return [];
      result.push(step.componentId);
      cursor = step.node;
    }
    return result.reverse();
  };

  const meshes: MeshReference[] = [];
  for (const branch of branches) {
    if (find(branch.a) !== find(branch.b)) {
      union(branch.a, branch.b);
      addTreeEdge(branch.a, branch.b, branch.componentId);
      continue;
    }
    const path = pathComponents(branch.a, branch.b);
    if (path.length > 0) {
      meshes.push({ id: meshes.length + 1, componentIds: [...path, branch.componentId] });
    }
  }

  return {
    currents: branches.map(({ a: _a, b: _b, ...current }) => current),
    meshes,
  };
}

export function directionPointLabel(node: number): string {
  return node === 0 ? 'GND(0)' : `N${node}`;
}

export function averagePoint(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}