import { PresetCircuit } from './index';
import { CircuitComponent, Wire } from '../schematic/types';
import { createComponent } from '../schematic/componentDefs';

/**
 * Cria preset oficial: Linha de Transmissão 500 kV de 300 km com Efeito Ferranti e Compensação Shunt
 * Baseado diretamente nas Apostilas 5 e 6 de GTDC do Prof. Marcelo (IFFluminense).
 */
export function createFerrantiPreset(): PresetCircuit {
  const g1 = createComponent('SYNCHRONOUS_GENERATOR', 120, 200, 0);
  g1.params = {
    label: 'Usina G1',
    mvaRating: 500,
    nominalKv: 500,
    amplitude: 408248, // (500 kV / sqrt(3)) * sqrt(2)
    frequency: 60,
    phase: 0
  };

  const gnd1 = createComponent('GROUND', 120, 320, 0);

  const bus1 = createComponent('POWER_BUS', 260, 200, 0);
  bus1.params = {
    label: 'Barra 1 (Envio)',
    busType: 'SLACK',
    nominalKv: 500,
    puVoltage: 1.0
  };

  const lt = createComponent('TRANSMISSION_LINE', 450, 200, 0);
  lt.params = {
    label: 'LT 500kV (300km)',
    lengthKm: 300,
    nominalKv: 500,
    rPerKm: 0.03,
    xPerKm: 0.32,
    bPerKm: 3.5,
    resistance: 9,
    inductance: 0.2546,
    capacitance: 2.78e-6
  };

  const bus2 = createComponent('POWER_BUS', 640, 200, 0);
  bus2.params = {
    label: 'Barra 2 (Recepção)',
    busType: 'PQ',
    nominalKv: 500,
    puVoltage: 1.05
  };

  const vMeter = createComponent('VOLTMETER', 640, 90, 0);
  vMeter.params = { label: 'V_Receptor (VR)' };

  const gndVm = createComponent('GROUND', 640, 30, 0);

  const sw = createComponent('SWITCH', 760, 160, 90);
  sw.params = { label: 'Chave Reator', closed: false };

  const reactor = createComponent('SHUNT_REACTOR', 760, 250, 0);
  reactor.params = {
    label: 'Reator Shunt 100MVAr',
    nominalKv: 500,
    reactivePowerMvar: 100,
    inductance: 6.63
  };

  const gnd2 = createComponent('GROUND', 760, 330, 0);

  const components: CircuitComponent[] = [g1, gnd1, bus1, lt, bus2, vMeter, gndVm, sw, reactor, gnd2];

  const wires: Wire[] = [
    { id: 'w_g_pos', fromCompId: g1.id, fromTerminalId: 'pos', toCompId: bus1.id, toTerminalId: 't1' },
    { id: 'w_g_neg', fromCompId: g1.id, fromTerminalId: 'neg', toCompId: gnd1.id, toTerminalId: 'gnd' },
    { id: 'w_bus1_lt', fromCompId: bus1.id, fromTerminalId: 't3', toCompId: lt.id, toTerminalId: 't1' },
    { id: 'w_lt_bus2', fromCompId: lt.id, fromTerminalId: 't2', toCompId: bus2.id, toTerminalId: 't1' },
    { id: 'w_bus2_vm_pos', fromCompId: bus2.id, fromTerminalId: 't2', toCompId: vMeter.id, toTerminalId: 'neg' },
    { id: 'w_vm_gnd', fromCompId: vMeter.id, fromTerminalId: 'pos', toCompId: gndVm.id, toTerminalId: 'gnd' },
    { id: 'w_bus2_sw', fromCompId: bus2.id, fromTerminalId: 't3', toCompId: sw.id, toTerminalId: 't1' },
    { id: 'w_sw_reac', fromCompId: sw.id, fromTerminalId: 't2', toCompId: reactor.id, toTerminalId: 'pos' },
    { id: 'w_reac_gnd', fromCompId: reactor.id, fromTerminalId: 'neg', toCompId: gnd2.id, toTerminalId: 'gnd' }
  ];

  return {
    id: 'gtdc_ferranti_shunt',
    name: 'LT 500kV: Efeito Ferranti & Reator Shunt',
    category: 'GTDC / SEP',
    description: 'Linha de 500 kV e 300 km com sobretensão em vazio (Efeito Ferranti). Feche a chave do Reator Shunt para compensar a sobretensão e trazer VR de volta ao valor nominal.',
    components,
    wires,
    timeStep: 2e-5,
    runDuration: 0.05
  };
}

