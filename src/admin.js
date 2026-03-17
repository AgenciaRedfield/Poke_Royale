import { supabase } from './supabase.js';

const state = {
  session: null,
  adminUser: null,
  profiles: [],
  pokemon: [],
  items: [],
  apiPokemonList: [],
  apiItemList: []
};

const els = {
  pokeApiSearch: document.getElementById('pokeApiSearch'),
  searchPokeApiBtn: document.getElementById('searchPokeApiBtn'),
  apiSearchResults: document.getElementById('apiSearchResults'),
  itemApiSearch: document.getElementById('itemApiSearch'),
  searchItemApiBtn: document.getElementById('searchItemApiBtn'),
  itemApiSearchResults: document.getElementById('itemApiSearchResults'),
  loginCard: document.getElementById('loginCard'),
  adminApp: document.getElementById('adminApp'),
  authMessage: document.getElementById('authMessage'),
  sessionInfo: document.getElementById('sessionInfo'),
  logoutBtn: document.getElementById('logoutBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  topPlayersList: document.getElementById('topPlayersList'),
  insightsList: document.getElementById('insightsList'),
  statPlayers: document.getElementById('statPlayers'),
  statAvgTrophies: document.getElementById('statAvgTrophies'),
  statWins: document.getElementById('statWins'),
  statGold: document.getElementById('statGold'),
  pokemonList: document.getElementById('pokemonList'),
  itemList: document.getElementById('itemList'),
  pokemonCount: document.getElementById('pokemonCount'),
  itemCount: document.getElementById('itemCount'),
  pokemonMessage: document.getElementById('pokemonMessage'),
  itemMessage: document.getElementById('itemMessage')
};

const navButtons = Array.from(document.querySelectorAll('.admin-nav-btn'));

function showMessage(el, message, isError = false) {
  el.textContent = message;
  el.style.color = isError ? '#fecdd3' : '#bfdbfe';
}

function clearMessage(el) {
  el.textContent = '';
}

function parseTypes(value) {
  return value
    .split(',')
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean);
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
}

function extractProfile(raw) {
  const game = raw.game_data || {};
  return {
    userId: raw.user_id,
    updatedAt: raw.updated_at,
    playerName: game.playerName || 'Treinador',
    playerAvatar: game.playerAvatar || '/poke-royale.png',
    trophies: Number(game.trophies || 0),
    wins: Number(game.wins || 0),
    losses: Number(game.losses || 0),
    gold: Number(game.gold || 0),
    candies: Number(game.candies || 0),
    playerLevel: Number(game.playerLevel || 1),
    collectionSize: Array.isArray(game.collection) ? game.collection.length : 0
  };
}

function computeInsights() {
  const totalPlayers = state.profiles.length;
  const totalWins = state.profiles.reduce((sum, profile) => sum + profile.wins, 0);
  const totalLosses = state.profiles.reduce((sum, profile) => sum + profile.losses, 0);
  const avgCollection = totalPlayers
    ? Math.round(state.profiles.reduce((sum, profile) => sum + profile.collectionSize, 0) / totalPlayers)
    : 0;
  const bestLevel = state.profiles.reduce((max, profile) => Math.max(max, profile.playerLevel), 0);

  return [
    `Relação vitórias/derrotas global: ${formatNumber(totalWins)} / ${formatNumber(totalLosses)}.`,
    `Coleção média por jogador: ${avgCollection} cartas.`,
    `Maior nível de treinador encontrado: ${bestLevel}.`,
    `${state.pokemon.filter((entry) => entry.active).length} Pokémon remotos ativos no catálogo.`,
    `${state.items.filter((entry) => entry.active).length} itens remotos ativos no catálogo.`
  ];
}

