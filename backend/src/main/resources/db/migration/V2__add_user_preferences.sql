CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    theme_mode VARCHAR(6) NOT NULL DEFAULT 'LIGHT',
    accent_color VARCHAR(32) NOT NULL DEFAULT 'Lavender',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_preferences_user UNIQUE (user_id),
    CONSTRAINT fk_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_preferences_theme CHECK (theme_mode IN ('LIGHT', 'DARK', 'SYSTEM')),
    CONSTRAINT ck_preferences_accent CHECK (accent_color IN ('Lavender', 'Rose', 'Sage', 'Deep lavender', 'Sky blue', 'Dusty pink', 'Denim blue')),
    CONSTRAINT ck_preferences_time CHECK (updated_at >= created_at)
);

-- Add defaults for existing accounts without modifying their profiles or content.
INSERT INTO user_preferences (user_id) SELECT id FROM users;
