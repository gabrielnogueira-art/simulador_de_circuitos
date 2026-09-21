import { CircuitComponent, Wire } from '../schematic/types';
import { createComponent } from '../schematic/componentDefs';

export interface PresetCircuit {
  id: string;
  name: string;
  category: string;
  description: string;
  components: CircuitComponent[];
  wires: Wire[];
  timeStep: number;
  runDuration: number;
}

/**
 * Criação dos 4 circuitos pré-configurados clássicos de eletrônica e PLECS
 */

// 1. Conversor Buck DC-DC com Diodo de Roda Livre, Filtro LC e Carga
function createBuckPreset(): PresetCircuit {
  const compPwm = createComponent('PULSE_VOLTAGE', 100, 200, 0);
  compPwm.params.label = 'PWM_Gen';
  compPwm.params.vHigh = 24;
  compPwm.params.vLow = 0;
  compPwm.params.frequency = 5000; // 5 kHz
  compPwm.params.dutyCycle = 0.5;

  const compDiode = createComponent('DIODE', 220, 200, 90); // Anodo em baixo (GND), Catodo em cima
  compDiode.params.label = 'D_Freewheel';

  const compL = createComponent('INDUCTOR', 340, 140, 0);
  compL.params.label = 'L1';
  compL.params.inductance = 2e-3; // 2 mH

  const compAmmeter = createComponent('AMMETER', 440, 140, 0);
  compAmmeter.params.label = 'I_Inductor';

  const compC = createComponent('CAPACITOR', 540, 220, 90);
  compC.params.label = 'C_Filter';
  compC.params.capacitance = 100e-6; // 100 uF

  const compR = createComponent('RESISTOR', 640, 220, 90);
  compR.params.label = 'R_Load';
  compR.params.resistance = 10; // 10 Ohms

  const compVout = createComponent('VOLTMETER', 740, 220, 0);
  compVout.params.label = 'V_Out';

  const compGnd = createComponent('GROUND', 220, 320, 0);

  const wires: Wire[] = [
    // PWM pos para topo do Diodo e entrada do Indutor
    { id: 'w1', fromCompId: compPwm.id, fromTerminalId: 'pos', toCompId: compDiode.id, toTerminalId: 'cathode' },
    { id: 'w2', fromCompId: compDiode.id, fromTerminalId: 'cathode', toCompId: compL.id, toTerminalId: 't1' },
    // Indutor para Amperímetro
    { id: 'w3', fromCompId: compL.id, fromTerminalId: 't2', toCompId: compAmmeter.id, toTerminalId: 'in' },
    // Saída do Amperímetro para Capacitor (+), Resistor e Voltímetro (+)
    { id: 'w4', fromCompId: compAmmeter.id, fromTerminalId: 'out', toCompId: compC.id, toTerminalId: 't1' },
    { id: 'w5', fromCompId: compC.id, fromTerminalId: 't1', toCompId: compR.id, toTerminalId: 't1' },
    { id: 'w6', fromCompId: compR.id, fromTerminalId: 't1', toCompId: compVout.id, toTerminalId: 'pos' },
    // Barramento de Terra (GND)
    { id: 'w7', fromCompId: compPwm.id, fromTerminalId: 'neg', toCompId: compDiode.id, toTerminalId: 'anode' },
    { id: 'w8', fromCompId: compDiode.id, fromTerminalId: 'anode', toCompId: compGnd.id, toTerminalId: 'gnd' },
    { id: 'w9', fromCompId: compDiode.id, fromTerminalId: 'anode', toCompId: compC.id, toTerminalId: 't2' },
    { id: 'w10', fromCompId: compC.id, fromTerminalId: 't2', toCompId: compR.id, toTerminalId: 't2' },
    { id: 'w11', fromCompId: compR.id, fromTerminalId: 't2', toCompId: compVout.id, toTerminalId: 'neg' }
  ];

  return {
    id: 'buck-converter',
    name: 'Conversor Buck DC-DC (5 kHz)',
    category: 'Eletrônica de Potência',
    description: 'Conversor abaixador chaveado com controle PWM (24V -> 12V), diodo de roda livre, indutor de 2mH e capacitor de filtro 100uF.',
    components: [compPwm, compDiode, compL, compAmmeter, compC, compR, compVout, compGnd],
    wires,
    timeStep: 5e-6,
    runDuration: 0.02
  };
}

