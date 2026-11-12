let currentPage = 1;
let totalPages = 1;
let compareList = [];
let favorites = JSON.parse(localStorage.getItem('pokedex_favs') || '[]');
let allPokemonIndex = [];

// Estado da Batalha (2 posições fixas: índice 0 = Lutador 1, índice 1 = Lutador 2)
let selectedFighters = [null, null];
let battleState = null;

const statusMsg = document.getElementById('status-msg');
const detailSection = document.getElementById('detail-section');
const catalogGrid = document.getElementById('catalog-grid');

/* ==================== ÍNDICE PARA AUTOCOMPLETE ==================== */
async function carregarIndicePokemon() {
  try {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
    if (!res.ok) return;
    const data = await res.json();
    allPokemonIndex = data.results.map((item, idx) => {
      const id = idx + 1;
      return {
        id,
        name: item.name,
        image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
      };
    });
  } catch {
    // Fallback silencioso caso não carregue o índice
  }
}

/* ==================== DICIONÁRIOS PT-BR ==================== */
const TIPOS_PT = {
  normal: 'Normal',
  fire: 'Fogo',
  water: 'Água',
  grass: 'Planta',
  electric: 'Elétrico',
  ice: 'Gelo',
  fighting: 'Lutador',
  poison: 'Veneno',
  ground: 'Terra',
  flying: 'Voador',
  psychic: 'Psíquico',
  bug: 'Inseto',
  rock: 'Pedra',
  ghost: 'Fantasma',
  dragon: 'Dragão',
  dark: 'Sombrio',
  steel: 'Aço',
  fairy: 'Fada'
};

const STATS_PT = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defesa',
  'special-attack': 'Atq. Especial',
  'special-defense': 'Def. Especial',
  speed: 'Velocidade'
};

function traduzirTipo(tipo) {
  return TIPOS_PT[tipo] || tipo;
}

function traduzirStat(stat) {
  return STATS_PT[stat] || stat;
}

function setStatus(msg = '') {
  statusMsg.textContent = msg;
}

