CREATE TABLE IF NOT EXISTS message_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type = 'image/jpeg'),
    size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_images_message ON message_images(message_id);
