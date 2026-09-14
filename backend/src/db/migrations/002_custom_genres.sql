-- Custom Genres CRUD table and movie junction table
CREATE TABLE IF NOT EXISTS custom_genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(30) DEFAULT '#38BDF8',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_custom_genre UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS user_movie_custom_genres (
    user_movie_id UUID NOT NULL REFERENCES user_movies(id) ON DELETE CASCADE,
    custom_genre_id UUID NOT NULL REFERENCES custom_genres(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_movie_id, custom_genre_id)
);
