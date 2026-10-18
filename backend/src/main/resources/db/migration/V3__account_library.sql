-- Additive: existing notes/lists have no placement and appear directly on Home.
CREATE TABLE library_entries (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    kind VARCHAR(6) NOT NULL CHECK (kind IN ('BUBBLE','PHOTO')),
    parent_id UUID REFERENCES library_entries(id) ON DELETE SET NULL,
    title VARCHAR(100) NOT NULL CHECK (btrim(title) <> ''),
    description TEXT NOT NULL,
    color VARCHAR(7) NOT NULL,
    image BYTEA NOT NULL CHECK (octet_length(image) BETWEEN 1 AND 524288),
    image_width INTEGER NOT NULL CHECK (image_width > 0),
    image_height INTEGER NOT NULL CHECK (image_height > 0),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_library_owner ON library_entries(user_id, created_at, id);
CREATE TABLE library_placements (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    bubble_id UUID NOT NULL REFERENCES library_entries(id) ON DELETE CASCADE,
    note_id UUID UNIQUE REFERENCES notes(id) ON DELETE CASCADE,
    checklist_id UUID UNIQUE REFERENCES checklists(id) ON DELETE CASCADE,
    CHECK ((note_id IS NULL) <> (checklist_id IS NULL))
);
CREATE INDEX idx_placements_owner ON library_placements(user_id,id);
