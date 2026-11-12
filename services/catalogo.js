const express = require('express');
const app = express();
const PORT = 3001;

const cache = new Map();
const TTL = 10 * 60 * 1000;

async function fetchComCache(url) {
  const agora = Date.now();
  if (cache.has(url)) {
    const item = cache.get(url);
    if (agora - item.timestamp < TTL) return item.data;
  }
  const res = await fetch(url);
  if (!res.ok) throw { status: res.status, message: 'Erro ao consultar PokéAPI' };
  const data = await res.json();
  cache.set(url, { data, timestamp: agora });
  return data;
}

app.get('/pokemon', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10);
    if (isNaN(page) || page < 1) {
      return res.status(400).json({ erro: 'Número de página inválido.' });
    }
    const limit = 12;
    const offset = (page - 1) * limit;
    const data = await fetchComCache(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
    const totalPages = Math.ceil(data.count / limit);

    if (page > totalPages) {
      return res.status(400).json({ erro: `Página máxima é ${totalPages}.` });
    }

    const results = data.results.map((p) => {
      const id = p.url.split('/').filter(Boolean).pop();
      return {
        id: Number(id),
        name: p.name,
        image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
      };
    });

    res.json({ page, totalPages, count: data.count, results });
  } catch (err) {
    res.status(err.status || 502).json({ erro: err.message || 'PokéAPI indisponível.' });
  }
});

app.get('/type/:tipo', async (req, res) => {
  try {
    const tipo = req.params.tipo.toLowerCase().trim();
    const data = await fetchComCache(`https://pokeapi.co/api/v2/type/${tipo}`);
    const results = data.pokemon.slice(0, 36).map(({ pokemon }) => {
      const id = pokemon.url.split('/').filter(Boolean).pop();
      return {
        id: Number(id),
        name: pokemon.name,
        image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
      };
    });
    res.json({ tipo, results });
  } catch (err) {
    res.status(err.status === 404 ? 404 : 502).json({ erro: 'Tipo não encontrado ou PokéAPI indisponível.' });
  }
});

app.listen(PORT, () => console.log(`[Catálogo] Rodando na porta ${PORT}`));