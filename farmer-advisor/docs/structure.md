# Project structure

farmer-advisor/
  docker-compose.yml
  .env.example
  db/
    init.sql                   tables and pgvector index
    migrations/                changes for databases created earlier
  data/
    crops.csv                  crop thresholds to fill in
    guides/                    farming guides for the five crops
  backend/
    requirements.txt
    README.md
    app/
      main.py                  FastAPI app
      api/                     auth, profile, chat (with photos), farm overview, officer routes
      agent/                   prompts, context, factory (model + agent), runner (one chat turn)
      tools/                   weather, soil, planting, guides, prices, profile, escalation
      middleware/              input guard, audit log, dynamic prompt, limits, error handling
      rag/                     embeddings, ingestion, retrieval
      services/                farm overview (weather cache + planting status)
      db/                      pool and queries
      core/                    settings, security, photo processing, logging
    scripts/                   create_user, load_crops, load_prices, ingest_guides
    tests/
  frontend/
    README.md
    src/app/                   routes: login, register, today, chat, farm, cases
    src/components/            chat, today (rain gauge), farm (map), cases, layout, ui
    src/lib/                   API client, types, formatting, geo, image helpers
    tests/