// 2. Ponte Retificadora de Diodos de Onda Completa com Filtro Capacitivo
function createBridgeRectifierPreset(): PresetCircuit {
  const compVac = createComponent('AC_VOLTAGE', 100, 220, 0);
  compVac.params.label = 'AC_Grid';
  compVac.params.amplitude = 127;
  compVac.params.frequency = 60;

  const compVin = createComponent('VOLTMETER', 180, 220, 0);
  compVin.params.label = 'V_AC_In';

  // 4 Diodos em ponte
  const compD1 = createComponent('DIODE', 300, 140, 0);
  compD1.params.label = 'D1';
  const compD2 = createComponent('DIODE', 300, 260, 0);
  compD2.params.label = 'D2';
  const compD3 = createComponent('DIODE', 420, 140, 0);
  compD3.params.label = 'D3';
  const compD4 = createComponent('DIODE', 420, 260, 0);
  compD4.params.label = 'D4';

  const compC = createComponent('CAPACITOR', 540, 200, 90);
  compC.params.label = 'C_Filter';
  compC.params.capacitance = 220e-6; // 220 uF

  const compR = createComponent('RESISTOR', 640, 200, 90);
  compR.params.label = 'R_Load';
  compR.params.resistance = 100;

  const compVout = createComponent('VOLTMETER', 740, 200, 0);
  compVout.params.label = 'V_DC_Out';

  const compGnd = createComponent('GROUND', 540, 320, 0);

  const wires: Wire[] = [
    // AC Pos para D1 anodo e D2 catodo
    { id: 'w1', fromCompId: compVac.id, fromTerminalId: 'pos', toCompId: compVin.id, toTerminalId: 'pos' },
    { id: 'w2', fromCompId: compVin.id, fromTerminalId: 'pos', toCompId: compD1.id, toTerminalId: 'anode' },
    { id: 'w3', fromCompId: compD1.id, fromTerminalId: 'anode', toCompId: compD2.id, toTerminalId: 'cathode' },

    // AC Neg para D3 anodo e D4 catodo
    { id: 'w4', fromCompId: compVac.id, fromTerminalId: 'neg', toCompId: compVin.id, toTerminalId: 'neg' },
    { id: 'w5', fromCompId: compVin.id, fromTerminalId: 'neg', toCompId: compD3.id, toTerminalId: 'anode' },
    { id: 'w6', fromCompId: compD3.id, fromTerminalId: 'anode', toCompId: compD4.id, toTerminalId: 'cathode' },

    // Barramento Positivo Retificado (D1 catodo + D3 catodo -> C (+) -> R (+) -> Vout (+))
    { id: 'w7', fromCompId: compD1.id, fromTerminalId: 'cathode', toCompId: compD3.id, toTerminalId: 'cathode' },
    { id: 'w8', fromCompId: compD3.id, fromTerminalId: 'cathode', toCompId: compC.id, toTerminalId: 't1' },
    { id: 'w9', fromCompId: compC.id, fromTerminalId: 't1', toCompId: compR.id, toTerminalId: 't1' },
    { id: 'w10', fromCompId: compR.id, fromTerminalId: 't1', toCompId: compVout.id, toTerminalId: 'pos' },

    // Barramento Negativo Retificado (D2 anodo + D4 anodo -> C (-) -> R (-) -> Vout (-))
    { id: 'w11', fromCompId: compD2.id, fromTerminalId: 'anode', toCompId: compD4.id, toTerminalId: 'anode' },
    { id: 'w12', fromCompId: compD4.id, fromTerminalId: 'anode', toCompId: compC.id, toTerminalId: 't2' },
    { id: 'w13', fromCompId: compC.id, fromTerminalId: 't2', toCompId: compR.id, toTerminalId: 't2' },
    { id: 'w14', fromCompId: compR.id, fromTerminalId: 't2', toCompId: compVout.id, toTerminalId: 'neg' },
    { id: 'w15', fromCompId: compC.id, fromTerminalId: 't2', toCompId: compGnd.id, toTerminalId: 'gnd' }
  ];

  return {
    id: 'bridge-rectifier',
    name: 'Retificador em Ponte Graetz (60 Hz)',
    category: 'Eletrônica de Potência',
    description: 'Retificação completa de sinal alternado 127V 60Hz para corrente contínua com filtragem capacitiva e medição de ripple.',
    components: [compVac, compVin, compD1, compD2, compD3, compD4, compC, compR, compVout, compGnd],
    wires,
    timeStep: 2e-5,
    runDuration: 0.05
  };
}

