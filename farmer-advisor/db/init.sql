CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'extension_officer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE farmer_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    location_name TEXT,
    latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
    farm_size_acres NUMERIC(8, 2) CHECK (farm_size_acres > 0),
    crops TEXT[] NOT NULL DEFAULT '{}',
    language TEXT NOT NULL DEFAULT 'en',
    reading_level TEXT NOT NULL DEFAULT 'simple' CHECK (reading_level IN ('simple', 'detailed')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE crops (
    name TEXT PRIMARY KEY,
    maturity_days INTEGER,
    min_rainfall_30d_mm NUMERIC(6, 1),
    ideal_ph_min NUMERIC(3, 1),
    ideal_ph_max NUMERIC(3, 1),
    source TEXT
);

INSERT INTO crops (name) VALUES ('maize'), ('beans'), ('cassava'), ('coffee'), ('banana');

CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_threads_user ON threads(user_id, created_at DESC);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    model TEXT,
    tokens_in INTEGER,
    tokens_out INTEGER,
    cost_usd NUMERIC(10, 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_thread ON messages(thread_id, created_at);

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (message_id, user_id)
);

CREATE TABLE escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE market_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop TEXT NOT NULL REFERENCES crops(name),
    market TEXT NOT NULL,
    price_ugx_per_kg NUMERIC(10, 2) NOT NULL CHECK (price_ugx_per_kg >= 0),
    recorded_on DATE NOT NULL,
    source TEXT
);

CREATE INDEX idx_prices_crop_date ON market_prices(crop, recorded_on DESC);

CREATE TABLE guide_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop TEXT REFERENCES crops(name),
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guide_chunks_embedding ON guide_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_guide_chunks_crop ON guide_chunks(crop);
CREATE TABLE IF NOT EXISTS message_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type = 'image/jpeg'),
    size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_images_message ON message_images(message_id);
