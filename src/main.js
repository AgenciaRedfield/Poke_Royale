import './style.css';

let GAME_DATA = {
  pokemonList: [],
  playerElixir: 5,
  maxElixir: 10,
  elixirRegenRate: 0.35, // per second
  units: [],
  towers: [],
  deck: [],
  hand: [],
  nextCard: null,
  enemyElixir: 5,
  lastFrameTime: performance.now(),
  gameOver: false,
  arenaRect: null,
  
  // Progression
  gold: 0,
  candies: 0,
  chests: [null, null, null, null],
  playerName: "Treinador",
  playerAvatar: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png",
  playerLevel: 1,
  playerXP: 0,
  
  // Collection & Deck building
  collection: [],
  deck: [], // active 8 cards
  battleDeck: [], // shuffled deck during gameplay
  selectedCollectionIndex: -1, // State for swapping cards
  selectedCardForUpgrade: null, // State for modal
  
  // Arenas & Leagues
  trophies: 0,
  wins: 0,
  losses: 0,
  
  // Shop State
  dailyOffers: [],
  
  // Battle State
  matchTime: 180,
  battleInterval: null
};

// --- Persistência (LocalStorage) ---
function saveGame() {
  const dataToSave = {
    gold: GAME_DATA.gold,
    candies: GAME_DATA.candies,
    playerName: GAME_DATA.playerName,
    playerAvatar: GAME_DATA.playerAvatar,
    playerLevel: GAME_DATA.playerLevel,
    playerXP: GAME_DATA.playerXP,
    collection: GAME_DATA.collection,
    deck: GAME_DATA.deck,
    trophies: GAME_DATA.trophies,
    wins: GAME_DATA.wins,
    losses: GAME_DATA.losses,
    chests: GAME_DATA.chests
  };
  localStorage.setItem("pokeClash_save", JSON.stringify(dataToSave));
}

function loadGame() {
  const saved = localStorage.getItem("pokeClash_save");
  if (saved) {
    const data = JSON.parse(saved);
    GAME_DATA.gold = data.gold ?? 0;
    GAME_DATA.candies = data.candies ?? 0;
    GAME_DATA.playerName = data.playerName ?? "Treinador";
    GAME_DATA.playerAvatar = data.playerAvatar ?? GAME_DATA.playerAvatar;
    GAME_DATA.playerLevel = data.playerLevel ?? 1;
    GAME_DATA.playerXP = data.playerXP ?? 0;
    GAME_DATA.collection = data.collection ?? [];
    GAME_DATA.deck = data.deck ?? [];
    GAME_DATA.trophies = data.trophies ?? 0;
    GAME_DATA.wins = data.wins ?? 0;
    GAME_DATA.losses = data.losses ?? 0;
    GAME_DATA.chests = data.chests ?? [null, null, null, null];
    return true;
  }
  return false;
}

