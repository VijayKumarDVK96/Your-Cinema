-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    preferred_languages TEXT[] DEFAULT ARRAY['en']::TEXT[],
    favorite_genres INT[] DEFAULT ARRAY[]::INT[],
    preferred_runtime_min INT DEFAULT 60,
    preferred_runtime_max INT DEFAULT 180,
    exclude_watched_default BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions for refresh token rotation
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password resets table
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canonical movies table (cached metadata per TMDB movie added by any user)
CREATE TABLE IF NOT EXISTS movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tmdb_id INT UNIQUE NOT NULL,
    imdb_id VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255),
    overview TEXT,
    release_date VARCHAR(20),
    runtime INT,
    original_language VARCHAR(20),
    spoken_languages TEXT[] DEFAULT ARRAY[]::TEXT[],
    poster_path TEXT,
    backdrop_path TEXT,
    vote_average NUMERIC(3, 1),
    director VARCHAR(255),
    cast_members JSONB DEFAULT '[]'::JSONB,
    crew_members JSONB DEFAULT '[]'::JSONB,
    genres JSONB DEFAULT '[]'::JSONB,
    keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    production_countries TEXT[] DEFAULT ARRAY[]::TEXT[],
    trailer_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-owned movies instance (metadata overrides, viewing state, rating)
CREATE TABLE IF NOT EXISTS user_movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    watch_status VARCHAR(20) DEFAULT 'unwatched' CHECK (watch_status IN ('unwatched', 'watching', 'watched')),
    personal_rating NUMERIC(2, 1) CHECK (personal_rating IS NULL OR (personal_rating >= 0.5 AND personal_rating <= 5.0)),
    is_favorite BOOLEAN DEFAULT FALSE,
    personal_notes TEXT,
    custom_title VARCHAR(255),
    custom_overview TEXT,
    custom_poster_url TEXT,
    custom_backdrop_url TEXT,
    custom_runtime INT,
    custom_director VARCHAR(255),
    custom_genres TEXT[] DEFAULT NULL,
    is_customized BOOLEAN DEFAULT FALSE,
    playback_position_sec INT DEFAULT 0,
    last_watched_at TIMESTAMPTZ,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_movie UNIQUE (user_id, movie_id)
);

-- User tags
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(30) DEFAULT '#E5A93C',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_tag UNIQUE (user_id, name)
);

-- User movie tags junction
CREATE TABLE IF NOT EXISTS user_movie_tags (
    user_movie_id UUID NOT NULL REFERENCES user_movies(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_movie_id, tag_id)
);

-- Watchlists
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_smart BOOLEAN DEFAULT FALSE,
    smart_criteria JSONB,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist movies junction
CREATE TABLE IF NOT EXISTS watchlist_movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    user_movie_id UUID NOT NULL REFERENCES user_movies(id) ON DELETE CASCADE,
    sort_order INT DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_watchlist_movie UNIQUE (watchlist_id, user_movie_id)
);

-- Movie sources (Google Drive, YouTube, OTT, custom URL)
CREATE TABLE IF NOT EXISTS movie_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_movie_id UUID NOT NULL REFERENCES user_movies(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('google_drive', 'youtube', 'ott', 'custom_url')),
    provider_name VARCHAR(100) NOT NULL,
    provider_icon TEXT,
    external_url TEXT,
    external_file_id TEXT,
    file_name TEXT,
    mime_type TEXT,
    quality VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watch history records
CREATE TABLE IF NOT EXISTS watch_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_movie_id UUID NOT NULL REFERENCES user_movies(id) ON DELETE CASCADE,
    source_id UUID REFERENCES movie_sources(id) ON DELETE SET NULL,
    duration_watched_sec INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    rating_given NUMERIC(2, 1),
    watched_date TIMESTAMPTZ DEFAULT NOW()
);

-- User AI settings
CREATE TABLE IF NOT EXISTS user_ai_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) DEFAULT 'gemini',
    api_key_encrypted TEXT,
    model_name VARCHAR(100) DEFAULT 'gemini-1.5-flash',
    base_url TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Google Drive accounts
CREATE TABLE IF NOT EXISTS google_drive_accounts (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expiry TIMESTAMPTZ,
    drive_email VARCHAR(255),
    connected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance and query indexes
CREATE INDEX IF NOT EXISTS idx_user_movies_user_id ON user_movies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_movies_movie_id ON user_movies(movie_id);
CREATE INDEX IF NOT EXISTS idx_user_movies_watch_status ON user_movies(user_id, watch_status);
CREATE INDEX IF NOT EXISTS idx_user_movies_is_favorite ON user_movies(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_user_movies_rating ON user_movies(user_id, personal_rating);
CREATE INDEX IF NOT EXISTS idx_user_movies_added_at ON user_movies(user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
CREATE INDEX IF NOT EXISTS idx_movies_director ON movies(director);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id, display_order ASC);
CREATE INDEX IF NOT EXISTS idx_watchlist_movies_lookup ON watchlist_movies(watchlist_id, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_movie_sources_user_movie ON movie_sources(user_movie_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_date ON watch_history(user_id, watched_date DESC);

-- Seed default demo user
INSERT INTO users (
    id,
    email,
    password_hash,
    name,
    avatar_url,
    preferred_languages,
    favorite_genres,
    preferred_runtime_min,
    preferred_runtime_max,
    exclude_watched_default
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'demo@yourcinema.com',
    '$2a$10$w8T0i9P1kLp9qG2v.e2Q.OtA/1P1yv9C1kE9lZ8zZ9o9oZ9o9oZ9o',
    'Cinema Enthusiast',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200',
    ARRAY['en', 'ta'],
    ARRAY[878, 53, 18],
    90,
    165,
    TRUE
) ON CONFLICT (id) DO NOTHING;

