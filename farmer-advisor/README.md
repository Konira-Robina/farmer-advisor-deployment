# Farmer Advisor

Farmer Advisor is an AI-powered agricultural advisory application designed for smallholder farmers in Uganda. It helps farmers make more informed farming decisions using their farm location, crop information, weather conditions, soil data, market prices and a library of agricultural guides.

Farmers can ask questions in plain language, share photos of plants for assessment, and receive context-aware agricultural guidance. When a situation requires human assistance, the system can escalate it to an extension officer.

## Main Features

### Farmer experience
- User registration, login and profile management.
- Farm location selection using a map, place search, geolocation or coordinates.
- Farm details, including farm size and crops grown.
- A Today dashboard showing weather conditions, rainfall history, forecasts and crop-related information.
- AI-powered conversations with support for follow-up questions and conversation history.
- Uploading plant photos for AI-assisted assessment when the configured model supports vision.
- Feedback on assistant responses.
- Escalation of cases requiring human review.

### Agricultural information
- Weather information and forecasts through Open-Meteo.
- Soil information through iSDAsoil.
- Rule-based planting advice using available crop and rainfall information.
- Retrieval of relevant farming guides.
- Market price information.
- Crop variety comparisons based on recorded, source-backed agricultural evidence.

### Extension officer experience
- Review and manage escalated farmer cases.
- Record and update market prices.
- Provide human oversight when automated advice is insufficient.

## Technology Stack

| Area | Technologies |
|---|---|
| Backend | Python, FastAPI, Pydantic |
| AI agent | LangChain, LangGraph, OpenRouter |
| Database | PostgreSQL, pgvector |
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Embeddings and retrieval | Embedding models, vector similarity search, pgvector |
| Weather | Open-Meteo |
| Soil data | iSDAsoil |
| Maps | OpenStreetMap, Nominatim |
| Testing | Pytest, Vitest |
| Local database | Docker Compose |
| Hosted database | Neon PostgreSQL |

## Project Structure

```text
farmer-advisor/
├── backend/
│   ├── app/
│   │   ├── agent/          # Agent construction, prompts and execution
│   │   ├── api/            # FastAPI routes and request schemas
│   │   ├── core/           # Configuration, security and image handling
│   │   ├── db/             # Database access functions
│   │   ├── middleware/     # Agent and request safeguards
│   │   ├── rag/             # Guide ingestion, embeddings and retrieval
│   │   ├── services/       # Supporting application services
│   │   └── tools/           # Tools available to the AI agent
│   ├── scripts/             # Data loading and account creation scripts
│   ├── tests/               # Backend tests
│   └── requirements.txt
├── data/
│   ├── crops.csv            # Crop information and thresholds
│   └── guides/              # Agricultural knowledge documents
├── db/
│   ├── init.sql             # Initial database schema
│   └── migrations/          # Subsequent database changes
├── docs/                    # Project documentation
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages and layouts
│   │   ├── components/      # Reusable UI components
│   │   └── lib/             # Frontend utilities and API client
│   ├── tests/               # Frontend tests
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
└── package.json
└── package-lock.json
└── neon.ts
```

## Getting Started

### Prerequisites

You will need:

- Python 3.11 or a compatible version supported by the backend dependencies.
- Node.js and npm.
- PostgreSQL with the pgvector extension.
- A PostgreSQL database, such as Neon, or a local Docker database.
- An OpenRouter API key for live AI responses.

Other external integrations, such as iSDAsoil and LangSmith, require their respective credentials.

### 1. Clone the repository

```bash
git clone <repository-url>
cd farmer-advisor
```

### 2. Configure environment variables

Copy the root environment example:

```bash
cp .env.example .env
```

Update `.env` with the required configuration.

