const express = require('express');
const app = express();
const PORT = 3002;

const cache = new Map();

async function fetchJson(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw { status: res.status };
  const data = await res.json();
  cache.set(url, data);
  return data;
}

function extrairEvolucoes(chain) {
  const lista = [];
  let atual = chain;
  while (atual) {
    const id = atual.species.url.split('/').filter(Boolean).pop();
    lista.push({
      id: Number(id),
      name: atual.species.name,
      image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
    });
    atual = atual.evolves_to[0];
  }
  return lista;
}

app.get('/pokemon/:termo', async (req, res) => {
  try {
    const termo = req.params.termo.toLowerCase().trim();
    const p = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${termo}`);

    let descricao = 'Descrição não disponível.';
    let evolucoes = [];
    try {
      const species = await fetchJson(p.species.url);
      const entry = species.flavor_text_entries.find((e) => e.language.name === 'en');
      if (entry) descricao = entry.flavor_text.replace(/\f|\n/g, ' ');
      const evoData = await fetchJson(species.evolution_chain.url);
      evolucoes = extrairEvolucoes(evoData.chain);
    } catch (_) {}

    res.json({
      id: p.id,
      name: p.name,
      image: p.sprites.other['official-artwork'].front_default || p.sprites.front_default,
      types: p.types.map((t) => t.type.name),
      heightMeters: (p.height / 10).toFixed(1),
      weightKg: (p.weight / 10).toFixed(1),
      abilities: p.abilities.map((a) => ({
        name: a.ability.name,
        hidden: a.is_hidden
      })),
      stats: p.stats.map((s) => ({
        name: s.stat.name,
        value: s.base_stat
      })),
      descricao,
      evolucoes
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ erro: 'Pokémon não encontrado.' });
    }
    res.status(502).json({ erro: 'Falha ao consultar a PokéAPI.' });
  }
});

app.listen(PORT, () => console.log(`[Estatísticas] Rodando na porta ${PORT}`));