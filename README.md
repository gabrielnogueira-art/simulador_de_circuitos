# Simulador de Circuitos Eletricos (Estilo PLECS) ⚡

Um simulador de circuitos eletricos moderno, de alta performance e interativo para a web, inspirado na estetica e precisao de ferramentas profissionais como o **PLECS(R)**.

Desenvolvido com **React 19**, **TypeScript**, **Vite** e **HTML5 Canvas**, oferecendo suporte completo a dispositivos moveis (smartphones/tablets) e computadores desktop.

---

## 🚀 Principais Funcionalidades

### 1. Motor de Simulacao Transient (MNA)
- **Analise Nodal Modificada (Modified Nodal Analysis - MNA)** em tempo real com algoritmo Companion Model (Euler Reverso).
- Suporte a componentes lineares e nao-lineares:
  - Resistores (R)
  - Capacitores (C)
  - Indutores (L)
  - Fontes de Tensao Continua (DC)
  - Fontes Senoidais Alternadas (AC) com ajuste de amplitude e frequencia
  - Diodos semicondutores nao-lineares com iteracao dinamica de condutancia e Vf
  - Terminais de Porta / Conexao (a e b) para medicao de Thevenin / Impedancia

### 2. Calculo Analitico de Impedancia Equivalente (Zab)
- **Solucionador Fasorial Complexo no Dominio da Frequencia**:
  - Injecao de teste unitario 1∠0° A entre os nos a e b.
  - Resolucao da matriz de admitancias complexas Y * V = I.
  - Exibicao de Zab nos formatos **Retangular** (R + jX Ω) e **Polar** (|Z| ∠ θ°).
  - Classificacao automatica da carga: **Capacitiva** (θ < 0°) ou **Indutiva** (θ > 0°).
  - Validacao exata com circuitos academicos de prova (ex: Zab = 34,68836 - j6,9301 Ω).

### 3. Edicao de Condutores com Roteamento Ortogonal (Manhattan)
- Fios clicaveis com trechos ortogonais independentes (horizontal e vertical).
- Handles visuais de arraste:
  - Trechos horizontais movem na vertical (↕).
  - Trechos verticais movem na horizontal (↔).
- Permite ajustar o layout do circuito livremente mantendo angulos retos de 90° sem distorcer o tracado nem romper as ligacoes.

### 4. Reconhecimento de Circuitos por Foto (Photo-to-Circuit)
- Envie uma foto de um circuito desenhado a mao no papel ou diagrama de livro/prova.
- O sistema processa o esquematico via visao computacional, detectando simbolos e conexoes.
- **Interface de Edicao Previa**: visualize a imagem lado a lado com as caixas delimitadoras, ajuste rotulos e posicoes antes de inserir na bancada.

### 5. Osciloscopio Multicanal Integrado (PLECS Scope)
- Visualizacao grafica de formas de onda de tensao e corrente nos nos e componentes.
- **Cursores Verticais C1 e C2**:
  - Arraste interativo para inspecionar pontos especificos do tempo.
  - Calculo instantaneo de Δt e frequencia equivalente (1/Δt).
  - Metricas automaticas: Vpp (Pico a Pico), RMS e Media DC.

### 6. Usabilidade Mobile & Touch
- Totalmente operavel pelo celular:
  - Arraste de componentes com 1 dedo.
  - Conexao de fios por toque com hitboxes ampliadas para os terminais.
  - **Pinch-to-zoom** (zoom com dois dedos) e pan da area de trabalho.
  - Gaveta deslizante (Drawer) para selecao rapida de componentes.

---

## 🛠️ Tecnologias Utilizadas

- **React 19**
- **TypeScript**
- **Vite**
- **HTML5 Canvas 2D**
- **Lucide React** (Icones)
- **Vanilla CSS / CSS Moderno** (sem dependencias pesadas)

---

## 💻 Como Rodar Localmente

1. Abra a pasta no terminal:
   `ash
   cd simulador_de_circuitos
   npm install
   npm run dev
   `

2. Acesse no navegador:
   `
   http://localhost:5173
   `

---

## 📦 Uso com GitHub Desktop

1. Abra o **GitHub Desktop**.
2. Clique em **File** -> **Add Local Repository...** (ou Ctrl + O).
3. Selecione a pasta do projeto:
   C:\Users\gpint\.gemini\antigravity-ide\simulador_de_circuitos
4. Clique em **Publish repository** para enviar ao GitHub!