/**
 * Cria preset oficial: Compensação Série em Linha de Transmissão (FC = 50%)
 * Baseado na Apostila 6 de GTDC.
 */
export function createSeriesCompPreset(): PresetCircuit {
  const g1 = createComponent('SYNCHRONOUS_GENERATOR', 120, 200, 0);
  g1.params = { label: 'Usina G1', nominalKv: 500, amplitude: 408248, frequency: 60 };
  const gnd1 = createComponent('GROUND', 120, 310, 0);

  const cSerie = createComponent('SERIES_CAPACITOR', 300, 160, 0);
  cSerie.params = { label: 'C_Série 50%', compensationFactor: 50, capacitance: 55.2e-6 };

  const swBypass = createComponent('SWITCH', 300, 80, 0);
  swBypass.params = { label: 'Bypass C', closed: true };

  const lt = createComponent('TRANSMISSION_LINE', 480, 160, 0);
  lt.params = { label: 'LT 500kV', lengthKm: 300, nominalKv: 500, resistance: 9, inductance: 0.2546, capacitance: 2.78e-6 };

  const load = createComponent('POWER_LOAD', 660, 200, 0);
  load.params = { label: 'Carga 200MW', nominalKv: 500, activePowerMw: 200, reactivePowerMvar: 50, resistance: 1250 };
  const gnd2 = createComponent('GROUND', 660, 310, 0);

  const vMeter = createComponent('VOLTMETER', 660, 80, 0);
  vMeter.params = { label: 'V_Carga' };

  const components = [g1, gnd1, cSerie, swBypass, lt, load, gnd2, vMeter];
  const wires: Wire[] = [
    { id: 'w1', fromCompId: g1.id, fromTerminalId: 'pos', toCompId: cSerie.id, toTerminalId: 't1' },
    { id: 'w2', fromCompId: g1.id, fromTerminalId: 'neg', toCompId: gnd1.id, toTerminalId: 'gnd' },
    { id: 'w3', fromCompId: g1.id, fromTerminalId: 'pos', toCompId: swBypass.id, toTerminalId: 't1' },
    { id: 'w4', fromCompId: cSerie.id, toTerminalId: 't2', fromTerminalId: 't2', toCompId: lt.id },
    { id: 'w5', fromCompId: swBypass.id, fromTerminalId: 't2', toCompId: lt.id, toTerminalId: 't1' },
    { id: 'w6', fromCompId: lt.id, fromTerminalId: 't2', toCompId: load.id, toTerminalId: 'pos' },
    { id: 'w7', fromCompId: load.id, fromTerminalId: 'neg', toCompId: gnd2.id, toTerminalId: 'gnd' },
    { id: 'w8', fromCompId: load.id, fromTerminalId: 'pos', toCompId: vMeter.id, toTerminalId: 'pos' },
    { id: 'w9', fromCompId: load.id, fromTerminalId: 'neg', toCompId: vMeter.id, toTerminalId: 'neg' }
  ];

  return {
    id: 'gtdc_series_comp',
    name: 'Compensação Série (FC = 50%) em LT',
    category: 'GTDC / SEP',
    description: 'Linha de 500 kV com banco de capacitores em série. Abra a chave de bypass para ativar a compensação e elevar a capacidade máxima de transmissão.',
    components,
    wires,
    timeStep: 2e-5,
    runDuration: 0.05
  };
}