// 3. Circuito Ressonante RLC Subamortecido
function createRlcPreset(): PresetCircuit {
  const compVdc = createComponent('DC_VOLTAGE', 100, 220, 0);
  compVdc.params.label = 'V_Source';
  compVdc.params.voltage = 10;

  const compSw = createComponent('SWITCH', 220, 140, 0);
  compSw.params.label = 'SW1';
  compSw.params.closed = true;

  const compR = createComponent('RESISTOR', 340, 140, 0);
  compR.params.label = 'R_Damp';
  compR.params.resistance = 2; // Baixa resistência para subamortecimento

  const compL = createComponent('INDUCTOR', 460, 140, 0);
  compL.params.label = 'L1';
  compL.params.inductance = 10e-3; // 10 mH

  const compC = createComponent('CAPACITOR', 580, 220, 90);
  compC.params.label = 'C1';
  compC.params.capacitance = 20e-6; // 20 uF

  const compVc = createComponent('VOLTMETER', 680, 220, 0);
  compVc.params.label = 'V_Capacitor';

  const compGnd = createComponent('GROUND', 340, 300, 0);

  const wires: Wire[] = [
    { id: 'w1', fromCompId: compVdc.id, fromTerminalId: 'pos', toCompId: compSw.id, toTerminalId: 't1' },
    { id: 'w2', fromCompId: compSw.id, fromTerminalId: 't2', toCompId: compR.id, toTerminalId: 't1' },
    { id: 'w3', fromCompId: compR.id, fromTerminalId: 't2', toCompId: compL.id, toTerminalId: 't1' },
    { id: 'w4', fromCompId: compL.id, fromTerminalId: 't2', toCompId: compC.id, toTerminalId: 't1' },
    { id: 'w5', fromCompId: compC.id, fromTerminalId: 't1', toCompId: compVc.id, toTerminalId: 'pos' },
    // Retorno GND
    { id: 'w6', fromCompId: compVdc.id, fromTerminalId: 'neg', toCompId: compGnd.id, toTerminalId: 'gnd' },
    { id: 'w7', fromCompId: compGnd.id, fromTerminalId: 'gnd', toCompId: compC.id, toTerminalId: 't2' },
    { id: 'w8', fromCompId: compC.id, fromTerminalId: 't2', toCompId: compVc.id, toTerminalId: 'neg' }
  ];

  return {
    id: 'rlc-resonance',
    name: 'Circuito Ressonante RLC',
    category: 'Circuitos Lineares',
    description: 'Resposta transitória clássica de segunda ordem com oscilação subamortecida e overshoot característico.',
    components: [compVdc, compSw, compR, compL, compC, compVc, compGnd],
    wires,
    timeStep: 5e-6,
    runDuration: 0.02
  };
}