function renderDashboard() {
  const totalPlayers = state.profiles.length;
  const totalTrophies = state.profiles.reduce((sum, profile) => sum + profile.trophies, 0);
  const totalWins = state.profiles.reduce((sum, profile) => sum + profile.wins, 0);
  const totalGold = state.profiles.reduce((sum, profile) => sum + profile.gold, 0);
  const avgTrophies = totalPlayers ? Math.round(totalTrophies / totalPlayers) : 0;

  els.statPlayers.textContent = formatNumber(totalPlayers);
  els.statAvgTrophies.textContent = formatNumber(avgTrophies);
  els.statWins.textContent = formatNumber(totalWins);
  els.statGold.textContent = formatNumber(totalGold);

  const topPlayers = [...state.profiles]
    .sort((a, b) => b.trophies - a.trophies)
    .slice(0, 8);

  els.topPlayersList.innerHTML = topPlayers.length
    ? topPlayers
        .map(
          (player, index) => `
            <div class="list-row">
              <img src="${player.playerAvatar}" alt="${player.playerName}" />
              <div>
                <strong>#${index + 1} ${player.playerName}</strong>
                <span>Nível ${player.playerLevel} • ${player.wins} vitórias</span>
              </div>
              <div class="meta">
                <strong>${player.trophies}</strong>
                <span>troféus</span>
              </div>
            </div>
          `
        )
        .join('')
    : '<div class="insight-card">Nenhum perfil encontrado ainda.</div>';

  els.insightsList.innerHTML = computeInsights()
    .map((text) => `<div class="insight-card">${text}</div>`)
    .join('');
}

function renderPokemonList() {
  els.pokemonCount.textContent = `${state.pokemon.length} itens`;
  els.pokemonList.innerHTML = state.pokemon.length
    ? state.pokemon
        .map(
          (entry) => `
            <article class="catalog-row">
              <img src="${entry.front_sprite}" alt="${entry.name}" />
              <div class="catalog-body">
                <strong>${entry.name}</strong>
                <small>${entry.slug} • custo ${entry.cost} • ${entry.rarity}</small>
                <div class="catalog-tags">
                  ${(entry.types || []).map((type) => `<span class="tag">${type}</span>`).join('')}
                  <span class="tag ${entry.active ? '' : 'off'}">${entry.active ? 'ativo' : 'inativo'}</span>
                </div>
                <div class="catalog-actions">
                  <button class="mini-btn" data-action="edit-pokemon" data-id="${entry.id}">Editar</button>
                  <button class="mini-btn ${entry.active ? 'danger' : ''}" data-action="toggle-pokemon" data-id="${entry.id}">
                    ${entry.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            </article>
          `
        )
        .join('')
    : '<div class="insight-card">Nenhum Pokémon remoto cadastrado.</div>';
}

function renderItemList() {
  els.itemCount.textContent = `${state.items.length} itens`;
  els.itemList.innerHTML = state.items.length
    ? state.items
        .map(
          (entry) => `
            <article class="catalog-row">
              <img src="${entry.front_sprite}" alt="${entry.name}" />
              <div class="catalog-body">
                <strong>${entry.name}</strong>
                <small>${entry.slug} • ${entry.item_kind} • custo ${entry.cost}</small>
                <div class="catalog-tags">
                  ${(entry.types || []).map((type) => `<span class="tag">${type}</span>`).join('')}
                  <span class="tag">${entry.rarity}</span>
                  <span class="tag ${entry.active ? '' : 'off'}">${entry.active ? 'ativo' : 'inativo'}</span>
                </div>
                <div class="catalog-actions">
                  <button class="mini-btn" data-action="edit-item" data-id="${entry.id}">Editar</button>
                  <button class="mini-btn ${entry.active ? 'danger' : ''}" data-action="toggle-item" data-id="${entry.id}">
                    ${entry.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            </article>
          `
        )
        .join('')
    : '<div class="insight-card">Nenhum item remoto cadastrado.</div>';
}

function setAuthenticatedUi(isAuthenticated) {
  els.loginCard.style.display = isAuthenticated ? 'none' : 'block';
  els.adminApp.style.display = isAuthenticated ? 'block' : 'none';
  els.logoutBtn.style.display = isAuthenticated ? 'inline-flex' : 'none';
  els.sessionInfo.textContent = isAuthenticated && state.session?.user?.email
    ? `Sessão: ${state.session.user.email}`
    : 'Sessão não iniciada';
}

