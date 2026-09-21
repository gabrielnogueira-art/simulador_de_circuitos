import { CircuitComponent, Wire } from './types';
import { getTerminalAbsPosition } from './componentDefs';

export interface TerminalKey {
  compId: string;
  terminalId: string;
}

export interface CircuitNetlist {
  nodeCount: number; // Número de nós ativos (1 a nodeCount). Nó 0 é GND.
  terminalToNode: Map<string, number>; // key: "compId:terminalId" -> nodeIndex
  hasGround: boolean;
}

export class CircuitGraph {
  static buildNetlist(components: CircuitComponent[], wires: Wire[]): CircuitNetlist {
    // Chave única para cada terminal
    const termKey = (compId: string, termId: string) => `${compId}:${termId}`;

    // Disjoint-set union (Union-Find)
    const parent = new Map<string, string>();

    const find = (i: string): string => {
      if (!parent.has(i)) parent.set(i, i);
      if (parent.get(i) === i) return i;
      const root = find(parent.get(i)!);
      parent.set(i, root);
      return root;
    };

    const union = (i: string, j: string) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) {
        parent.set(rootI, rootJ);
      }
    };

    // Registra todos os terminais de todos os componentes
    for (const comp of components) {
      for (const t of comp.terminals) {
        const key = termKey(comp.id, t.id);
        find(key);
      }
    }

    // Une terminais que estão exatamente na mesma posição física (snap)
    const posMap = new Map<string, string>(); // "x,y" -> first terminal key
    for (const comp of components) {
      for (const t of comp.terminals) {
        const p = getTerminalAbsPosition(comp, t.id);
        const snappedPos = `${Math.round(p.x)},${Math.round(p.y)}`;
        const key = termKey(comp.id, t.id);
        if (posMap.has(snappedPos)) {
          union(key, posMap.get(snappedPos)!);
        } else {
          posMap.set(snappedPos, key);
        }
      }
    }

    // Une os terminais conectados por fios
    for (const wire of wires) {
      const k1 = termKey(wire.fromCompId, wire.fromTerminalId);
      const k2 = termKey(wire.toCompId, wire.toTerminalId);
      union(k1, k2);
    }

    // Identifica quais conjuntos estão conectados ao terra (GROUND)
    const groundRoots = new Set<string>();
    for (const comp of components) {
      if (comp.type === 'GROUND') {
        const gKey = termKey(comp.id, 'gnd');
        groundRoots.add(find(gKey));
      }
    }

    let hasGround = groundRoots.size > 0;
    // Se não houver terra explícito, definimos o terminal negativo da primeira fonte ou o primeiro nó como GND de referência
    let fallbackGndRoot: string | null = null;
    if (!hasGround) {
      const source = components.find(c => c.type === 'DC_VOLTAGE' || c.type === 'AC_VOLTAGE' || c.type === 'PULSE_VOLTAGE');
      if (source) {
        fallbackGndRoot = find(termKey(source.id, 'neg'));
      } else if (components.length > 0 && components[0].terminals.length > 0) {
        fallbackGndRoot = find(termKey(components[0].id, components[0].terminals[0].id));
      }
    }

    // Mapeia raízes para índices de nó (0 para GND, 1..N para nós ativos)
    const rootToNodeIndex = new Map<string, number>();
    let nextNodeIndex = 1;

    // Primeiro mapeia os nós terras para 0
    if (hasGround) {
      for (const gRoot of groundRoots) {
        rootToNodeIndex.set(gRoot, 0);
      }
    } else if (fallbackGndRoot) {
      rootToNodeIndex.set(fallbackGndRoot, 0);
    }

    // Mapeia os demais nós
    const terminalToNode = new Map<string, number>();
    for (const comp of components) {
      for (const t of comp.terminals) {
        const key = termKey(comp.id, t.id);
        const root = find(key);

        if (!rootToNodeIndex.has(root)) {
          rootToNodeIndex.set(root, nextNodeIndex++);
        }

        terminalToNode.set(key, rootToNodeIndex.get(root)!);
      }
    }

    return {
      nodeCount: nextNodeIndex - 1,
      terminalToNode,
      hasGround: hasGround || fallbackGndRoot !== null
    };
  }
}
