const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

async function proxy(req, res, targetUrl) {
  try {
    const options = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (['POST', 'PUT'].includes(req.method)) {
      options.body = JSON.stringify(req.body);
    }
    const response = await fetch(targetUrl, options);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(503).json({ erro: 'Microsserviço temporariamente indisponível.' });
  }
}

app.get('/api/catalogo/pokemon', (req, res) => {
  const page = req.query.page || 1;
  proxy(req, res, `http://localhost:3001/pokemon?page=${page}`);
});

app.get('/api/catalogo/type/:tipo', (req, res) => {
  proxy(req, res, `http://localhost:3001/type/${req.params.tipo}`);
});

app.get('/api/estatisticas/pokemon/:termo', (req, res) => {
  proxy(req, res, `http://localhost:3002/pokemon/${req.params.termo}`);
});

app.all('/api/favoritos', (req, res) => {
  proxy(req, res, 'http://localhost:3003/');
});

app.delete('/api/favoritos/:id', (req, res) => {
  proxy(req, res, `http://localhost:3003/${req.params.id}`);
});

app.listen(PORT, () => console.log(`[API Gateway] Acesse http://localhost:${PORT}`));