async function ensureAdminAccess(session) {
  const email = session?.user?.email;
  if (!email) throw new Error('Sessão sem e-mail válido.');

  const { data, error } = await supabase
    .from('admin_users')
    .select('id, email, role, active')
    .eq('email', email)
    .eq('active', true)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Seu usuário não está autorizado no painel admin.');

  state.adminUser = data;
}

async function loadDashboardData() {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, updated_at, game_data');

  if (profilesError) throw profilesError;

  const { data: pokemon, error: pokemonError } = await supabase
    .from('game_pokemon')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (pokemonError) throw pokemonError;

  const { data: items, error: itemsError } = await supabase
    .from('game_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (itemsError) throw itemsError;

  state.profiles = (profiles || []).map(extractProfile);
  state.pokemon = pokemon || [];
  state.items = items || [];

  renderDashboard();
  renderPokemonList();
  renderItemList();
}

function switchPanel(panelId) {
  navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.panel === panelId);
  });

  document.querySelectorAll('.admin-panel').forEach((panel) => {
    panel.style.display = panel.id === panelId ? 'block' : 'none';
  });
}

function resetPokemonForm() {
  document.getElementById('pokemonForm').reset();
  document.getElementById('pokemonId').value = '';
  document.getElementById('pokemonActive').checked = true;
  document.getElementById('pokemonSortOrder').value = 0;
  document.getElementById('pokemonSplashRadius').value = 0;
}

function resetItemForm() {
  document.getElementById('itemForm').reset();
  document.getElementById('itemId').value = '';
  document.getElementById('itemActive').checked = true;
  document.getElementById('itemSortOrder').value = 0;
  document.getElementById('itemRadius').value = 0;
  document.getElementById('itemKind').value = 'spell';
}

function fillPokemonForm(entry) {
  document.getElementById('pokemonId').value = entry.id;
  document.getElementById('pokemonSlug').value = entry.slug || '';
  document.getElementById('pokemonName').value = entry.name || '';
  document.getElementById('pokemonFrontSprite').value = entry.front_sprite || '';
  document.getElementById('pokemonBackSprite').value = entry.back_sprite || '';
  document.getElementById('pokemonCryUrl').value = entry.cry_url || '';
  document.getElementById('pokemonTypes').value = (entry.types || []).join(', ');
  document.getElementById('pokemonHp').value = entry.hp || 1;
  document.getElementById('pokemonAtk').value = entry.atk || 1;
  document.getElementById('pokemonSpeed').value = entry.speed || 1;
  document.getElementById('pokemonRange').value = entry.range || 30;
  document.getElementById('pokemonAtkSpeed').value = entry.atk_speed || 1000;
  document.getElementById('pokemonCost').value = entry.cost || 1;
  document.getElementById('pokemonRarity').value = entry.rarity || 'Comum';
  document.getElementById('pokemonSplashRadius').value = entry.splash_radius || 0;
  document.getElementById('pokemonSortOrder').value = entry.sort_order || 0;
  document.getElementById('pokemonActive').checked = Boolean(entry.active);
}

function fillItemForm(entry) {
  document.getElementById('itemId').value = entry.id;
  document.getElementById('itemSlug').value = entry.slug || '';
  document.getElementById('itemName').value = entry.name || '';
  document.getElementById('itemKind').value = entry.item_kind || 'spell';
  document.getElementById('itemFrontSprite').value = entry.front_sprite || '';
  document.getElementById('itemEffectSprite').value = entry.effect_sprite || '';
  document.getElementById('itemTypes').value = (entry.types || []).join(', ');
  document.getElementById('itemAtk').value = entry.atk || 0;
  document.getElementById('itemRadius').value = entry.radius || 0;
  document.getElementById('itemCost').value = entry.cost || 0;
  document.getElementById('itemRarity').value = entry.rarity || 'Comum';
  document.getElementById('itemSortOrder').value = entry.sort_order || 0;
  document.getElementById('itemActive').checked = Boolean(entry.active);
}

