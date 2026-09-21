/**
 * Base de conhecimento formal de GTDC (Geração, Transmissão, Distribuição e Consumo)
 * Sistemas Elétricos de Potência (SEP)
 * Professor: Marcelo José dos Santos — IFFluminense (Campos Centro)
 * Contém regras canônicas, formulações matemáticas e banco com todas as questões e gabaritos oficiais.
 */

export interface GtdcExercise {
  id: string;
  listId: 'gtdc_l1' | 'gtdc_l2' | 'gtdc_l3' | 'gtdc_l4' | 'gtdc_l5' | 'gtdc_l6';
  number: string;
  title: string;
  topic: string;
  questionText: string;
  gabarito: string;
  method: string;
  keyFormulas: string[];
}

export const GTDC_THEORY_RULES = `
CONVENÇÕES E REGRAS OBRIGATÓRIAS DE GTDC / SEP (IFFluminense):
1. ESTRUTURA E TENSÕES DO SEP NO BRASIL:
   - Geração -> Transmissão -> Subtransmissão -> Distribuição Primária (MT: 13,8 kV e 34,5 kV) -> Distribuição Secundária (BT: 127/220 V e 220/380 V).
   - Classes de Tensão: BT (<= 1 kV), MT (1 a 34,5 kV), AT (34,5 a 230 kV), EAT (230 a 500 kV), UAT (> 500 kV).
   - HVDC (Transmissão em CC):
     * Elo monopolar (retorno pela terra/mar) e bipolar (dois condutores com polaridades opostas +/- V).
     * Distância crítica econômica: aproximadamente 800 km (ponto onde o custo de linha CC mais conversores fica menor que CA).
     * Vantagens: necessita de apenas 2/3 dos condutores e isoladores de CA, faixas de passagem mais estreitas, sem limite de estabilidade angular/capacitância de linha, viabiliza conexões submarinas/subterrâneas longas (> 30 km) e interliga sistemas com frequências diferentes (ex: Itaipu 50 Hz Paraguai e 60 Hz Brasil).

2. SISTEMA POR UNIDADE (PU) E MUDANÇA DE BASE:
   - Grandezas de Base: Escolhe-se S_base (potência aparente trifásica única para todo o sistema, ex: 100 MVA) e V_base (tensão de linha nominal em um setor).
   - Relações de Base:
     * I_base = S_3φ(base) / (√3 * V_L(base)) [A]
     * Z_base = (V_L(base))² / S_3φ(base) [Ω]  (com V em kV e S em MVA: Z_base = V_base_kV² / S_base_MVA [Ω])
   - Grandezas em pu:
     * V_pu = V / V_base,  I_pu = I / I_base,  Z_pu = Z / Z_base,  S_pu = S / S_base.
     * Em pu, as tensões de linha e de fase são numericamente iguais em módulo: V_L(pu) = V_F(pu).
     * Em pu, as potências 1φ e 3φ são numericamente iguais: S_3φ(pu) = S_1φ(pu).
   - Fórmula de Mudança de Base de Impedância:
     Z_pu(nova) = Z_pu(antiga) * (V_base(antiga) / V_base(nova))² * (S_base(nova) / S_base(antiga))

3. MODELAGEM DE TRANSFORMADORES EM PU E DEFASAGEM ANGULAR:
   - Em pu, o transformador tem relação de espiras 1:1, eliminando os transformadores do circuito de impedâncias.
   - Transformadores de 2 enrolamentos: Z_T(pu) é a mesma referida a qualquer dos lados (primário ou secundário).
   - Transformadores de 3 enrolamentos (modelo estrela equivalente com impedâncias Z_P, Z_S, Z_T):
     * Z_P = 0.5 * (Z_PS + Z_PT - Z_ST)
     * Z_S = 0.5 * (Z_PS - Z_PT + Z_ST)
     * Z_T = 0.5 * (-Z_PS + Z_PT + Z_ST)
     * Todas as impedâncias de teste (Z_PS, Z_PT, Z_ST) DEVEM ser convertidas para a mesma base do sistema antes de aplicar as fórmulas.
   - Defasagem em transformadores Y-Δ (ou Δ-Y) com sequência positiva (ABC):
     * As grandezas do lado Y estão 30° ADIANTADAS em relação às grandezas do lado Δ (V_Y = V_Δ ∠ +30° e I_Y = I_Δ ∠ +30°).
     * Ao passar de Y para Δ, ATRASA 30°: V_Δ = V_Y ∠ -30°.

4. REPRESENTAÇÃO MATRICIAL DA REDE ELÉTRICA (Y_barra e Z_barra):
   - Montagem direta da Matriz de Admitância de Barra (Y_barra):
     * Diagonal principal: Y_kk = y_k0 + ∑ y_kj (somatório de todas as admitâncias conectadas à barra k, incluindo admitâncias de derivação/shunt).
     * Fora da diagonal: Y_kj = -y_kj (negativo da admitância série do elemento entre as barras k e j).
   - Matriz de Impedância de Barra (Z_barra):
     * Z_barra = (Y_barra)⁻¹.
     * A diagonal Z_kk representa a Impedância de Thévenin vista pela barra k (Z_th,k = Z_kk).
   - Resolução Nodal com Fontes Injetadas:
     * Geradores e motores (tensão E_k em série com Z_k) são convertidos para o modelo Norton: corrente injetada i_k = E_k / Z_k em paralelo com admitância y_k0 = 1/Z_k.
     * Sistema linear: [i] = [Y_barra] * [V] <=> [V] = [Z_barra] * [i].
     * Tensões de barra com compensação shunt (reator ou capacitor conectado à barra k):
       V_k_novo = V_th,k * [Z_ext / (Z_th,k + Z_ext)].

5. MODELOS DE LINHAS DE TRANSMISSÃO E CONSTANTES ABCD:
   - Linhas Curtas (l <= 80 km): Despreza-se a capacitância shunt (C = 0).
     * Matriz ABCD: A = 1, B = Z, C = 0, D = 1.
   - Linhas Médias (80 km < l <= 240 km): Modelo π-nominal com Y/2 nas extremidades.
     * Z = z * l;  Y = y * l.
     * A = D = 1 + (Z * Y) / 2
     * B = Z
     * C = Y * (1 + (Z * Y) / 4)
   - Linhas Longas (l > 240 km): Parâmetros distribuídos.
     * Constante de propagação: γ = √(z * y) = α + jβ
     * Impedância característica: Z_c = √(z / y)
     * Matriz ABCD: A = D = cosh(γl), B = Z_c * sinh(γl), C = (1 / Z_c) * sinh(γl)
     * Circuito π-equivalente: Z_eq = Z_c * sinh(γl) = Z * (sinh(γl) / (γl));  Y_eq / 2 = (1 / Z_c) * tanh(γl / 2) = (Y / 2) * [tanh(γl/2) / (γl/2)].
   - Relação Matricial Entrada-Saída:
     [V_S]   [A  B]   [V_R]
     [I_S] = [C  D] * [I_R]  (V_S e V_R são tensões de fase; I_S e I_R são correntes de linha).
   - Regulação de Tensão:
     Regulação (%) = (|V_R(vazio)| - |V_R(plena_carga)|) / |V_R(plena_carga)| * 100% = (|V_S / A| - |V_R|) / |V_R| * 100%.
   - Equações de Potência na Linha (com A = |A|∠α, B = |B|∠β, V_S = |V_S|∠δ, V_R = |V_R|∠0°):
     * P_R = (|V_S| * |V_R| / |B|) * cos(β - δ) - (|A| * |V_R|² / |B|) * cos(β - α) [W/fase]
     * Q_R = (|V_S| * |V_R| / |B|) * sen(β - δ) - (|A| * |V_R|² / |B|) * sen(β - α) [VAr/fase]
     * Máxima Potência Ativa Transmissível (quando δ = β):
       P_R(max) = (|V_S| * |V_R| / |B|) - (|A| * |V_R|² / |B|) * cos(β - α)

6. COMPENSAÇÃO REATIVA EM LINHAS DE TRANSMISSÃO:
   - Compensação Série (Capacitores em série com a linha):
     * Fator de compensação série: FC_serie = |X_c| / X_L.
     * Matriz de quadripolo do banco de capacitores série: [A_c B_c; C_c D_c] = [1 -j|Xc|; 0 1].
     * Matriz da linha compensada em cascata: [T_novo] = [T_linha] * [T_cap] (se no final) ou [T_cap] * [T_linha] (se no início).
     * Reduz a constante B (B_novo = B - j*A*|Xc|), reduzindo a impedância série e aumentando significativamente a capacidade máxima de transmissão P_max em até 50% ou mais.
   - Compensação Shunt (Reatores em paralelo para limitar sobretensão em vazio / Efeito Ferranti):
     * Fator de compensação shunt: FC_shunt = |B_L| / B_C.
     * Matriz de quadripolo do reator shunt: [A_r B_r; C_r D_r] = [1 0; -j|B_L| 1].
     * Matriz com reator no final da linha: [T_novo] = [T_linha] * [T_reator] => A_novo = A - j*B*|B_L|, B_novo = B, C_novo = C - j*D*|B_L|, D_novo = D.
     * Eleva o módulo de A (|A_novo| > |A|), reduzindo a tensão a vazio V_R(vazio) = V_S / A_novo e diminuindo a regulação da linha para valores baixos e seguros.
`;