Important variables include:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Main PostgreSQL connection string |
| `TEST_DATABASE_URL` | Separate database connection used by database tests |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `COOKIE_SECURE` | Enables secure cookies when deployed over HTTPS |
| `CORS_ORIGINS` | Allowed frontend origins |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `LLM_MODEL` | Model used by the AI agent |
| `LLM_SUPPORTS_VISION` | Indicates whether the configured model supports images |
| `LLM_PRICE_IN_PER_MILLION` | Optional input-token price for cost estimates |
| `LLM_PRICE_OUT_PER_MILLION` | Optional output-token price for cost estimates |
| `EMBEDDING_MODEL` | Embedding model used for retrieval |
| `EMBEDDING_API_KEY` | Embedding provider API key |
| `EMBEDDING_BASE_URL` | Embedding provider endpoint |
| `ISDA_USERNAME` | Optional iSDAsoil credentials |
| `ISDA_PASSWORD` | Optional iSDAsoil credentials |
| `LANGSMITH_TRACING` | Enables or disables LangSmith tracing |
| `LANGSMITH_API_KEY` | LangSmith API key |
| `LANGSMITH_PROJECT` | LangSmith project name |

The root `.env.example` also contains `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` for the optional local Docker database.

Generate a strong JWT secret with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Do not commit your actual `.env` file or expose API keys and database credentials.

### 3. Configure the database

Farmer Advisor uses PostgreSQL with the pgvector extension.

**Hosted database (Neon)**

The project can use Neon PostgreSQL as its primary hosted database. Create a database with pgvector support and set its connection string as `DATABASE_URL` in the root `.env` file.

**Local database (Docker)**

Docker Compose provides an optional local PostgreSQL instance using the pgvector image:

```bash
docker compose up -d
```

The database service uses the credentials in the root `.env` file. Its initial schema is mounted from `db/init.sql`.

Before running database commands in Git Bash, load the root environment variables:

```bash
set -a
source .env
set +a

### 4. Initialize the database schema

For a fresh database, execute the initial schema:

```bash
psql "$DATABASE_URL" -f db/init.sql
```

Then apply the project migrations in filename order:

```bash
psql "$DATABASE_URL" -f db/migrations/002_message_images.sql
psql "$DATABASE_URL" -f db/migrations/003_crop_varieties_and_sources.sql
```

For an existing database, apply only migrations that have not already been applied. Do not rerun `db/init.sql` against an initialized database because it creates tables without checking whether they already exist.

The project currently uses manual SQL migrations rather than an application-managed migration tracking system. Keep a record of which migrations have been applied to each database.

**Testing database:** The test suite uses `TEST_DATABASE_URL`, not the main application database. Its database name must contain `test`. The test fixture initializes the schema when necessary and applies the migration files automatically. Never point `TEST_DATABASE_URL` at your development or production database because database tests reset data.

### 5. Set up and run the backend

Open a terminal in the project root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment in Git Bash:

```bash
source .venv/Scripts/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI development server:

```bash
uvicorn app.main:app --reload
```

The backend normally runs at:

```text
http://127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/health
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

### 6. Set up and run the frontend

Open a second terminal in the project root:

```bash
cd frontend
npm install
cp .env.example .env.local
```

The frontend environment example contains:

```env
BACKEND_URL=http://127.0.0.1:8000
```

Change this value if the backend runs at another address.

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The Next.js application communicates with the FastAPI backend through its built-in API proxy. This keeps browser requests on the frontend origin and allows the authentication cookie to remain first-party.

## Frontend Pages

| Route | Access | Purpose |
|---|---|---|
| `/login` | Public | Sign in |
| `/register` | Public | Create an account |
| `/today` | Farmers | Weather, rainfall and crop information |
| `/chat` | Farmers | Start a conversation with the advisor |
| `/chat/[id]` | Farmers | Continue a conversation |
| `/farm` | Farmers | Set farm location and profile information |
| `/cases` | Officers and admins | Review escalated cases and manage market prices |

The frontend is designed for mobile and desktop use. It includes responsive navigation, accessible form controls, loading and error states, and retry handling.

## Agricultural Data

The quality of agricultural advice depends on the quality and coverage of the available agricultural data. The application is designed to use recorded information rather than inventing unsupported agronomic facts.

### Crop information

Crop information is stored in:

```text
data/crops.csv
```

It can include:

- Crop name.
- Days to maturity.
- Minimum rainfall requirements.
- Ideal soil pH range.
- Source information.

Load crop information from the backend directory:

```bash
python -m scripts.load_crops
```

### Farming guides

Place agricultural guides in:

```text
data/guides/
```

Supported formats:

- Markdown (`.md`)
- Plain text (`.txt`)
- PDF (`.pdf`)

The folder structure can identify the crop associated with a guide:

```text
data/guides/
├── maize/
│   └── maize_production_guide.pdf
├── beans/
│   └── bean_production_guide.md
└── general/
    └── soil_health.md
