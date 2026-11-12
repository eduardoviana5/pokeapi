const express = require('express');
const app = express();
const PORT = 3003;

app.use(express.json());
const favoritos = new Map();

app.get('/', (req, res) => {
  res.json(Array.from(favoritos.values()));
});

app.post('/', (req, res) => {
  const { id, name, image } = req.body;
  if (!id || !name) return res.status(400).json({ erro: 'Dados inválidos.' });
  favoritos.set(Number(id), { id: Number(id), name, image });
  res.status(201).json(Array.from(favoritos.values()));
});

app.delete('/:id', (req, res) => {
  favoritos.delete(Number(req.params.id));
  res.json(Array.from(favoritos.values()));
});

app.listen(PORT, () => console.log(`[Favoritos] Rodando na porta ${PORT}`));