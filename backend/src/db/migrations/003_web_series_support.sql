-- Web Series & TV Shows Support Migration
ALTER TABLE movies
ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'movie' CHECK (media_type IN ('movie', 'tv')),
ADD COLUMN IF NOT EXISTS number_of_seasons INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS number_of_episodes INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS first_air_date VARCHAR(20),
ADD COLUMN IF NOT EXISTS last_air_date VARCHAR(20),
ADD COLUMN IF NOT EXISTS series_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS created_by JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS seasons JSONB DEFAULT '[]'::JSONB;

ALTER TABLE user_movies
ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'movie' CHECK (media_type IN ('movie', 'tv')),
ADD COLUMN IF NOT EXISTS current_season INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_episode INT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_movies_media_type ON movies(media_type);
CREATE INDEX IF NOT EXISTS idx_user_movies_media_type ON user_movies(media_type);