/* ==================== NAVEGAÇÃO POR ABAS ==================== */
function alternarAba(nomeAba) {
  document.querySelectorAll('.nav-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === nomeAba);
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  const alvo = document.getElementById(`tab-${nomeAba}`);
  if (alvo) alvo.classList.remove('hidden');

  if (nomeAba === 'favoritos') renderFavoritos();
  if (nomeAba === 'batalha') atualizarSlotsBatalha();
}

function renderStats(stats) {
  return stats.map(s => {
    const pct = Math.min(100, Math.round((s.value / 255) * 100));
    return `
      <div class="stat-row">
        <span>${traduzirStat(s.name)}</span>
        <strong>${s.value}</strong>
        <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

async function carregarDetalhes(termo) {
  setStatus('Carregando ficha do Pokémon...');
  try {
    const res = await fetch(`/api/estatisticas/pokemon/${encodeURIComponent(termo)}`);
    const p = await res.json();
    if (!res.ok) throw new Error(p.erro || 'Erro ao buscar Pokémon.');

    setStatus('');
    const isFav = favorites.some(f => f.id === p.id);

    detailSection.classList.remove('hidden');
    detailSection.innerHTML = `
      <div class="section-header" style="margin-bottom:0.8rem;">
        <span class="poke-id">Ficha Técnica</span>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('detail-section').classList.add('hidden')">Fechar ✕</button>
      </div>
      <div class="detail-layout">
        <div class="detail-profile">
          <img src="${p.image}" alt="Imagem oficial de ${p.name}" width="175" height="175" />
          <span class="poke-id">#${String(p.id).padStart(3, '0')}</span>
          <h3 style="margin:0.2rem 0 0.6rem; text-transform:capitalize; font-size:1.4rem;">${p.name}</h3>
          <div>${p.types.map(t => `<span class="badge">${traduzirTipo(t)}</span>`).join('')}</div>
          <p style="font-size:0.9rem; margin:0.8rem 0;"><strong>Altura:</strong> ${p.heightMeters} m &nbsp;|&nbsp; <strong>Peso:</strong> ${p.weightKg} kg</p>
          <div class="detail-actions">
            <button class="btn btn-primary" onclick="selecionarParaBatalha('${p.name}')">⚔️ Lutar com ${p.name}</button>
            <button class="btn btn-outline" onclick='toggleFavorito(${JSON.stringify({ id: p.id, name: p.name, image: p.image })})'>
              ${isFav ? '★ Remover Favorito' : '☆ Favoritar'}
            </button>
            <button class="btn btn-ghost" onclick='adicionarComparacao(${JSON.stringify(p)})'>⚖️ Comparar</button>
          </div>
        </div>
        <div>
          <p style="font-size:1rem; color:#334155; margin-top:0;"><em>"${p.descricao}"</em></p>
          <h4 style="margin-bottom:0.3rem;">Habilidades</h4>
          <p style="margin-top:0; text-transform:capitalize;">${p.abilities.map(a => `${a.name.replace('-', ' ')}${a.hidden ? ' (oculta)' : ''}`).join(', ')}</p>
          <h4 style="margin-bottom:0.4rem;">Atributos Base</h4>
          ${renderStats(p.stats)}
          <h4 style="margin:1.2rem 0 0.4rem;">Linha Evolutiva</h4>
          <div class="evo-list">
            ${p.evolucoes.map(e => `
              <div class="poke-card" style="padding:0.7rem;" onclick="carregarDetalhes(${e.id})">
                <img src="${e.image}" alt="${e.name}" style="width:64px;height:64px"/>
                <span class="poke-id">#${e.id}</span>
                <strong style="text-transform:capitalize; font-size:0.85rem;">${e.name}</strong>
              </div>`).join('')}
          </div>
        </div>
      </div>
    `;
    detailSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    setStatus(err.message);
  }
}

async function toggleFavorito(poke) {
  const existe = favorites.some(f => f.id === poke.id);
  if (existe) {
    favorites = favorites.filter(f => f.id !== poke.id);
    fetch(`/api/favoritos/${poke.id}`, { method: 'DELETE' }).catch(() => {});
  } else {
    favorites.push(poke);
    fetch('/api/favoritos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(poke)
    }).catch(() => {});
  }
  localStorage.setItem('pokedex_favs', JSON.stringify(favorites));
  renderFavoritos();
  if (!detailSection.classList.contains('hidden')) {
    carregarDetalhes(poke.id);
  }
}

function removerFavoritoDireto(id) {
  favorites = favorites.filter(f => f.id !== id);
  fetch(`/api/favoritos/${id}`, { method: 'DELETE' }).catch(() => {});
  localStorage.setItem('pokedex_favs', JSON.stringify(favorites));
  renderFavoritos();
}

function renderFavoritos() {
  document.getElementById('fav-count').textContent = favorites.length;
  const favContainer = document.getElementById('favorites-list');

  if (!favorites.length) {
    favContainer.innerHTML = '<p style="color:#64748b; grid-column:1/-1; margin:0;">Você ainda não favoritou nenhum Pokémon. Abra qualquer ficha e clique em <strong>"☆ Favoritar"</strong>!</p>';
    return;
  }

  favContainer.innerHTML = favorites.map(f => `
    <div class="poke-card" onclick="carregarDetalhes(${f.id})">
      <img src="${f.image}" alt="${f.name}" />
      <span class="poke-id">#${String(f.id).padStart(3, '0')}</span>
      <span class="poke-name">${f.name}</span>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-primary btn-sm" onclick="selecionarParaBatalha('${f.name}')">⚔️ Lutar</button>
        <button class="btn btn-ghost btn-sm" onclick="removerFavoritoDireto(${f.id})">Remover</button>
      </div>
    </div>
  `).join('');
}

function adicionarComparacao(poke) {
  if (compareList.some(p => p.id === poke.id)) return;
  if (compareList.length >= 2) compareList.shift();
  compareList.push(poke);

  alternarAba('catalogo');
  const sec = document.getElementById('compare-section');
  sec.classList.remove('hidden');
  document.getElementById('compare-grid').innerHTML = compareList.map(p => `
    <div class="poke-card" style="text-align:left; cursor:default;">
      <h3 style="margin-top:0; text-transform:capitalize;">#${p.id} ${p.name}</h3>
      <p style="font-size:0.88rem;">Altura: ${p.heightMeters} m | Peso: ${p.weightKg} kg</p>
      ${renderStats(p.stats)}
    </div>
  `).join('');
}

document.getElementById('clear-compare').onclick = () => {
  compareList = [];
  document.getElementById('compare-section').classList.add('hidden');
};

async function carregarCatalogo(page = 1) {
  setStatus('Carregando catálogo...');
  try {
    const res = await fetch(`/api/catalogo/pokemon?page=${page}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro);

    setStatus('');
    currentPage = data.page;
    totalPages = data.totalPages;
    document.getElementById('pagination').classList.remove('hidden');
    document.getElementById('page-info').textContent = `Página ${currentPage} de ${totalPages}`;
    document.getElementById('prev-page').disabled = currentPage <= 1;
    document.getElementById('next-page').disabled = currentPage >= totalPages;

    renderCards(data.results);
  } catch (err) {
    setStatus(err.message);
  }
}

async function filtrarTipo(tipo) {
  if (tipo === 'all') return carregarCatalogo(1);
  setStatus('Filtrando por tipo...');
  try {
    const res = await fetch(`/api/catalogo/type/${tipo}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro);

    setStatus('');
    document.getElementById('pagination').classList.add('hidden');
    renderCards(data.results);
  } catch (err) {
    setStatus(err.message);
  }
}

function renderCards(lista) {
  catalogGrid.innerHTML = lista.map(p => `
    <div class="poke-card" onclick="carregarDetalhes(${p.id})">
      <img src="${p.image}" alt="${p.name}" loading="lazy" />
      <span class="poke-id">#${String(p.id).padStart(3, '0')}</span>
      <span class="poke-name">${p.name}</span>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-outline btn-sm" onclick="carregarDetalhes(${p.id})">Ver</button>
        <button class="btn btn-primary btn-sm" onclick="selecionarParaBatalha('${p.name}')">⚔️ Lutar</button>
      </div>
    </div>
  `).join('');
}

/* ==================== SISTEMA DE COMBATE ==================== */
const TYPE_CHART = {
  fire: { grass: 2, ice: 2, bug: 2, steel: 2, water: 0.5, fire: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  grass: { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, flying: 2, grass: 0.5, electric: 0.5, dragon: 0.5, ground: 0 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, flying: 0.5, psychic: 0.5, poison: 0.5, bug: 0.5, fairy: 0.5, ghost: 0 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
  flying: { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ghost: { psychic: 2, ghost: 2, dark: 0.5, normal: 0 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
  steel: { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
  poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  normal: { rock: 0.5, steel: 0.5, ghost: 0 }
};

const TYPE_MOVES = {
  fire: { name: 'Lança-Chamas', power: 65 },
  water: { name: 'Jato d’Água', power: 65 },
  grass: { name: 'Folha Navalha', power: 65 },
  electric: { name: 'Choque do Trovão', power: 65 },
  psychic: { name: 'Psíquico', power: 65 },
  ice: { name: 'Raio de Gelo', power: 65 },
  fighting: { name: 'Soco Dinâmico', power: 65 },
  ground: { name: 'Terremoto', power: 65 },
  flying: { name: 'Ataque de Asa', power: 60 },
  rock: { name: 'Avalanche', power: 65 },
  ghost: { name: 'Bola Sombria', power: 65 },
  dragon: { name: 'Garra do Dragão', power: 70 },
  dark: { name: 'Mordida Sombria', power: 60 },
  poison: { name: 'Bomba de Lodo', power: 60 },
  bug: { name: 'Tesoura X', power: 60 },
  steel: { name: 'Cauda de Ferro', power: 65 },
  fairy: { name: 'Brilho Mágico', power: 65 },
  normal: { name: 'Investida', power: 50 }
};

function calcularMultiplicador(moveType, targetTypes) {
  let mult = 1;
  targetTypes.forEach(t => {
    const chart = TYPE_CHART[moveType];
    if (chart && chart[t] !== undefined) mult *= chart[t];
  });
  return mult;
}

function criarLutador(dados) {
  const getStat = (nome) => dados.stats.find(s => s.name === nome)?.value || 50;
  const maxHp = getStat('hp') * 2 + 60;
  const tipo1 = dados.types[0] || 'normal';
  const tipo2 = dados.types[1] || null;

  const golpePrincipal = TYPE_MOVES[tipo1] || TYPE_MOVES.normal;
  const golpeSecundario = tipo2 && TYPE_MOVES[tipo2]
    ? TYPE_MOVES[tipo2]
    : { name: 'Hiper Raio', power: 75, type: 'normal' };

  return {
    id: dados.id,
    name: dados.name,
    image: dados.image,
    types: dados.types,
    maxHp,
    hp: maxHp,
    atk: Math.max(getStat('attack'), getStat('special-attack')),
    def: Math.max(getStat('defense'), getStat('special-defense')),
    spd: getStat('speed'),
    potions: 2,
    moves: [
      { name: 'Ataque Rápido', type: 'normal', power: 40 },
      { name: golpePrincipal.name, type: tipo1, power: golpePrincipal.power },
      { name: golpeSecundario.name, type: golpeSecundario.type || tipo2 || 'normal', power: golpeSecundario.power },
      { name: 'Poção de Cura', type: 'heal', power: 0 }
    ]
  };
}

async function selecionarParaBatalha(termo, slotIndex = null) {
  alternarAba('batalha');
  document.getElementById('battle-setup').classList.remove('hidden');
  document.getElementById('battle-arena').classList.add('hidden');

  setStatus(`Preparando ${termo} para a arena...`);
  try {
    const res = await fetch(`/api/estatisticas/pokemon/${encodeURIComponent(termo)}`);
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro || 'Pokémon não encontrado.');
    setStatus('');

    if (slotIndex !== null) {
      selectedFighters[slotIndex] = dados;
    } else if (!selectedFighters[0]) {
      selectedFighters[0] = dados;
    } else if (!selectedFighters[1]) {
      selectedFighters[1] = dados;
    } else {
      selectedFighters[0] = dados;
      selectedFighters[1] = null;
    }

    atualizarSlotsBatalha();
  } catch (err) {
    setStatus(err.message);
  }
}

function removerLutadorSlot(index) {
  selectedFighters[index] = null;
  atualizarSlotsBatalha();
}

function buscarLutadorNoSlot(event, index) {
  event.preventDefault();
  const input = document.getElementById(`slot-input-${index}`);
  const termo = input.value.trim();
  if (termo) selecionarParaBatalha(termo, index);
}

/* ==================== AUTOCOMPLETE NOS SLOTS ==================== */
function filtrarSugestoesSlot(index) {
  const input = document.getElementById(`slot-input-${index}`);
  const listEl = document.getElementById(`slot-suggestions-${index}`);
  if (!input || !listEl) return;

  const termo = input.value.trim().toLowerCase();
  if (!termo || !allPokemonIndex.length) {
    listEl.classList.add('hidden');
    listEl.innerHTML = '';
    return;
  }

  const matches = allPokemonIndex
    .filter(p => p.name.includes(termo) || String(p.id) === termo)
    .slice(0, 7);

  if (!matches.length) {
    listEl.classList.add('hidden');
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = matches.map(p => `
    <div class="autocomplete-item" onmousedown="selecionarSugestaoSlot('${p.name}', ${index})">
      <img src="${p.image}" alt="${p.name}" loading="lazy" />
      <div>
        <div class="autocomplete-item-id">#${String(p.id).padStart(3, '0')}</div>
        <div class="autocomplete-item-name">${p.name}</div>
      </div>
    </div>
  `).join('');
  listEl.classList.remove('hidden');
}

function selecionarSugestaoSlot(nome, index) {
  selecionarParaBatalha(nome, index);
}

function fecharSugestoesSlot(index) {
  setTimeout(() => {
    const listEl = document.getElementById(`slot-suggestions-${index}`);
    if (listEl) listEl.classList.add('hidden');
  }, 150);
}

function atualizarSlotsBatalha() {
  const startBtn = document.getElementById('start-battle-btn');
  const battleCount = document.getElementById('battle-count');
  const totalProntos = selectedFighters.filter(Boolean).length;

  battleCount.textContent = `${totalProntos}/2`;
  battleCount.classList.toggle('hidden', totalProntos === 0);

  [0, 1].forEach(idx => {
    const slotEl = document.getElementById(`slot-${idx + 1}`);
    const fighter = selectedFighters[idx];
    const titulo = idx === 0 ? '1º Lutador (Você)' : '2º Lutador (Oponente)';

    if (fighter) {
      slotEl.classList.add('ready');
      slotEl.innerHTML = `
        <div class="slot-selected-box">
          <div class="slot-fighter-info">
            <img src="${fighter.image}" alt="${fighter.name}" />
            <div>
              <span class="slot-label">${titulo}</span>
              <div style="font-size:1.05rem; font-weight:800; text-transform:capitalize;">${fighter.name}</div>
              <div style="font-size:0.8rem; color:#475569;">${fighter.types.map(traduzirTipo).join(' / ')}</div>
            </div>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" onclick="removerLutadorSlot(${idx})">Trocar</button>
        </div>
      `;
    } else {
      slotEl.classList.remove('ready');
      slotEl.innerHTML = `
        <form class="slot-search-form" onsubmit="buscarLutadorNoSlot(event, ${idx})" autocomplete="off">
          <span class="slot-label">${titulo}: Aguardando...</span>
          <div class="slot-input-row">
            <div class="autocomplete-wrapper">
              <input
                id="slot-input-${idx}"
                type="text"
                placeholder="Digite nome ou nº (ex: gen...)"
                oninput="filtrarSugestoesSlot(${idx})"
                onfocus="filtrarSugestoesSlot(${idx})"
                onblur="fecharSugestoesSlot(${idx})"
                required
              />
              <div id="slot-suggestions-${idx}" class="autocomplete-list hidden"></div>
            </div>
            <button type="submit" class="btn btn-primary btn-sm">Escolher</button>
          </div>
        </form>
      `;
    }
  });

  startBtn.disabled = totalProntos < 2;
}

document.getElementById('quick-battle-btn').onclick = async () => {
  const id1 = Math.floor(Math.random() * 151) + 1;
  let id2 = Math.floor(Math.random() * 151) + 1;
  if (id2 === id1) id2 = (id1 % 151) + 1;

  setStatus('Sorteando lutadores...');
  try {
    const [res1, res2] = await Promise.all([
      fetch(`/api/estatisticas/pokemon/${id1}`),
      fetch(`/api/estatisticas/pokemon/${id2}`)
    ]);

    const r1 = await res1.json();
    const r2 = await res2.json();

    if (!res1.ok || !res2.ok) {
      throw new Error(r1.erro || r2.erro || 'Serviço de estatísticas indisponível (porta 3002).');
    }

    setStatus('');
    selectedFighters = [r1, r2];
    atualizarSlotsBatalha();
    iniciarCombate();
  } catch (e) {
    setStatus(`Erro na batalha rápida: ${e.message}`);
  }
};

document.getElementById('start-battle-btn').onclick = iniciarCombate;

const resetBtn = document.getElementById('reset-battle');
if (resetBtn) {
  resetBtn.onclick = () => {
    selectedFighters = [null, null];
    battleState = null;
    document.getElementById('battle-arena').classList.add('hidden');
    document.getElementById('battle-setup').classList.remove('hidden');
    atualizarSlotsBatalha();
  };
}

function iniciarCombate() {
  if (!selectedFighters[0] || !selectedFighters[1]) return;
  battleState = {
    p1: criarLutador(selectedFighters[0]),
    p2: criarLutador(selectedFighters[1]),
    busy: false,
    over: false
  };

  document.getElementById('battle-setup').classList.add('hidden');
  document.getElementById('battle-arena').classList.remove('hidden');

  document.getElementById('p1-name').textContent = battleState.p1.name;
  document.getElementById('p1-sprite').src = battleState.p1.image;
  document.getElementById('p2-name').textContent = battleState.p2.name;
  document.getElementById('p2-sprite').src = battleState.p2.image;

  atualizarHudBatalha();
  renderBotoesGolpes();
  escreverLog(`Um ${battleState.p2.name.toUpperCase()} entrou na arena! Escolha seu golpe.`);
}

function atualizarHudBatalha() {
  ['p1', 'p2'].forEach(key => {
    const f = battleState[key];
    const pct = Math.max(0, Math.round((f.hp / f.maxHp) * 100));
    const bar = document.getElementById(`${key}-hp-bar`);
    bar.style.width = `${pct}%`;
    bar.style.backgroundColor = pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444';
    document.getElementById(`${key}-hp-num`).textContent = Math.max(0, f.hp);
    document.getElementById(`${key}-hp-max`).textContent = f.maxHp;
  });
}

function escreverLog(linhas) {
  const logEl = document.getElementById('battle-log');
  if (Array.isArray(linhas)) {
    logEl.innerHTML = linhas.map(l => `<div>▸ ${l}</div>`).join('');
  } else {
    logEl.innerHTML = `<div>▸ ${linhas}</div>`;
  }
}

function animarDano(targetKey) {
  const sprite = document.getElementById(`${targetKey}-sprite`);
  sprite.classList.remove('hit-anim');
  void sprite.offsetWidth;
  sprite.classList.add('hit-anim');
}

function renderBotoesGolpes() {
  const container = document.getElementById('battle-moves');
  if (battleState.over) {
    container.innerHTML = `
      <button class="btn btn-primary" style="grid-column:span 2;" onclick="iniciarCombate()">🔄 Revanche</button>
    `;
    return;
  }

  container.innerHTML = battleState.p1.moves.map((m, idx) => {
    const isHeal = m.type === 'heal';
    const disabled = battleState.busy || (isHeal && battleState.p1.potions <= 0);
    return `
      <button class="move-btn" ${disabled ? 'disabled' : ''} onclick="executarTurno(${idx})">
        <span class="move-title">${m.name} ${isHeal ? `(${battleState.p1.potions})` : ''}</span>
        <span class="move-meta">${isHeal ? 'Recupera 45% HP' : `Tipo: ${traduzirTipo(m.type)} • Poder ${m.power}`}</span>
      </button>
    `;
  }).join('');
}

function aplicarGolpe(atacante, defensor, move) {
  if (move.type === 'heal') {
    if (atacante.potions <= 0) return `${atacante.name} não tem mais poções!`;
    atacante.potions--;
    const cura = Math.round(atacante.maxHp * 0.45);
    atacante.hp = Math.min(atacante.maxHp, atacante.hp + cura);
    return `${atacante.name.toUpperCase()} usou Poção e recuperou ${cura} de HP!`;
  }

  const mult = calcularMultiplicador(move.type, defensor.types);
  const critico = Math.random() < 0.12 ? 1.5 : 1;
  const variacao = 0.85 + Math.random() * 0.15;
  const danoBase = (((22 * move.power * (atacante.atk / defensor.def)) / 18) + 6);
  const danoFinal = mult === 0 ? 0 : Math.max(4, Math.round(danoBase * mult * critico * variacao));

  defensor.hp = Math.max(0, defensor.hp - danoFinal);

  let msg = `${atacante.name.toUpperCase()} usou ${move.name}!`;
  if (mult === 0) msg += ' Não teve efeito...';
  else {
    msg += ` Causou ${danoFinal} de dano.`;
    if (mult > 1) msg += ' Foi super efetivo!';
    if (mult < 1) msg += ' Não foi muito efetivo...';
    if (critico > 1) msg += ' Acerto crítico!';
  }
  return msg;
}

function executarTurno(moveIdx) {
  if (!battleState || battleState.busy || battleState.over) return;
  battleState.busy = true;
  renderBotoesGolpes();

  const { p1, p2 } = battleState;
  const moveP1 = p1.moves[moveIdx];
  const msg1 = aplicarGolpe(p1, p2, moveP1);
  if (moveP1.type !== 'heal') animarDano('p2');
  atualizarHudBatalha();

  if (p2.hp <= 0) {
    battleState.over = true;
    battleState.busy = false;
    escreverLog([msg1, `🏆 ${p2.name.toUpperCase()} desmaiou! ${p1.name.toUpperCase()} venceu a batalha!`]);
    renderBotoesGolpes();
    return;
  }

  escreverLog([msg1, `${p2.name.toUpperCase()} está preparando o contra-ataque...`]);

  setTimeout(() => {
    const opcoesOponente = p2.hp < p2.maxHp * 0.35 && p2.potions > 0
      ? [0, 1, 2, 3]
      : [0, 1, 2];
    const escolha = opcoesOponente[Math.floor(Math.random() * opcoesOponente.length)];
    const moveP2 = p2.moves[escolha];
    const msg2 = aplicarGolpe(p2, p1, moveP2);
    if (moveP2.type !== 'heal') animarDano('p1');
    atualizarHudBatalha();

    if (p1.hp <= 0) {
      battleState.over = true;
      escreverLog([msg2, `💀 ${p1.name.toUpperCase()} desmaiou! ${p2.name.toUpperCase()} venceu!`]);
    } else {
      escreverLog([msg1, msg2]);
    }

    battleState.busy = false;
    renderBotoesGolpes();
  }, 950);
}

/* ==================== EVENTOS GERAIS ==================== */
document.getElementById('search-form').onsubmit = (e) => {
  e.preventDefault();
  const termo = document.getElementById('search-input').value.trim();
  if (termo) carregarDetalhes(termo);
};

document.getElementById('random-btn').onclick = () => {
  const randomId = Math.floor(Math.random() * 1025) + 1;
  carregarDetalhes(randomId);
};

document.getElementById('prev-page').onclick = () => carregarCatalogo(currentPage - 1);
document.getElementById('next-page').onclick = () => carregarCatalogo(currentPage + 1);

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtrarTipo(btn.dataset.type);
  };
});

carregarIndicePokemon();
renderFavoritos();
atualizarSlotsBatalha();
carregarCatalogo(1);