```

Markdown and text guides can include metadata at the beginning of the file, followed by a blank line:

```text
title: Maize pest control
source: NARO Maize Handbook, 2021
crop: maize

The guide content starts here.
```

Without metadata, the title is derived from the filename and the source from the file path.

Each guide source should be unique.

To ingest or reload guides, run this command from the backend directory:

```bash
python -m scripts.ingest_guides
```

### Crop varieties and agricultural evidence

The application supports individual crop varieties and source-backed agricultural characteristics.

Important database tables include:

- `agricultural_sources`: Publication and source information.
- `crop_varieties`: Individual varieties associated with crops.
- `crop_source_evidence`: Documented characteristics associated with crops or individual varieties.

Evidence can include:

- Days to maturity.
- Yield potential.
- Disease resistance or susceptibility.
- Soil requirements.
- Rainfall requirements.
- Other documented agricultural characteristics.

Source records retain publication details, organisation, URL and verification information. Evidence records retain the characteristic, value, unit, source page, source excerpt and confidence.

The variety comparison tool retrieves recorded evidence for each variety. Missing information should be identified rather than treated as proof that a characteristic is absent.

The migration for these tables is:

```text
db/migrations/003_crop_varieties_and_sources.sql
```

### Market prices

Market prices can be loaded from a CSV file:

```bash
python -m scripts.load_prices --file prices.csv
```

The expected columns are:

- `crop`
- `market`
- `price_ugx_per_kg`
- `recorded_on`
- `source`

Market prices can also be recorded by authorized extension officers through the application.

### Extension officer accounts

Create an extension officer account from the backend directory:

```bash
python -m scripts.create_user --email officer@example.com --role extension_officer
```

The script is used to create an authorized officer account. Use the appropriate email address for the intended account.

## AI Agent and Tools

The backend uses LangChain and LangGraph to organize the AI agent's workflow. The agent can use application tools to retrieve relevant information and perform supported operations.

Available tools include:

| Tool | Purpose |
|---|---|
| `get_weather` | Retrieve weather information and forecasts |
| `get_soil_profile` | Retrieve soil information |
| `get_planting_advice` | Generate planting guidance from available crop and rainfall information |
| `search_farming_guides` | Retrieve relevant agricultural guide content |
| `get_market_prices` | Retrieve recorded market prices |
| `compare_crop_varieties` | Compare varieties using recorded evidence |
| `update_farmer_profile` | Update farmer profile information |
| `escalate_to_extension_officer` | Refer a case for human review |

The agent is designed to use tools for relevant information instead of relying only on its language model's general knowledge.

### Retrieval-Augmented Generation (RAG)

The farming guide retrieval system uses PostgreSQL with pgvector to store and search embedded guide content.

The general process is:

1. Agricultural guides are loaded from `data/guides/`.
2. Documents are split into smaller text chunks.
3. Text chunks are converted into embeddings.
4. Embeddings and associated metadata are stored in PostgreSQL using pgvector.
5. Relevant passages are retrieved when a farmer asks a question.
6. Retrieved information is supplied to the AI agent as supporting context.

This approach helps ground agricultural responses in the project's available knowledge base.

## Backend API

The main API endpoints include:

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/logout` | Public |
| GET | `/api/auth/me` | Authenticated |
| GET, PUT | `/api/profile` | Authenticated |
| POST | `/api/chat` | Authenticated |
| POST | `/api/chat/upload` | Authenticated |
| GET | `/api/images/{id}` | Image owner |
| GET | `/api/farm/overview` | Authenticated |
| GET | `/api/config` | Public |
| GET | `/api/threads` | Authenticated |
| GET | `/api/threads/{id}/messages` | Authenticated |
| DELETE | `/api/threads/{id}` | Authenticated |
| POST | `/api/messages/{id}/feedback` | Authenticated |
| GET | `/api/escalations` | Extension officer or admin |
| PATCH | `/api/escalations/{id}` | Extension officer or admin |
| POST | `/api/admin/prices` | Extension officer or admin |
| GET | `/health` | Public |