async function savePokemon(event) {
  event.preventDefault();
  clearMessage(els.pokemonMessage);

  const id = document.getElementById('pokemonId').value;
  const payload = {
    slug: document.getElementById('pokemonSlug').value.trim().toLowerCase(),
    name: document.getElementById('pokemonName').value.trim(),
    front_sprite: document.getElementById('pokemonFrontSprite').value.trim(),
    back_sprite: document.getElementById('pokemonBackSprite').value.trim() || null,
    cry_url: document.getElementById('pokemonCryUrl').value.trim() || null,
    types: parseTypes(document.getElementById('pokemonTypes').value),
    hp: Number(document.getElementById('pokemonHp').value),
    atk: Number(document.getElementById('pokemonAtk').value),
    speed: Number(document.getElementById('pokemonSpeed').value),
    range: Number(document.getElementById('pokemonRange').value),
    atk_speed: Number(document.getElementById('pokemonAtkSpeed').value),
    cost: Number(document.getElementById('pokemonCost').value),
    rarity: document.getElementById('pokemonRarity').value,
    splash_radius: Number(document.getElementById('pokemonSplashRadius').value || 0),
    sort_order: Number(document.getElementById('pokemonSortOrder').value || 0),
    active: document.getElementById('pokemonActive').checked,
    updated_at: new Date().toISOString()
  };

  const query = id
    ? supabase.from('game_pokemon').update(payload).eq('id', id)
    : supabase.from('game_pokemon').insert(payload);

  const { error } = await query;
  if (error) {
    showMessage(els.pokemonMessage, error.message, true);
    return;
  }

  resetPokemonForm();
  showMessage(els.pokemonMessage, 'Pokémon salvo com sucesso.');
  await loadDashboardData();
}

async function fetchApiPokemonList() {
  if (state.apiPokemonList.length > 0) return state.apiPokemonList;
  try {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1000');
    const data = await res.json();
    state.apiPokemonList = data.results;
    return state.apiPokemonList;
  } catch (error) {
    console.error('Erro ao buscar lista PokeAPI:', error);
    return [];
  }
}

async function searchPokeApi() {
  const query = els.pokeApiSearch.value.trim().toLowerCase();
  if (!query) {
    els.apiSearchResults.style.display = 'none';
    return;
  }

  const list = await fetchApiPokemonList();
  const matches = list
    .filter((p) => p.name.includes(query))
    .slice(0, 10);

  if (matches.length === 0) {
    els.apiSearchResults.innerHTML = '<div class="search-result-item">Nenhum resultado</div>';
  } else {
    els.apiSearchResults.innerHTML = matches
      .map(
        (p) => `
        <div class="search-result-item" data-api-name="${p.name}">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.url.split('/').filter(Boolean).pop()}.png" alt="${p.name}" />
          <span>${p.name}</span>
          <small>PokeAPI</small>
        </div>
      `
      )
      .join('');
  }
  els.apiSearchResults.style.display = 'block';
}

async function importFromPokeApi(apiName) {
  els.apiSearchResults.style.display = 'none';
  els.pokeApiSearch.value = '';
  showMessage(els.pokemonMessage, `Buscando dados de ${apiName}...`);

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${apiName}`);
    const data = await res.json();

    const entry = {
      slug: data.name,
      name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
      front_sprite: data.sprites.front_default || '',
      back_sprite: data.sprites.back_default || '',
      cry_url: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${data.id}.ogg`,
      types: data.types.map((t) => t.type.name),
      hp: data.stats.find((s) => s.stat.name === 'hp')?.base_stat || 50,
      atk: data.stats.find((s) => s.stat.name === 'attack')?.base_stat || 50,
      speed: data.stats.find((s) => s.stat.name === 'speed')?.base_stat || 50,
      range: 45,
      atk_speed: 1000,
      cost: Math.min(10, Math.ceil(data.base_experience / 30) || 3),
      rarity: data.base_experience > 200 ? 'Lendária' : data.base_experience > 100 ? 'Épica' : 'Comum',
      splash_radius: 0,
      sort_order: data.id,
      active: true
    };

    fillPokemonForm(entry);
    document.getElementById('pokemonId').value = ''; // Ensure we create a new one if it was an edit
    showMessage(els.pokemonMessage, `Dados de ${entry.name} carregados! Preencha os detalhes e salve.`);
  } catch (error) {
    showMessage(els.pokemonMessage, `Erro ao importar: ${error.message}`, true);
  }
}

