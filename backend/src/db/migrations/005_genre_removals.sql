-- Migration 005: Add excluded_genres support to user_movies
ALTER TABLE user_movies
ADD COLUMN IF NOT EXISTS excluded_genres TEXT[] DEFAULT ARRAY[]::TEXT[];
