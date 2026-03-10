CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default prompt key so GET always returns a row
INSERT INTO app_settings (key, value)
VALUES ('rekryterarPrompt', '')
ON CONFLICT (key) DO NOTHING;