async function saveItem(event) {
  event.preventDefault();
  clearMessage(els.itemMessage);

  const id = document.getElementById('itemId').value;
  const payload = {
    slug: document.getElementById('itemSlug').value.trim().toLowerCase(),
    name: document.getElementById('itemName').value.trim(),
    item_kind: document.getElementById('itemKind').value,
    front_sprite: document.getElementById('itemFrontSprite').value.trim(),
    effect_sprite: document.getElementById('itemEffectSprite').value.trim() || null,
    types: parseTypes(document.getElementById('itemTypes').value),
    atk: Number(document.getElementById('itemAtk').value),
    radius: Number(document.getElementById('itemRadius').value || 0),
    cost: Number(document.getElementById('itemCost').value),
    rarity: document.getElementById('itemRarity').value,
    sort_order: Number(document.getElementById('itemSortOrder').value || 0),
    active: document.getElementById('itemActive').checked,
    updated_at: new Date().toISOString()
  };

  const query = id
    ? supabase.from('game_items').update(payload).eq('id', id)
    : supabase.from('game_items').insert(payload);

  const { error } = await query;
  if (error) {
    showMessage(els.itemMessage, error.message, true);
    return;
  }

  resetItemForm();
  showMessage(els.itemMessage, 'Item salvo com sucesso.');
  await loadDashboardData();
}

async function fetchApiItemList() {
  if (state.apiItemList.length > 0) return state.apiItemList;
  try {
    const res = await fetch('https://pokeapi.co/api/v2/item?limit=2000');
    const data = await res.json();
    state.apiItemList = data.results;
    return state.apiItemList;
  } catch (error) {
    console.error('Erro ao buscar lista de itens PokeAPI:', error);
    return [];
  }
}

async function searchItemApi() {
  const query = els.itemApiSearch.value.trim().toLowerCase();
  if (!query) {
    els.itemApiSearchResults.style.display = 'none';
    return;
  }

  const list = await fetchApiItemList();
  const matches = list
    .filter((i) => i.name.includes(query))
    .slice(0, 10);

  if (matches.length === 0) {
    els.itemApiSearchResults.innerHTML = '<div class="search-result-item">Nenhum resultado</div>';
  } else {
    els.itemApiSearchResults.innerHTML = matches
      .map(
        (i) => `
        <div class="search-result-item" data-api-item-name="${i.name}">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${i.name}.png" 
               onerror="this.src='/poke-royale.png'" alt="${i.name}" />
          <span>${i.name}</span>
          <small>Item API</small>
        </div>
      `
      )
      .join('');
  }
  els.itemApiSearchResults.style.display = 'block';
}

async function importItemFromPokeApi(apiName) {
  els.itemApiSearchResults.style.display = 'none';
  els.itemApiSearch.value = '';
  showMessage(els.itemMessage, `Buscando dados do item ${apiName}...`);

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/item/${apiName}`);
    const data = await res.json();

    const entry = {
      slug: data.name,
      name: (data.names?.find(n => n.language.name === 'en')?.name || data.name).replace(/-/g, ' '),
      item_kind: 'spell', // Default
      front_sprite: data.sprites?.default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${data.name}.png`,
      effect_sprite: null,
      types: [], 
      atk: data.cost ? Math.floor(data.cost / 2) : 50,
      radius: 40,
      cost: Math.min(10, Math.ceil(data.cost / 500) || 2),
      rarity: data.cost > 5000 ? 'Lendária' : data.cost > 1000 ? 'Épica' : 'Comum',
      sort_order: data.id,
      active: true
    };

    // Tentar mapear categoria para tipo
    if (data.category?.name) {
      entry.types = [data.category.name.replace(/-/g, '')];
    }

    fillItemForm(entry);
    document.getElementById('itemId').value = ''; 
    showMessage(els.itemMessage, `Dados de ${entry.name} carregados!`);
  } catch (error) {
    showMessage(els.itemMessage, `Erro ao importar item: ${error.message}`, true);
  }
}

