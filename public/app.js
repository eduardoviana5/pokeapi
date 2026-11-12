let currentPage = 1;
let totalPages = 1;
let compareList = [];
let favorites = JSON.parse(localStorage.getItem('pokedex_favs') || '[]');

const statusMsg = document.getElementById('status-msg');
const detailSection = document.getElementById('detail-section');
const catalogGrid = document.getElementById('catalog-grid');

function setStatus(msg = '') {
  statusMsg.textContent = msg;
}

function renderStats(stats) {
  return stats.map(s => {
    const pct = Math.min(100, Math.round((s.value / 255) * 100));
    return `
      <div class="stat-row">
        <span>${s.name}</span>
        <strong>${s.value}</strong>
        <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

async function carregarDetalhes(termo) {
  setStatus('Carregando Pokémon...');
  try {
    const res = await fetch(`/api/estatisticas/pokemon/${encodeURIComponent(termo)}`);
    const p = await res.json();
    if (!res.ok) throw new Error(p.erro || 'Erro ao buscar Pokémon.');

    setStatus('');
    const isFav = favorites.some(f => f.id === p.id);

    detailSection.classList.remove('hidden');
    detailSection.innerHTML = `
      <div class="detail-layout">
        <div style="text-align:center">
          <img src="${p.image}" alt="Imagem oficial de ${p.name}" width="180" height="180" />
          <h3>#${p.id} ${p.name.toUpperCase()}</h3>
          <div>${p.types.map(t => `<span class="badge">${t}</span>`).join('')}</div>
          <p><strong>Altura:</strong> ${p.heightMeters} m | <strong>Peso:</strong> ${p.weightKg} kg</p>
          <button onclick='toggleFavorito(${JSON.stringify({ id: p.id, name: p.name, image: p.image })})'>
            ${isFav ? 'Remover Favorito' : 'Favoritar'}
          </button>
          <button onclick='adicionarComparacao(${JSON.stringify(p)})'>Comparar</button>
        </div>
        <div>
          <p><em>${p.descricao}</em></p>
          <h4>Habilidades</h4>
          <p>${p.abilities.map(a => `${a.name}${a.hidden ? ' (oculta)' : ''}`).join(', ')}</p>
          <h4>Estatísticas Base</h4>
          ${renderStats(p.stats)}
          <h4>Linha Evolutiva</h4>
          <div class="evo-list">
            ${p.evolucoes.map(e => `
              <div class="poke-card" onclick="carregarDetalhes(${e.id})">
                <img src="${e.image}" alt="${e.name}" style="width:60px;height:60px"/>
                <div>#${e.id} ${e.name}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    `;
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
  carregarDetalhes(poke.id);
}

function renderFavoritos() {
  document.getElementById('fav-count').textContent = favorites.length;
  document.getElementById('favorites-list').innerHTML = favorites.length
    ? favorites.map(f => `
        <div class="poke-card" onclick="carregarDetalhes(${f.id})">
          <img src="${f.image}" alt="${f.name}" style="width:64px;height:64px" />
          <div>#${f.id} ${f.name}</div>
        </div>`).join('')
    : '<p>Nenhum Pokémon favoritado.</p>';
}

function adicionarComparacao(poke) {
  if (compareList.some(p => p.id === poke.id)) return;
  if (compareList.length >= 2) compareList.shift();
  compareList.push(poke);

  const sec = document.getElementById('compare-section');
  sec.classList.remove('hidden');
  document.getElementById('compare-grid').innerHTML = compareList.map(p => `
    <div class="poke-card" style="text-align:left">
      <h3>#${p.id} ${p.name.toUpperCase()}</h3>
      <p>Altura: ${p.heightMeters} m | Peso: ${p.weightKg} kg</p>
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
      <div><strong>#${p.id}</strong> ${p.name}</div>
    </div>
  `).join('');
}

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

renderFavoritos();
carregarCatalogo(1);