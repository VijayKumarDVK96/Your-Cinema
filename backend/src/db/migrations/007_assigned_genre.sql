-- Migration 007: Add assigned_genre to user_movies to enforce single genre per movie
ALTER TABLE user_movies
ADD COLUMN IF NOT EXISTS assigned_genre VARCHAR(100) DEFAULT NULL;
