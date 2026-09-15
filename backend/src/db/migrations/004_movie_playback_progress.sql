-- Movie playback progress table
-- Dedicated storage for last played position and timestamp per user movie
-- user_movie_id references user_movies(id) with ON DELETE CASCADE so if a movie is deleted from user_movies,
-- this playback progress record is also automatically deleted.

CREATE TABLE IF NOT EXISTS movie_playback_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_movie_id UUID NOT NULL REFERENCES user_movies(id) ON DELETE CASCADE,
    source_id UUID REFERENCES movie_sources(id) ON DELETE SET NULL,
    source_type VARCHAR(50),
    last_played_position_sec INT NOT NULL DEFAULT 0,
    last_played_time_formatted VARCHAR(50),
    completed BOOLEAN DEFAULT FALSE,
    last_played_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_movie_playback UNIQUE (user_id, user_movie_id)
);

CREATE INDEX IF NOT EXISTS idx_playback_progress_user ON movie_playback_progress(user_id, last_played_at DESC);
CREATE INDEX IF NOT EXISTS idx_playback_progress_movie ON movie_playback_progress(user_movie_id);