const ARENAS = [
  { name: "Arena da Cidade de Pallet", minTrophies: 0, bg: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/locations/1.png", badgeImg: null },
  { name: "Arena da Cidade de Pewter", minTrophies: 100, bg: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/locations/2.png", badgeImg: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/boulder-badge.png", badgeName: "Insígnia da Rocha" },
  { name: "Arena da Cidade de Cerulean", minTrophies: 200, bg: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/locations/3.png", badgeImg: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/cascade-badge.png", badgeName: "Insígnia da Cascata" },
  { name: "Arena da Cidade de Vermilion", minTrophies: 300, bg: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/locations/4.png", badgeImg: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/thunder-badge.png", badgeName: "Insígnia do Trovão" },
  { name: "Arena da Cidade de Celadon", minTrophies: 400, bg: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/locations/5.png", badgeImg: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rainbow-badge.png", badgeName: "Insígnia do Arco-Íris" }
];

// --- Menu Navigation ---
function switchMenuTab(tabId) {
  document.querySelectorAll('.menu-tab').forEach(el => el.style.display = 'none');
  const target = document.getElementById(tabId);
  target.style.display = 'flex';
  
  if (tabId === 'shopTab') {
    if (GAME_DATA.dailyOffers.length === 0) generateDailyOffers();
    renderShop();
  }
}

document.getElementById('btnNavShop').addEventListener('click', () => switchMenuTab('shopTab'));
document.getElementById('btnNavCollection').addEventListener('click', () => {
    switchMenuTab('collectionTab');
    renderCollection();
});
document.getElementById('btnNavLeagues').addEventListener('click', () => {
    switchMenuTab('leaguesTab');
    renderLeagues();
});
document.getElementById('btnNavBadges').addEventListener('click', () => {
    switchMenuTab('badgesTab');
    renderBadges();
});

// --- Progression & Currencies ---
function updateCurrencyUI() {
  document.getElementById("goldVal").innerText = GAME_DATA.gold;
  document.getElementById("candyVal").innerText = GAME_DATA.candies;
  saveGame();
}

window.buySpecialChest = function(type) {
  let cost = type === 'mega' ? 20 : 50;
  if (GAME_DATA.candies >= cost) {
    const emptySlot = GAME_DATA.chests.findIndex(c => c === null);
    if (emptySlot === -1) {
      alert("Seus slots de baú estão cheios!");
      return;
    }
    
    GAME_DATA.candies -= cost;
    const chest = type === 'mega' ? 
      { name: "Mega Pokebola", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png", time: 0 } :
      { name: "Ultra Pokebola", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png", time: 0 };
    
    // Purchased chests are instant open
    GAME_DATA.chests[emptySlot] = chest;
    updateCurrencyUI();
    renderChests();
    playEffect('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'); // generic visual/audio filler
  } else {
    alert("Doces insuficientes!");
  }
}

// --- Shop Logic ---
function generateDailyOffers() {
  const count = 4;
  const pool = GAME_DATA.pokemonList;
  const offers = [];
  
  for (let i = 0; i < count; i++) {
    const card = pool[Math.floor(Math.random() * pool.length)];
    let cost = 500;
    if (card.rarity === "Épica") cost = 2000;
    if (card.rarity === "Lendária") cost = 10000;
    
    offers.push({ card: {...card}, cost: cost, bought: false });
  }
  
  GAME_DATA.dailyOffers = offers;
}

function renderShop() {
  const container = document.getElementById("dailyOffersSlots");
  container.innerHTML = "";
  
  GAME_DATA.dailyOffers.forEach((offer, index) => {
    const card = offer.card;
    const itemEl = document.createElement("div");
    itemEl.className = `shop-item rarity-${card.rarity.toLowerCase()}`;
    
    if (offer.bought) {
      itemEl.innerHTML = `
        <div class="rarity-tag">${card.rarity}</div>
        <img src="${card.frontSprite}" style="opacity: 0.3" />
        <h4 style="color:#94a3b8">ESGOTADO</h4>
        <button class="buy-btn" disabled style="background:#475569">Comprado</button>
      `;
    } else {
      itemEl.innerHTML = `
        <div class="rarity-tag">${card.rarity}</div>
        <img src="${card.frontSprite}" />
        <h4>${card.name}</h4>
        <button class="buy-btn" onclick="buyDailyOffer(${index})">
          <i class="fas fa-coins"></i> ${offer.cost}
        </button>
      `;
    }
    container.appendChild(itemEl);
  });
}

window.buyDailyOffer = function(index) {
  const offer = GAME_DATA.dailyOffers[index];
  if (GAME_DATA.gold >= offer.cost) {
    GAME_DATA.gold -= offer.cost;
    offer.bought = true;
    
    const existing = GAME_DATA.collection.find(c => c.id === offer.card.id);
    if (!existing) {
      const newCard = {...offer.card};
      newCard.copies = 1;
      GAME_DATA.collection.push(newCard);
    } else {
      existing.copies = (existing.copies || 0) + 1;
    }
    
    updateCurrencyUI();
    renderShop();
    playEffect('buy');
  } else {
    alert("Ouro insuficiente!");
  }
}

// --- Chest System ---
function getChestDrop() {
  const roll = Math.random();
  if (roll < 0.6) {
    return { name: "Pokebola", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png", time: 5 * 60 };
  } else if (roll < 0.9) {
    return { name: "Mega Pokebola", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png", time: 20 * 60 };
  } else {
    return { name: "Ultra Pokebola", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png", time: 30 * 60 };
  }
}

function renderChests() {
  const chestSlots = document.querySelectorAll(".chest-slot");
  GAME_DATA.chests.forEach((chest, index) => {
    const slotEl = chestSlots[index];
    if (chest === null) {
      slotEl.className = "chest-slot";
      slotEl.innerHTML = "Vazio";
      slotEl.onclick = null;
    } else {
      let content = `<img src="${chest.img}" /><br/>`;
      if (chest.time <= 0) {
        slotEl.className = "chest-slot has-chest ready";
        content += `<span class="timer" style="background:#facc15;color:#000;">ABRIR</span>`;
        slotEl.onclick = () => openChest(index);
      } else {
        slotEl.className = "chest-slot has-chest";
        const m = Math.floor(chest.time / 60);
        const s = chest.time % 60;
        content += `<span class="timer">${m}m ${s}s</span>`;
        slotEl.onclick = () => alert("Pokebola ainda abrindo.");
      }
      slotEl.innerHTML = content;
    }
  });
}

function openChest(index) {
  const chest = GAME_DATA.chests[index];
  if (chest && chest.time <= 0) {
    const goldBonus = Math.floor(Math.random() * 100) + 50;
    const candyBonus = Math.floor(Math.random() * 5) + 1;
    GAME_DATA.gold += goldBonus;
    GAME_DATA.candies += candyBonus;
    
    // Chance to drop a new card from the global pool
    let cardDropMsg = "";
    if (Math.random() < 0.4) {
        const drop = GAME_DATA.pokemonList[Math.floor(Math.random() * GAME_DATA.pokemonList.length)];
        const existing = GAME_DATA.collection.find(c => c.id === drop.id);
        
        if (!existing) {
            const newCard = {...drop};
            newCard.copies = 1;
            GAME_DATA.collection.push(newCard);
            cardDropMsg = `\nNOVA CARTA: ${drop.name.toUpperCase()}!`;
        } else {
            existing.copies = (existing.copies || 0) + 1;
            cardDropMsg = `\n+1 CARTA DE: ${drop.name.toUpperCase()}!`;
        }
    }

    alert(`Você abriu a ${chest.name}!\n+${goldBonus} Moedas\n+${candyBonus} Doces${cardDropMsg}`);
    GAME_DATA.chests[index] = null;
    updateCurrencyUI();
    renderChests();
    renderCollection(); 
  }
}

setInterval(() => {
  let changed = false;
  GAME_DATA.chests.forEach(chest => {
    if (chest && chest.time > 0) {
      chest.time--;
      changed = true;
    }
  });
  if (changed) {
    renderChests();
  }
}, 1000);


// --- Splash Screen ---
function showSplash() {
  const splash = document.getElementById('splashScreen');
  const loading = document.getElementById('loadingScreen');
  if (!splash) { startDataFetch(); return; }
  
  splash.style.display = 'flex';
  loading.style.display = 'none';
  
  // After 2.5s, transition to loading screen
  setTimeout(() => {
    splash.style.opacity = '0';
    splash.style.transform = 'scale(1.05)';
    setTimeout(() => {
      splash.style.display = 'none';
      loading.style.display = 'flex';
      startDataFetch();
    }, 500);
  }, 2000);
}

// Simplified Fetch from PokeAPI
async function startDataFetch() {
  const loadingText = document.getElementById("loadingText");
  const loadingBar = document.getElementById("loadingBarFill");
  const promises = [];
  const ids = [1, 4, 7, 25, 39, 66, 74, 92, 94, 6, 9, 3, 130, 133, 143, 149, 150, 151, 144, 145, 146, 
               2, 5, 8, 26, 65, 68, 76, 123, 131, 134, 135, 136, 59, 112, 115, 121, 137, 142, 147, 148];
  let loaded = 0;
  
  for (let i = 0; i < ids.length; i++) {
    promises.push(
      fetch(`https://pokeapi.co/api/v2/pokemon/${ids[i]}`)
        .then(res => res.json())
        .then(data => {
          loaded++;
          const pct = Math.round((loaded / ids.length) * 100);
          if (loadingText) loadingText.innerText = `Carregando Pokémon... ${pct}%`;
          if (loadingBar) loadingBar.style.width = `${pct}%`;

          let hp = 100 + data.stats.find(s => s.stat.name === 'hp').base_stat * 2;
          let atk = data.stats.find(s => s.stat.name === 'attack').base_stat / 2;
          let cost = Math.max(1, Math.min(9, Math.ceil((hp/100) + (atk/20))));
          
          const bst = data.stats.reduce((acc, s) => acc + s.base_stat, 0);
          let rarity = "Comum";
          let rarityMult = 1.0;
          if (bst > 580) { rarity = "Lendária"; rarityMult = 1.4; cost = Math.max(cost, 7); }
          else if (bst > 480) { rarity = "Épica"; rarityMult = 1.2; cost = Math.max(cost, 4); }
          
          hp = Math.floor(hp * rarityMult);
          atk = Math.floor(atk * rarityMult);

          return {
            id: data.id,
            name: data.name,
            frontSprite: data.sprites.front_default || data.sprites.other["official-artwork"].front_default,
            backSprite: data.sprites.back_default || data.sprites.front_default,
            cry: data.cries && data.cries.latest ? data.cries.latest : null,
            hp: hp,
            maxHp: hp,
            atk: atk,
            speed: data.stats.find(s => s.stat.name === 'speed').base_stat / 2,
            range: 30,
            atkSpeed: 1000 + Math.random() * 500,
            cost: cost,
            level: 1,
            rarity: rarity
          };
        })
    );
  }
  
  const results = await Promise.all(promises);
  GAME_DATA.pokemonList = results;
  
  // Try to load saved game
  const hasSave = loadGame();
  
  if (!hasSave) {
    GAME_DATA.collection = results.filter(p => ["bulbasaur", "charmander", "squirtle", "pikachu", "jigglypuff", "machop"].includes(p.name));
    GAME_DATA.deck = GAME_DATA.collection.slice(0, 8);
  }
  
  document.getElementById("loadingScreen").style.display = "none";
  
  if (!hasSave) {
      document.getElementById("setupScreen").style.display = "flex";
  } else {
      document.getElementById("mainMenu").style.display = "flex";
      updateProfileUI();
      updateArenaUI(); 
      renderChests();
      updateCurrencyUI();
      playMusic();
  }
}

async function fetchPokemonData() {
  showSplash();
}

// --- Setup Screen Logic ---
document.querySelectorAll('.avatar-option').forEach(el => {
  el.addEventListener('click', (e) => {
    document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
    e.target.classList.add('selected');
  });
});

document.getElementById("startGameBtn").addEventListener('click', () => {
  const nameInput = document.getElementById("playerNameInput").value.trim();
  if (nameInput) GAME_DATA.playerName = nameInput;
  
  const selectedAvatar = document.querySelector('.avatar-option.selected');
  if (selectedAvatar) GAME_DATA.playerAvatar = selectedAvatar.src;
  
  document.getElementById("setupScreen").style.display = "none";
  document.getElementById("mainMenu").style.display = "flex";
  updateProfileUI();
  playMusic();
});

document.getElementById("musicToggleBtn").addEventListener("click", () => {
  const btn = document.getElementById("musicToggleBtn");
  if (bgmElement && !bgmElement.paused) {
    bgmElement.pause();
    btn.classList.add("muted");
    btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
  } else {
    playMusic();
    btn.classList.remove("muted");
    btn.innerHTML = '<i class="fas fa-volume-up"></i>';
  }
});

function updateProfileUI() {
  document.getElementById("playerNameDisplay").innerText = GAME_DATA.playerName;
  document.getElementById("playerAvatarDisplay").src = GAME_DATA.playerAvatar;
  document.getElementById("playerLevelDisplay").innerText = GAME_DATA.playerLevel;
  
  const xpRequired = GAME_DATA.playerLevel * 100;
  const xpPercent = (GAME_DATA.playerXP / xpRequired) * 100;
  document.getElementById("playerXpFill").style.width = `${Math.min(100, xpPercent)}%`;
}

// --- Card Upgrade Logic ---
function openCardModal(card) {
  GAME_DATA.selectedCardForUpgrade = card;
  const modal = document.getElementById("cardModal");
  const info = document.getElementById("cardModalInfo");
  
  const level = card.level || 1;
  const hp = Math.floor(card.hp * (1 + (level - 1) * 0.1));
  const atk = Math.floor(card.atk * (1 + (level - 1) * 0.1));
  
  const goldCost = level * 100;
  const candyCost = level * 5;
  
  document.getElementById("upgradeCostGold").innerText = goldCost;
  document.getElementById("upgradeCostCandy").innerText = candyCost;
  
  const copiesNeeded = level * 2;
  const currentCopies = card.copies || 0;
  const canLevelUp = GAME_DATA.gold >= goldCost && GAME_DATA.candies >= candyCost && currentCopies >= copiesNeeded;
  
  info.innerHTML = `
    <div class="rarity-badge rarity-${(card.rarity || 'Comum').toLowerCase()}">${card.rarity || 'Comum'}</div>
    <img src="${card.frontSprite}" />
    <h3>${card.name}</h3>
    
    <div class="evolution-progress">
       <div class="evo-bar"><div class="evo-fill" style="width: ${Math.min(100, (currentCopies/copiesNeeded)*100)}%"></div></div>
       <span>${currentCopies} / ${copiesNeeded} Cartas</span>
    </div>

    <div class="card-stats-grid">
       <div class="stat-box">
          <label>Nível</label>
          <span>${level}</span>
       </div>
       <div class="stat-box">
          <label>Custo</label>
          <span>${card.cost} <i class="fas fa-droplet" style="color:#a855f7"></i></span>
       </div>
       <div class="stat-box">
          <label>HP</label>
          <span>${hp}</span>
       </div>
       <div class="stat-box">
          <label>Ataque</label>
          <span>${atk}</span>
       </div>
    </div>
  `;
  
  const upgradeBtn = document.getElementById("upgradeCardBtn");
  if (currentCopies < copiesNeeded) {
    upgradeBtn.classList.add("disabled-btn");
    upgradeBtn.innerHTML = `<i class="fas fa-lock"></i> Cartas Insuficientes`;
  } else {
    upgradeBtn.classList.remove("disabled-btn");
    upgradeBtn.innerHTML = `
      <i class="fas fa-arrow-up"></i> Melhorar 
      <span id="upgradeCostGold">${goldCost}</span> <i class="fas fa-coins"></i>
      <span id="upgradeCostCandy">${candyCost}</span> <i class="fas fa-candy-cane"></i>
    `;
  }
  
  modal.style.display = "flex";
}

document.querySelector(".close-modal").onclick = () => {
  document.getElementById("cardModal").style.display = "none";
};

document.getElementById("upgradeCardBtn").onclick = () => {
  const card = GAME_DATA.selectedCardForUpgrade;
  if (!card) return;
  
  const level = card.level || 1;
  const copiesNeeded = level * 2;
  const currentCopies = card.copies || 0;
  const goldCost = level * 100;
  const candyCost = level * 5;
  
  if (currentCopies < copiesNeeded) {
    alert("Você precisa de mais cópias desta carta!");
    return;
  }
  
  if (GAME_DATA.gold >= goldCost && GAME_DATA.candies >= candyCost) {
    GAME_DATA.gold -= goldCost;
    GAME_DATA.candies -= candyCost;
    card.copies -= copiesNeeded;
    card.level = level + 1;
    
    // Check if it can evolve to next pokemon
    tryEvolveToNextForm(card);
    
    updateCurrencyUI();
    openCardModal(card); // Refresh modal
    renderCollection(); 
    playEffect('levelUp');
  } else {
    alert("Recursos insuficientes!");
  }
};

function tryEvolveToNextForm(card) {
    // Basic evolution mappings for the IDs we have
    const evolutionMap = {
        'bulbasaur': 'ivysaur', 'ivysaur': 'venusaur',
        'charmander': 'charmeleon', 'charmeleon': 'charizard',
        'squirtle': 'wartortle', 'wartortle': 'blastoise',
        'pikachu': 'raichu',
        'pidgey': 'pidgeotto', 'pidgeotto': 'pidgeot',
        'dratini': 'dragonair', 'dragonair': 'dragonite',
        'gastly': 'haunter', 'haunter': 'gengar',
        'machop': 'machoke', 'machoke': 'machamp'
    };
    
    const nextFormName = evolutionMap[card.name.toLowerCase()];
    // Only evolve if reaching specific levels (e.g., 5 and 10)
    if (nextFormName && (card.level === 5 || card.level === 10)) {
        const nextFormData = GAME_DATA.pokemonList.find(p => p.name.toLowerCase() === nextFormName);
        if (nextFormData) {
            alert(`UAU! Seu ${card.name.toUpperCase()} está evoluindo para ${nextFormData.name.toUpperCase()}!`);
            // Transfer stats but use new visuals
            card.id = nextFormData.id;
            card.name = nextFormData.name;
            card.frontSprite = nextFormData.frontSprite;
            card.backSprite = nextFormData.backSprite;
            card.cry = nextFormData.cry;
            // Also update base stats to the new form's stats, keeping the level
            const rarityMult = card.rarity === "Lendária" ? 1.4 : (card.rarity === "Épica" ? 1.2 : 1.0);
            card.hp = Math.floor(nextFormData.hp);
            card.maxHp = card.hp;
            card.atk = Math.floor(nextFormData.atk);
            card.speed = nextFormData.speed;
        }
    }
}

// --- Leagues & Badges Logic ---
function getCurrentArenaIndex() {
  let idx = 0;
  for (let i = 0; i < ARENAS.length; i++) {
    if (GAME_DATA.trophies >= ARENAS[i].minTrophies) {
      idx = i;
    }
  }
  return idx;
}

function updateArenaUI() {
  const currentArena = ARENAS[getCurrentArenaIndex()];
  document.getElementById("arenaTitleDisplay").innerText = currentArena.name;
  document.getElementById("arenaTrophiesDisplay").innerText = `Troféus: ${GAME_DATA.trophies}`;
  document.querySelector(".arena-display").style.backgroundImage = `url('${currentArena.bg}')`;
}

function renderLeagues() {
  const container = document.getElementById("leaguesContainer");
  container.innerHTML = "";
  const currentIdx = getCurrentArenaIndex();
  
  ARENAS.forEach((arena, index) => {
    const el = document.createElement("div");
    el.className = `league-item ${index <= currentIdx ? 'unlocked' : 'locked'} ${index === currentIdx ? 'current' : ''}`;
    el.innerHTML = `
      <h3>${arena.name}</h3>
      <p>${arena.minTrophies} Troféus</p>
    `;
    container.appendChild(el);
  });
}

function renderBadges() {
  document.getElementById("statWins").innerText = GAME_DATA.wins;
  document.getElementById("statLosses").innerText = GAME_DATA.losses;
  
  const container = document.getElementById("badgesContainer");
  container.innerHTML = "";
  
  for (let i = 1; i < ARENAS.length; i++) {
    const arena = ARENAS[i];
    const unlocked = GAME_DATA.trophies >= arena.minTrophies;
    const el = document.createElement("div");
    el.className = `badge-item ${unlocked ? 'unlocked' : 'locked'}`;
    el.innerHTML = `
      <img src="${arena.badgeImg}" />
      <p>${arena.badgeName}</p>
    `;
    container.appendChild(el);
  }
}

// --- Collection & Deck Logic ---
function renderCollection() {
  const deckArea = document.getElementById("deckArea");
  const collectionArea = document.getElementById("collectionArea");
  document.getElementById("collectionCount").innerText = GAME_DATA.collection.length;
  
  deckArea.innerHTML = "";
  collectionArea.innerHTML = "";
  
  // Render Deck
  GAME_DATA.deck.forEach((card, index) => {
     let el = document.createElement("div");
     el.className = `collection-card rarity-${(card.rarity || 'Comum').toLowerCase()}`;
     
     if (GAME_DATA.selectedCollectionIndex !== -1) {
         el.style.animation = "pulse 1s infinite";
     }
     
     el.innerHTML = `
        <img src="${card.frontSprite}" />
        <div class="energy-tag">${card.cost}</div>
        <div class="level-tag">Lv.${card.level || 1}</div>
        <div class="rarity-tag">${card.rarity || 'Comum'}</div>
        <div class="card-evo-bar ${(card.copies || 0) >= (card.level || 1) * 2 ? 'ready' : ''}">
           <div class="evo-progress-fill" style="width: ${Math.min(100, ((card.copies || 0)/((card.level || 1) * 2))*100)}%"></div>
        </div>
     `;
     
     el.onclick = () => {
         if (GAME_DATA.selectedCollectionIndex !== -1) {
             const newCard = GAME_DATA.collection[GAME_DATA.selectedCollectionIndex];
             const existingIndex = GAME_DATA.deck.findIndex(c => c.id === newCard.id);
             if (existingIndex !== -1) {
                 GAME_DATA.deck[existingIndex] = GAME_DATA.deck[index];
                 GAME_DATA.deck[index] = newCard;
             } else {
                 GAME_DATA.deck[index] = newCard;
             }
             GAME_DATA.selectedCollectionIndex = -1;
             renderCollection();
         } else {
             // If clicking top card with nothing selected, open its modal
             openCardModal(card);
         }
     };
     deckArea.appendChild(el);
  });
  
  // Render Collection
  GAME_DATA.collection.forEach((card, index) => {
     let el = document.createElement("div");
     el.className = `collection-card rarity-${(card.rarity || 'Comum').toLowerCase()}`;
     
     const inDeck = GAME_DATA.deck.some(c => c.id === card.id);
     
     if (GAME_DATA.selectedCollectionIndex === index) {
         el.style.borderColor = "#facc15";
         el.style.boxShadow = "0 0 15px rgba(250, 204, 21, 0.8)";
     } else if (inDeck) {
         el.classList.add("locked");
     }
     
     el.innerHTML = `
        <img src="${card.frontSprite}" />
        <div class="energy-tag">${card.cost}</div>
        <div class="level-tag">Lv.${card.level || 1}</div>
        <div class="rarity-tag">${card.rarity || 'Comum'}</div>
        <div class="card-evo-bar ${(card.copies || 0) >= (card.level || 1) * 2 ? 'ready' : ''}">
           <div class="evo-progress-fill" style="width: ${Math.min(100, ((card.copies || 0)/((card.level || 1) * 2))*100)}%"></div>
        </div>
     `;
     
     el.onclick = () => {
         if (GAME_DATA.selectedCollectionIndex === index) {
             openCardModal(card);
             return;
         }
         GAME_DATA.selectedCollectionIndex = index;
         renderCollection();
     };
     collectionArea.appendChild(el);
  });
}

document.getElementById("toBattleBtn").addEventListener("click", () => {
    // Only proceed to battle if from arena
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("gameContainer").style.display = "flex";
    initGame();
});

// Tower Setup
function initTowers() {
  GAME_DATA.towers = [
    { id: "enemyKingTower", team: "enemy", hp: 1500, maxHp: 1500, isKing: true, el: document.getElementById("enemyKingTower"), x: 50, y: 5 },
    { id: "enemyTowerLeft", team: "enemy", hp: 800, maxHp: 800, isKing: false, el: document.getElementById("enemyTowerLeft"), x: 20, y: 20 },
    { id: "enemyTowerRight", team: "enemy", hp: 800, maxHp: 800, isKing: false, el: document.getElementById("enemyTowerRight"), x: 80, y: 20 },
    { id: "playerKingTower", team: "player", hp: 1500, maxHp: 1500, isKing: true, el: document.getElementById("playerKingTower"), x: 50, y: 95 },
    { id: "playerTowerLeft", team: "player", hp: 800, maxHp: 800, isKing: false, el: document.getElementById("playerTowerLeft"), x: 20, y: 80 },
    { id: "playerTowerRight", team: "player", hp: 800, maxHp: 800, isKing: false, el: document.getElementById("playerTowerRight"), x: 80, y: 80 },
  ];
  
  // FIX: Always restore tower visibility on arena reset
  GAME_DATA.towers.forEach(t => {
    t.el.style.display = '';
  });
  
  updateTowersUI();
}

function updateTowersUI() {
  GAME_DATA.towers.forEach(t => {
    if (t.hp <= 0) {
      t.el.style.display = 'none';
    } else {
      const fill = t.el.querySelector('.hp-fill');
      fill.style.width = `${(t.hp / t.maxHp) * 100}%`;
    }
  });
}

// Cards Setup
// Shuffle helper
function shuffleArray(array) {
  let newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function initDeck() {
  // Prep battle deck
  GAME_DATA.battleDeck = shuffleArray(GAME_DATA.deck);
  
  // Draw 4 cards in hand, 1 next card
  GAME_DATA.hand = [
      GAME_DATA.battleDeck.pop(),
      GAME_DATA.battleDeck.pop(),
      GAME_DATA.battleDeck.pop(),
      GAME_DATA.battleDeck.pop()
  ];
  GAME_DATA.nextCard = GAME_DATA.battleDeck.pop();
  
  renderHand();
}

function renderHand() {
  const slots = document.querySelectorAll(".card-slot");
  slots.forEach((slot, i) => {
    const card = GAME_DATA.hand[i];
    slot.innerHTML = `
      <img src="${card.frontSprite}" />
      <div class="energy-cost">${card.cost}</div>
    `;
    slot.dataset.index = i;
    
    // Dim if not enough elixir
    if (GAME_DATA.playerElixir >= card.cost) {
      slot.classList.remove("disabled");
    } else {
      slot.classList.add("disabled");
    }
  });
  
  const nextSlot = document.querySelector("#nextCardSlot .preview");
  nextSlot.innerHTML = `<img src="${GAME_DATA.nextCard.frontSprite}" />`;
}

// Drag & Drop
let draggedCardIndex = -1;
let dragPreview = document.createElement("div");
dragPreview.id = "dragPreview";
document.body.appendChild(dragPreview);

document.querySelectorAll(".card-slot").forEach(slot => {
  slot.addEventListener("pointerdown", (e) => {
    if (slot.classList.contains("disabled")) return;
    draggedCardIndex = parseInt(slot.dataset.index);
    slot.classList.add("active");
    
    // Show preview
    dragPreview.style.display = "block";
    updateDragPreview(e);
  });
});

document.addEventListener("pointermove", (e) => {
  if (draggedCardIndex !== -1) {
    updateDragPreview(e);
  }
});

function updateDragPreview(e) {
  dragPreview.style.left = `${e.clientX}px`;
  dragPreview.style.top = `${e.clientY}px`;
}

document.addEventListener("pointerup", (e) => {
  if (draggedCardIndex !== -1) {
    const slot = document.querySelector(`.card-slot[data-index="${draggedCardIndex}"]`);
    if(slot) slot.classList.remove("active");
    
    dragPreview.style.display = "none";
    
    // Check if dropped in arena (bottom 50% for player)
    const arenaRect = document.getElementById("arena").getBoundingClientRect();
    if (e.clientX >= arenaRect.left && e.clientX <= arenaRect.right &&
        e.clientY >= arenaRect.top && e.clientY <= arenaRect.bottom) {
      
      const spawnYPercent = ((e.clientY - arenaRect.top) / arenaRect.height) * 100;
      const spawnXPercent = ((e.clientX - arenaRect.left) / arenaRect.width) * 100;
      
      // Can only spawn on player side (y > 50)
      if (spawnYPercent >= 50) {
        spawnPlayerUnit(draggedCardIndex, spawnXPercent, spawnYPercent);
      }
    }
    
    draggedCardIndex = -1;
  }
});

// --- Audio Logic ---
let bgmElement = null;

const SOUNDS = {
  buy: 'https://www.soundjay.com/buttons/sounds/button-3.mp3',
  levelUp: 'https://www.soundjay.com/buttons/sounds/button-10.mp3',
  deploy: 'https://www.soundjay.com/buttons/sounds/button-4.mp3'
};

function playEffect(type) {
  const url = SOUNDS[type];
  if (url) {
    const audio = new Audio(url);
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }
}

function playCry(audioUrl) {
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.volume = 0.4;
    audio.play().catch(e => console.log('Audio playback prevented', e));
  }
}

function playMusic() {
  if (!bgmElement) {
    // Pokémon Center theme or similar placeholder
    bgmElement = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"); 
    bgmElement.loop = true;
    bgmElement.volume = 0.15;
  }
  bgmElement.play().catch(e => console.log('Music blocked by browser policy', e));
}

function spawnPlayerUnit(handIndex, xPercent, yPercent) {
  const card = GAME_DATA.hand[handIndex];
  if (GAME_DATA.playerElixir >= card.cost) {
    GAME_DATA.playerElixir -= card.cost;
    
    createUnit(card, xPercent, yPercent, "player");
    playCry(card.cry);
    playEffect('deploy');
    
    // Cycle cards back to bottom of battle deck
    GAME_DATA.battleDeck.unshift(card); // put played card backwards
    
    // Pull the next card to hand, and pop a new next card
    GAME_DATA.hand[handIndex] = GAME_DATA.nextCard;
    GAME_DATA.nextCard = GAME_DATA.battleDeck.pop();
    
    renderHand();
  }
}

function spawnEnemyUnit() {
  const currentArenaIdx = getCurrentArenaIndex();
  
  // AI difficulty scaling
  const minElixirNeeded = Math.max(4, 9 - currentArenaIdx); 
  const spawnFrequency = 0.03 + (currentArenaIdx * 0.02); // higher arenas spawn more often
  
  if (GAME_DATA.enemyElixir >= minElixirNeeded && Math.random() < spawnFrequency) {
    // Filter cards by rarity/strength appropriate for arena
    // Arena 0: Comum only. Arena 1: Comum + some Epics. Arena 2+: All.
    let pool = GAME_DATA.pokemonList.filter(p => {
       if (currentArenaIdx === 0) return p.rarity === "Comum";
       if (currentArenaIdx === 1) return p.rarity !== "Lendária";
       return true;
    });
    
    const card = { ...pool[Math.floor(Math.random() * pool.length)] };
    
    if (GAME_DATA.enemyElixir >= card.cost) {
      GAME_DATA.enemyElixir -= card.cost;
      const xPercent = 10 + Math.random() * 80;
      const yPercent = 10 + Math.random() * 30;
      
      // Buff AI slightly in higher arenas
      const buff = 1 + (currentArenaIdx * 0.05);
      card.hp = Math.floor(card.hp * buff);
      card.atk = Math.floor(card.atk * buff);
      
      createUnit(card, xPercent, yPercent, "enemy");
    }
  }
}

function createUnit(model, x, y, team) {
  const container = document.getElementById("unitsContainer");
  const unitEl = document.createElement("div");
  unitEl.className = `unit ${team}`;
  unitEl.style.left = `${x}%`;
  unitEl.style.top = `${y}%`;
  
  // Scale stats by level
  const level = model.level || 1;
  const currentHp = Math.floor(model.hp * (1 + (level - 1) * 0.1));
  const currentAtk = Math.floor(model.atk * (1 + (level - 1) * 0.1));
  
  unitEl.innerHTML = `
    <div class="hp-bar"><div class="hp-fill" style="background: ${team === 'player' ? 'var(--blue-team)' : 'var(--red-team)'}"></div></div>
    <img src="${team === 'player' ? model.backSprite : model.frontSprite}" />
  `;
  container.appendChild(unitEl);
  
  GAME_DATA.units.push({
    ...model,
    hp: currentHp,
    maxHp: currentHp,
    atk: currentAtk,
    x, y, team, el: unitEl, lastAtkTime: 0,
    target: null,
    rarity: model.rarity || "Comum"
  });
  
  // Add rarity effects to unit sprite
  if (model.rarity === "Épica") {
    unitEl.querySelector("img").style.filter += " drop-shadow(0 0 5px #a855f7)";
  } else if (model.rarity === "Lendária") {
    unitEl.querySelector("img").style.filter += " drop-shadow(0 0 8px #facc15)";
    unitEl.classList.add("legendary-aura");
  }
}

// Game Loop
function update(time) {
  if (GAME_DATA.gameOver) return;
  
  const dtStr = (time - GAME_DATA.lastFrameTime) / 1000;
  // cap dt to prevent big jumps
  const dt = Math.min(dtStr, 0.1);
  GAME_DATA.lastFrameTime = time;
  
  // Update Elixir
  GAME_DATA.playerElixir = Math.min(GAME_DATA.maxElixir, GAME_DATA.playerElixir + GAME_DATA.elixirRegenRate * dt);
  GAME_DATA.enemyElixir = Math.min(GAME_DATA.maxElixir, GAME_DATA.enemyElixir + GAME_DATA.elixirRegenRate * dt);
  
  document.getElementById("elixirBarFill").style.width = `${(GAME_DATA.playerElixir / GAME_DATA.maxElixir) * 100}%`;
  document.getElementById("elixirText").innerText = Math.floor(GAME_DATA.playerElixir);
  
  renderHand(); // To update disabled states
  
  // Enemy AI tick
  spawnEnemyUnit();
  
  // Unit AI and physics
  const arenaRect = document.getElementById("arena").getBoundingClientRect();
  const pxRatioX = 100 / arenaRect.width;
  const pxRatioY = 100 / arenaRect.height;
  
  GAME_DATA.units.forEach((u, index) => {
    if (u.hp <= 0) return;
    
    // Find target
    let activeTowers = GAME_DATA.towers.filter(t => t.hp > 0 && t.team !== u.team);
    let activeEnemies = GAME_DATA.units.filter(e => e.hp > 0 && e.team !== u.team);
    
    let closestDist = Infinity;
    let target = null;
    
    // Target Units first
    activeEnemies.forEach(e => {
      const d = Math.hypot(e.x - u.x, e.y - u.y);
      if (d < closestDist) {
        closestDist = d;
        target = { type: 'unit', ref: e, x: e.x, y: e.y };
      }
    });
    
    // Then Towers if no closer units (or give towers slightly lower priority)
    activeTowers.forEach(t => {
      const dist = Math.hypot(t.x - u.x, t.y - u.y);
      // Give towers a little less priority (dist * 1.2) to make units fight each other first
      if (dist * 1.2 < closestDist) {
        closestDist = dist * 1.2;
        target = { type: 'tower', ref: t, x: t.x, y: t.y };
      }
    });
    
    u.target = target;
    
    if (target) {
      const actualDist = Math.hypot(target.x - u.x, target.y - u.y);
      // Roughly 5% arena width = range
      const rangePercent = u.range * pxRatioY; 
      
      if (actualDist > rangePercent) {
        // Move towards target
        const angle = Math.atan2(target.y - u.y, target.x - u.x);
        // speed is base stat, let's normalize to screen % per second
        const moveSpeed = (2 + u.speed * 0.05) * dt; 
        
        u.x += Math.cos(angle) * moveSpeed;
        u.y += Math.sin(angle) * moveSpeed * (arenaRect.width / arenaRect.height); // squish ratio
      } else {
        // Attack
        if (time - u.lastAtkTime > u.atkSpeed) {
          u.lastAtkTime = time;
          target.ref.hp -= u.atk;
          
          // Small bump animation
          u.el.style.transform = `translate(-50%, -50%) scale(1.2)`;
          setTimeout(() => { if (u.el) u.el.style.transform = `translate(-50%, -50%) scale(1)`; }, 100);
          
          if (target.type === 'tower') updateTowersUI();
          
          // Check win condition
          if (target.type === 'tower' && target.ref.isKing && target.ref.hp <= 0) {
            endGame(u.team === 'player');
          }
        }
      }
    }
    
    // Clamp to map
    u.x = Math.max(0, Math.min(100, u.x));
    u.y = Math.max(0, Math.min(100, u.y));
    
    // Apply position
    u.el.style.left = `${u.x}%`;
    u.el.style.top = `${u.y}%`;
    
    // Update HP UI
    const fillPos = (u.hp / u.maxHp) * 100;
    u.el.querySelector(".hp-fill").style.width = `${Math.max(0, fillPos)}%`;
  });
  
  // Cleanup dead units
  for (let i = GAME_DATA.units.length - 1; i >= 0; i--) {
    if (GAME_DATA.units[i].hp <= 0) {
      GAME_DATA.units[i].el.remove();
      GAME_DATA.units.splice(i, 1);
    }
  }
  
  requestAnimationFrame(update);
}

function endGame(playerWon) {
  GAME_DATA.gameOver = true;
  if (GAME_DATA.battleInterval) clearInterval(GAME_DATA.battleInterval);
  
  const screen = document.getElementById("gameOverScreen");
  const title = document.getElementById("gameOverTitle");
  screen.style.display = "flex";
  
  const oldArenaIdx = getCurrentArenaIndex();
  
  if (playerWon) {
    // Rewards
    GAME_DATA.gold += 30;
    const gainedCandies = Math.floor(Math.random() * 5) + 1;
    GAME_DATA.candies += gainedCandies;
    
    // XP Logic WIN
    GAME_DATA.playerXP += 30;
    // Tropies & Wins
    GAME_DATA.wins++;
    GAME_DATA.trophies += 10;
    
    let xpRequired = GAME_DATA.playerLevel * 100;
    let levelUpMsg = "";
    while (GAME_DATA.playerXP >= xpRequired && GAME_DATA.playerLevel < 99) {
      GAME_DATA.playerXP -= xpRequired;
      GAME_DATA.playerLevel++;
      xpRequired = GAME_DATA.playerLevel * 100;
      levelUpMsg = "\nNÍVEL UP!";
    }
    
    // Chest logic
    const emptySlotIndex = GAME_DATA.chests.findIndex(c => c === null);
    let chestMsg = "";
    if (emptySlotIndex !== -1 && Math.random() < 0.8) {
      const newChest = getChestDrop();
      GAME_DATA.chests[emptySlotIndex] = newChest;
      chestMsg = `\nvocê encontrou uma ${newChest.name}!`;
    }
    
    const newArenaIdx = getCurrentArenaIndex();
    let arenaMsg = "";
    if (newArenaIdx > oldArenaIdx) {
       arenaMsg = `\nNOVA LIGA: ${ARENAS[newArenaIdx].name}!`;
       if (ARENAS[newArenaIdx].badgeName) {
           arenaMsg += `\nGANHOU: ${ARENAS[newArenaIdx].badgeName}!`;
       }
    }
    
    updateCurrencyUI();
    renderChests();
    updateProfileUI();
    updateArenaUI();
    
    title.innerText = `VITÓRIA!\n+10 Troféus\n+30 Moedas\n+${gainedCandies} Doces\n+30 XP${levelUpMsg}${chestMsg}${arenaMsg}`;
    title.style.color = "#fbbf24";
  } else {
    // LOSS
    GAME_DATA.playerXP -= 15;
    if (GAME_DATA.playerXP < 0) GAME_DATA.playerXP = 0;
    
    GAME_DATA.losses++;
    GAME_DATA.trophies -= 5;
    if (GAME_DATA.trophies < 0) GAME_DATA.trophies = 0;
    
    updateProfileUI();
    updateArenaUI();
    
    title.innerText = "DERROTA\n-5 Troféus\n-15 XP";
    title.style.color = "#ef4444";
  }
  saveGame();
}

function startMatchTimer() {
  GAME_DATA.matchTime = 180;
  if (GAME_DATA.battleInterval) clearInterval(GAME_DATA.battleInterval);
  
  GAME_DATA.battleInterval = setInterval(() => {
    if (GAME_DATA.gameOver) return;
    
    GAME_DATA.matchTime--;
    const m = Math.floor(GAME_DATA.matchTime / 60);
    const s = GAME_DATA.matchTime % 60;
    document.getElementById("matchTimer").innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
    
    if (GAME_DATA.matchTime <= 0) {
      const playerTowers = GAME_DATA.towers.filter(t => t.team === 'player').length;
      const enemyTowers = GAME_DATA.towers.filter(t => t.team === 'enemy').length;
      endGame(playerTowers >= enemyTowers);
    }
    
    // Double elixir
    if (GAME_DATA.matchTime <= 60) {
        GAME_DATA.elixirRegenRate = 0.7;
        document.getElementById("matchTimer").style.color = "#f87171";
    } else {
        GAME_DATA.elixirRegenRate = 0.35;
    }
  }, 1000);
}

function resetBattleState() {
  // Stop any running loop
  if (GAME_DATA.battleInterval) {
    clearInterval(GAME_DATA.battleInterval);
    GAME_DATA.battleInterval = null;
  }
  
  // Clear all unit elements from DOM
  GAME_DATA.units.forEach(u => { if (u.el) u.el.remove(); });
  GAME_DATA.units = [];
  
  // Also clear any orphaned unit elements
  document.getElementById('unitsContainer').innerHTML = '';
  
  // Reset battle variables
  GAME_DATA.playerElixir = 5;
  GAME_DATA.enemyElixir = 5;
  GAME_DATA.gameOver = false;
  GAME_DATA.matchTime = 180;
  GAME_DATA.elixirRegenRate = 0.35;
  
  // Reset timer display color
  document.getElementById('matchTimer').style.color = '';
  document.getElementById('matchTimer').innerText = '3:00';
}

function initGame() {
  // Bind once - safety check
  if (!GAME_DATA.restartBound) {
    document.getElementById("restartBtn").addEventListener("click", () => {
      document.getElementById("gameOverScreen").style.display = "none";
      document.getElementById("gameContainer").style.display = "none";
      document.getElementById("mainMenu").style.display = "flex";
      switchMenuTab('arenaTab');
      updateArenaUI();
      updateProfileUI();
      updateCurrencyUI();
      renderChests();
    });
    GAME_DATA.restartBound = true;
  }
  
  // FIX: Full reset before each new game
  resetBattleState();
  
  initTowers();
  initDeck();
  startMatchTimer();
  GAME_DATA.lastFrameTime = performance.now();
  GAME_DATA.gameOver = false; // ensure set after reset
  requestAnimationFrame(update);
}

// Start
fetchPokemonData();
