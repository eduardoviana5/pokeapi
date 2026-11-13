const express = require('express');
const app = express();

app.use(express.json());

const POKEAPI_BASE = 'https://pokeapi.co/api/v2';
const cache = new Map();
let favoritosMemoria = [];

function extractIdFromUrl(url) {
  const parts = url.split('/').filter(Boolean);
  return Number(parts[parts.length - 1]);
}

function getOfficialArtwork(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function flattenEvolutionChain(chainNode, list = []) {
  const id = extractIdFromUrl(chainNode.species.url);
  list.push({
    id,
    name: chainNode.species.name,
    image: getOfficialArtwork(id)
  });
  for (const next of chainNode.evolves_to || []) {
    flattenEvolutionChain(next, list);
  }
  return list;
}

async function traduzirParaPtBr(texto) {
  if (!texto) return 'Descrição indisponível.';
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=en|pt-BR`;
    const res = await fetch(url);
    if (!res.ok) return texto;
    const data = await res.json();
    const traduzido = data?.responseData?.translatedText;
    return traduzido && !traduzido.includes('MYMEMORY WARNING') ? traduzido : texto;
  } catch {
    return texto;
  }
}

// CATÁLOGO PAGINADO
app.get('/api/catalogo/pokemon', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const response = await fetch(`${POKEAPI_BASE}/pokemon?limit=${limit}&offset=${offset}`);
    if (!response.ok) return res.status(502).json({ erro: 'Erro ao consultar PokéAPI.' });

    const data = await response.json();
    const results = data.results.map(item => {
      const id = extractIdFromUrl(item.url);
      return { id, name: item.name, image: getOfficialArtwork(id) };
    });

    res.json({
      page,
      totalPages: Math.ceil(data.count / limit),
      results
    });
  } catch {
    res.status(500).json({ erro: 'Erro interno no catálogo.' });
  }
});

// FILTRO POR TIPO
app.get('/api/catalogo/type/:tipo', async (req, res) => {
  try {
    const tipo = req.params.tipo.toLowerCase().trim();
    const response = await fetch(`${POKEAPI_BASE}/type/${encodeURIComponent(tipo)}`);
    if (!response.ok) return res.status(404).json({ erro: 'Tipo não encontrado.' });

    const data = await response.json();
    const results = data.pokemon
      .map(entry => {
        const id = extractIdFromUrl(entry.pokemon.url);
        return { id, name: entry.pokemon.name, image: getOfficialArtwork(id) };
      })
      .filter(p => p.id <= 1025);

    res.json({ results });
  } catch {
    res.status(500).json({ erro: 'Erro ao filtrar por tipo.' });
  }
});

// FICHA TÉCNICA / ESTATÍSTICAS
app.get('/api/estatisticas/pokemon/:termo', async (req, res) => {
  try {
    const termo = req.params.termo.toLowerCase().trim();
    if (cache.has(termo)) return res.json(cache.get(termo));

    const pokeRes = await fetch(`${POKEAPI_BASE}/pokemon/${encodeURIComponent(termo)}`);
    if (!pokeRes.ok) return res.status(404).json({ erro: 'Pokémon não encontrado.' });
    const pokemon = await pokeRes.json();

    const speciesRes = await fetch(pokemon.species.url);
    const species = speciesRes.ok ? await speciesRes.json() : null;

    let evolucoes = [];
    if (species?.evolution_chain?.url) {
      const evoRes = await fetch(species.evolution_chain.url);
      if (evoRes.ok) {
        const evoData = await evoRes.json();
        evolucoes = flattenEvolutionChain(evoData.chain);
      }
    }

    const flavorEntry = species?.flavor_text_entries?.find(f => f.language.name === 'en');
    const descricaoIngles = flavorEntry ? flavorEntry.flavor_text.replace(/[\n\f\r]/g, ' ') : '';
    const descricao = await traduzirParaPtBr(descricaoIngles);

    const resultado = {
      id: pokemon.id,
      name: pokemon.name,
      image: getOfficialArtwork(pokemon.id),
      heightMeters: pokemon.height / 10,
      weightKg: pokemon.weight / 10,
      types: pokemon.types.map(t => t.type.name),
      abilities: pokemon.abilities.map(a => ({ name: a.ability.name, hidden: a.is_hidden })),
      stats: pokemon.stats.map(s => ({ name: s.stat.name, value: s.base_stat })),
      descricao,
      evolucoes
    };

    cache.set(termo, resultado);
    cache.set(String(pokemon.id), resultado);
    cache.set(pokemon.name.toLowerCase(), resultado);

    res.json(resultado);
  } catch {
    res.status(500).json({ erro: 'Erro interno ao buscar detalhes do Pokémon.' });
  }
});

// FAVORITOS
app.get('/api/favoritos', (req, res) => res.json(favoritosMemoria));
app.post('/api/favoritos', (req, res) => {
  const poke = req.body;
  if (poke && !favoritosMemoria.some(f => f.id === poke.id)) favoritosMemoria.push(poke);
  res.status(201).json(favoritosMemoria);
});
app.delete('/api/favoritos/:id', (req, res) => {
  const id = Number(req.params.id);
  favoritosMemoria = favoritosMemoria.filter(f => f.id !== id);
  res.json(favoritosMemoria);
});

module.exports = app;