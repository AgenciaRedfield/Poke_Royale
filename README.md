# PokéClash Royale 🚀

Um jogo de batalha tática em tempo real inspirado em Clash Royale e focado no universo Pokémon. Desenvolvido com **Vanilla JavaScript**, **Vite** e **PokéAPI**.

![PokéClash Preview](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png)

## ✨ Funcionalidades

- **Batalhas em Tempo Real**: Posicione seus Pokémon na arena para derrubar as torres do oponente.
- **Batalhas Online (PvP)**: Sistema de Matchmaking real-time com sincronização de unidades, feitiços e dano em torres.
- **Modo Treino (Bot)**: Pratique suas jogadas contra uma IA inteligente antes de enfrentar outros treinadores.
- **Sistema de Projéteis**: Pokémon com tipos elementares (Fogo, Água, etc.) agora atacam à distância com projéteis visuais e mecânicas de trajetória.
- **Dano em Área (Splash)**: Pokémon Épicos, Lendários ou de tipos específicos (Fogo, Dragão, Pedra) causam dano em área, ideal para limpar hordas.
- **Vantagem de Tipos**: Sistema de fraquezas e resistências clássico de Pokémon integrado ao dano (ex: Água > Fogo).
- **Sistema de "Juice" & VFX**: Screen shake (tremor de tela), Impact Flash, e Floating Combat Text (números de dano flutuantes) para uma experiência visceral.
- **Física de Tropas**: Sistema de anti-colisão e agrupamento que impede que unidades se sobreponham, garantindo uma formação de batalha natural.
- **Deploy Automático**: Tempo de invocação de 1 segundo com feedback visual (unidades desbotadas) antes de entrarem na ação.
- **Sistema de Deck & Evolução**: Monte um deck de 8 cartas e evolua seus Pokémon usando Moedas e Doces da PokéAPI.
- **Progressão do Treinador**: Conquiste 5 Arenas/Ligas, ganhe Insígnias e suba de nível para desbloquear bônus.
- **Dificuldade Balanceada**: Curva de aprendizado suave com IA facilitada para iniciantes na primeira Arena.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, Vanilla CSS, JavaScript (ES6+).
- **Backend**: [Supabase](https://supabase.com/) para dados persistentes (perfis, ranking) e sistema Real-Time (matchmaking, sincronização PvP).
- **Tooling**: [Vite](https://vitejs.dev/) para desenvolvimento e build.
- **API**: [PokéAPI](https://pokeapi.co/) para dados e sprites de Pokémon.
- **Ícones**: Font Awesome.

## 🚀 Como Executar Localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/poke-clash.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Abra o navegador em `http://localhost:5173`.

## 🌐 Deploy na Vercel

Este projeto está pronto para ser hospedado na Vercel. 

1. Conecte seu repositório GitHub à Vercel.
2. Certifique-se de que o comando de Build seja `npm run build` e o diretório de saída seja `dist`.
3. Clique em **Deploy** e pronto!

## 📜 Licença

Este projeto é para fins educacionais. Os ativos de Pokémon são propriedade da Nintendo/The Pokémon Company.
