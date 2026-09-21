/**
 * Base de conhecimento formal de Circuitos Elétricos II e GTDC
 * Professor: Marcelo José dos Santos — IFFluminense (Campos Centro)
 * Contém regras canônicas, convenções de sinal e banco com todas as questões e gabaritos oficiais.
 */

export interface OfficialExercise {
  id: string;
  listId: 'lista1' | 'lista2' | 'lista3' | 'lista4' | 'lista5' | 'lista6';
  number: string; // ex: "1.1", "2.10", "3.14", "4.5", "5.2", "6.7"
  title: string;
  topic: string;
  questionText: string;
  gabarito: string;
  method: string;
  keyFormulas: string[];
}

export const CIRCUITOS_II_THEORY_RULES = `
CONVENÇÕES OBRIGATÓRIAS DE CIRCUITOS II (IFFluminense):
1. Representação Padrão no Domínio dos Fasores:
   - A função cosseno é a forma de onda de referência padrão: v(t) = Vm*cos(ωt + θ) <=> V_fasor = Vm ∠ θ.
   - Se uma função for dada em seno: sen(ωt + θ) = cos(ωt + θ - 90°).
   - Se for -cos(ωt + θ): -cos(ωt + θ) = cos(ωt + θ ± 180°).
   - Se for -sen(ωt + θ): -sen(ωt + θ) = cos(ωt + θ + 90°).

2. Impedâncias e Admitâncias dos Elementos Passivos:
   - Resistor: Z_R = R,  Y_R = 1/R (puramente resistivo).
   - Indutor:  Z_L = jωL = ωL ∠ 90°,  Y_L = 1/(jωL) = -j/(ωL) (reatância indutiva X_L = ωL > 0).
   - Capacitor: Z_C = 1/(jωC) = -j/(ωC) = (1/(ωC)) ∠ -90°, Y_C = jωC (reatância capacitiva X_C = -1/(ωC) < 0).
   - Admitância complexa: Y = G + jB, onde G = R/(R² + X²) e B = -X/(R² + X²). B_L < 0 (indutiva), B_C > 0 (capacitiva).

3. Potência em Regime Permanente Senoidal (Monofásico):
   - Potência Instantânea: p(t) = P + P*cos(2ωt) - Q*sen(2ωt).
   - Potência Média (Ativa ou Real): P = 0.5 * Vm * Im * cos(θv - θi) = V_rms * I_rms * cos(θv - θi) [W].
   - Potência Reativa: Q = 0.5 * Vm * Im * sen(θv - θi) = V_rms * I_rms * sen(θv - θi) [VAr].
     * Carga indutiva: Q > 0, Fator de Potência atrasado (corrente atrasada da tensão).
     * Carga capacitiva: Q < 0, Fator de Potência adiantado (corrente adiantada da tensão).
   - Potência Complexa: S_fasor = V_rms * (I_rms)* = P + jQ [VA].
   - Potência Aparente: S = |S_fasor| = V_rms * I_rms = sqrt(P² + Q²) [VA].
   - Fator de Potência: FP = P / S = cos(θv - θi).
   - Máxima Transferência de Potência Média:
     * Carga de impedância Z_L: Z_L = (Z_th)* = R_th - jX_th. Potência máxima: P_max = |V_th|² / (8*R_th) (com pico) ou |V_th_rms|² / (4*R_th) (com RMS).
     * Carga puramente resistiva R_L: R_L = |Z_th| = sqrt(R_th² + X_th²).

4. Sentidos de Referência e Equacionamento (LKC e LKT):
   - As setas de corrente indicadas no circuito definem o sentido de referência arbitrado pelo exercício (ex: ix, io, i1).
   - Respeite rigorosamente a referência fornecida pelo aluno; se a corrente calculada tiver valor negativo, isso significa apenas que o fluxo real é contrário à seta.
   - Em supernós e supermalhas, conserve as restrições das fontes internas.

5. Circuitos Trifásicos Equilibrados:
   - Gerador Trifásico: fontes com mesma amplitude V_f e defasadas de 120°.
   - Sequência Positiva (ABC / direta):
     * V_an = Vf ∠ 0°,  V_bn = Vf ∠ -120°,  V_cn = Vf ∠ +120°.
     * Tensões de linha (estrela): V_ab = √3*V_an ∠ 30°,  V_bc = V_ab ∠ -120°,  V_ca = V_ab ∠ +120°.
   - Sequência Negativa (ACB / inversa):
     * V_an = Vf ∠ 0°,  V_bn = Vf ∠ +120°,  V_cn = Vf ∠ -120°.
     * Tensões de linha (estrela): V_ab = √3*V_an ∠ -30°,  V_bc = V_ab ∠ +120°,  V_ca = V_ab ∠ -120°.
   - Conexão Estrela (Y): V_linha = √3 * V_fase, I_linha = I_fase.
   - Conexão Triângulo (Δ): V_linha = V_fase, I_linha = √3 * I_fase.
     * Na sequência ABC: I_a = √3 * I_AB ∠ -30°, I_b = I_a ∠ -120°, I_c = I_a ∠ +120°.
     * Na sequência ACB: I_a = √3 * I_AB ∠ +30°, I_b = I_a ∠ +120°, I_c = I_a ∠ -120°.
   - Equivalente Monofásico: Para circuitos equilibrados, resolve-se apenas uma fase (fase 'a'):
     * Carga em Δ convertida para Y: Z_Y = Z_Δ / 3.
     * I_a = V_an / Z_Y_total. Em seguida, obtêm-se as outras correntes deslocando ±120°.
   - Potência Trifásica em Circuitos Equilibrados:
     * A potência instantânea total p(t) = 3 * Vf * If * cos(θ) é constante (não pulsante).
     * S_3φ = 3 * S_1φ = 3 * V_fase * (I_fase)* = √3 * V_linha * I_linha ∠ θ.
     * P_3φ = √3 * V_linha * I_linha * cos(θ) [W].
     * Q_3φ = √3 * V_linha * I_linha * sen(θ) [VAr].
   - Correção do Fator de Potência Trifásico:
     * Qc = P_3φ * (tan θ_antigo - tan θ_novo).
     * Capacitores em Δ: C_Δ = Qc / (3 * ω * V_linha²).
     * Capacitores em Y: C_Y = 3 * C_Δ = Qc / (3 * ω * V_fase²).

6. Circuitos Trifásicos Desequilibrados e Medição de Potência:
   - Desequilíbrio de Carga: Quando as impedâncias por fase diferem (ZA ≠ ZB ou ZA ≠ ZC).
   - Conexão Y-Y a 4 condutores (com neutro):
     * Corrente no neutro: I_n = -(I_a + I_b + I_c) ≠ 0.
     * Com linha ideal, as tensões nas fases da carga são iguais às tensões das fontes.
   - Conexão Y-Y a 3 condutores (sem neutro):
     * O neutro da carga (ponto O) sofre deslocamento de potencial em relação ao neutro da fonte (ponto n): V_ON.
     * Método 1: Conversão Y-Δ das impedâncias (Z_ab = (ZA*ZB + ZB*ZC + ZC*ZA)/ZC, etc.).
     * Método 2: Análise de Malhas com 2 malhas independentes I1 e I2: I_a = I1, I_b = I2 - I1, I_c = -I2.
   - Carga em Δ Desequilibrada:
     * Correntes de fase: I_AB = V_AB / Z_AB, I_BC = V_BC / Z_BC, I_CA = V_CA / Z_CA.
     * Correntes de linha (LKC): I_a = I_AB - I_CA, I_b = I_BC - I_AB, I_c = I_CA - I_BC.
   - Potência em Cargas Desequilibradas:
     * Deve ser calculada fase a fase individualmente: S_3φ = S_A + S_B + S_C.
   - Método dos Dois Wattímetros (Método de Aron):
     * Potência ativa total: P_3φ = P1 + P2 (válido para sistemas equilibrados e desequilibrados a 3 fios).
     * Em sistemas equilibrados: Q_3φ = √3 * (P2 - P1) e tan(θ) = √3 * (P2 - P1) / (P1 + P2).
     * Em sistemas desequilibrados: P_3φ = P1 + P2 ainda é válido, mas Q_3φ NÃO é √3*(P2 - P1).

7. Análise de Circuitos por Transformadas de Laplace:
   - Definição: L[f(t)] = F(s) = ∫[0⁻ a ∞] f(t)*e^(-st) dt, onde s = σ + jω.
   - Pares Fundamentais:
     * L[δ(t)] = 1
     * L[u(t)] = 1/s
     * L[e^(-at) u(t)] = 1 / (s + a)
     * L[t u(t)] = 1 / s²
     * L[t^n e^(-at) u(t)] = n! / (s + a)^(n+1)
     * L[sen(ωt) u(t)] = ω / (s² + ω²)
     * L[cos(ωt) u(t)] = s / (s² + ω²)
     * L[e^(-at) sen(ωt) u(t)] = ω / ((s + a)² + ω²)
     * L[e^(-at) cos(ωt) u(t)] = (s + a) / ((s + a)² + ω²)
   - Propriedades Importantes:
     * Derivação no tempo: L[df/dt] = s*F(s) - f(0⁻). Para 2ª derivada: L[d²f/dt²] = s²*F(s) - s*f(0⁻) - f'(0⁻).
     * Integração no tempo: L[∫ f(τ) dτ] = F(s) / s.
     * Deslocamento no tempo: L[f(t - a) u(t - a)] = e^(-as) * F(s).
     * Teorema do Valor Inicial (TVI): lim(t->0⁺) f(t) = lim(s->∞) s*F(s).
     * Teorema do Valor Final (TVF): lim(t->∞) f(t) = lim(s->0) s*F(s) (aplicável se todos os polos de sF(s) estiverem no semiplano esquerdo).
   - Modelos de Circuitos no Domínio s (com Condições Iniciais):
     * Resistor: Impedância Z(s) = R.
     * Indutor: Impedância sL em série com fonte de tensão L*i(0⁻) (polo positivo na entrada da corrente), OU impedância sL em paralelo com fonte de corrente i(0⁻)/s.
     * Capacitor: Impedância 1/(sC) em série com fonte de tensão v(0⁻)/s (mesma polaridade de v(0⁻)), OU impedância 1/(sC) em paralelo com fonte de corrente C*v(0⁻).
   - Expansão em Frações Parciais:
     * Polos simples: k_i = lim(s->-p_i) [(s + p_i) * F(s)].
     * Polos complexos conjugados: Completar o quadrado no denominador s² + as + b = (s + α)² + β², escrevendo A1*(s + α)/((s + α)² + β²) + B1*β/((s + α)² + β²), cuja inversa é e^(-αt)*[A1*cos(βt) + B1*sen(βt)] u(t) = A*e^(-αt)*cos(βt - θ) u(t).
   - Função de Transferência e Estabilidade:
     * H(s) = Y(s) / X(s) sob condições iniciais nulas.
     * Estabilidade: Circuito é BIBO estável se todos os polos de H(s) tiverem parte real estritamente negativa (semiplano esquerdo do plano s). Polos no eixo imaginário simples indicam estabilidade marginal / oscilatória; polos no semiplano direito indicam instabilidade.
`;

