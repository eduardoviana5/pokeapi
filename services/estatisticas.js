const express = require('express');
const app = express();
const PORT = 3002;
const POKEAPI_BASE = 'https://pokeapi.co/api/v2';

const cache = new Map();

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

app.get('/pokemon/:termo', async (req, res) => {
  try {
    const termo = req.params.termo.toLowerCase().trim();
    if (cache.has(termo)) {
      return res.json(cache.get(termo));
    }

    const pokeRes = await fetch(`${POKEAPI_BASE}/pokemon/${encodeURIComponent(termo)}`);
    if (!pokeRes.ok) {
      return res.status(404).json({ erro: 'Pokémon não encontrado.' });
    }
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
    const descricaoIngles = flavorEntry
      ? flavorEntry.flavor_text.replace(/[\n\f\r]/g, ' ')
      : '';
    const descricao = await traduzirParaPtBr(descricaoIngles);

    const resultado = {
      id: pokemon.id,
      name: pokemon.name,
      image: getOfficialArtwork(pokemon.id),
      heightMeters: pokemon.height / 10,
      weightKg: pokemon.weight / 10,
      types: pokemon.types.map(t => t.type.name),
      abilities: pokemon.abilities.map(a => ({
        name: a.ability.name,
        hidden: a.is_hidden
      })),
      stats: pokemon.stats.map(s => ({
        name: s.stat.name,
        value: s.base_stat
      })),
      descricao,
      evolucoes
    };

    cache.set(termo, resultado);
    cache.set(String(pokemon.id), resultado);
    cache.set(pokemon.name.toLowerCase(), resultado);

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno ao buscar detalhes do Pokémon.' });
  }
});

app.listen(PORT, () => {
  console.log(`[Serviço Estatísticas] rodando na porta ${PORT}`);
});