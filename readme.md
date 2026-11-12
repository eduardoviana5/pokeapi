# Pokédex Explorer

Aplicação web full-stack desenvolvida em **Node.js + Express** e **JavaScript Vanilla** para consulta, filtragem, comparação e gestão de favoritos de Pokémon a partir da **PokéAPI v2**.

---

## 1. Arquitetura do Projeto

O sistema foi estruturado seguindo a evolução de um backend único para uma arquitetura distribuída baseada em **API Gateway** e **Microsserviços**:

```text
Frontend (HTML / CSS / JS)
          │
          ▼
   API Gateway (:3000)
    ├──► Catálogo (:3001)      -> Listagem paginada, filtros por tipo e cache em memória (TTL)
    ├──► Estatísticas (:3002)  -> Consulta por nome/ID, conversão de unidades, stats, espécies e evoluções
    └──► Favoritos (:3003)     -> Serviço dedicado para gestão de Pokémon favoritados
          │
          ▼
     PokéAPI v2 (GET)