export const OFFICIAL_EXERCISE_LISTS: OfficialExercise[] = [
  // ===================== LISTA 1: SENOIDES E FASORES =====================
  {
    id: 'l1_ex1_1',
    listId: 'lista1',
    number: '1.1',
    title: 'Defasagens Angulares entre Senoidais',
    topic: 'Senoides e Fasores',
    questionText: 'Determine as relações de defasagens angulares entre as senoidais a seguir: a) v(t) = 10 cos(3t - 47°) V e i(t) = 15 sen(3t + 51°) A; b) v(t) = 8 cos(15t - 61°) V e i(t) = -10 sen(15t) A; c) v1(t) = -50 cos(200t + 65°) V e v2(t) = 30 sen(200t - 40°) V.',
    gabarito: 'a) v(t) está 8° atrasada de i(t); b) v(t) está 151° atrasada de i(t); c) v1(t) está 15° adiantada de v2(t)',
    method: 'Conversão trigonométrica para cosseno com amplitudes positivas e comparação de fases.',
    keyFormulas: ['sen(ωt + θ) = cos(ωt + θ - 90°)', '-cos(ωt + θ) = cos(ωt + θ ± 180°)', 'Δθ = θv - θi']
  },
  {
    id: 'l1_ex1_2',
    listId: 'lista1',
    number: '1.2',
    title: 'Combinação de Senoides por Fasores',
    topic: 'Senoides e Fasores',
    questionText: 'Aplique o conceito de fasores para combinar as seguintes funções senoidais em uma única senoide: a) v(t) = [8 cos(3t - 45°) - 15 sen(3t + 80°)] V; b) i(t) = [8 sen(15t + 100°) + 16 cos 15t] A; c) v(t) = [50 cos(200t - 60°) - 25 sen(200t + 70°) - 75 cos(200t - 100°)] V; d) i(t) = [10 cos(1000t - 30°) - 10 sen 1000t + 10 cos(1000t - 50°)] A.',
    gabarito: 'a) v(t) = 9,6127 cos(3t - 161,4875°) V; b) i(t) = 23,9188 cos(15t + 3,3296°) A; c) v(t) = 41,7221 cos(200t + 69,6174°) V; d) i(t) = 15,3209 cos(1000t - 10°) A',
    method: 'Conversão para fasores retangulares, soma vetorial complexa e retorno à forma temporal polar.',
    keyFormulas: ['V = V1 + V2 + ...', 'v(t) = Re{V*e^(jωt)}']
  },
  {
    id: 'l1_ex1_3',
    listId: 'lista1',
    number: '1.3',
    title: 'Impedância Equivalente Zab em Ponte / Escada',
    topic: 'Associação de Impedâncias',
    questionText: 'Determine o valor da impedância equivalente Zab nos circuitos de escada/ponte com resistores, capacitores e indutores.',
    gabarito: 'a) Zab = 34,68836 - j6,9301 Ω; b) Zab = 0,3796 + j1,46 Ω',
    method: 'Associações em série e em paralelo de impedâncias complexas Z = R + jX.',
    keyFormulas: ['Z_serie = Z1 + Z2', 'Z_paralelo = (Z1 * Z2) / (Z1 + Z2)']
  },
  {
    id: 'l1_ex1_4',
    listId: 'lista1',
    number: '1.4',
    title: 'Admitância Equivalente Yab em mS',
    topic: 'Admitância',
    questionText: 'Determine o valor da admitância equivalente Yab em mS do circuito formado por combinações série/paralelo de R, L e C.',
    gabarito: 'Yab = 40 + j30 mS (ou 0,04 + j0,03 S)',
    method: 'Cálculo de Zab e inversão Yab = 1/Zab expresso em miliSiemens.',
    keyFormulas: ['Y = 1 / Z', 'G = R/(R² + X²)', 'B = -X/(R² + X²)']
  },
  {
    id: 'l1_ex1_5',
    listId: 'lista1',
    number: '1.5',
    title: 'Tensão de Saída vo(t) em Circuito RLC',
    topic: 'Análise Fasorial',
    questionText: 'No circuito RLC alimentado por fonte senoidal, determine a tensão vo(t) em regime permanente senoidal.',
    gabarito: 'vo(t) = 17,148 cos(1000t - 76,57°) V',
    method: 'Divisor de tensão ou análise nodal no domínio dos fasores com impedâncias Z_L = jωL e Z_C = 1/(jωC).',
    keyFormulas: ['Vo = Vs * (Z2 / (Z1 + Z2))', 'v(t) = |Vo| cos(ωt + ∠Vo)']
  },
  {
    id: 'l1_ex1_6',
    listId: 'lista1',
    number: '1.6',
    title: 'Corrente io(t) com Fonte Senoidal',
    topic: 'Análise Fasorial',
    questionText: 'Determine a corrente io(t) no ramo de carga do circuito sob regime permanente senoidal.',
    gabarito: 'io(t) = 3,35 cos(4t + 117,43°) A',
    method: 'Equacionamento nodal/malhas em fasores para determinar a corrente no domínio do tempo.',
    keyFormulas: ['Io = Vo / Z', 'i(t) = |Io| cos(ωt + ∠Io)']
  },
  {
    id: 'l1_ex1_8',
    listId: 'lista1',
    number: '1.8',
    title: 'Corrente io(t) em Circuito com Indutor e Capacitor',
    topic: 'Análise Fasorial',
    questionText: 'Determine a expressão de regime permanente para a corrente io(t) do circuito RL//C.',
    gabarito: 'io(t) = 2,87 cos(2t - 141,12°) A',
    method: 'Redução de impedâncias no domínio de frequência e cálculo fasorial.',
    keyFormulas: ['Io = Is * (Z_outro / (Z_ramo + Z_outro))']
  },
  {
    id: 'l1_ex1_10',
    listId: 'lista1',
    number: '1.10',
    title: 'Tensão vo(t) com Múltiplos Elementos Reativos',
    topic: 'Análise Fasorial',
    questionText: 'Determine a tensão vo(t) em regime permanente senoidal no circuito RLC com excitação senoidal.',
    gabarito: 'vo(t) = 10,72 cos(100t + 36,46°) V',
    method: 'Análise nodal fasorial com admitâncias.',
    keyFormulas: ['V = I / Y_eq', 'v(t) = Vm * cos(ωt + θ)']
  },
  {
    id: 'l1_ex1_13',
    listId: 'lista1',
    number: '1.13',
    title: 'Conversão Delta-Estrela em Domínio Fasorial',
    topic: 'Transformação Δ-Y',
    questionText: 'Aplique a transformação Delta-Estrela para determinar a impedância equivalente e a corrente no circuito alimentado por fonte senoidal.',
    gabarito: 'Zeq = 1,44 - j2,08 Ω e Io = 6,36 ∠ 105,26° A',
    method: 'Fórmulas de conversão de impedâncias complexas Δ para Y: Zy = (Z1*Z2)/(Z1+Z2+Z3).',
    keyFormulas: ['Zy = (Za * Zb) / (Za + Zb + Zc)']
  },

  // ===================== LISTA 2: ANÁLISE CA =====================
  {
    id: 'l2_ex2_1',
    listId: 'lista2',
    number: '2.1',
    title: 'Análise Nodal com Supernó e Fonte de Tensão',
    topic: 'Análise Nodal',
    questionText: 'Determine as tensões de nó V1 e V2 e a corrente io(t) no circuito de regime permanente senoidal.',
    gabarito: 'V1 = 25,385 ∠ 44,14° V, V2 = 11,27 ∠ 124,14° V e io(t) = 2,254 cos(2t + 34,14°) A',
    method: 'LKC nos nós essenciais e equação de restrição do supernó.',
    keyFormulas: ['∑ I_saem = 0', 'V_superno = V_positivo - V_negativo']
  },
  {
    id: 'l2_ex2_2',
    listId: 'lista2',
    number: '2.2',
    title: 'Análise Nodal com Fontes Dependentes',
    topic: 'Análise Nodal',
    questionText: 'Determine a tensão vo(t) no circuito contendo fonte de corrente controlada por tensão.',
    gabarito: 'vo(t) = 31,41 cos(4t - 85,18°) V',
    method: 'Análise nodal com substituição da variável de controle.',
    keyFormulas: ['LKC nos nós', 'Variável de controle expressa em função das tensões nodais']
  },
  {
    id: 'l2_ex2_5',
    listId: 'lista2',
    number: '2.5',
    title: 'Análise de Malhas no Domínio Fasorial',
    topic: 'Análise de Malhas',
    questionText: 'Determine as correntes de malha I1 e I2 e a corrente de saída io(t).',
    gabarito: 'I1 = 4,67 ∠ -20,17° A, I2 = 1,79 ∠ -157,2° A e io(t) = 6,14 cos(1000t - 35,6°) A',
    method: 'Montagem da matriz de impedâncias de malha [Z][I] = [V].',
    keyFormulas: ['Z11*I1 - Z12*I2 = V1', '-Z21*I1 + Z22*I2 = V2']
  },
  {
    id: 'l2_ex2_8',
    listId: 'lista2',
    number: '2.8',
    title: 'Superposição com Fontes de Mesma Frequência',
    topic: 'Teorema da Superposição',
    questionText: 'Utilize o princípio da superposição para encontrar a tensão fasorial Vo.',
    gabarito: 'Vo = 2,425 ∠ 64,84° V',
    method: 'Análise separada desativando cada fonte e soma vetorial dos fasores.',
    keyFormulas: ['Vo = Vo_fonte1 + Vo_fonte2']
  },
  {
    id: 'l2_ex2_10',
    listId: 'lista2',
    number: '2.10',
    title: 'Superposição com Frequências Diferentes (ω1 ≠ ω2)',
    topic: 'Superposição Multi-frequência',
    questionText: 'Determine vo(t) no circuito contendo fontes com frequências angulares distintas (ex: DC, 2 rad/s e 5 rad/s).',
    gabarito: 'vo(t) = [4 + 1,581 cos(2t - 71,57°) + 0,588 sen(5t - 59,04°)] V',
    method: 'Cálculo independente em cada frequência (incluindo DC) e soma das expressões no domínio do tempo (NUNCA somar fasores de frequências diferentes).',
    keyFormulas: ['v_total(t) = v_dc(t) + v_ω1(t) + v_ω2(t)']
  },
  {
    id: 'l2_ex2_12',
    listId: 'lista2',
    number: '2.12',
    title: 'Transformação de Fontes em CA',
    topic: 'Transformação de Fontes',
    questionText: 'Utilize transformações sucessivas de fontes para determinar a corrente io(t).',
    gabarito: 'io(t) = 1,24 cos(10t - 153,43°) A',
    method: 'Conversão V_s em série com Z <=> I_s = V_s/Z em paralelo com Z.',
    keyFormulas: ['Vs = Is * Z', 'Is = Vs / Z']
  },
  {
    id: 'l2_ex2_14',
    listId: 'lista2',
    number: '2.14',
    title: 'Equivalente de Thévenin e Norton',
    topic: 'Thévenin e Norton',
    questionText: 'Determine os equivalentes de Thévenin e Norton nos terminais a-b do circuito CA.',
    gabarito: 'Vth = 12,407 ∠ -134,53° V, Zth = 4,24 - j1,68 Ω e IN = 2,72 ∠ -113,13° A',
    method: 'Cálculo da tensão a circuito aberto V_ca = Vth, desativação de fontes independentes para Zth, e IN = Vth/Zth.',
    keyFormulas: ['Vth = Vca', 'IN = Isc', 'Zth = Vth / IN']
  },

  // ===================== LISTA 3: POTÊNCIA EM CA =====================
  {
    id: 'l3_ex3_1',
    listId: 'lista3',
    number: '3.1',
    title: 'Potência Média e Reativa com Ângulos de Fasor',
    topic: 'Potência Média e Reativa',
    questionText: 'Dadas a tensão v(t) = 120 cos(ωt + 45°) V e a corrente i(t) = 10 cos(ωt - 10°) A, determine a potência instantânea, potência média P e potência reativa Q.',
    gabarito: 'P = 344,15 W, Q = 491,49 VAr (indutivo, FP atrasado = 0,5736)',
    method: 'P = 0.5 * Vm * Im * cos(θv - θi), Q = 0.5 * Vm * Im * sen(θv - θi).',
    keyFormulas: ['P = 0.5 * Vm * Im * cos(θv - θi)', 'Q = 0.5 * Vm * Im * sen(θv - θi)']
  },
  {
    id: 'l3_ex3_2',
    listId: 'lista3',
    number: '3.2',
    title: 'Potência Complexa e Aparente',
    topic: 'Potência Complexa',
    questionText: 'Determine a potência complexa S, o fator de potência e a potência aparente de uma carga alimentada por V_rms = 220 ∠ 0° V e I_rms = 5 ∠ -36,87° A.',
    gabarito: 'S = 880 + j660 VA = 1100 ∠ 36,87° VA, P = 880 W, Q = 660 VAr, S_aparente = 1100 VA, FP = 0,8 atrasado',
    method: 'S = V_rms * I_rms*, P = Re{S}, Q = Im{S}, FP = P/|S|.',
    keyFormulas: ['S = V_rms * I_rms*', 'P = Re{S}', 'Q = Im{S}', 'FP = cos(θ)']
  },
  {
    id: 'l3_ex3_5',
    listId: 'lista3',
    number: '3.5',
    title: 'Máxima Transferência de Potência Média em CA',
    topic: 'Máxima Potência Média',
    questionText: 'Determine a impedância de carga ZL para máxima transferência de potência média e o valor da potência máxima entregue a ZL.',
    gabarito: 'ZL = Zth* = 5 - j3 Ω, P_max = 24,5 W',
    method: 'Cálculo de Thévenin (Vth, Zth). Para máxima potência média: ZL = Zth* = Rth - jXth. Pmax = |Vth|² / (8*Rth) (com pico).',
    keyFormulas: ['ZL = Zth*', 'P_max = |Vth|² / (8 * Rth)']
  },
  {
    id: 'l3_ex3_10',
    listId: 'lista3',
    number: '3.10',
    title: 'Conservação de Potência Ativa e Reativa em Circuito com 3 Cargas',
    topic: 'Conservação de Potência',
    questionText: 'Determine as potências ativa e reativa de cada impedância e fonte, verificando a conservação de potência (valores de pico: Vs = 150 ∠ 0° V).',
    gabarito: 'a) P1 = 1.690 W, Q1 = 3.380 VAr, P2 = 240 W, Q2 = -320 VAr, P3 = 1.970 W, Q3 = 5.910 VAr; b) Ps = 1.950 W, Qs = -3.900 VAr, Px = -5.850 W, Qx = -5.070 VAr; c) P_fornecida = P_absorvida = 5.850 W e Q_fornecida = Q_absorvida = 9.290 VAr',
    method: 'S_i = 0.5 * V_i * I_i*. Identificar se fornece (P < 0 ou convenção ativa) ou absorve (P > 0).',
    keyFormulas: ['S = 0.5 * V * I*', '∑ P_fornecida = ∑ P_absorvida', '∑ Q_fornecida = ∑ Q_absorvida']
  },
  {
    id: 'l3_ex3_16',
    listId: 'lista3',
    number: '3.16',
    title: 'Correção de Fator de Potência de 3 Cargas para 0,96 Atrasado',
    topic: 'Correção de Fator de Potência',
    questionText: 'Fonte 240 V (RMS), 60 Hz supre 3 cargas: 10 kW (resistiva), 15 kVAr (capacitiva) e 22 kVAr (indutiva). a) Corrente total; b) Capacitor em kVAr e µF para FP = 0,96 atrasado; c) Nova corrente.',
    gabarito: 'a) I = 50,8606 ∠ -34,992° A; b) C = 188,03 µF e 4,083 kVAr; c) I_novo = 43,403 ∠ -16,262° A',
    method: 'P_total = 10 kW, Q_total = 22 - 15 = 7 kVAr. S = 10 + j7 kVA, FP1 = 0,819 indutivo. Para FP2 = 0,96 atrasado: θ2 = cos⁻¹(0,96) = 16,26°. Q_novo = P * tan(θ2) = 10 * 0,29167 = 2,917 kVAr. Qc = Q_total - Q_novo = 7 - 2,917 = 4,083 kVAr. C = Qc / (ω * V²) = 4083 / (377 * 240²) = 188,03 µF.',
    keyFormulas: ['Qc = P * (tan θ1 - tan θ2)', 'C = Qc / (ω * V_rms²)', 'I_novo = P / (V_rms * FP2)']
  },

  // ===================== LISTA 4: CIRCUITOS TRIFÁSICOS EQUILIBRADOS =====================
  {
    id: 'l4_ex4_1',
    listId: 'lista4',
    number: '4.1',
    title: 'Sistema Estrela-Estrela Equilibrado com Sequência BCA',
    topic: 'Trifásicos Y-Y',
    questionText: 'Seja um sistema trifásico estrela-estrela equilibrado, de sequência BCA e Vbn = 100 ∠ 20° V no gerador. A impedância de linha por fase é 0,6 + j1,2 Ω, enquanto a impedância por fase da carga é 10 + j14 Ω. Calcule as correntes de linha e as tensões de fase na carga.',
    gabarito: 'Ia = 5,3963 ∠ 84,891° A, Ib = 5,3963 ∠ -35,109° A, Ic = 5,3963 ∠ -155,109° A; VAN = 92,8423 ∠ 139,353° V, VBN = 92,8423 ∠ 19,353° V, VCN = 92,8423 ∠ -100,647° V',
    method: 'Circuito monofásico equivalente. Na sequência BCA: Van está adiantada 120° de Vbn, Vcn está atrasada 120°. Zy = Z_linha + Z_carga = 10,6 + j15,2 Ω. Ia = Van / Zy, VAN = Z_carga * Ia.',
    keyFormulas: ['Zy = Z_l + Z_L', 'I_fase = V_fase / Zy', 'V_carga = Z_L * I_fase']
  },
  {
    id: 'l4_ex4_2',
    listId: 'lista4',
    number: '4.2',
    title: 'Sistema Y-Y com Cargas em Estrela em Paralelo',
    topic: 'Trifásicos Y-Y',
    questionText: 'Para o sistema trifásico do exercício 4.1, considere que duas cargas em estrela sejam conectadas em paralelo com a carga existente. As impedâncias das novas cargas são: 5 + j3 Ω e 2 - j4 Ω. Calcule a corrente de linha na fase "c" e as correntes nas fases "a" de cada carga.',
    gabarito: 'Ic = 24,9692 ∠ -106,071° A; Ia1 = 5,0367 ∠ 66,539° A, Ia2 = 14,8611 ∠ 90,037° A, Ia3 = 19,3765 ∠ -175,564° A',
    method: 'Associação paralelo das 3 cargas por fase: Zp = Z1 // Z2 // Z3. Zy_eq = Z_linha + Zp. Cálculo de Ia e rotação para Ic na sequência BCA.',
    keyFormulas: ['Zp = 1 / (1/Z1 + 1/Z2 + 1/Z3)', 'I_a_total = Van / (Z_linha + Zp)', 'I_ai = V_AN / Zi']
  },
  {
    id: 'l4_ex4_3',
    listId: 'lista4',
    number: '4.3',
    title: 'Sistema Y-Y com Tensão de Linha Vca e Expressão Temporal',
    topic: 'Trifásicos Y-Y',
    questionText: 'Seja um sistema trifásico estrela-estrela equilibrado, de sequência BCA cuja tensão de linha entre as fases "c" e "a" da fonte é igual a 110√3 ∠ -60° V. A impedância por fase de linha é 3 + j2 Ω, enquanto a impedância por fase da carga é 37 + j28 Ω. Calcule as correntes de linha, as tensões de linha na carga e a expressão no domínio do tempo para a tensão da fase "a" da carga, sabendo que a frequência da rede é 60 Hz.',
    gabarito: 'Ia = 2,2 ∠ 113,13° A, Ib = 2,2 ∠ -6,87° A, Ic = 2,2 ∠ -126,87° A; VAB = 176,8094 ∠ -179,753° V, VBC = 176,8094 ∠ 60,247° V, VCA = 176,8094 ∠ -59,753° V; vAN(t) = 102,08095 cos(120πt + 150,247°) V',
    method: 'Determinação de Van a partir de Vca na sequência BCA. Cálculo da corrente monofásica e tensão de fase VAN, conversão para linha VAB e conversão para domínio do tempo com pico Vm = √2 * V_rms.',
    keyFormulas: ['V_linha = √3 * V_fase ∠ ±30°', 'v(t) = √2 * V_rms * cos(2πft + θ)']
  },
  {
    id: 'l4_ex4_4',
    listId: 'lista4',
    number: '4.4',
    title: 'Sistema Y-Y com Valor de Pico e Sequência Inversa (ACB)',
    topic: 'Trifásicos Y-Y',
    questionText: 'O valor de pico da tensão senoidal de fase de uma fonte trifásica equilibrada, ligada em Y, é 200 V. A fonte está ligada a uma carga equilibrada em Y por uma linha de impedância 0,1 + j0,5 Ω/fase. A impedância interna dos enrolamentos do gerador é j0,3 Ω/fase e a impedância da carga é 19,9 + j14,2 Ω/fase. A sequência de fases é inversa e a tensão da fase "a" da fonte é a referência. Determine as correntes de linha, as tensões de fase na carga e as tensões de linha na fonte e na carga.',
    gabarito: 'Ia = 5,657 ∠ -36,87° A, Ib = 5,657 ∠ 83,13° A, Ic = 5,657 ∠ -156,87° A; Vab = 243,1967 ∠ -30,554° V, Vbc = 243,1967 ∠ 89,446° V, Vca = 243,1967 ∠ -150,554° V; VAN = 138,292 ∠ -1,359° V, VBN = 138,292 ∠ 118,641° V, VCN = 138,292 ∠ -121,359° V; VAB = 239,5295 ∠ -31,359° V, VBC = 239,5295 ∠ 88,641° V, VCA = 239,5295 ∠ -151,359° V',
    method: 'V_an_rms = 200/√2 = 141,421 ∠ 0° V. Z_total = Zs + Zl + Z_L = 20 + j15 = 25 ∠ 36,87° Ω. Na seq. inversa (ACB): Vab = √3 * Van ∠ -30°.',
    keyFormulas: ['V_rms = V_pico / √2', 'Seq. ACB: Vab = √3*Van ∠ -30°', 'V_terminal = Van - Zs*Ia']
  },
  {
    id: 'l4_ex4_5',
    listId: 'lista4',
    number: '4.5',
    title: 'Fonte Estrela com Cargas Paralelo Y e Delta',
    topic: 'Trifásicos Y-Δ',
    questionText: 'O circuito é excitado por uma fonte trifásica equilibrada em estrela com Vcn = 210 ∠ -120° V e sequência de fases positiva. Se Zl = 1 + j Ω, ZΔ = 24 - j30 Ω e ZY = 12 + j5 Ω, determine as correntes de linha, as correntes em cada fase das cargas e as tensões de linha nas cargas.',
    gabarito: 'Ia = 23,6653 ∠ 126,776° A, Ib = 23,6653 ∠ 6,776° A, Ic = 23,6663 ∠ -113,224° A; Carga Y: IA = 14,7007 ∠ 89,472° A, IB = 14,7007 ∠ -30,528° A, IC = 14,7007 ∠ -150,528° A; Carga Δ: IAB = 8,6159 ∠ -166,567° A, IBC = 8,6159 ∠ 73,433° A, ICA = 8,6159 ∠ -46,567° A; VAB = 331,0117 ∠ 142,092° V, VBC = 331,0117 ∠ 22,092° V, VCA = 331,0117 ∠ -97,908° V',
    method: 'Converter ZΔ para Y: ZY2 = ZΔ / 3 = 8 - j10 Ω. Associar em paralelo com ZY: Zp = ZY // ZY2. Resolver monofásico equivalente.',
    keyFormulas: ['ZY_eq = ZΔ / 3', 'Zp = (ZY * ZY_eq) / (ZY + ZY_eq)', 'IAB = VAB / ZΔ']
  },
  {
    id: 'l4_ex4_6',
    listId: 'lista4',
    number: '4.6',
    title: 'Determinação de Corrente de Linha e Tensão de Fase em Carga Mista',
    topic: 'Trifásicos Y-Δ',
    questionText: 'Dado o circuito trifásico com fontes Y 240 V rms e cargas mistas, determine a corrente de linha na fase "b", a tensão de fase VCN e a corrente de fase IAB.',
    gabarito: 'Ib = 11,1385 ∠ -83,013° A, VCN = 230,8009 ∠ -133,402° V e IAB = 11,104 ∠ 106,598° A',
    method: 'Monofásico equivalente com conversão de carga em triângulo para estrela equivalente.',
    keyFormulas: ['ZY = ZΔ / 3', 'Ib = Vbn / Zy_total', 'VCN = Zcarga * Ic']
  },
  {
    id: 'l4_ex4_7',
    listId: 'lista4',
    number: '4.7',
    title: 'Circuito Trifásico com Fonte em Triângulo e Carga em Triângulo (Sequência Negativa)',
    topic: 'Trifásicos Δ-Δ',
    questionText: 'No circuito trifásico com gerador em triângulo, se Vab = 440 ∠ 60° V e a sequência de fases é negativa, determine as correntes de linha e as correntes nas fases do gerador.',
    gabarito: 'Ia = 17,7425 ∠ 114,775° A, Ib = 17,7425 ∠ -125,225° A, Ic = 17,7425 ∠ -5,225° A; Iba = 10,2436 ∠ 84,775° A, Icb = 10,2436 ∠ -155,225° A, Iac = 10,2436 ∠ -35,225° A',
    method: 'Conversão da fonte Δ para Y equivalente na sequência negativa: Van = (Vab/√3) ∠ +30°. Carga Δ para Y: ZY = ZΔ/3. Monofásico para Ia e Iba = (Ia/√3) ∠ -30°.',
    keyFormulas: ['Seq. negativa Δ: Van = (Vab/√3) ∠ 30°', 'Iba = (Ia/√3) ∠ -30°']
  },
  {
    id: 'l4_ex4_8',
    listId: 'lista4',
    number: '4.8',
    title: 'Sistema Δ-Δ com Sequência CAB',
    topic: 'Trifásicos Δ-Δ',
    questionText: 'Em um sistema trifásico triângulo-triângulo equilibrado, a sequência de fases é CAB e Vab = 220 ∠ -10° V no gerador. A impedância de linha por fase é 0,6 + j0,5 Ω, enquanto a impedância por fase da carga é 30 - j20 Ω. Calcule as correntes de linha, as correntes de fase na carga e as tensões de fase na carga.',
    gabarito: 'Ia = 10,3575 ∠ -9,811° A, Ib = 10,3575 ∠ -129,811° A, Ic = 10,3575 ∠ 110,189° A; IAB = 5,9799 ∠ 20,189° A, IBC = 5,9799 ∠ -99,811° A, ICA = 5,9799 ∠ 140,189° A; VAB = 215,609 ∠ -13,501° V, VBC = 215,609 ∠ -133,501° V, VCA = 215,609 ∠ 106,499° V',
    method: 'Transformação Y equivalente completa, cálculo monofásico e retorno a grandezas de triângulo.',
    keyFormulas: ['Z_Y = Z_Δ / 3', 'IAB = (Ia / √3) ∠ 30°', 'VAB = Z_Δ * IAB']
  },
  {
    id: 'l4_ex4_9',
    listId: 'lista4',
    number: '4.9',
    title: 'Gerador em Triângulo com Impedância Interna e Carga Y',
    topic: 'Trifásicos Δ-Y',
    questionText: 'Seja um gerador conectado em triângulo com fontes 864 V e impedâncias internas de 4,5 + j3 Ω por fase. Determine: c) As correntes de linha em curto-circuito nos terminais A, B, C; d) As correntes de fase no gerador e carga e tensões de linha quando conectado a carga Y de 1.192 + j1.584 Ω através de linha 6,5 + j15 Ω.',
    gabarito: 'c) Ia = 276,7014 ∠ -63,6901° A, Ib = 276,7014 ∠ 176,31° A, Ic = 276,7014 ∠ 56,31° A; d) Iba = 144 ∠ -53,1301° mA, Icb = 144 ∠ -173,1301° mA, Iac = 144 ∠ 66,87° mA; Ia = 249,4153 ∠ -83,1301° mA, Ib = 249,4153 ∠ 156,87° mA, Ic = 249,4153 ∠ 36,87° mA; Vab = 863,2656 ∠ 0,0172° V, Vbc = 863,2656 ∠ -119,9828° V, Vca = 863,2656 ∠ 120,0172° V',
    method: 'Conversão da fonte e impedância interna em Δ para Y equivalente: Zs_Y = Zs_Δ / 3 e Van = (Vab/√3) ∠ -30°.',
    keyFormulas: ['Zs_Y = Zs_Δ / 3', 'Van = (Vab/√3) ∠ -30°', 'Vab = √3*Van_term ∠ 30°']
  },
  {
    id: 'l4_ex4_10',
    listId: 'lista4',
    number: '4.10',
    title: 'Potências Complexas Totais da Fonte e da Carga em Y-Δ',
    topic: 'Potência Trifásica',
    questionText: 'Seja um sistema trifásico estrela-triângulo equilibrado, no qual a tensão na fase "a" da fonte é 400 V (referência) e a impedância da carga é 51 + j45 Ω. Se a linha for 0,5 + j1,8 Ω/fase, determine as potências complexas totais da fonte e da carga.',
    gabarito: 'S_fonte = 14.273,81944 + j13.702,86666 VA e S_carga = 13.865,99602 + j12.234,70237 VA',
    method: 'Monofásico com ZY = (51 + j45)/3 = 17 + j15 Ω. Ia = 400 / (17,5 + j16,8) A. S_3φ_fonte = 3 * Van * Ia*, S_3φ_carga = 3 * |Ia|² * ZY.',
    keyFormulas: ['S_fonte = 3 * Van * Ia*', 'S_carga = 3 * |Ia|² * ZY', 'S_linha = 3 * |Ia|² * Zl']
  },
  {
    id: 'l4_ex4_12',
    listId: 'lista4',
    number: '4.12',
    title: 'Cálculo de Correntes de Linha a partir da Potência e FP',
    topic: 'Potência Trifásica',
    questionText: 'Uma carga trifásica equilibrada com FP indutivo de 0,85 absorve 10 kW de um sistema equilibrado com sequência inversa. Tensão Vca é referência e vale 380 V. Calcule as correntes de linha.',
    gabarito: 'Ia = 17,87462 ∠ 118,2117° A, Ib = 17,87462 ∠ -121,7883° A, Ic = 17,87462 ∠ -1,7883° A',
    method: 'P = √3 * VL * IL * cos(θ) => IL = P / (√3 * VL * FP) = 17,875 A. Determinar fases das tensões na sequência inversa e atrasar corrente de θ = cos⁻¹(0,85) = 31,79°.',
    keyFormulas: ['IL = P / (√3 * VL * FP)', 'θ = cos⁻¹(FP)']
  },
  {
    id: 'l4_ex4_13',
    listId: 'lista4',
    number: '4.13',
    title: 'Modelagem Série e Paralelo de Carga Trifásica em Δ',
    topic: 'Modelagem de Carga',
    questionText: 'Uma carga trifásica equilibrada absorve 150 kVA, FP = 0,96 adiantado, com tensão de linha 600 V. Determine dois circuitos equivalentes (série e paralelo) para modelar essa carga em triângulo.',
    gabarito: '6,912 Ω em série com -j2,016 Ω; 7,5 Ω em paralelo com -j25,714 Ω',
    method: 'S_fase = 50 kVA ∠ -cos⁻¹(0,96) = 48 - j14 kVA. Z_Δ_serie = |VL|² / S_fase* = 6,912 - j2,016 Ω. Modelo paralelo: Rp = |VL|²/P_fase = 7,5 Ω, Xp = -|VL|²/Q_fase = -j25,714 Ω.',
    keyFormulas: ['Z_serie = |V|² / S*', 'R_p = |V|² / P', 'X_p = |V|² / Q']
  },
  {
    id: 'l4_ex4_14',
    listId: 'lista4',
    number: '4.14',
    title: 'Impedâncias de Carga em Paralelo em Triângulo',
    topic: 'Potência Trifásica',
    questionText: 'Fonte trifásica fornece 540 kVA, FP = 0,96 atrasado, a duas cargas equilibradas em paralelo em Δ. Linha desprezível. Carga 1 tem 38,4 - j208,8 kVA. Determine as impedâncias por fase da carga 2 em série e em paralelo para VL = 1.600√3 V.',
    gabarito: 'a) Série: 30,72 Ω e j23,04 Ω; b) Paralelo: 48 Ω e j64 Ω',
    method: 'S_total = 540 * (0,96 + j*sen(cos⁻¹(0,96))) = 518,4 + j151,2 kVA. S2 = S_total - S1 = 480 + j360 kVA. Por fase: S2_fase = 160 + j120 kVA. Z2 = |VL|² / S2_fase*.',
    keyFormulas: ['S2 = S_total - S1', 'Z_fase = |VL|² / (S_fase)*']
  },
  {
    id: 'l4_ex4_16',
    listId: 'lista4',
    number: '4.16',
    title: 'Combinação de Cargas em Triângulo e Estrela com Sequência BAC',
    topic: 'Trifásicos Misto',
    questionText: 'Três impedâncias de 50 - j40 Ω são ligadas em triângulo a um circuito de sequência BAC, com Vbn = 240 V referência. Outras três impedâncias de 30 + j20 Ω são ligadas em estrela nos mesmos terminais. Determine a corrente de linha Ic e o FP da carga total.',
    gabarito: 'a) Ic = 14,70153 ∠ 133,0998° A; b) FP = 0,97398 (adiantado)',
    method: 'Converter carga Δ para Y: ZY1 = (50 - j40)/3 = 16,67 - j13,33 Ω. Associar em paralelo com ZY2 = 30 + j20 Ω. Monofásico equivalente na sequência BAC.',
    keyFormulas: ['ZY1 = ZΔ / 3', 'Zp = ZY1 // ZY2', 'FP = cos(θ_total)']
  },
  {
    id: 'l4_ex4_18',
    listId: 'lista4',
    number: '4.18',
    title: 'Eficiência de Linha e Três Cargas Trifásicas em Paralelo',
    topic: 'Potência e Eficiência',
    questionText: 'Três cargas trifásicas equilibradas em paralelo são alimentadas por linha de distribuição 2 + j16 Ω/fase, com tensão nas cargas VL = 24√3 kV. Carga 1 em Y (400 + j300 Ω), Carga 2 em Δ (2.400 - j1.800 Ω), Carga 3 absorve 172,8 + j2.203,2 kVA. Calcule a potência complexa no início da linha e a eficiência da linha.',
    gabarito: 'a) S_inicio = 4.353,75 + j3.510 kVA; b) Eficiência = 99,23 %',
    method: 'Calcular S_cargas = S1 + S2 + S3. Corrente de linha IL = (S_cargas / (√3*VL))*. Perdas na linha = 3*|IL|²*R_linha. Potência no início: P_in = P_cargas + P_perdas. Eficiência = P_cargas / P_in.',
    keyFormulas: ['P_perdas = 3 * |IL|² * R_linha', 'η = P_cargas / (P_cargas + P_perdas) * 100%']
  },
  {
    id: 'l4_ex4_19',
    listId: 'lista4',
    number: '4.19',
    title: 'Corrente e Potência Reativa de Motor de Indução Trifásico',
    topic: 'Máquinas e Potência Trifásica',
    questionText: 'Um motor de indução trifásico de 150 HP funciona a plena carga com eficiência de 96% e FP = 0,85 atrasado, alimentado por rede 380 V. Determine o módulo da corrente de linha e a potência reativa total fornecida ao motor (1 HP = 746 W).',
    gabarito: 'a) IL = 208,35105 A; b) Q_total = 72.238,949445 VAr',
    method: 'P_mec = 150 * 746 = 111.900 W. P_eletrica = P_mec / 0,96 = 116.562,5 W. IL = P_eletrica / (√3 * 380 * 0,85). Q = P_eletrica * tan(cos⁻¹(0,85)).',
    keyFormulas: ['P_eletrica = P_mec / rendimento', 'IL = P_eletrica / (√3 * VL * FP)', 'Q = P * tan(θ)']
  },
  {
    id: 'l4_ex4_20',
    listId: 'lista4',
    number: '4.20',
    title: 'Banco de Capacitores para Correção de Fator de Potência',
    topic: 'Correção de Fator de Potência',
    questionText: 'Carga indutiva de 50 kW e 65 kVA conectada em estrela a rede 480 V, 50 Hz. Deseja-se corrigir FP para 0,92 indutivo. Calcule a capacitância do banco em paralelo com cada impedância da carga.',
    gabarito: 'C = 279,53256 µF',
    method: 'Q1 = √(65² - 50²) = 41,533 kVAr. Para FP = 0,92: θ2 = cos⁻¹(0,92) = 23,07°, Q2 = 50 * tan(θ2) = 21,298 kVAr. Qc_total = Q1 - Q2 = 20,235 kVAr. Como está em estrela (Vf = 480/√3): C_Y = (Qc/3) / (2π*50*Vf²) = 279,53 µF.',
    keyFormulas: ['Qc = P * (tan θ1 - tan θ2)', 'C_Y = (Qc / 3) / (ω * Vf²)']
  },
  {
    id: 'l4_ex4_22',
    listId: 'lista4',
    number: '4.22',
    title: 'Minimização de Perdas na Linha por Correção de FP em Triângulo',
    topic: 'Otimização de Linha',
    questionText: 'Carga trifásica com linha 15 + j30 Ω, S_fase = 144 + j192 kVA, VL = 2,45 kV, 60 Hz. Determine: a) Capacitância do banco em Δ para perdas mínimas (FP = 1,0); b) Corrente de linha antes e depois; c) Redução percentual de perdas.',
    gabarito: 'a) C_Δ = 84,8473 µF; b) IL_antes = 169,67028 A e IL_depois = 101,80217 A; c) Redução = 64%',
    method: 'Perdas mínimas ocorrem quando toda a potência reativa indutiva da carga é compensada pelo banco (FP = 1): Qc_total = 3 * 192 = 576 kVAr. C_Δ = (Qc/3) / (ω * VL²). IL_antes = |S_total| / (√3*VL), IL_depois = P_total / (√3*VL). Redução = 1 - (IL_depois/IL_antes)².',
    keyFormulas: ['Qc_total = Q_carga', 'C_Δ = (Qc / 3) / (ω * VL²)', 'ΔPerdas = 1 - (I_novo / I_antigo)²']
  },
  {
    id: 'l4_ex4_26',
    listId: 'lista4',
    number: '4.26',
    title: 'Verificação da Conservação de Potência em Sistema com Linha e Gerador',
    topic: 'Conservação de Potência Trifásica',
    questionText: 'Carga Y com Vf = 480 V absorve 60 kVA/fase, FP = 0,8 atrasado. Linha 0,2 + j0,4 Ω/fase e gerador Y com capacitor em paralelo -j5 Ω. Determine a corrente Ia, a potência complexa da fonte e verifique a conservação de P e Q.',
    gabarito: 'a) Ia = 257,43737 ∠ 70,72046° A; b) S_fonte = 153,375 - j379,995 kVA; c) P_fornecida = P_absorvida = 153,375 kW e Q_fornecida = Q_absorvida = 506,745 kVAr',
    method: 'Cálculo da corrente na carga, queda de tensão na linha para achar a tensão nos terminais do gerador, corrente drenada pelos capacitores e soma de potências complexas.',
    keyFormulas: ['S_fonte = S_enrolamentos + S_linha + S_carga', '∑ P = 0', '∑ Q = 0']
  },

  // ===================== LISTA 5: CIRCUITOS TRIFÁSICOS DESEQUILIBRADOS =====================
  {
    id: 'l5_ex5_1',
    listId: 'lista5',
    number: '5.1',
    title: 'Carga Desequilibrada em Triângulo Alimentada por Tensões de Linha',
    topic: 'Trifásicos Desequilibrados Δ',
    questionText: 'A carga desequilibrada em triângulo (ZAB = 10 - j5 Ω, ZBC = 16 Ω, ZCA = 8 + j6 Ω) é alimentada por tensões de linha equilibradas de 440 V na sequência positiva. Determine as correntes de linha e a potência complexa total, sabendo que Vca está na referência.',
    gabarito: 'Ia = 39,70642 ∠ -161,066° A, Ib = 64,11991 ∠ 100,234° A, Ic = 70,12645 ∠ -45,731° A; S_carga = 43,076 + j3,872 kVA',
    method: 'Tensões de linha na sequência ABC com Vca = 440 ∠ 0° V: Vab = 440 ∠ 120° V, Vbc = 440 ∠ -120° V. Lei de Ohm em cada fase da carga: I_AB = Vab/ZAB, I_BC = Vbc/ZBC, I_CA = Vca/ZCA. LKC nos nós para achar Ia, Ib, Ic. S_total = Vab*IAB* + Vbc*IBC* + Vca*ICA*.',
    keyFormulas: ['I_AB = V_ab / Z_AB', 'Ia = I_AB - I_CA', 'S_total = ∑ V_fase * I_fase*']
  },
  {
    id: 'l5_ex5_2',
    listId: 'lista5',
    number: '5.2',
    title: 'Carga Desequilibrada em Estrela sem Neutro e Deslocamento de Neutro VON',
    topic: 'Trifásicos Desequilibrados Y sem Neutro',
    questionText: 'Para a carga trifásica desequilibrada em Y sem condutor neutro (ZA = j5 Ω, ZB = 10 Ω, ZC = -j10 Ω), alimentada por rede equilibrada com Van = 120 ∠ -70° V (sequência positiva), determine as correntes de linha, a potência complexa da carga e a tensão de deslocamento do neutro VON.',
    gabarito: 'Ia = 56,78461 ∠ -70° A, Ib = 25,45584 ∠ 65° A, Ic = 42,75799 ∠ 134,896° A; S_carga = 6,48 - j2,16 kVA; VON = 308,24065 ∠ -137,089° V',
    method: 'Análise de malhas ou conversão Y-Δ da carga desequilibrada. Deslocamento de neutro: VON = Van - VAO = Van - ZA*Ia.',
    keyFormulas: ['V_ON = V_an - Z_A * I_a', 'Ia + Ib + Ic = 0', 'S_carga = ∑ Z_i * |I_i|²']
  },
  {
    id: 'l5_ex5_3',
    listId: 'lista5',
    number: '5.3',
    title: 'Carga Mista Desequilibrada com Sequência Negativa',
    topic: 'Trifásicos Desequilibrados',
    questionText: 'Sistema trifásico com tensões de linha de 220 V na sequência negativa com Vbc na referência alimenta uma carga em Δ desequilibrada e uma carga em Y. Calcule as correntes de linha e a potência complexa total.',
    gabarito: 'Ia = 37,34343 ∠ -67,49555° A, Ib = 41,60102 ∠ -11,57956° A, Ic = 69,75953 ∠ 142,1021° A; S_cargas = 17.111,30084 + j2.908,8238 VA',
    method: 'Conversão da carga Y para Δ e paralelo com a carga Δ original, aplicando a Lei de Ohm e LKC com tensões na sequência ACB.',
    keyFormulas: ['Seq. ACB: Vab = V_linha ∠ -120° ref Vbc', 'I_linha = I_fase1 - I_fase2']
  },
  {
    id: 'l5_ex5_4',
    listId: 'lista5',
    number: '5.4',
    title: 'Carga Y com Condutor Neutro e Linha com Impedância',
    topic: 'Trifásicos Desequilibrados Y 4 Fios',
    questionText: 'Carga Y desequilibrada (ZA = 10∠0°, ZB = 8∠-30°, ZC = 5∠53,13°) com linha 0,3 + j1 Ω/fase e neutro. Gerador com Vab = 280 ∠ -40° V seq. positiva. Determine a corrente de neutro, correntes de linha e balanço de potência ativa e reativa.',
    gabarito: 'Ia = 14,872585 ∠ -82,78235° A, Ib = 23,37672 ∠ -166,85806° A, Ic = 25,100601 ∠ 0,09564° A, In = 20,46447 ∠ 101,85651° A; P_fornecida = P_absorvida = 8.433,07615 W e Q_fornecida = Q_absorvida = 2.150,7724 VAr',
    method: 'Com neutro de impedância desprezível, cada fase é desacoplada: I_a = Van / (Zl + ZA), I_b = Vbn / (Zl + ZB), I_c = Vcn / (Zl + ZC). In = Ia + Ib + Ic.',
    keyFormulas: ['I_k = V_kn / (Z_linha + Z_k)', 'In = Ia + Ib + Ic', 'P_total = ∑ Re{S_k}']
  },
  {
    id: 'l5_ex5_6',
    listId: 'lista5',
    number: '5.6',
    title: 'Carga Desequilibrada em Triângulo com Impedância de Linha',
    topic: 'Trifásicos Desequilibrados Δ',
    questionText: 'Fonte Y equilibrada Van = 440 ∠ 80° V (seq. positiva) alimenta carga Δ desequilibrada (ZAB = 40 + j15 Ω, ZBC = 60 Ω, ZCA = 18 - j12 Ω) por linha 2 + j3 Ω/fase. Determine as correntes de linha e a potência complexa fornecida pela fonte.',
    gabarito: 'a) Ia = 44,62466 ∠ 67,34868° A, Ib = 19,80986 ∠ -62,62058° A, Ic = 35,32787 ∠ -138,10285° A; b) S_fonte = 41.626,766 + j1.855,808 VA',
    method: 'Conversão da carga Δ para Y equivalente ou análise de malhas com 3 malhas.',
    keyFormulas: ['Análise de Malhas no domínio fasorial', 'S_fonte = Van*Ia* + Vbn*Ib* + Vcn*Ic*']
  },
  {
    id: 'l5_ex5_7',
    listId: 'lista5',
    number: '5.7',
    title: 'Análise de Malhas em Sistema com Fontes em Triângulo',
    topic: 'Análise de Malhas Trifásicas',
    questionText: 'Utilize o método de análise de malhas para determinar a corrente de linha Ib e as correntes de fase IBC, Iba, Iac e Icb no circuito com fontes em triângulo.',
    gabarito: 'Ib = 9,10637 ∠ 168,47614° A, IBC = 5,49968 ∠ 172,46839° A, Iba = 5,95905 ∠ 2,82135° A, Icb = 3,64548 ∠ 144,58467° A, Iac = 3,83063 ∠ -141,09292° A',
    method: 'Sistema de equações de malhas independentes aplicando LKT e LKC.',
    keyFormulas: ['[Z_malha][I_malha] = [V_malha]']
  },
  {
    id: 'l5_ex5_8',
    listId: 'lista5',
    number: '5.8',
    title: 'Carga Trifásica com Motor, Capacitor e Carga Monofásica de Iluminação',
    topic: 'Carga Mista Desequilibrada',
    questionText: 'Motor trifásico equilibrado de 4 kVA (FP = 0,72 atrasado) a 220 V + capacitor de 1,8 kVAr entre fases "a" e "b" + iluminação de 800 W entre fase "c" e neutro. Determine as correntes Ia, Ib, Ic e In (Van referência).',
    gabarito: 'Ia = 3,47285 ∠ -3,28785° A, Ib = 11,65065 ∠ -120,97956° A, Ic = 15,65468 ∠ 92,26739° A e In = 6,29837 ∠ -60° A',
    method: 'Superposição de correntes em cada condutor: I_a = I_motor_a + I_cap_ab; I_b = I_motor_b - I_cap_ab; I_c = I_motor_c + I_lamp_c; I_n = I_lamp_c.',
    keyFormulas: ['I_motor = S_motor / (3 * Vfase)*', 'I_cap = Vab / (-jXc)', 'I_lamp = P_lamp / Vcn']
  },
  {
    id: 'l5_ex5_9',
    listId: 'lista5',
    number: '5.9',
    title: 'Medição de Potência Trifásica com Dois Wattímetros',
    topic: 'Método dos 2 Wattímetros',
    questionText: 'Dois wattímetros estão conectados entre as fases a-c (W1) e b-c (W2) para medir a potência de carga em Δ com Z = 2 - j3 Ω, Van = 240 ∠ 0° V (seq. positiva). Calcule a leitura de cada wattímetro e a potência total complexa.',
    gabarito: 'a) P1 = 5.342,49466 W e P2 = 74.411,35151 W; b) ST = 143.778,2909 ∠ -56,30993° VA',
    method: 'W1 mede Re{Vac * Ia*}, W2 mede Re{Vbc * Ib*}. Potência ativa total: P_total = P1 + P2.',
    keyFormulas: ['P1 = Re{Vac * Ia*}', 'P2 = Re{Vbc * Ib*}', 'P_total = P1 + P2']
  },
  {
    id: 'l5_ex5_10',
    listId: 'lista5',
    number: '5.10',
    title: 'Método dos Três Wattímetros em Sistema Quadrifilar',
    topic: 'Método dos 3 Wattímetros',
    questionText: 'Linha quadrifilar 120 V alimenta motor de 260 kVA (FP = 0,85) + três cargas de iluminação fase-neutro (24 kW em a, 15 kW em b, 9 kW em c). Determine a leitura de 3 wattímetros ligados fase-neutro e a corrente no neutro.',
    gabarito: 'a) P1 = 97.666,66667 W, P2 = 88.666,66667 W, P3 = 82.666,66667 W; b) In = 108,97 A',
    method: 'P_motor_fase = (260 * 0,85) / 3 = 73.666,67 W. P1 = P_motor_fase + 24 kW = 97.666,67 W. In = Ia + Ib + Ic por soma fasorial complexa.',
    keyFormulas: ['P_k = Re{V_kn * I_k*}', 'In = Ia + Ib + Ic']
  },
  {
    id: 'l5_ex5_11',
    listId: 'lista5',
    number: '5.11',
    title: 'Dois Wattímetros em Carga Desequilibrada',
    topic: 'Método dos 2 Wattímetros',
    questionText: 'Dois wattímetros conectados às fases de carga desequilibrada alimentada por fonte Vab = 208 ∠ 0° V. Determine a leitura de cada medidor e a potência ativa total.',
    gabarito: 'P1 = 2.590,68748 W e P2 = 4.807,71252 W; PT = 7.398,4 W',
    method: 'P1 = Re{Vab * Ia*}, P2 = Re{Vcb * Ic*}, PT = P1 + P2.',
    keyFormulas: ['PT = P1 + P2', 'P1 = Re{Vab * Ia*}', 'P2 = Re{Vcb * Ic*}']
  },

  // ===================== LISTA 6: TRANSFORMADAS DE LAPLACE =====================
  {
    id: 'l6_ex6_1',
    listId: 'lista6',
    number: '6.1',
    title: 'Corrente i(t) com Polos Repetidos e Chaveamento em t = 0',
    topic: 'Laplace em Circuitos RLC',
    questionText: 'Utilizando a transformada de Laplace, determine i(t) para t >= 0 no circuito RLC com indutor de 2,5 H, capacitor de 1 mF e chave abrindo em t = 0.',
    gabarito: 'i(t) = -6,4 t e^(-20t) u(t) A',
    method: 'Calcular condições iniciais em t = 0⁻. Converter elementos para domínio s com fontes de condição inicial. Resolver I(s) e aplicar inversa de Laplace com polo duplo s = -20.',
    keyFormulas: ['L⁻¹[1/(s + a)²] = t * e^(-at) u(t)', 'I(s) = -6,4 / (s + 20)²']
  },
  {
    id: 'l6_ex6_2',
    listId: 'lista6',
    number: '6.2',
    title: 'Tensão no Indutor v(t) por Laplace',
    topic: 'Laplace em Circuitos RLC',
    questionText: 'Utilizando a transformada de Laplace, calcule v(t) para t > 0 no circuito RLC de 2ª ordem após a abertura da chave em t = 0.',
    gabarito: 'v(t) = (18 e^(-t) - 2 e^(-9t)) u(t) V',
    method: 'Encontrar i_L(0⁻) e v_C(0⁻). Montar equações de nó/malha em s. Decompor V(s) em frações parciais com polos simples em s = -1 e s = -9.',
    keyFormulas: ['V(s) = k1/(s + 1) + k2/(s + 9)', 'v(t) = (k1*e^(-t) + k2*e^(-9t)) u(t)']
  },
  {
    id: 'l6_ex6_3',
    listId: 'lista6',
    number: '6.3',
    title: 'Resposta Completa v(t) e i(t) com Degrau e Polos Complexos',
    topic: 'Laplace em Circuitos RLC',
    questionText: 'Utilizando a transformada de Laplace, determine v(t) e i(t) para t > 0 no circuito excitado por fonte degrau 3u(t) A e fonte DC de 20 V.',
    gabarito: 'v(t) = [35 - e^(-0,8t)(15 cos 0,6t + 20 sen 0,6t)] u(t) V ou v(t) = [35 + 25 e^(-0,8t) cos(0,6t + 126,87°)] u(t) V; i(t) = [5 e^(-0,8t) sen 0,6t] u(t) A',
    method: 'Circuito no domínio s. Polos complexos conjugados s = -0,8 ± j0,6. Completar quadrados e aplicar pares inversos de seno e cosseno amortecidos.',
    keyFormulas: ['s² + 1,6s + 1 = (s + 0,8)² + 0,6²', 'L⁻¹[(s+α)/((s+α)²+β²)] = e^(-αt) cos(βt)', 'L⁻¹[β/((s+α)²+β²)] = e^(-αt) sen(βt)']
  },
  {
    id: 'l6_ex6_4',
    listId: 'lista6',
    number: '6.4',
    title: 'Corrente i(t) em Circuito RL de 1ª Ordem',
    topic: 'Laplace em Circuitos RL',
    questionText: 'Utilizando a transformada de Laplace, determine i(t) para t > 0 no circuito RL com chaveamento de fontes.',
    gabarito: 'i(t) = 5 e^(-4t) u(t) A',
    method: 'Condição inicial do indutor i(0⁻). Modelo em s com gerador L*i(0⁻). Resolução algébrica simples I(s) = 5/(s + 4).',
    keyFormulas: ['I(s) = i(0⁻) / (s + R/L)', 'i(t) = i(0⁻) * e^(-Rt/L) u(t)']
  },
  {
    id: 'l6_ex6_5',
    listId: 'lista6',
    number: '6.5',
    title: 'Tensão com Duas Constantes de Tempo Distintas',
    topic: 'Laplace em Circuitos RLC',
    questionText: 'Utilizando a transformada de Laplace, calcule v(t) para t > 0 no circuito RLC com chave fechando em t = 0 e fonte degrau.',
    gabarito: 'v(t) = (20 - 10,206 e^(-0,05051t) + 0,2052 e^(-4,949t)) u(t) V',
    method: 'Equação de nós no domínio s, raízes reais distintas do denominador (s = -0,05051 e s = -4,949) e expansão em frações parciais.',
    keyFormulas: ['V(s) = A/s + B/(s + p1) + C/(s + p2)']
  },
  {
    id: 'l6_ex6_6',
    listId: 'lista6',
    number: '6.6',
    title: 'Resposta Criticamente Amortecida (Polos Duplos)',
    topic: 'Laplace com Polos Repetidos',
    questionText: 'Utilize a transformada de Laplace para determinar i(t) para t > 0 no circuito com resposta criticamente amortecida.',
    gabarito: 'i(t) = [3 e^(-5t) - 9 t e^(-5t)] u(t) A',
    method: 'Polos duplos em s = -5. I(s) = k1/(s + 5) + k2/(s + 5)². Inversa resulta em termo exponencial e termo t*exponencial.',
    keyFormulas: ['L⁻¹[1/(s + a)] = e^(-at)', 'L⁻¹[1/(s + a)²] = t * e^(-at)']
  },
  {
    id: 'l6_ex6_7',
    listId: 'lista6',
    number: '6.7',
    title: 'Condições Iniciais v(0), dv(0)/dt e Resposta Subamortecida',
    topic: 'Laplace com Condições Iniciais',
    questionText: 'No circuito RLC, a chave esteve na posição 1 por um longo tempo e muda para a posição 2 em t = 0. Determine v(0), dv(0)/dt e v(t) por Laplace.',
    gabarito: 'v(0) = 4 V; dv(0)/dt = -8 V/s; v(t) = [e^(-t)(4 cos 1,7321t - 2,3094 sen 1,7321t)] u(t) V',
    method: 'v(0⁻) = 4 V, i_L(0⁻) calculada em regime permanente DC. dv(0⁺)/dt = i_C(0⁺)/C. Polos s = -1 ± j√3. Completar quadrado.',
    keyFormulas: ['dv(0⁺)/dt = iC(0⁺) / C', 's² + 2s + 4 = (s + 1)² + 3']
  },
  {
    id: 'l6_ex6_8',
    listId: 'lista6',
    number: '6.8',
    title: 'Excitação Senoidal com Condição Inicial Não-Nula',
    topic: 'Laplace com Entrada Senoidal',
    questionText: 'Utilize a transformada de Laplace para determinar v(t) no circuito com fonte 2 cos(4t) V e v(0) = 2 V.',
    gabarito: 'v(t) = [2,202 e^(-3t) + 3,84 t e^(-3t) - 0,202 cos 4t + 0,6915 sen 4t] u(t) V',
    method: 'Vs(s) = 2s / (s² + 16). Incluir gerador de condição inicial do capacitor. Polos em s = -3 (duplo) e s = ±j4.',
    keyFormulas: ['V(s) = k1/(s+3) + k2/(s+3)² + (As + B)/(s² + 16)']
  },
  {
    id: 'l6_ex6_9',
    listId: 'lista6',
    number: '6.9',
    title: 'Equivalente de Thévenin no Domínio s',
    topic: 'Thévenin em Laplace',
    questionText: 'Supondo energia nula em t = 0 e is = 10 u(t) A com fonte dependente 2ix, use o teorema de Thévenin no domínio s para determinar Vo(s) e vo(t).',
    gabarito: 'Vo(s) = 125 / [s(s + 4)] e vo(t) = 31,25 (1 - e^(-4t)) u(t) V',
    method: 'Determinar Vth(s) a circuito aberto e Zth(s) no domínio s. Divisor de tensão com a impedância de carga.',
    keyFormulas: ['Vo(s) = Vth(s) * [ZL(s) / (Zth(s) + ZL(s))]', 'L⁻¹[A / (s(s + a))] = (A/a) * (1 - e^(-at)) u(t)']
  },
  {
    id: 'l6_ex6_10',
    listId: 'lista6',
    number: '6.10',
    title: 'Função de Transferência Vo(s)/Vs(s) com Fonte Controlada',
    topic: 'Função de Transferência',
    questionText: 'Dado o circuito com indutor, capacitor e fonte dependente de corrente 2i, determine a função de transferência Vo(s)/Vs(s).',
    gabarito: 'Vo(s)/Vs(s) = 9s / (3s² + 9s + 2)',
    method: 'Substituição no domínio s com condições iniciais nulas. Análise nodal para relacionar Vo(s) com Vs(s).',
    keyFormulas: ['H(s) = Vo(s) / Vs(s)']
  },
  {
    id: 'l6_ex6_11',
    listId: 'lista6',
    number: '6.11',
    title: 'Função de Transferência VL(s)/V(s) e Resposta ao Degrau',
    topic: 'Função de Transferência e Degrau',
    questionText: 'Para o circuito em ponte com L e C: a) Determine VL(s)/V(s); b) Determine vL(t) para entrada degrau 3u(t) V.',
    gabarito: 'a) VL(s)/V(s) = s² / (2s² + 3s + 1); b) vL(t) = 3 (e^(-t) - 0,5 e^(-0,5t)) u(t) V',
    method: 'H(s) = s² / [(2s + 1)(s + 1)]. Para entrada degrau V(s) = 3/s: VL(s) = H(s) * (3/s) = 3s / [(2s + 1)(s + 1)]. Frações parciais.',
    keyFormulas: ['VL(s) = H(s) * (3/s)', 'L⁻¹[k/(s + a)] = k * e^(-at) u(t)']
  },
  {
    id: 'l6_ex6_12',
    listId: 'lista6',
    number: '6.12',
    title: 'Valores Iniciais, Teorema do Valor Inicial (TVI) e Polos em Laplace',
    topic: 'Teorema do Valor Inicial e Polos',
    questionText: 'Circuito 60 Hz com Vo = 120 ∠ 0° V (rms) e cargas Ra, Rb, jXa e linha jXl. A chave abre em t = 0. Determine: a) i2(0), io(0) e vg(0); b) Polos de Vo(s); c) Aplique o TVI para vg(0); d) Função de transferência Vo(s)/Vg(s).',
    gabarito: 'a) i2(0) = 0 A, io(0) = 35,3553 A e vg(0) = 173,83042 V; b) s = ±j120π e s = -4.633,84; c) vg(0) = 173,83042 V; d) Vo(s)/Vg(s) = 4.523,86 / (s + 4.633,84)',
    method: 'Análise de regime permanente pré-chaveamento para condições iniciais. No domínio s, TVI: lim(s->∞) s*F(s) = f(0⁺).',
    keyFormulas: ['TVI: f(0⁺) = lim(s->∞) s * F(s)']
  },
  {
    id: 'l6_ex6_13',
    listId: 'lista6',
    number: '6.13',
    title: 'Estabilidade de Circuito Ativo em Função do Ganho β',
    topic: 'Estabilidade e Polos',
    questionText: 'Determine os valores do parâmetro β da fonte dependente β*io(t) que produzam sinal limitado vo(t) para entrada limitada vi(t), com polos complexos. Verifique as faixas de estabilidade.',
    gabarito: '-3/2 < β < 1/2 (para estabilidade e polos complexos)',
    method: 'Determinar H(s) = Vo(s)/Vi(s). Obter a equação característica D(s) = 0. Impor que as raízes tenham parte real negativa (Re < 0 para estabilidade) e discriminante negativo (Δ < 0 para polos complexos).',
    keyFormulas: ['Re{polos} < 0 (estabilidade)', 'Δ < 0 (polos complexos conjugados)']
  }
];