// 4. Filtro Passa-Baixas RC
function createRcFilterPreset(): PresetCircuit {
  const compVac = createComponent('AC_VOLTAGE', 100, 220, 0);
  compVac.params.label = 'V_In';
  compVac.params.amplitude = 5;
  compVac.params.frequency = 100;

  const compVin = createComponent('VOLTMETER', 180, 220, 0);
  compVin.params.label = 'Probe_In';

  const compR = createComponent('RESISTOR', 300, 140, 0);
  compR.params.label = 'R1';
  compR.params.resistance = 1000; // 1k

  const compC = createComponent('CAPACITOR', 440, 220, 90);
  compC.params.label = 'C1';
  compC.params.capacitance = 1e-6; // 1 uF (fc ≈ 159 Hz)

  const compVout = createComponent('VOLTMETER', 560, 220, 0);
  compVout.params.label = 'Probe_Out';

  const compGnd = createComponent('GROUND', 300, 300, 0);

  const wires: Wire[] = [
    { id: 'w1', fromCompId: compVac.id, fromTerminalId: 'pos', toCompId: compVin.id, toTerminalId: 'pos' },
    { id: 'w2', fromCompId: compVin.id, fromTerminalId: 'pos', toCompId: compR.id, toTerminalId: 't1' },
    { id: 'w3', fromCompId: compR.id, fromTerminalId: 't2', toCompId: compC.id, toTerminalId: 't1' },
    { id: 'w4', fromCompId: compC.id, fromTerminalId: 't1', toCompId: compVout.id, toTerminalId: 'pos' },
    // Retorno GND
    { id: 'w5', fromCompId: compVac.id, fromTerminalId: 'neg', toCompId: compVin.id, toTerminalId: 'neg' },
    { id: 'w6', fromCompId: compVin.id, fromTerminalId: 'neg', toCompId: compGnd.id, toTerminalId: 'gnd' },
    { id: 'w7', fromCompId: compGnd.id, fromTerminalId: 'gnd', toCompId: compC.id, toTerminalId: 't2' },
    { id: 'w8', fromCompId: compC.id, fromTerminalId: 't2', toCompId: compVout.id, toTerminalId: 'neg' }
  ];

  return {
    id: 'rc-filter',
    name: 'Filtro Passa-Baixas RC',
    category: 'Sinais & Filtros',
    description: 'Filtro passivo de primeira ordem atenuando componentes de alta frequência e introduzindo defasagem temporal.',
    components: [compVac, compVin, compR, compC, compVout, compGnd],
    wires,
    timeStep: 1e-5,
    runDuration: 0.04
  };
}

