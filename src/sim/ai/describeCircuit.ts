import { CircuitComponent, Wire } from '../schematic/types';
import { CircuitGraph } from '../schematic/circuitGraph';
import { analyzeCircuitDirections, directionPointLabel } from './circuitDirections';

/**
 * Converte o circuito montado na prancheta em um texto (netlist legível)
 * que a IA consegue interpretar para resolver o que a questão pede.
 */
export function describeCircuit(components: CircuitComponent[], wires: Wire[]): string {
  if (components.length === 0) return 'A prancheta está vazia (nenhum componente montado).';

  const netlist = CircuitGraph.buildNetlist(components, wires);
  const nodeOf = (compId: string, termId: string) => {
    const n = netlist.terminalToNode.get(`${compId}:${termId}`);
    if (n === undefined) return 'desconectado';
    return n === 0 ? 'GND(0)' : `N${n}`;
  };

  const lines: string[] = [];
  lines.push(`Nós ativos: ${netlist.nodeCount} | Referência (terra) definida: ${netlist.hasGround ? 'sim' : 'não'}`);
  lines.push('');
  lines.push('Componentes (tipo, rótulo, nós dos terminais, parâmetros):');

  for (const comp of components) {
    const terms = (comp.terminals ?? [])
      .map(t => `${t.id}=${nodeOf(comp.id, t.id)}`)
      .join(', ');


    const params = Object.entries(comp.params ?? {})
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join(', ');

    lines.push(`- ${comp.type} "${comp.params?.label ?? comp.id}" [${terms}] { ${params} }`);
  }

  // Setas de corrente marcadas pelo usuário nos fios/trechos
  const wireArrows = wires.filter(w => w.currentArrow);
  if (wireArrows.length > 0) {
    lines.push('');
    lines.push('Setas de corrente em trechos/fios condutores (definidas pelo enunciado):');
    for (const w of wireArrows) {
      const from = components.find(c => c.id === w.fromCompId);
      const to = components.find(c => c.id === w.toCompId);
      const fromLabel = from?.params.label || w.fromCompId;
      const toLabel = to?.params.label || w.toCompId;
      const isRev = w.currentArrow?.direction === 'reverse';
      const startComp = isRev ? toLabel : fromLabel;
      const endComp = isRev ? fromLabel : toLabel;
      const startTerm = isRev ? w.toTerminalId : w.fromTerminalId;
      const endTerm = isRev ? w.fromTerminalId : w.toTerminalId;
      const startNode = isRev ? nodeOf(w.toCompId, w.toTerminalId) : nodeOf(w.fromCompId, w.fromTerminalId);
      const endNode = isRev ? nodeOf(w.fromCompId, w.fromTerminalId) : nodeOf(w.toCompId, w.toTerminalId);
      const arrowLabel = w.currentArrow?.label || 'i';

      lines.push(
        `- Corrente "${arrowLabel}": sentido fixado do ${startComp}[${startTerm}, nó ${startNode}] para ${endComp}[${endTerm}, nó ${endNode}] ` +
        `[SENTIDO DEFINIDO PELO ENUNCIADO — OBRIGATÓRIO: monte as equações de LKC/LKT adotando este sentido de referência].`
      );
    }
  }

  const directions = analyzeCircuitDirections(components, wires);
  if (directions.currents.length > 0) {
    lines.push('');
    lines.push('Referências visuais das correntes de ramo (iguais às setas I1, I2... mostradas ao aluno):');
    directions.currents.forEach((current, index) => {
      lines.push(
        `- I${index + 1} em ${current.label}: ${directionPointLabel(current.fromNode)} → ${directionPointLabel(current.toNode)} ` +
        `(${current.fromTerminalId} → ${current.toTerminalId})` +
        (current.isUserDefined ? ' [SENTIDO DEFINIDO PELO ENUNCIADO — não inverter a referência]' : ' [referência automática]'),
      );
    });
    lines.push('Os sentidos marcados como definidos pelo enunciado são obrigatórios. Se uma corrente calculada for negativa, seu sentido real é oposto à seta de referência.');
  }
  if (directions.meshes.length > 0) {
    lines.push('');
    lines.push('Malhas independentes mostradas ao aluno (todas adotadas no sentido horário ↻):');
    directions.meshes.forEach(mesh => {
      const labels = mesh.componentIds.map(id => components.find(component => component.id === id)?.params.label || id);
      lines.push(`- M${mesh.id} ↻: ${labels.join(' → ')}`);
    });
  }

  return lines.join('\n');
}