For request and response details, use the interactive API documentation at `/docs`.

## Photo Uploads and Image Handling

The chat supports up to three plant photos per upload.

Supported formats:

- JPEG
- PNG
- WebP

Image handling includes:

- File type and content validation.
- File size and pixel-count limits.
- Browser-side resizing to a maximum longest side of 1280 pixels.
- Server-side resizing to a maximum longest side of 1024 pixels.
- JPEG conversion and removal of GPS metadata.
- Storage of image records in the database.
- Access restricted to the image owner.

Images can be sent to the configured language model when vision support is enabled. Set `LLM_SUPPORTS_VISION=false` if the selected model does not support image inputs.

Images may be sent again in later messages within the same conversation, which can increase token usage. When LangSmith tracing is enabled, traces may also contain image-related content. Consider this when configuring external services and handling user data.

Existing databases created before image support require:

```text
db/migrations/002_message_images.sql
```

## Testing

### Backend tests

Run from the backend directory:

```bash
python -m pytest
```

Database-dependent tests require a reachable `TEST_DATABASE_URL` pointing to a separate database whose name contains `test`.

Tests that require a database are skipped when the test database is unavailable. The test configuration uses stand-in models and controlled tool responses where appropriate, allowing agent behavior to be tested without live AI provider credentials.

Never use the production database for testing.

### Frontend tests

Run from the frontend directory:

```bash
npm test
```

### Additional frontend checks

```bash
npm run lint
npm run typecheck
npm run build
```

These commands check code style, TypeScript correctness and production build compatibility.

## Safety and Reliability

The backend includes safeguards intended to make agent execution more controlled:

- Input guard middleware.
- Model retry handling.
- Model-call limits.
- Tool-call limits.
- Tool error handling.
- Tool-call auditing.
- A farm-focused system prompt.

The application also uses role-based access controls and authenticated access to protected resources.

## Design Decisions

- PostgreSQL is used as the main relational database and pgvector provides vector similarity search.
- Agricultural recommendations should be grounded in available crop records, weather information, soil information and documented sources.
- Planting advice uses rule-based logic where appropriate rather than asking the language model to invent agricultural thresholds.
- Crop variety comparisons use recorded evidence and identify missing information.
- Human extension officers provide oversight for cases that require additional attention.
- Authentication uses secure, HTTP-only cookies with role-based authorization.
- Agent tools provide controlled access to application functionality and data.

## Known Limitations

- Live AI responses and image interpretation depend on the configured OpenRouter model and API credentials.
- Embedding generation requires a configured embedding provider.
- Soil information depends on iSDAsoil availability and credentials.
- Weather information depends on Open-Meteo availability.
- Agricultural advice depends on the quality and coverage of the loaded crop data and farming guides.
- Variety comparisons are limited to the evidence recorded in the database.
- The current prompt guard uses pattern-based checks and should not be considered complete protection against prompt injection.
- The in-memory rate limiter is designed for a single application instance and does not provide shared rate limiting across multiple servers.
- Responses are not streamed.
- Farm coordinates are validated against the supported Uganda geographic range.
- The frontend currently supports English only.
- The application is not an offline or installable progressive web application.
- Public OpenStreetMap tiles and Nominatim place search may need replacement with an appropriately hosted provider for heavier usage.
- A Content Security Policy has not yet been configured.
- Agricultural guidance is informational and should not replace professional advice from qualified agricultural extension officers.

## Security Notes

- Never commit `.env`, `.env.local` or other files containing credentials.
- Use a strong `JWT_SECRET`.
- Enable `COOKIE_SECURE=true` when deploying behind HTTPS.
- Keep the test database separate from development and production databases.
- Restrict access to extension officer and admin functionality.
- Review agricultural source records and evidence before relying on them for recommendations.
- Consider the privacy implications of sending uploaded images and conversation data to external AI or tracing providers.

## Project Status

Farmer Advisor is an actively developed project. Its backend and frontend include automated tests, and the application has been developed around a complete farmer-to-extension-officer workflow.

Some integrations require external credentials and live services before their end-to-end behavior can be verified in a deployment environment.