// 5. Circuito do Exercício: Cálculo da Impedância Zab (R-L-C em Regime Permanente)
function createImpedanceExamPreset(): PresetCircuit {
  const portA = createComponent('PORT_TERMINAL', 100, 160, 0);
  portA.params.label = 'a';
  portA.params.portName = 'a';

  const r8 = createComponent('RESISTOR', 220, 160, 0);
  r8.params.label = '8Ω';
  r8.params.resistance = 8;

  const c12 = createComponent('CAPACITOR', 340, 160, 0);
  c12.params.label = '-j12Ω';
  c12.params.reactance = -12;

  // Ramo Vertical Central
  const r20 = createComponent('RESISTOR', 460, 220, 90);
  r20.params.label = '20Ω';
  r20.params.resistance = 20;

  const l15 = createComponent('INDUCTOR', 460, 320, 90);
  l15.params.label = 'j15Ω';
  l15.params.reactance = 15;

  // Ponte Horizontal Central
  const r10mid = createComponent('RESISTOR', 580, 270, 0);
  r10mid.params.label = '10Ω';
  r10mid.params.resistance = 10;

  // Ramo Superior Direito
  const c16top = createComponent('CAPACITOR', 580, 160, 0);
  c16top.params.label = '-j16Ω';
  c16top.params.reactance = -16;

  const r10rtop = createComponent('RESISTOR', 700, 215, 90);
  r10rtop.params.label = '10Ω';
  r10rtop.params.resistance = 10;

  // Ramo Inferior Direito
  const r10rbot = createComponent('RESISTOR', 700, 325, 90);
  r10rbot.params.label = '10Ω';
  r10rbot.params.resistance = 10;

  const c16bot = createComponent('CAPACITOR', 580, 380, 0);
  c16bot.params.label = '-j16Ω';
  c16bot.params.reactance = -16;

  // Terminal b e Terra
  const portB = createComponent('PORT_TERMINAL', 100, 380, 0);
  portB.params.label = 'b';
  portB.params.portName = 'b';

  const gnd = createComponent('GROUND', 220, 420, 0);

  const wires: Wire[] = [
    // Terminal a -> Resistor 8 ohms -> Capacitor -j12 ohms
    { id: 'w_a', fromCompId: portA.id, fromTerminalId: 'pin', toCompId: r8.id, toTerminalId: 't1' },
    { id: 'w1', fromCompId: r8.id, fromTerminalId: 't2', toCompId: c12.id, toTerminalId: 't1' },
    // Capacitor -j12 -> Nó 1 (topo de 20 ohms e -j16 superior)
    { id: 'w2', fromCompId: c12.id, fromTerminalId: 't2', toCompId: r20.id, toTerminalId: 't1' },
    { id: 'w3', fromCompId: r20.id, fromTerminalId: 't1', toCompId: c16top.id, toTerminalId: 't1' },

    // Nó 2 (entre 20 ohms, j15 indutor e 10 ohms central)
    { id: 'w4', fromCompId: r20.id, fromTerminalId: 't2', toCompId: l15.id, toTerminalId: 't1' },
    { id: 'w5', fromCompId: l15.id, fromTerminalId: 't1', toCompId: r10mid.id, toTerminalId: 't1' },

    // -j16 superior -> Resistor direito superior 10 ohms
    { id: 'w6', fromCompId: c16top.id, fromTerminalId: 't2', toCompId: r10rtop.id, toTerminalId: 't1' },

    // Nó direito (10 ohms direito superior, 10 ohms central, 10 ohms direito inferior)
    { id: 'w7', fromCompId: r10rtop.id, fromTerminalId: 't2', toCompId: r10mid.id, toTerminalId: 't2' },
    { id: 'w8', fromCompId: r10mid.id, fromTerminalId: 't2', toCompId: r10rbot.id, toTerminalId: 't1' },

    // Resistor direito inferior -> -j16 inferior
    { id: 'w9', fromCompId: r10rbot.id, fromTerminalId: 't2', toCompId: c16bot.id, toTerminalId: 't2' },

    // Barramento inferior / Nó b: -j16 inferior -> Indutor j15 -> Terminal b -> Terra
    { id: 'w10', fromCompId: c16bot.id, fromTerminalId: 't1', toCompId: l15.id, toTerminalId: 't2' },
    { id: 'w11', fromCompId: l15.id, fromTerminalId: 't2', toCompId: portB.id, toTerminalId: 'pin' },
    { id: 'w12', fromCompId: portB.id, fromTerminalId: 'pin', toCompId: gnd.id, toTerminalId: 'gnd' }
  ];

  return {
    id: 'impedance-exam',
    name: 'Cálculo de Impedância Zab (Exemplo)',
    category: 'Análise Fasorial AC',
    description: 'Rede em ponte R-L-C para cálculo da impedância de entrada. Resposta exata: Zab = 34,68836 - j6,9301 Ω.',
    components: [portA, r8, c12, r20, l15, r10mid, c16top, r10rtop, r10rbot, c16bot, portB, gnd],
    wires,
    timeStep: 1e-5,
    runDuration: 0.02
  };
}