/**
 * Cria preset oficial: Sistema de 3 Barras em PU com Matriz Ybarra
 * Baseado na Apostila 4 de GTDC.
 */
export function createThreeBusPreset(): PresetCircuit {
  const b1 = createComponent('POWER_BUS', 160, 160, 0);
  b1.params = { label: 'Barra 1 (Slack)', busType: 'SLACK', nominalKv: 230, puVoltage: 1.0 };

  const g1 = createComponent('SYNCHRONOUS_GENERATOR', 160, 280, 0);
  g1.params = { label: 'G1 100MVA', nominalKv: 230, amplitude: 187793, frequency: 60 };
  const gnd1 = createComponent('GROUND', 160, 360, 0);

  const b2 = createComponent('POWER_BUS', 420, 160, 0);
  b2.params = { label: 'Barra 2 (Carga)', busType: 'PQ', nominalKv: 230, puVoltage: 0.98 };

  const b3 = createComponent('POWER_BUS', 680, 160, 0);
  b3.params = { label: 'Barra 3 (PV)', busType: 'PV', nominalKv: 230, puVoltage: 1.02 };

  const lt12 = createComponent('TRANSMISSION_LINE', 290, 120, 0);
  lt12.params = { label: 'LT 1-2 (z=0.02+j0.10 pu)', lengthKm: 100, nominalKv: 230, resistance: 10.5, inductance: 0.14 };

  const lt23 = createComponent('TRANSMISSION_LINE', 550, 120, 0);
  lt23.params = { label: 'LT 2-3 (z=0.01+j0.08 pu)', lengthKm: 80, nominalKv: 230, resistance: 8.4, inductance: 0.11 };

  const load2 = createComponent('POWER_LOAD', 420, 270, 0);
  load2.params = { label: 'Carga 80MW + j40MVAr', nominalKv: 230, activePowerMw: 80, reactivePowerMvar: 40, resistance: 661 };
  const gnd2 = createComponent('GROUND', 420, 350, 0);

  const components = [b1, g1, gnd1, b2, b3, lt12, lt23, load2, gnd2];
  const wires: Wire[] = [
    { id: 'w1', fromCompId: g1.id, fromTerminalId: 'pos', toCompId: b1.id, toTerminalId: 'b2' },
    { id: 'w2', fromCompId: g1.id, fromTerminalId: 'neg', toCompId: gnd1.id, toTerminalId: 'gnd' },
    { id: 'w3', fromCompId: b1.id, fromTerminalId: 't3', toCompId: lt12.id, toTerminalId: 't1' },
    { id: 'w4', fromCompId: lt12.id, fromTerminalId: 't2', toCompId: b2.id, toTerminalId: 't1' },
    { id: 'w5', fromCompId: b2.id, fromTerminalId: 't3', toCompId: lt23.id, toTerminalId: 't1' },
    { id: 'w6', fromCompId: lt23.id, fromTerminalId: 't2', toCompId: b3.id, toTerminalId: 't1' },
    { id: 'w7', fromCompId: b2.id, fromTerminalId: 'b2', toCompId: load2.id, toTerminalId: 'pos' },
    { id: 'w8', fromCompId: load2.id, fromTerminalId: 'neg', toCompId: gnd2.id, toTerminalId: 'gnd' }
  ];

  return {
    id: 'gtdc_three_bus',
    name: 'Rede 3 Barras em PU & Matriz Ybarra',
    category: 'GTDC / SEP',
    description: 'Sistema Elétrico de 3 Barras com gerador, linhas de transmissão interligadas e carga. Ideal para inspecionar e calcular a Matriz de Admitâncias Ybarra e fluxo de potência.',
    components,
    wires,
    timeStep: 2e-5,
    runDuration: 0.05
  };
}

export const PRESET_CIRCUITS_GTDC: PresetCircuit[] = [
  createFerrantiPreset(),
  createSeriesCompPreset(),
  createThreeBusPreset()
];