async function toggleEntry(table, collectionKey, id) {
  const current = state[collectionKey].find((entry) => entry.id === id);
  if (!current) return;

  const { error } = await supabase
    .from(table)
    .update({ active: !current.active, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadDashboardData();
}

async function bootstrapSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    showMessage(els.authMessage, error.message, true);
    return;
  }

  if (!data.session) {
    setAuthenticatedUi(false);
    return;
  }

  try {
    state.session = data.session;
    await ensureAdminAccess(data.session);
    setAuthenticatedUi(true);
    await loadDashboardData();
  } catch (error) {
    await supabase.auth.signOut();
    setAuthenticatedUi(false);
    showMessage(els.authMessage, error.message || 'Falha ao validar acesso admin.', true);
  }
}

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage(els.authMessage);

  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showMessage(els.authMessage, error.message, true);
    return;
  }

  try {
    state.session = data.session;
    await ensureAdminAccess(data.session);
    setAuthenticatedUi(true);
    await loadDashboardData();
  } catch (authError) {
    await supabase.auth.signOut();
    setAuthenticatedUi(false);
    showMessage(els.authMessage, authError.message || 'Falha ao validar acesso admin.', true);
  }
});

document.getElementById('pokemonForm').addEventListener('submit', savePokemon);
document.getElementById('itemForm').addEventListener('submit', saveItem);
document.getElementById('resetPokemonFormBtn').addEventListener('click', resetPokemonForm);
document.getElementById('resetItemFormBtn').addEventListener('click', resetItemForm);

els.searchPokeApiBtn.addEventListener('click', searchPokeApi);
els.pokeApiSearch.addEventListener('input', (e) => {
  if (e.target.value.length >= 2) searchPokeApi();
  else els.apiSearchResults.style.display = 'none';
});

els.searchItemApiBtn.addEventListener('click', searchItemApi);
els.itemApiSearch.addEventListener('input', (e) => {
  if (e.target.value.length >= 2) searchItemApi();
  else els.itemApiSearchResults.style.display = 'none';
});

document.addEventListener('click', (e) => {
  const pokemonMatch = e.target.closest('.search-result-item[data-api-name]');
  const itemMatch = e.target.closest('.search-result-item[data-api-item-name]');

  if (pokemonMatch) {
    importFromPokeApi(pokemonMatch.dataset.apiName);
  } else if (itemMatch) {
    importItemFromPokeApi(itemMatch.dataset.apiItemName);
  } else if (!e.target.closest('.api-search-box')) {
    if (els.apiSearchResults) els.apiSearchResults.style.display = 'none';
    if (els.itemApiSearchResults) els.itemApiSearchResults.style.display = 'none';
  }
});

els.logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  state.session = null;
  state.adminUser = null;
  setAuthenticatedUi(false);
});

els.refreshBtn.addEventListener('click', async () => {
  try {
    await loadDashboardData();
  } catch (error) {
    alert(error.message);
  }
});

navButtons.forEach((button) => {
  button.addEventListener('click', () => switchPanel(button.dataset.panel));
});

document.addEventListener('click', async (event) => {
  const action = event.target.dataset.action;
  const id = event.target.dataset.id;
  if (!action || !id) return;

  if (action === 'edit-pokemon') {
    const entry = state.pokemon.find((pokemon) => pokemon.id === id);
    if (entry) {
      fillPokemonForm(entry);
      switchPanel('pokemonPanel');
    }
    return;
  }

  if (action === 'toggle-pokemon') {
    await toggleEntry('game_pokemon', 'pokemon', id);
    return;
  }

  if (action === 'edit-item') {
    const entry = state.items.find((item) => item.id === id);
    if (entry) {
      fillItemForm(entry);
      switchPanel('itemsPanel');
    }
    return;
  }

  if (action === 'toggle-item') {
    await toggleEntry('game_items', 'items', id);
  }
});

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (!session) {
    state.session = null;
    state.adminUser = null;
    setAuthenticatedUi(false);
    return;
  }

  try {
    state.session = session;
    await ensureAdminAccess(session);
    setAuthenticatedUi(true);
    await loadDashboardData();
  } catch (error) {
    showMessage(els.authMessage, error.message || 'Falha ao validar acesso admin.', true);
  }
});

resetPokemonForm();
resetItemForm();
bootstrapSession();