// 6. Exercício 1.10 — Análise Nodal / Malhas e Fasores (Livro)
function createExercise1_10Preset(): PresetCircuit {
  const vg = createComponent('AC_VOLTAGE', 100, 260, 0);
  vg.params.label = 'Vg';
  vg.params.amplitude = 8.3726;
  vg.params.phase = 29.32;
  vg.params.frequency = 159.15;
  vg.params.waveformFunction = '8.3726 ∠ 29.32° V';

  const rc = createComponent('RESISTOR', 220, 160, 0);
  rc.params.label = 'Rc_25';
  rc.params.resistance = 25;

  const dotTop = createComponent('JUNCTION_DOT', 320, 160, 0);
  dotTop.params.label = 'Nó1';

  // Ramo a: 120 Ω + j40 Ω
  const ra = createComponent('RESISTOR', 320, 240, 90);
  ra.params.label = 'Ra_120';
  ra.params.resistance = 120;

  const la = createComponent('INDUCTOR', 320, 320, 90);
  la.params.label = 'La_j40';
  la.params.reactance = 40;
  la.params.inductance = 40 / (2 * Math.PI * 159.15);

  // Ramo b: 160 Ω - j80 Ω
  const rb = createComponent('RESISTOR', 440, 240, 90);
  rb.params.label = 'Rb_160';
  rb.params.resistance = 160;

  const cb = createComponent('CAPACITOR', 440, 320, 90);
  cb.params.label = 'Cb_-j80';
  cb.params.reactance = -80;
  cb.params.capacitance = 1 / (2 * Math.PI * 159.15 * 80);

  // Fonte de corrente Is = 40+j80 mA
  const is = createComponent('AC_CURRENT', 560, 280, 270);
  is.params.label = 'Is_40+j80mA';
  is.params.amplitude = 0.08944;
  is.params.phase = 63.435;
  is.params.frequency = 159.15;
  is.params.waveformFunction = '40+j80 mA';
  is.params.complexValue = { r: 0.04, i: 0.08 };

  const dotBot = createComponent('JUNCTION_DOT', 320, 400, 0);
  dotBot.params.label = 'Ref';

  const gnd = createComponent('GROUND', 320, 440, 0);

  const wires: Wire[] = [
    // Vg(+) -> Rc
    { id: 'w1', fromCompId: vg.id, fromTerminalId: 'pos', toCompId: rc.id, toTerminalId: 't1' },
    // Rc -> Nó superior
    { id: 'w2', fromCompId: rc.id, fromTerminalId: 't2', toCompId: dotTop.id, toTerminalId: 'pin' },
    // Nó superior -> Ramo a (Ra)
    { id: 'w3', fromCompId: dotTop.id, fromTerminalId: 'pin', toCompId: ra.id, toTerminalId: 't1' },
    { id: 'w4', fromCompId: ra.id, fromTerminalId: 't2', toCompId: la.id, toTerminalId: 't1' },
    // Nó superior -> Ramo b (Rb)
    { id: 'w5', fromCompId: dotTop.id, fromTerminalId: 'pin', toCompId: rb.id, toTerminalId: 't1' },
    { id: 'w6', fromCompId: rb.id, fromTerminalId: 't2', toCompId: cb.id, toTerminalId: 't1' },
    // Nó superior -> Fonte de corrente Is
    { id: 'w7', fromCompId: dotTop.id, fromTerminalId: 'pin', toCompId: is.id, toTerminalId: 'in' },
    // Retornos ao barramento inferior (dotBot)
    { id: 'w8', fromCompId: la.id, fromTerminalId: 't2', toCompId: dotBot.id, toTerminalId: 'pin' },
    { id: 'w9', fromCompId: cb.id, fromTerminalId: 't2', toCompId: dotBot.id, toTerminalId: 'pin' },
    { id: 'w10', fromCompId: is.id, fromTerminalId: 'out', toCompId: dotBot.id, toTerminalId: 'pin' },
    { id: 'w11', fromCompId: dotBot.id, fromTerminalId: 'pin', toCompId: gnd.id, toTerminalId: 'gnd' },
    { id: 'w12', fromCompId: dotBot.id, fromTerminalId: 'pin', toCompId: vg.id, toTerminalId: 'neg' }
  ];

  return {
    id: 'exercicio-1-10',
    name: 'Exercício 1.10 — Análise Nodal/Malhas & Fasores',
    category: 'Circuitos CA (Livro)',
    description: 'Circuito fasorial com Za = 120+j40 Ω (Ia = 40∠0° mA), Zb = 160-j80 Ω, Rc = 25 Ω e fonte Is = 40+j80 mA. Resolução exata: Ib = 28.28∠45° mA, Ic = 141.42∠45° mA, Vg = 8.37∠29.32° V.',
    components: [vg, rc, dotTop, ra, la, rb, cb, is, dotBot, gnd],
    wires,
    timeStep: 1e-4,
    runDuration: 0.05
  };
}

