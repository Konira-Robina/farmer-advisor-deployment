
-- Store individual varieties belonging to each crop.
CREATE TABLE IF NOT EXISTS crop_varieties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_name TEXT NOT NULL REFERENCES crops(name) ON DELETE CASCADE,
    variety_name TEXT NOT NULL,
    description TEXT,
    production_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (crop_name, variety_name),
    UNIQUE (crop_name, id)
);

CREATE INDEX IF NOT EXISTS idx_crop_varieties_crop
    ON crop_varieties(crop_name);


-- Store agricultural publications and reference documents.
CREATE TABLE IF NOT EXISTS agricultural_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    organisation TEXT,
    source_type TEXT,
    publication_year INTEGER,
    url TEXT,
    verification_status TEXT NOT NULL DEFAULT 'unverified'
        CHECK (verification_status IN ('unverified', 'verified', 'disputed')),
    accessed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);



-- Store individual agricultural claims and their supporting sources.
CREATE TABLE IF NOT EXISTS crop_source_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_name TEXT NOT NULL REFERENCES crops(name) ON DELETE CASCADE,
    variety_id UUID,
    source_id UUID NOT NULL REFERENCES agricultural_sources(id) ON DELETE RESTRICT,
    characteristic TEXT NOT NULL,
    value_text TEXT NOT NULL,
    unit TEXT,
    maturity_stage TEXT,
    source_page TEXT,
    source_excerpt TEXT,
    confidence TEXT NOT NULL DEFAULT 'unreviewed'
        CHECK (confidence IN ('unreviewed', 'supported', 'conflicting')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    FOREIGN KEY (crop_name, variety_id)
        REFERENCES crop_varieties(crop_name, id)
        ON DELETE CASCADE
);


CREATE INDEX IF NOT EXISTS idx_crop_evidence_crop
    ON crop_source_evidence(crop_name);

CREATE INDEX IF NOT EXISTS idx_crop_evidence_variety
    ON crop_source_evidence(variety_id);

CREATE INDEX IF NOT EXISTS idx_crop_evidence_source
    ON crop_source_evidence(source_id);
