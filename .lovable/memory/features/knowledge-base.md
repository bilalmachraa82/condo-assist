---
name: Knowledge Base Module
description: Knowledge articles table, 14 categories, CRUD UI at /knowledge, 4 API endpoints in agent-api
type: feature
---

## Knowledge Base

Table `knowledge_articles` with fields: title, content (markdown), category, subcategory, tags[], building_id (FK), is_global, is_published, metadata (jsonb), created_by.

### Categories (14)
procedimentos, edificios, elevadores, extintores, gas, seguros, acidentes_trabalho, desbaratizacao, colunas_eletricas, caleiras, chamines, fornecedores, legal, geral

### Frontend
- Page: `/knowledge` with filters, card grid, Sheet form (markdown editor with preview), detail dialog
- Components: KnowledgeFilters, KnowledgeCard, KnowledgeForm, KnowledgeDetail
- Hook: `useKnowledgeArticles` with CRUD mutations + toast feedback
- Sidebar: "Base de Conhecimento" with BookOpen icon

### API (agent-api endpoints)
- `GET /v1/knowledge` — search articles (q, category, building_id, tags, limit, offset)
- `GET /v1/knowledge/:id` — full article with content
- `POST /v1/knowledge` — create article
- `PATCH /v1/knowledge/:id` — partial update

### Dependencies
- react-markdown + remark-gfm for markdown rendering