// 7. Exercício 1.11 — Análise Nodal Fasorial e Regime Permanente (Livro)
function createExercise1_11Preset(): PresetCircuit {
  const ig = createComponent('AC_CURRENT', 120, 260, 270); // Corrente apontando para cima (entra no nó)
  ig.params.label = 'ig';
  ig.params.amplitude = 0.06; // 60 mA
  ig.params.frequency = 1591.55; // 10.000 rad/s / (2*pi)
  ig.params.omega = 10000;
  ig.params.waveformFunction = '60cos(10.000t) mA';

  const dotTop = createComponent('JUNCTION_DOT', 260, 160, 0);
  dotTop.params.label = 'Nó_topo';

  // Ramo 1: R1 = 50 Ω, L1 = 10 mH (XL = 100 Ω)
  const r1 = createComponent('RESISTOR', 260, 240, 90);
  r1.params.label = 'R1_50';
  r1.params.resistance = 50;

  const l1 = createComponent('INDUCTOR', 260, 320, 90);
  l1.params.label = 'L1_10mH';
  l1.params.inductance = 10e-3;
  l1.params.reactance = 100;

  // Ramo 2: R2 = 100 Ω, C2 = 2 µF (XC = 50 Ω)
  const r2 = createComponent('RESISTOR', 400, 240, 90);
  r2.params.label = 'R2_100';
  r2.params.resistance = 100;

  const c2 = createComponent('CAPACITOR', 400, 320, 90);
  c2.params.label = 'C2_2uF';
  c2.params.capacitance = 2e-6;
  c2.params.reactance = -50;

  // Voltímetro para medir vo sobre R1
  const vo = createComponent('VOLTMETER', 190, 240, 90);
  vo.params.label = 'vo(t)';

  const dotBot = createComponent('JUNCTION_DOT', 260, 400, 0);
  dotBot.params.label = 'GND_Bus';

  const gnd = createComponent('GROUND', 260, 440, 0);

  const wires: Wire[] = [
    // Fonte ig(in) para o nó superior
    { id: 'w1', fromCompId: ig.id, fromTerminalId: 'in', toCompId: dotTop.id, toTerminalId: 'pin' },
    // Nó superior para ramo 1 (R1) e ramo 2 (R2)
    { id: 'w2', fromCompId: dotTop.id, fromTerminalId: 'pin', toCompId: r1.id, toTerminalId: 't1' },
    { id: 'w3', fromCompId: dotTop.id, fromTerminalId: 'pin', toCompId: r2.id, toTerminalId: 't1' },
    // R1 para L1
    { id: 'w4', fromCompId: r1.id, fromTerminalId: 't2', toCompId: l1.id, toTerminalId: 't1' },
    // R2 para C2
    { id: 'w5', fromCompId: r2.id, fromTerminalId: 't2', toCompId: c2.id, toTerminalId: 't1' },
    // Voltímetro vo conectado sobre R1 (t1 e t2)
    { id: 'w6', fromCompId: vo.id, fromTerminalId: 'pos', toCompId: r1.id, toTerminalId: 't1' },
    { id: 'w7', fromCompId: vo.id, fromTerminalId: 'neg', toCompId: r1.id, toTerminalId: 't2' },
    // Retorno ao barramento inferior (dotBot)
    { id: 'w8', fromCompId: l1.id, fromTerminalId: 't2', toCompId: dotBot.id, toTerminalId: 'pin' },
    { id: 'w9', fromCompId: c2.id, fromTerminalId: 't2', toCompId: dotBot.id, toTerminalId: 'pin' },
    { id: 'w10', fromCompId: ig.id, fromTerminalId: 'out', toCompId: dotBot.id, toTerminalId: 'pin' },
    { id: 'w11', fromCompId: dotBot.id, fromTerminalId: 'pin', toCompId: gnd.id, toTerminalId: 'gnd' }
  ];

  return {
    id: 'exercicio-1-11',
    name: 'Exercício 1.11 — Análise Nodal & Regime Permanente',
    category: 'Circuitos CA (Livro)',
    description: 'Fonte ig(t) = 60cos(10.000t) mA com dois ramos em paralelo (50Ω + 10mH e 100Ω + 2µF). Resposta exata: vo(t) = 2.12132cos(10.000t - 45°) V com defasagem de 78.54 µs.',
    components: [ig, dotTop, r1, l1, r2, c2, vo, dotBot, gnd],
    wires,
    timeStep: 1e-5,
    runDuration: 0.01
  };
}

export const PRESET_CIRCUITS: PresetCircuit[] = [
  createExercise1_10Preset(),
  createExercise1_11Preset(),
  createImpedanceExamPreset(),
  createBuckPreset(),
  createBridgeRectifierPreset(),
  createRlcPreset(),
  createRcFilterPreset()
];