export const GTDC_EXERCISE_LISTS: GtdcExercise[] = [
  // ===================== GTDC LISTA 1: REVISÃO DE POTÊNCIA CA E TRIFÁSICOS =====================
  {
    id: 'gtdc_l1_ex1_1',
    listId: 'gtdc_l1',
    number: '1.1',
    title: 'Compensação de Carga Indutiva com Reatância Capacitiva em Paralelo',
    topic: 'Compensação Reativa Monofásica',
    questionText: 'Fonte de 7200 ∠ 0° V (rms) alimenta carga de 138 + j460 Ω por linha 2 + j20 Ω. Determine: a) Perdas ativas na linha; b) Reatância capacitiva em paralelo para carga puramente resistiva; c) Impedância equivalente da carga compensada; d) Novas perdas ativas na linha; e) Variação percentual das perdas; f) Variação percentual da tensão nos terminais da carga.',
    gabarito: 'a) 414,72 W; b) -501,4 Ω; c) 1.671,3333 Ω; d) 37,02 W; e) -90,07 %; f) +3,98 %',
    method: 'Associação de admitâncias da carga: Y_carga = 1/(138 + j460) = 0,000598 - j0,001994 S. Para tornar resistivo, Y_cap = +j0,001994 S => Xc = -1/0,001994 = -501,4 Ω. Nova impedância Z_eq = 1/0,000598 = 1.671,33 Ω. Recálculo das correntes e perdas na linha I²*R.',
    keyFormulas: ['Y_carga = 1 / Z_carga', 'B_cap = -Im{Y_carga}', 'Z_eq = 1 / Re{Y_carga}', 'Perdas = |I|² * R_linha']
  },
  {
    id: 'gtdc_l1_ex1_2',
    listId: 'gtdc_l1',
    number: '1.2',
    title: 'Cálculo de Tensão de Carga a partir de Potência e Linha',
    topic: 'Queda de Tensão em Linha',
    questionText: 'Fonte de 240 ∠ θ° V alimenta carga que absorve 250 VA com fator de potência 0,6 (atrasado) por linha de 1 + j8 Ω. Tensão na carga é Vc ∠ 0° V. Determine o módulo de Vc e o ângulo θ.',
    gabarito: 'Solução 1: 232,43236 V e 1,2716°; Solução 2: 8,67172 V e 28,71772°',
    method: 'S_carga = 250*(0,6 + j0,8) = 150 + j200 VA. Corrente I = (S_carga / Vc)* = (150 - j200)/Vc. Tensão na fonte: 240 ∠ θ = Vc + (1 + j8)*I. Resulta em equação biquadrática para Vc.',
    keyFormulas: ['Vs = Vc + Z_linha * (S_carga / Vc)*', '|Vs|² = (Vc + Re{Z*I})² + (Im{Z*I})²']
  },
  {
    id: 'gtdc_l1_ex1_3',
    listId: 'gtdc_l1',
    number: '1.3',
    title: 'Sistema Trifásico com Cargas em Estrela e Triângulo em Paralelo',
    topic: 'Circuitos Trifásicos Equilibrados',
    questionText: 'Sistema trifásico equilibrado Y, sequência positiva, Vab = 208 ∠ 50° V. Carga Y (4 + j3 Ω) em paralelo com carga Δ (3 - j9 Ω), alimentadas por linha de 1,4 + j0,8 Ω/fase. Calcule as correntes nas fases das cargas.',
    gabarito: 'IAB = 16,8158 ∠ 100,906° A, IBC = 16,8158 ∠ -19,094° A, ICA = 16,8158 ∠ -139,094° A; IA = 18,42079 ∠ -37,529° A, IB = 18,42079 ∠ -157,529° A, IC = 18,42079 ∠ 82,471° A',
    method: 'Conversão da carga Δ para Y: ZY2 = (3 - j9)/3 = 1 - j3 Ω. Associação paralelo Zp = (4 + j3) // (1 - j3). Circuito monofásico equivalente para achar Ia_total e tensão na carga VAN. Depois calcular I_fase_Y = VAN / ZY e I_fase_Δ = VAB / ZΔ.',
    keyFormulas: ['ZY = ZΔ / 3', 'Zp = ZY1 // ZY2', 'IAB = VAB / ZΔ']
  },
  {
    id: 'gtdc_l1_ex1_5',
    listId: 'gtdc_l1',
    number: '1.5',
    title: 'Gerador em Triângulo com Linha e Carga em Triângulo',
    topic: 'Circuitos Trifásicos Δ-Δ',
    questionText: 'Gerador trifásico em Δ com impedância interna 9 + j90 mΩ/fase e tensão a vazio 13,8 kV alimenta carga em Δ de 7,056 + j3,417 Ω por linha de 20 + j180 mΩ/fase. Determine: a) Módulo da corrente de linha; b) Módulo da tensão de linha nos terminais da carga; c) Módulo da tensão de linha nos terminais da fonte; d) Módulo da corrente de fase no gerador.',
    gabarito: 'a) 2.917 A; b) 13.203,31 V; c) 13.712,52 V; d) 1.684,13 A',
    method: 'Converter tudo para estrela equivalente: Zs_Y = Zs_Δ/3 = 0,003 + j0,03 Ω; Z_L_Y = Z_L_Δ/3 = 2,352 + j1,139 Ω; Van = 13,8 kV / √3 = 7.967,43 V. Monofásico: I_linha = Van / (Zs_Y + Z_linha + Z_L_Y) = 2.917 A. I_fase_gerador = I_linha / √3.',
    keyFormulas: ['Z_Y = Z_Δ / 3', 'IL = Van / Z_total', 'I_fase = IL / √3']
  },
  {
    id: 'gtdc_l1_ex1_6',
    listId: 'gtdc_l1',
    number: '1.6',
    title: 'Motor Trifásico e Aquecedor em Paralelo',
    topic: 'Potência Trifásica em Cargas Industriais',
    questionText: 'Motor trifásico de 120 HP (1 HP = 746 W) com rendimento de 95% e FP = 0,707 (atrasado) ligado em paralelo a um aquecedor de 80 kW (FP unitário) em rede de 480 V. Determine a magnitude da corrente de linha.',
    gabarito: '238,2781 A',
    method: 'P_motor = (120 * 746)/0,95 = 94.231,58 W. Q_motor = P_motor * tan(cos⁻¹(0,707)) = 94.231,58 VAr. P_aquecedor = 80.000 W, Q = 0. P_total = 174.231,58 W, Q_total = 94.231,58 VAr. S_total = √(P² + Q²) = 198.077,5 VA. IL = S_total / (√3 * 480) = 238,278 A.',
    keyFormulas: ['P_in = P_mec / rendimento', 'S_total = √(P_total² + Q_total²)', 'IL = S_total / (√3 * VL)']
  },
  {
    id: 'gtdc_l1_ex1_7',
    listId: 'gtdc_l1',
    number: '1.7',
    title: 'Linha de Distribuição Trifásica Alimentando 3 Cargas',
    topic: 'Linha de Distribuição e Eficiência',
    questionText: 'Linha trifásica de 5 + j10 Ω/fase alimenta três cargas em paralelo: Carga 1 (180 kVA, FP = 0,866 atrasado), Carga 2 (150 kVA, FP = 0,28 adiantado), Carga 3 (72,12 kW, FP unitário). Tensão na carga é 1.800√3 V. Determine a tensão de linha no início da linha e a eficiência percentual da linha.',
    gabarito: '3.509,294 V e 87,38 %',
    method: 'Soma das potências complexas das 3 cargas: S_total = S1 + S2 + S3. Corrente de linha IL = (S_total / (√3 * VL_carga))*. Queda de tensão na linha: Vs_fase = Vc_fase + Z_linha * IL. Tensão de linha Vs = √3 * |Vs_fase|. Perdas ativas = 3*|IL|²*R_linha. Eficiência = P_carga / (P_carga + Perdas) * 100%.',
    keyFormulas: ['S_total = ∑ S_i', 'Vs_fase = Vc_fase + Z_l * IL', 'η = P_cargas / P_total * 100%']
  },
  {
    id: 'gtdc_l1_ex1_8',
    listId: 'gtdc_l1',
    number: '1.8',
    title: 'Compensação Reativa em Linha Monofásica para Manter Tensão e Perdas Mínimas',
    topic: 'Compensação Reativa',
    questionText: 'Linha de transmissão (10 + j5 Ω) alimenta carga de 150 kVA (FP = 0,8 atrasado) a 4.800 V (rms). Um capacitor é colocado em paralelo com a carga para que a tensão no início da linha tenha 4.800 V e perdas mínimas. Determine: a) Valor do capacitor em µF a 60 Hz; b) Ângulo de fase da tensão no início; c) Potência complexa no início.',
    gabarito: 'a) 44,32934 µF; b) 8,86442°; c) 492,09384 - j819,07038 kVA',
    method: 'Perdas mínimas na linha ocorrem quando a corrente reativa da carga é compensada. Dimensionamento do capacitor para atingir o ponto de tensão e FP desejado.',
    keyFormulas: ['C = Qc / (ω * V²)', 'Vs = Vc + Z_l * I']
  },
  {
    id: 'gtdc_l1_ex1_9',
    listId: 'gtdc_l1',
    number: '1.9',
    title: 'Regulação de Tensão em Subestação de Distribuição com Banco de Capacitores',
    topic: 'Regulação de Tensão em SEP',
    questionText: 'Subestação a 13,8 kV, 60 Hz conectada à usina por linha 0,6 + j4,8 Ω/fase. Carga é 3,6 MW e 3,6 MVAr. A tensão na usina deve ficar entre 13 kV e 14,6 kV (±5,8%). a) Verifique se a tensão atende à tolerância; b) Repita com banco de capacitores que compensa todo o reativo da carga; c) Valor de cada capacitor em µF em triângulo.',
    gabarito: 'a) 15.248,11 V (não atende, > 14,6 kV); b) 14.012,58 V (atende perfeitamente); c) 16,71 µF',
    method: 'a) IL = (S_3φ / (√3 * 13,8k))*. Van_usina = 13,8k/√3 + Z_l * IL. V_linha_usina = √3 * |Van_usina| = 15.248 V. b) Com compensação total Q = 0: S_novo = 3,6 MW. Recalcular tensão. c) Qc = 3,6 MVAr => C_Δ = (3,6M/3) / (2π*60 * (13,8k)²) = 16,71 µF.',
    keyFormulas: ['IL = (S / (√3*VL))*', 'V_usina = √3 * |V_carga/√3 + Z_l * IL|', 'C_Δ = (Qc / 3) / (ω * VL²)']
  },
  {
    id: 'gtdc_l1_ex1_11',
    listId: 'gtdc_l1',
    number: '1.11',
    title: 'Perdas na Linha em Condição de Carga Leve com e sem Capacitores',
    topic: 'Operação de Redes de Distribuição',
    questionText: 'No sistema da subestação do exercício 1.9, quando a carga é reduzida para 180 kW e 480 kVAr: b) Calcule as perdas na linha se os capacitores permanecerem ligados; c) Se forem retirados.',
    gabarito: 'b) 30,77126 kW',
    method: 'Com capacitores de 3,6 MVAr ligados e carga de 480 kVAr, a rede opera fortemente sobrecompensada (reativo líquido capacitivo de -3.120 kVAr), gerando corrente elevada e perdas excessivas na linha (30,77 kW). Recomendação: desligar o banco em carga leve.',
    keyFormulas: ['Q_liq = Q_carga - Q_cap', 'Perdas = 3 * |IL|² * R_linha']
  },

  // ===================== GTDC LISTA 2: SISTEMAS EM PU =====================
  {
    id: 'gtdc_l2_ex2_1',
    listId: 'gtdc_l2',
    number: '2.1',
    title: 'Cálculo de Tensão e Compensação por PU',
    topic: 'Sistema Por Unidade',
    questionText: 'Carga trifásica equilibrada de 900 kW (FP = 0,6 atrasado) a 2.500√3 V alimentada por linha 1 + j3 Ω/fase. Banco de capacitores em Y fornece 1.125 kVAr a 2.500√3 V. Base do sistema: 750 kVA (trifásica) e 2,6√3 kV (linha). Determine a tensão Vab no início da linha com o banco desligado e ligado utilizando PU.',
    gabarito: 'a) 5.380,52 ∠ 33,69° V; b) 4.629,77 ∠ 37,52° V',
    method: 'Z_base = V_base² / S_base = (2,6√3 * 10³)² / 750.000 = 27,04 Ω. Z_linha(pu) = (1 + j3)/27,04 pu. P_pu = 900/750 = 1,2 pu. Resolver circuito monofásico equivalente totalmente em pu e desnormalizar multiplicando por V_base.',
    keyFormulas: ['Z_base = V_base² / S_base', 'Z_pu = Z_ohms / Z_base', 'V_real = V_pu * V_base']
  },
  {
    id: 'gtdc_l2_ex2_3',
    listId: 'gtdc_l2',
    number: '2.3',
    title: 'Compensação Reativa Resolvida em PU',
    topic: 'Sistema Por Unidade',
    questionText: 'Repita o exercício 1.8 utilizando a representação em pu na base de 360 kVA (trifásica) e 4,8√3 kV (linha). Determine também a potência reativa total associada ao banco de capacitores.',
    gabarito: 'a) CY = 44,32934 µF; b) 8,86442°; c) S_inicio = 492,09384 - j819,07038 kVA; Qc = -1.155,117367 kVAr',
    method: 'Conversão dos parâmetros da linha e da carga para a base 360 kVA e 4,8√3 kV. Resolução em pu e conversão das potências para kVAr.',
    keyFormulas: ['S_base = 360 kVA', 'V_base = 4,8√3 kV', 'Q_real = Q_pu * S_base']
  },
  {
    id: 'gtdc_l2_ex2_4',
    listId: 'gtdc_l2',
    number: '2.4',
    title: 'Compensação com Carga Capacitiva em PU',
    topic: 'Sistema Por Unidade',
    questionText: 'Repita o exercício 1.8 em pu admitindo carga monofásica de 150 kVA com FP = 0,8 adiantado na base de 600 kVA e 5√3 kV. Determine a capacitância e o reativo do banco.',
    gabarito: 'a) CY = 23,60604 µF; b) 8,86442°; c) S_inicio = 492,09384 - j819,07038 kVA; Qc = -615,117303 kVAr',
    method: 'Mudança de parâmetros para carga com fator de potência adiantado em representação PU.',
    keyFormulas: ['Qc = Q_desejado - Q_carga', 'C = Qc / (ω * V²)']
  },

  // ===================== GTDC LISTA 3: REPRESENTAÇÃO DE SEP EM PU =====================
  {
    id: 'gtdc_l3_ex3_1',
    listId: 'gtdc_l3',
    number: '3.1',
    title: 'Diagrama de Impedâncias em PU de Sistema Gerador-Trafos-LT-Carga',
    topic: 'Diagrama de Impedâncias em PU',
    questionText: 'Gerador síncrono (150 MVA, 13,9 kV, xs = 15%), Trafo 1 (3 unidades 1φ de 50 MVA, 8/138 kV, xT = 12% em Y-Δ), Trafo 2 (100 MVA, 138/13,6 kV, xT = 10% em Y-Y), LT (5 + j20 Ω) e Carga (50 MW, FP = 0,85 indutivo, 13 kV). Escolha como base do sistema os dados nominais do gerador e determine o diagrama de impedâncias em pu e a corrente da carga.',
    gabarito: 'a) Zg = j0,15 pu; ZT1 = j0,11925 pu; ZLT = 0,039136 + j0,15654 pu; ZT2 = j0,14906 pu; Zcarga = 1,968065 + j1,219698 pu; b) I_carga = 0,41155 pu e 2.612,44466 A; c) Zg = j0,19321 Ω, ZT1(AT) = j45,7056 Ω, ZLT = 5 + j20 Ω, ZT2(AT) = j19,044 Ω, Zcarga = 2,44205 + j1,51345 Ω',
    method: 'Determinação das tensões base em cada trecho a partir do trafo 1 (Y-Δ: tensão no lado AT é √3*8 = 13,856 kV / 138 kV => Vbase2 = 138 kV, Vbase3 = 13,6 kV). Mudança de base dos trafos e impedância base da linha Zbase_LT = 138²/150 = 127,224 Ω.',
    keyFormulas: ['Z_pu_novo = Z_pu_antigo * (V_ant/V_novo)² * (S_novo/S_ant)', 'Zbase = Vbase² / Sbase']
  },
  {
    id: 'gtdc_l3_ex3_2',
    listId: 'gtdc_l3',
    number: '3.2',
    title: 'Diagrama em PU com Transformador de 3 Enrolamentos e Banco de Capacitores',
    topic: 'Transformadores de 3 Enrolamentos em PU',
    questionText: 'No sistema do exercício 3.1, o trafo 2 é substituído por trafo de 3 enrolamentos (P: 100 MVA, 138 kV; S: 100 MVA, 13,6 kV; T: 50 MVA, 13,2 kV em Y-Y-Y) com ZPS = j0,1 pu (100 MVA, 138 kV), ZPT = j0,04 pu (50 MVA, 138 kV) e ZST = j0,06 pu (50 MVA, 13,6 kV). Banco de capacitores de -j30 Ω em triângulo no terciário. Determine o diagrama em pu.',
    gabarito: 'Zcap = -j8,554902 pu; ZT2_P = j0,044718 pu; ZT2_S = j0,104342 pu; ZT2_T = j0,0745303 pu',
    method: 'Converter ZPT e ZST para a base de 150 MVA do sistema: ZPT_novo = j0,04*(150/50) = j0,12 pu; ZST_novo = j0,06*(150/50) = j0,18 pu; ZPS_novo = j0,1*(150/100) = j0,15 pu. Modelo estrela: ZP = 0.5*(ZPS + ZPT - ZST), ZS = 0.5*(ZPS - ZPT + ZST), ZT = 0.5*(-ZPS + ZPT + ZST). Converter banco de capacitores em Δ para Y e depois para pu.',
    keyFormulas: ['ZP = 0.5*(ZPS + ZPT - ZST)', 'ZS = 0.5*(ZPS - ZPT + ZST)', 'ZT = 0.5*(-ZPS + ZPT + ZST)', 'ZY_cap = ZΔ_cap / 3']
  },
  {
    id: 'gtdc_l3_ex3_3',
    listId: 'gtdc_l3',
    number: '3.3',
    title: 'Sistema com 2 Geradores, Linhas Paralelas e Motor Síncrono',
    topic: 'Diagrama de Impedâncias de SEP',
    questionText: 'Sistema com G1 (20 MVA, 13,8 kV, xs=20%), G2 (30 MVA, 18 kV, xs=20%), Motor (30 MVA, 20 kV, xs=20%), T1 (25 MVA, 13,8/220 kV, 10%), T2 (3x10 MVA, 17/130 kV, 20%), T3 (35 MVA, 220/22 kV, xBT=1,38286 Ω), LT2-3 (10 + j90 Ω) e LT3-5 (30 + j150 Ω). Base do sistema: motor síncrono. Calcule o diagrama em pu e impedâncias reais.',
    gabarito: 'a) Zg1 = j0,363 pu, ZT1 = j0,1452 pu, ZLT-23 = 0,0075 + j0,0675 pu, ZLT-35 = 0,0225 + j0,1125 pu, ZT2 = j0,2535 pu, Zg2 = j0,2842 pu, ZT3 = j0,10371 pu, Zm = j0,2 pu; b) ZT2(AT) = j338 Ω e ZT2(BT) = j5,78 Ω; c) Na base do trafo 2: Zg1 = j0,28639 pu, ZT1 = j0,11456 pu, ZT2 = j0,2 pu, Zm = j0,15779 pu',
    method: 'Definição de trechos de tensão por trafos, cálculo de Zbase em cada trecho, mudança de base de geradores e trafos para a base global do motor.',
    keyFormulas: ['Zbase = Vbase² / Sbase', 'Z_pu = Z_real / Zbase']
  },
  {
    id: 'gtdc_l3_ex3_4',
    listId: 'gtdc_l3',
    number: '3.4',
    title: 'Sistema com Trafo de 3 Enrolamentos e Linhas em Paralelo',
    topic: 'Transformador 3 Enrolamentos e SEP',
    questionText: 'Sistema com gerador, motor, trafos e linhas com dados em pu e ohms, tendo Trafo 3 com 3 enrolamentos (Y-Δ-Δ). Base do sistema: valores nominais do trafo 3. Determine o diagrama de impedâncias em pu.',
    gabarito: 'Zg = j0,13724 pu, Zm = j0,243 pu, ZT1 = j0,20833 pu, ZT2 = j0,13333 pu, ZT3_P = j0,035 pu, ZT3_S = j0,035 pu, ZT3_T = j0,055 pu, ZLT-24 = 0,008333 + j0,03333 pu, ZLT-34 = 0,013889 + j0,05556 pu, Zcarga = 2,551985 + j5,954631 pu',
    method: 'Ajuste de base de todos os elementos para a base do trafo 3 (45 MVA, 138√3 kV). Obtenção do modelo estrela do trafo 3.',
    keyFormulas: ['Mudança de base para Sbase = 45 MVA', 'ZP = 0.5*(ZPS + ZPT - ZST)']
  },
  {
    id: 'gtdc_l3_ex3_6',
    listId: 'gtdc_l3',
    number: '3.6',
    title: 'Tensões e Correntes Reais a partir do Diagrama em PU (com Defasagem Y-Δ)',
    topic: 'Desnormalização de Grandezas em PU',
    questionText: 'Para o sistema do exercício 3.1, determine em grandezas reais: a) Tensão de fase Eg(a); b) V1(bc); c) V2(ca); d) Corrente ILT(b); e) Potência complexa Sg.',
    gabarito: 'a) Eg(a) = 8,89243 ∠ 40,01° kV; b) V1(bc) = 14,84401 ∠ -52,46° kV; c) V2(ca) = 143,62628 ∠ 155,443° kV; d) ILT = 257,45837 ∠ -151,788° A; e) Sg = 50,99428 + j45,59166 MVA',
    method: 'Resolução no circuito monofásico equivalente em pu considerando a defasagem de 30° introduzida pelo Trafo 1 (Y-Δ) ao cruzar a fronteira de transformação.',
    keyFormulas: ['V_real = V_pu * Vbase', 'I_real = I_pu * Ibase', 'Defasagem Y-Δ: +30° do lado Y']
  },
  {
    id: 'gtdc_l3_ex3_9',
    listId: 'gtdc_l3',
    number: '3.9',
    title: 'Análise Completa de Fluxo com Divisor de Corrente e Conservação de Potência',
    topic: 'Análise de SEP em PU',
    questionText: 'Para o sistema do exercício 3.3 com motor operando a 25 MVA, FP = 0,85 indutivo e 19 kV. Determine tensões geradas, tensões de barras, correntes nas linhas e verifique a conservação de potência.',
    gabarito: 'a) Eg1(a) = 8,57169 ∠ -125,227° kV e Eg2(a) = 10,31705 ∠ 174,773° kV; b) V5(bc) = 207,18096 ∠ 106,218° kV; c) V6(ab) = 16,64579 ∠ -159,464° kV; d) I23(c) = 40,30395 ∠ -82,368° A e I53(c) = 35,66759 ∠ -81,133° A; e) Ig1(b) = 642,52691 ∠ 67,632° A; f) Em(a) = 10,051099 ∠ -179,864° kV; g) P_fornecida = P_absorvida = 21,413 MW; h) Eg2(c) = 11,58796 ∠ -79,888° kV',
    method: 'Divisor de corrente no barramento comum para determinar o compartilhamento de carga entre os dois geradores.',
    keyFormulas: ['I_ramo = I_total * (Z_outro / (Z_ramo + Z_outro))', '∑ P_fornecida = ∑ P_absorvida']
  },

  // ===================== GTDC LISTA 4: REPRESENTAÇÃO MATRICIAL DA REDE ELÉTRICA =====================
  {
    id: 'gtdc_l4_ex4_1',
    listId: 'gtdc_l4',
    number: '4.1',
    title: 'Impedância de Thévenin e Matriz Zbarra por Inversão',
    topic: 'Matriz Zbarra e Thévenin',
    questionText: 'Para o sistema de 3 barras com reatâncias em pu, determine a impedância de Thévenin vista pela barra 3 sem usar a matriz, e em seguida determine Zbarra.',
    gabarito: 'Zth3 = j0,83378 pu e Zbarra = [j0,28378 j0,15135 j0,28378; j0,15135 j0,45404 j0,15135; j0,28378 j0,15135 j0,83378] pu',
    method: 'Montar Ybarra diretamente pelas somas de admitâncias nos nós. Inverter Ybarra para encontrar Zbarra = (Ybarra)⁻¹. Verificar que Z_33 = Zth3.',
    keyFormulas: ['Ykk = yk0 + ∑ ykj', 'Ykj = -ykj', 'Zbarra = Ybarra⁻¹', 'Zth_k = Zkk']
  },
  {
    id: 'gtdc_l4_ex4_2',
    listId: 'gtdc_l4',
    number: '4.2',
    title: 'Matriz Zbarra de Rede com 4 Barras',
    topic: 'Matriz Zbarra',
    questionText: 'Para o sistema de 4 barras, determine a impedância de Thévenin vista pela barra 2 e a matriz Zbarra completa em pu.',
    gabarito: 'Zth2 = j0,7319 pu e Zbarra diagonal: Z11=j0,7166, Z22=j0,7319, Z33=j0,7166, Z44=j0,7631 pu',
    method: 'Construção direta de Ybarra (4x4) e inversão matricial para obter Zbarra.',
    keyFormulas: ['Zbarra = inv(Ybarra)']
  },
  {
    id: 'gtdc_l4_ex4_3',
    listId: 'gtdc_l4',
    number: '4.3',
    title: 'Tensões Nodais por Representação Matricial em Grandezas Reais',
    topic: 'Solução Nodal Matricial',
    questionText: 'Para o circuito de 3 barras com fontes de corrente independentes, determine as tensões V1, V2 e V3 utilizando [i] = [Ybarra][V].',
    gabarito: '[V1; V2; V3] = [12,70542 ∠ 92,0607°; 12,03208 ∠ 98,4955°; 11,85476 ∠ 88,8729°] V',
    method: 'Montagem de Ybarra com admitâncias complexas Y = 1/Z. Vetor de injeções de corrente [i]. Solução [V] = [Ybarra]⁻¹ * [i].',
    keyFormulas: ['[V] = [Ybarra]⁻¹ * [i]']
  },
  {
    id: 'gtdc_l4_ex4_4',
    listId: 'gtdc_l4',
    number: '4.4',
    title: 'Tensões Nodais em PU e Corrente em Banco de Capacitores Shunt',
    topic: 'Solução Nodal e Capacitores Shunt',
    questionText: 'Para o sistema com fontes de tensão e reatâncias em pu, determine: a) As tensões nodais em todas as barras; b) A corrente que circulará em capacitor com susceptância de 25% conectado na barra 3.',
    gabarito: 'a) [V1; V2; V3] = [0,98121 ∠ 32,3621°; 1,00096 ∠ 33,4712°; 0,95047 ∠ 32,6435°] pu; b) I_cap = 0,24936 ∠ 122,6435° pu',
    method: 'Converter fontes de tensão para fontes Norton em paralelo com admitância. Montar Ybarra e resolver [V] = inv(Ybarra)*[i]. Corrente no capacitor: I_cap = V3 * (jB_cap) = V3 * (j0,25).',
    keyFormulas: ['i_k = E_k / z_k', '[V] = [Zbarra] * [i]', 'I_cap = V3 * jB_cap']
  },
  {
    id: 'gtdc_l4_ex4_5',
    listId: 'gtdc_l4',
    number: '4.5',
    title: 'Matriz Ybarra de Sistema do Exercício 3.1 com Reator e Capacitor em Derivação',
    topic: 'Ybarra e Compensação Shunt',
    questionText: 'Para o sistema do exercício 3.1, determine: a) A matriz Ybarra; b) A tensão na barra 3 com gerador a 1,07 ∠ 0° pu; c) A tensão na barra 3 com reator shunt de 10 pu; d) Com capacitor shunt de 10 pu.',
    gabarito: 'a) Ybarra 4x4; b) V3 = 0,95268 ∠ -6,98046° pu; c) V3_reator = 0,91848 ∠ -6,5349° pu; d) V3_cap = 0,989466 ∠ -7,46046° pu',
    method: 'Modificação do elemento Y33 da matriz Ybarra somando a admitância do reator (-j0,1) ou do capacitor (+j0,1) e resolvendo o novo sistema.',
    keyFormulas: ['Y33_novo = Y33_antigo + y_shunt', 'V3 = Zth3 * I_inj / (1 + Zth3 * y_shunt)']
  },
  {
    id: 'gtdc_l4_ex4_6',
    listId: 'gtdc_l4',
    number: '4.6',
    title: 'Matriz Ybarra 6x6 e Tensões Nodais em Sistema Interconectado',
    topic: 'Ybarra de Ordem Elevada',
    questionText: 'Para o sistema do exercício 3.3 com 6 barras, determine a matriz Ybarra e o vetor com as tensões em todas as 6 barras para geradores G1, G2 e Motor.',
    gabarito: 'b) [V1; V2; V3; V4; V5; V6] = [0,9777142 ∠ 29,4189°; 0,969835 ∠ 24,9884°; 0,964527 ∠ 22,9169°; 0,960871 ∠ 18,4974°; 0,974876 ∠ 24,1272°; 0,990135 ∠ 26,9477°] pu',
    method: 'Montagem direta da matriz esparsa Ybarra 6x6 e inversão para produto com vetor de injeções de geradores.',
    keyFormulas: ['[V] = inv(Ybarra) * [I_inj]']
  },

  // ===================== GTDC LISTA 5: MODELOS DE LINHAS DE TRANSMISSÃO =====================
  {
    id: 'gtdc_l5_ex5_1',
    listId: 'gtdc_l5',
    number: '5.1',
    title: 'Linha Curta (18 km) com Diferentes Fatores de Potência',
    topic: 'Linhas de Transmissão Curtas',
    questionText: 'LT de 18 km alimenta carga de 2500 kW a 11 kV com z = 0,2357 + j0,4139 Ω/km. Determine a tensão no início da linha e a regulação percentual para: i) FP = 0,8 atrasado; ii) unitário; iii) 0,9 adiantado.',
    gabarito: 'a) i) 13,2697 kV; ii) 12,0834 kV; iii) 11,3517 kV; b) Regulação: i) 20,63 %; ii) 9,85 %; iii) 3,2 %',
    method: 'Modelo de linha curta: Z = z * 18 = 4,2426 + j7,4502 Ω. Corrente IL = P / (√3 * VL * FP) ∠ -θ. Tensão no envio: Vs = Vr + Z*IL. Regulação = (|Vs| - |Vr|) / |Vr| * 100%.',
    keyFormulas: ['Vs = Vr + Z * Ir', 'Regulação = (|Vs| - |Vr|) / |Vr| * 100%']
  },
  {
    id: 'gtdc_l5_ex5_2',
    listId: 'gtdc_l5',
    number: '5.2',
    title: 'Linha Média (170 km) Modelo π-Nominal e Constantes ABCD',
    topic: 'Linhas de Transmissão Médias',
    questionText: 'LT de 170 km alimenta carga de 55 MVA a 132 kV, 60 Hz com FP = 0,8 indutivo. r = 0,07553 Ω/km, L = 1,13531 mH/km, C = 9,06977 nF/km. Determine: a) Constantes ABCD; b) Tensão, corrente, potências ativa/reativa e FP no início da linha; c) Regulação.',
    gabarito: 'a) A = D = 0,9788 ∠ 0,219°, B = 73,884 ∠ 80° Ω, C = 5,768*10⁻⁴ ∠ 90,108° S; b) Vs = 88,444 ∠ 8,08° kV, Is = 212,099 ∠ -27,09° A, Ps = 46,003 MW, Qs = 32,416 MVAr, FP = 0,817 atrasado; c) Regulação = 18,57 %',
    method: 'Z = (r + jωL)*170, Y = (jωC)*170. Constantes ABCD de linha média π-nominal: A = 1 + ZY/2, B = Z, C = Y(1 + ZY/4). Vs = A*Vr + B*Ir, Is = C*Vr + D*Ir.',
    keyFormulas: ['A = 1 + ZY/2', 'B = Z', 'C = Y*(1 + ZY/4)', 'Regulação = (|Vs/A| - |Vr|) / |Vr| * 100%']
  },
  {
    id: 'gtdc_l5_ex5_3',
    listId: 'gtdc_l5',
    number: '5.3',
    title: 'Linha Longa (402,3 km) com Modelo Hiperbólico e PU',
    topic: 'Linhas de Transmissão Longas',
    questionText: 'LT de 402,3 km (250 milhas) alimenta 125 MW a 230 kV com FP = 0,9 indutivo. Em pu (150 MVA, 240 kV), determine tensão, corrente, potência ativa no início, máxima potência transferível e regulação da linha. z = 0,75 ∠ 80° Ω/milha, y = 7*10⁻⁶ ∠ 90° S/milha.',
    gabarito: 'Vs = 157,25562 ∠ 20,1287° kV; Is = 284,67536 ∠ 20,6683° A; Ps = 134,2944 MW; P_max = 303,68599 MW; Regulação = 40,473 %',
    method: 'γ = √(z*y), Zc = √(z/y). Funções hiperbólicas A = D = cosh(γl), B = Zc*sinh(γl), C = (1/Zc)*sinh(γl). Pmax = |Vs||Vr|/|B| - |A||Vr|²/|B| * cos(β - α).',
    keyFormulas: ['γ = √(zy)', 'Zc = √(z/y)', 'A = cosh(γl)', 'Pmax = (|Vs||Vr|/|B|) - (|A||Vr|²/|B|)*cos(β - α)']
  },
  {
    id: 'gtdc_l5_ex5_5',
    listId: 'gtdc_l5',
    number: '5.5',
    title: 'Comparação de Modelos de Linha Curta, Média e Longa',
    topic: 'Comparação de Modelos de LT',
    questionText: 'LT de 402,3 km alimenta 50 MW a 230 kV com FP = 0,8 atrasado. Determine a tensão de linha e corrente de envio e regulação considerando: a) Linha curta; b) Linha média; c) Linha longa.',
    gabarito: 'a) Curta: 275,75042 ∠ 37,3603° kV, 156,88866 ∠ -36,8699° A, 19,89 %; b) Média: 246,69142 ∠ 40,0302° kV, 139,64139 ∠ 38,66575° A, 23,6 %; c) Longa: 244,82058 ∠ 39,7725° kV, 142,84608 ∠ 39,4723° A, 22,28 %',
    method: 'Aplicação sequencial das formulações curta (A=1), média (π-nominal) e longa (hiperbólica) para evidenciar os desvios causados pela distribuição espacial dos parâmetros.',
    keyFormulas: ['Curta vs Média vs Longa']
  },
  {
    id: 'gtdc_l5_ex5_6',
    listId: 'gtdc_l5',
    number: '5.6',
    title: 'Linha Longa Operando a Vazio (Efeito Ferranti)',
    topic: 'Efeito Ferranti',
    questionText: 'LT de 321,9 km (200 milhas) opera a 345 kV em vazio. r = 0,2 Ω/milha, L = 2,5 mH/milha, C = 16,9 nF/milha. Determine a corrente de carregamento no início da linha.',
    gabarito: 'Is = 276,2226 ∠ 88,9054° A',
    method: 'Em vazio Ir = 0. A corrente no início é Is = C * Vr = (1/Zc)*sinh(γl) * Vr.',
    keyFormulas: ['Is(vazio) = C * Vr = (1/Zc) * sinh(γl) * Vr']
  },

  // ===================== GTDC LISTA 6: COMPENSAÇÃO REATIVA EM LTS =====================
  {
    id: 'gtdc_l6_ex6_1',
    listId: 'gtdc_l6',
    number: '6.1',
    title: 'Divisão de Linha em Dois Quadripolos e Quadripolo Equivalente',
    topic: 'Quadripolos em Cascata',
    questionText: 'LT de 600 km com z = j0,34 Ω/km e y = j4,8 µS/km alimenta 2 GW a 750 kV. a) Quadripolo de 600 km; b) Dois trechos de 300 km em cascata; c) Tensão e corrente no ponto médio; d) Tensão e corrente no início.',
    gabarito: 'a) A = D = 0,7203, B = j184,6 Ω, C = j2,606*10⁻³ S; b) Trecho 300 km: A1 = 0,9275, B1 = j99,52 Ω, C1 = j1,405*10⁻³ S; c) V_meio = 429,855 ∠ 20,88° kV, I_meio = 1.552,18 ∠ 23,07° A; d) Vs = 422,029 ∠ 42,33° kV, Is = 1.582,34 ∠ 45,49° A',
    method: 'Multiplicação de matrizes de quadripolos em cascata: [T_total] = [T1] * [T2]. Comprovação de que a cascata de duas metades equivale à linha inteira.',
    keyFormulas: ['[T_eq] = [T1] * [T2]']
  },
  {
    id: 'gtdc_l6_ex6_2',
    listId: 'gtdc_l6',
    number: '6.2',
    title: 'Regulação e Efeito Ferranti em Linha de 300 milhas sem Compensação',
    topic: 'Regulação de Linha Longa',
    questionText: 'LT de 300 milhas alimenta 400 MVA (FP = 0,8 atrasado) a 345 kV com A = D = 0,8180 ∠ 1,3°, B = 172,2 ∠ 84,2° Ω, C = 0,001933 ∠ 90,4° S. Determine tensão/corrente de envio a plena carga, tensão a vazio e regulação.',
    gabarito: 'a) Vs = 256,73613 ∠ 20,1525° kV, Is = 447,66986 ∠ 8,5430° A, queda = 22,42%; b) Vr(vazio) = 313,858345 ∠ 18,8525° kV, Is(vazio) = 606,68818 ∠ 109,2525° A; c) Regulação = 57,57 %',
    method: 'Vr_fase = 345k/√3 = 199,186 kV. Vs = A*Vr + B*Ir. Vr(vazio) = Vs / A. Regulação = (|Vr(vazio)| - |Vr|) / |Vr| * 100%.',
    keyFormulas: ['Vr(vazio) = Vs / A', 'Regulação = (|Vs/A| - |Vr|) / |Vr| * 100%']
  },
  {
    id: 'gtdc_l6_ex6_3',
    listId: 'gtdc_l6',
    number: '6.3',
    title: 'Compensação Reativa Série no Ponto Central da Linha de Transmissão',
    topic: 'Compensação Série',
    questionText: 'Banco de capacitores série de 100 Ω instalado no ponto central da LT do exercício 6.2 (dois trechos de 150 milhas com A = 0,9534 ∠ 0,3°, B = 90,33 ∠ 84,1° Ω, C = 0,001014 ∠ 90,1° S). Determine: a) Tensão e corrente de envio e queda de tensão; b) Tensão a vazio; c) Regulação; d) Aumento percentual na capacidade máxima de transmissão.',
    gabarito: 'a) Vs = 227,52175 ∠ 10,09098° kV, Is = 497,15534 ∠ 5,62487° A, queda = 12,45%; b) Vr(vazio) = 248,74595 ∠ 8,87255° kV, Is(vazio) = 506,52490 ∠ 99,26246° A; c) Regulação = 24,88 %; d) Aumento de Pmax = 62,85 %',
    method: 'Cascata de três quadripolos: [T_novo] = [T_trecho1] * [T_cap] * [T_trecho2]. B_novo é substancialmente menor, reduzindo a queda de tensão e aumentando Pmax.',
    keyFormulas: ['[T_novo] = [T1] * [1 -jXc; 0 1] * [T2]', 'ΔPmax = (Pmax_novo / Pmax_antigo - 1) * 100%']
  },
  {
    id: 'gtdc_l6_ex6_4',
    listId: 'gtdc_l6',
    number: '6.4',
    title: 'Compensação Reativa Shunt no Fim de Linha contra Sobretensão a Vazio',
    topic: 'Compensação Shunt',
    questionText: 'Banco de reatores shunt de 300 MVAr e 345 kV conectado no fim da LT do exercício 6.2 em vazio. Determine a nova tensão a vazio e a nova regulação.',
    gabarito: 'a) Vr(vazio) = 205,41352 ∠ 21,31249° kV, Is(vazio) = 27,22046 ∠ -54,1421° A; b) Regulação = 3,13 % (reduzida de 57,57% para 3,13%)',
    method: 'Reator shunt consome a corrente capacitiva em vazio. B_L = -300M / 345k² = -0,00252 S. A_novo = A + j*B*B_L. Vr(vazio) = Vs / A_novo.',
    keyFormulas: ['A_novo = A + j*B*B_L', 'Vr(vazio) = Vs / A_novo']
  },
  {
    id: 'gtdc_l6_ex6_5',
    listId: 'gtdc_l6',
    number: '6.5',
    title: 'Compensação Conjunta Série e Shunt em Vazio',
    topic: 'Compensação Série-Shunt',
    questionText: 'Linha com compensação série do exercício 6.3 operando a vazio com reator shunt de 300 MVAr do exercício 6.4 no fim da linha. Calcule Vr(vazio) e a regulação.',
    gabarito: 'a) Vr(vazio) = 203,55849 ∠ 1,38868° kV e Is = 55,14871 ∠ -71,15338° A; b) Regulação = 2,195 %',
    method: 'Associação conjunta: capacitores série mantêm capacidade elevada a plena carga e reatores shunt controlam a tensão em vazio para regulação quase nula.',
    keyFormulas: ['Regulação = (|Vr(vazio)| - |Vr|) / |Vr| * 100%']
  },
  {
    id: 'gtdc_l6_ex6_6',
    listId: 'gtdc_l6',
    number: '6.6',
    title: 'Reatância de Reatores Shunt para Comportamento de Linha Curta',
    topic: 'Compensação Shunt Plena',
    questionText: 'Determine o valor da reatância do banco de reatores shunt (em Ω) que deve ser instalado no final da linha do exercício 6.2 para que a linha se comporte como linha curta em vazio (A_novo = 1).',
    gabarito: '940,197 Ω',
    method: 'Impor A_novo = A + j*B*B_L = 1. Como B = |B|∠β, resolve-se para B_L = (1 - A) / (j*B). X_reator = 1 / |B_L|.',
    keyFormulas: ['B_L = Im{(1 - A) / (j * B)}', 'X_reator = 1 / |B_L|']
  }
];
