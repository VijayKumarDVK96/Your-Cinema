import pg from 'pg';
import { config } from '../config/index.js';
import { Logger } from '../utils/logger.js';

const { Pool } = pg;

// Parse PostgreSQL NUMERIC (OID 1700) as float instead of string
pg.types.setTypeParser(1700, (val: string) => (val === null ? null : parseFloat(val)));

const isCustomDbConfig = Boolean(
  (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') || process.env.DB_PASSWORD
);

const poolConfig: pg.PoolConfig = isCustomDbConfig
  ? {
      host: process.env.DB_HOST || config.db.host,
      port: parseInt(process.env.DB_PORT || String(config.db.port), 10),
      user: process.env.DB_USER || config.db.user,
      password: process.env.DB_PASSWORD || config.db.password,
      database: process.env.DB_NAME || config.db.database,
    }
  : (config.db.connectionString
      ? { connectionString: config.db.connectionString }
      : {
          host: config.db.host,
          port: config.db.port,
          user: config.db.user,
          password: config.db.password,
          database: config.db.database,
        });

// Primary PostgreSQL Pool
export const pool = new Pool({
  ...poolConfig,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let isPgConnected = false;

export function setPgConnected(val: boolean) {
  isPgConnected = val;
}

// Test connectivity on start
pool.connect()
  .then(async (client) => {
    isPgConnected = true;
    Logger.info('Connected successfully to PostgreSQL database');
    try {
      await client.query('ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES watchlists(id) ON DELETE CASCADE;');
    } catch (e: any) {
      Logger.warn(`Watchlists parent_id column check: ${e.message}`);
    }
    client.release();
  })
  .catch((err) => {
    isPgConnected = false;
    Logger.warn(`PostgreSQL connection failed (${err.message || err}). Using resilient in-memory data store.`);
  });

// Resilient fallback in-memory state store
class InMemoryStore {
  users: Map<string, any> = new Map();
  userSessions: Map<string, any> = new Map();
  passwordResets: Map<string, any> = new Map();
  movies: Map<string, any> = new Map();
  userMovies: Map<string, any> = new Map();
  tags: Map<string, any> = new Map();
  userMovieTags: Map<string, any> = new Map();
  customGenres: Map<string, any> = new Map();
  userMovieCustomGenres: Map<string, any> = new Map();
  watchlists: Map<string, any> = new Map();
  watchlistMovies: Map<string, any> = new Map();
  movieSources: Map<string, any> = new Map();
  moviePlaybackProgress: Map<string, any> = new Map();
  watchHistory: Map<string, any> = new Map();
  userAiSettings: Map<string, any> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    // Seed default demo user: demo@yourcinema.com / password123
    const demoUserId = 'a0000000-0000-0000-0000-000000000001';
    this.users.set(demoUserId, {
      id: demoUserId,
      email: 'demo@yourcinema.com',
      password_hash: '$2a$10$w8T0i9P1kLp9qG2v.e2Q.OtA/1P1yv9C1kE9lZ8zZ9o9oZ9o9oZ9o', // password123
      name: 'Cinema Enthusiast',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200',
      preferred_languages: ['en', 'ta'],
      favorite_genres: [878, 53, 18], // Sci-Fi, Thriller, Drama
      preferred_runtime_min: 90,
      preferred_runtime_max: 165,
      exclude_watched_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Seed Tags
    const tag1 = { id: 't1', user_id: demoUserId, name: 'Mind Bending', color: '#8B5CF6' };
    const tag2 = { id: 't2', user_id: demoUserId, name: 'Slow Burn', color: '#EC4899' };
    const tag3 = { id: 't3', user_id: demoUserId, name: 'Visually Stunning', color: '#3B82F6' };
    const tag4 = { id: 't4', user_id: demoUserId, name: 'Must Rewatch', color: '#F59E0B' };
    [tag1, tag2, tag3, tag4].forEach(t => this.tags.set(t.id, t));

    // Seed Custom Genres
    const cg1 = { id: 'cg-1', user_id: demoUserId, name: 'Cyberpunk', color: '#06B6D4', description: 'High-tech dystopian and neon futures', created_at: new Date().toISOString() };
    const cg2 = { id: 'cg-2', user_id: demoUserId, name: 'Neo-Noir', color: '#EC4899', description: 'Modern dark cynical crime and moral ambiguity', created_at: new Date().toISOString() };
    const cg3 = { id: 'cg-3', user_id: demoUserId, name: 'Psychological Thriller', color: '#8B5CF6', description: 'Mind-bending puzzle box narratives', created_at: new Date().toISOString() };
    const cg4 = { id: 'cg-4', user_id: demoUserId, name: 'Space Opera', color: '#38BDF8', description: 'Epic intergalactic journeys and wormhole odyssey', created_at: new Date().toISOString() };
    [cg1, cg2, cg3, cg4].forEach(cg => this.customGenres.set(cg.id, cg));

    // Seed Canonical Movies
    const m1 = {
      id: 'm-157336',
      tmdb_id: 157336,
      imdb_id: 'tt0816692',
      title: 'Interstellar',
      original_title: 'Interstellar',
      overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.',
      release_date: '2014-11-05',
      runtime: 169,
      original_language: 'en',
      spoken_languages: ['en'],
      poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      backdrop_path: '/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
      vote_average: 8.4,
      director: 'Christopher Nolan',
      cast_members: [
        { name: 'Matthew McConaughey', character: 'Joseph Cooper' },
        { name: 'Anne Hathaway', character: 'Dr. Amelia Brand' },
        { name: 'Jessica Chastain', character: 'Murphy Cooper' },
      ],
      genres: [{ id: 12, name: 'Adventure' }, { id: 18, name: 'Drama' }, { id: 878, name: 'Science Fiction' }],
      keywords: ['wormhole', 'space travel', 'relativity', 'black hole', 'time dilation'],
      production_countries: ['United States of America', 'United Kingdom'],
      trailer_url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
    };

    const m2 = {
      id: 'm-27205',
      tmdb_id: 27205,
      imdb_id: 'tt1375666',
      title: 'Inception',
      original_title: 'Inception',
      overview: 'Cobb, a skilled thief who steals corporate secrets through use of dream-sharing technology, is given the inverse task of planting an idea into the mind of a C.E.O.',
      release_date: '2010-07-15',
      runtime: 148,
      original_language: 'en',
      spoken_languages: ['en', 'ja', 'fr'],
      poster_path: '/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
      backdrop_path: '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
      vote_average: 8.4,
      director: 'Christopher Nolan',
      cast_members: [
        { name: 'Leonardo DiCaprio', character: 'Dom Cobb' },
        { name: 'Joseph Gordon-Levitt', character: 'Arthur' },
        { name: 'Elliot Page', character: 'Ariadne' },
      ],
      genres: [{ id: 28, name: 'Action' }, { id: 878, name: 'Science Fiction' }, { id: 12, name: 'Adventure' }],
      keywords: ['dream', 'subconscious', 'heist', 'memory', 'architect'],
      production_countries: ['United States of America', 'United Kingdom'],
      trailer_url: 'https://www.youtube.com/watch?v=YoHD9XEInc0',
    };

    const m3 = {
      id: 'm-438631',
      tmdb_id: 438631,
      imdb_id: 'tt1160419',
      title: 'Dune',
      original_title: 'Dune',
      overview: "Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe to ensure the future of his family and his people.",
      release_date: '2021-09-15',
      runtime: 155,
      original_language: 'en',
      spoken_languages: ['en'],
      poster_path: '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
      backdrop_path: '/lzWHmYZrARxsMpMp4AcvKaN5vZs.jpg',
      vote_average: 7.8,
      director: 'Denis Villeneuve',
      cast_members: [
        { name: 'Timothée Chalamet', character: 'Paul Atreides' },
        { name: 'Rebecca Ferguson', character: 'Lady Jessica Atreides' },
        { name: 'Oscar Isaac', character: 'Duke Leto Atreides' },
      ],
      genres: [{ id: 878, name: 'Science Fiction' }, { id: 12, name: 'Adventure' }],
      keywords: ['spice', 'desert', 'prophecy', 'empire', 'sandworm'],
      production_countries: ['United States of America'],
      trailer_url: 'https://www.youtube.com/watch?v=n9xhJrPXop4',
    };

    const m4 = {
      id: 'm-329865',
      tmdb_id: 329865,
      imdb_id: 'tt2543164',
      title: 'Arrival',
      original_title: 'Arrival',
      overview: 'Taking place after alien crafts land around the world, an expert linguist is recruited by the military to determine whether they come in peace or are a threat.',
      release_date: '2016-11-10',
      runtime: 116,
      original_language: 'en',
      spoken_languages: ['en', 'cmn', 'ru'],
      poster_path: '/x2OAHw29RA129hdF9Gzsz7tZl3r.jpg',
      backdrop_path: '/y2v4D2Jm4m6Yc2rG1L7n2E4k5mR.jpg',
      vote_average: 7.6,
      director: 'Denis Villeneuve',
      cast_members: [
        { name: 'Amy Adams', character: 'Dr. Louise Banks' },
        { name: 'Jeremy Renner', character: 'Ian Donnelly' },
        { name: 'Forest Whitaker', character: 'Colonel Weber' },
      ],
      genres: [{ id: 18, name: 'Drama' }, { id: 878, name: 'Science Fiction' }, { id: 9648, name: 'Mystery' }],
      keywords: ['alien invasion', 'linguistics', 'non-linear time', 'communication'],
      production_countries: ['United States of America', 'Canada'],
      trailer_url: 'https://www.youtube.com/watch?v=tFMo3UJ4B4g',    };

    const series1 = {
      id: 'm-1396',
      tmdb_id: 1396,
      imdb_id: 'tt0903747',
      title: 'Breaking Bad',
      original_title: 'Breaking Bad',
      media_type: 'tv',
      number_of_seasons: 5,
      number_of_episodes: 62,
      series_status: 'Ended',
      first_air_date: '2008-01-20',
      overview: 'Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of two years left to live. He becomes filled with a sense of fearlessness and an unrelenting desire to secure his family’s financial future at any cost as he enters the dangerous world of drugs and crime.',
      release_date: '2008-01-20',
      runtime: 47,
      original_language: 'en',
      spoken_languages: ['en'],
      poster_path: '/ztkUQFLlC19CCMYHW9o1zWhJAGq.jpg',
      backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
      vote_average: 8.9,
      director: 'Vince Gilligan',
      created_by: [{ id: 66633, name: 'Vince Gilligan', profile_path: null }],
      cast_members: [
        { name: 'Bryan Cranston', character: 'Walter White' },
        { name: 'Aaron Paul', character: 'Jesse Pinkman' },
        { name: 'Anna Gunn', character: 'Skyler White' },
      ],
      crew_members: [
        { name: 'Vince Gilligan', job: 'Creator', department: 'Writing' },
        { name: 'Dave Porter', job: 'Original Music Composer', department: 'Sound' },
      ],
      genres: [{ id: 18, name: 'Drama' }, { id: 80, name: 'Crime' }],
      keywords: ['methamphetamine', 'chemistry teacher', 'drug lord', 'cancer'],
      production_countries: ['United States of America'],
      trailer_url: 'https://www.youtube.com/watch?v=HhesaQXLuRY',
      seasons: [
        { id: 3572, season_number: 1, name: 'Season 1', episode_count: 7, air_date: '2008-01-20', poster_path: '/1BP4xYv9ZG4ZVHkL7ocOEZBbSYH.jpg' },
        { id: 3573, season_number: 2, name: 'Season 2', episode_count: 13, air_date: '2009-03-08', poster_path: '/e3olIEA0Jc4Jz6cHzR3pBf2WbJ5.jpg' },
        { id: 3575, season_number: 3, name: 'Season 3', episode_count: 13, air_date: '2010-03-21', poster_path: '/ffP8Q8ew048Y3Z2f25bO89l2b1R.jpg' },
        { id: 3576, season_number: 4, name: 'Season 4', episode_count: 13, air_date: '2011-07-17', poster_path: '/5p72M0z03q5k1s0Z3mR89Qk2b1R.jpg' },
        { id: 3578, season_number: 5, name: 'Season 5', episode_count: 16, air_date: '2012-07-15', poster_path: '/r3z2l1s03q5k1s0Z3mR89Qk2b1R.jpg' },
      ],
    };

    const series2 = {
      id: 'm-66732',
      tmdb_id: 66732,
      imdb_id: 'tt4574334',
      title: 'Stranger Things',
      original_title: 'Stranger Things',
      media_type: 'tv',
      number_of_seasons: 4,
      number_of_episodes: 34,
      series_status: 'Returning Series',
      first_air_date: '2016-07-15',
      overview: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
      release_date: '2016-07-15',
      runtime: 50,
      original_language: 'en',
      spoken_languages: ['en'],
      poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
      backdrop_path: '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
      vote_average: 8.6,
      director: 'The Duffer Brothers',
      created_by: [{ id: 1179419, name: 'The Duffer Brothers', profile_path: null }],
      cast_members: [
        { name: 'Millie Bobby Brown', character: 'Eleven' },
        { name: 'Finn Wolfhard', character: 'Mike Wheeler' },
        { name: 'Winona Ryder', character: 'Joyce Byers' },
      ],
      crew_members: [
        { name: 'Matt Duffer', job: 'Creator', department: 'Writing' },
        { name: 'Ross Duffer', job: 'Creator', department: 'Writing' },
      ],
      genres: [{ id: 10765, name: 'Sci-Fi & Fantasy' }, { id: 9648, name: 'Mystery' }, { id: 18, name: 'Drama' }],
      keywords: ['upside down', 'supernatural', 'telepathy', 'monsters'],
      production_countries: ['United States of America'],
      trailer_url: 'https://www.youtube.com/watch?v=b9EkMc79ZSU',
      seasons: [
        { id: 77680, season_number: 1, name: 'Season 1', episode_count: 8, air_date: '2016-07-15', poster_path: '/rb5U2Qv0moxb9IPfGn8AIqMGskD.jpg' },
        { id: 85937, season_number: 2, name: 'Season 2', episode_count: 9, air_date: '2017-10-27', poster_path: '/lWJfeN0moxb9IPfGn8AIqMGskD.jpg' },
        { id: 115216, season_number: 3, name: 'Season 3', episode_count: 8, air_date: '2019-07-04', poster_path: '/sWJfeN0moxb9IPfGn8AIqMGskD.jpg' },
        { id: 144361, season_number: 4, name: 'Season 4', episode_count: 9, air_date: '2022-05-27', poster_path: '/tWJfeN0moxb9IPfGn8AIqMGskD.jpg' },
      ],
    };

    [m1, m2, m3, m4, series1, series2].forEach(m => this.movies.set(m.id, m));

    // Seed User Movies (Personal library instances)
    const um1 = {
      id: 'um-1',
      user_id: demoUserId,
      movie_id: m1.id,
      media_type: 'movie',
      watch_status: 'watched',
      personal_rating: 5.0,
      is_favorite: true,
      personal_notes: 'Masterpiece of modern sci-fi. Emotional Hans Zimmer score.',
      custom_title: null,
      custom_overview: null,
      is_customized: false,
      playback_position_sec: 10140,
      last_watched_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      added_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const um2 = {
      id: 'um-2',
      user_id: demoUserId,
      movie_id: m2.id,
      media_type: 'movie',
      watch_status: 'watched',
      personal_rating: 4.5,
      is_favorite: true,
      personal_notes: 'Complex multi-level dream architecture.',
      custom_title: null,
      custom_overview: null,
      is_customized: false,
      playback_position_sec: 8880,
      last_watched_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      added_at: new Date(Date.now() - 86400000 * 20).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const um3 = {
      id: 'um-3',
      user_id: demoUserId,
      movie_id: m3.id,
      media_type: 'movie',
      watch_status: 'watching',
      personal_rating: null,
      is_favorite: false,
      personal_notes: 'Paused midway through the desert sequence.',
      custom_title: null,
      custom_overview: null,
      is_customized: false,
      playback_position_sec: 4320, // 1h 12m
      last_watched_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      added_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const um4 = {
      id: 'um-4',
      user_id: demoUserId,
      movie_id: m4.id,
      media_type: 'movie',
      watch_status: 'unwatched',
      personal_rating: null,
      is_favorite: false,
      personal_notes: 'Need to watch this weekend for the linguistics angle.',
      custom_title: null,
      custom_overview: null,
      is_customized: false,
      playback_position_sec: 0,
      last_watched_at: null,
      added_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const umS1 = {
      id: 'um-s1',
      user_id: demoUserId,
      movie_id: series1.id,
      media_type: 'tv',
      current_season: 5,
      current_episode: 16,
      watch_status: 'watched',
      personal_rating: 5.0,
      is_favorite: true,
      personal_notes: 'Greatest TV show in television history. Ozymandias is perfection.',
      custom_title: null,
      custom_overview: null,
      is_customized: false,
      playback_position_sec: 0,
      last_watched_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      added_at: new Date(Date.now() - 86400000 * 15).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const umS2 = {
      id: 'um-s2',
      user_id: demoUserId,
      movie_id: series2.id,
      media_type: 'tv',
      current_season: 4,
      current_episode: 7,
      watch_status: 'watching',
      personal_rating: 4.5,
      is_favorite: false,
      personal_notes: 'Watching Season 4 - Chapter Seven: The Massacre at Hawkins Lab.',
      custom_title: null,
      custom_overview: null,
      is_customized: false,
      playback_position_sec: 2400,
      last_watched_at: new Date().toISOString(),
      added_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date().toISOString(),
    };

    [um1, um2, um3, um4, umS1, umS2].forEach(um => this.userMovies.set(um.id, um));

    // Connect Tags
    this.userMovieTags.set('um1-t1', { user_movie_id: um1.id, tag_id: tag1.id });
    this.userMovieTags.set('um1-t3', { user_movie_id: um1.id, tag_id: tag3.id });
    this.userMovieTags.set('um2-t1', { user_movie_id: um2.id, tag_id: tag1.id });
    this.userMovieTags.set('um4-t1', { user_movie_id: um4.id, tag_id: tag1.id });
    this.userMovieTags.set('um4-t2', { user_movie_id: um4.id, tag_id: tag2.id });

    // Connect Custom Genres
    this.userMovieCustomGenres.set('um1-cg4', { user_movie_id: um1.id, custom_genre_id: cg4.id });
    this.userMovieCustomGenres.set('um2-cg3', { user_movie_id: um2.id, custom_genre_id: cg3.id });
    this.userMovieCustomGenres.set('um3-cg4', { user_movie_id: um3.id, custom_genre_id: cg4.id });
    this.userMovieCustomGenres.set('um4-cg1', { user_movie_id: um4.id, custom_genre_id: cg1.id });

    // Seed Sources
    const s1 = {
      id: 'src-1',
      user_movie_id: um1.id,
      source_type: 'youtube',
      provider_name: 'YouTube',
      provider_icon: 'youtube',
      external_url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
      file_name: null,
      quality: '1080p',
      created_at: new Date().toISOString(),
    };
    const s2 = {
      id: 'src-2',
      user_movie_id: um3.id,
      source_type: 'ott',
      provider_name: 'JioHotstar',
      provider_icon: 'jiohotstar',
      external_url: 'https://www.hotstar.com',
      file_name: null,
      quality: '4K HDR',
      created_at: new Date().toISOString(),
    };
    [s1, s2].forEach(s => this.movieSources.set(s.id, s));

    // Seed Movie Playback Progress
    const prog1 = {
      id: 'prog-1',
      user_id: demoUserId,
      user_movie_id: um1.id,
      source_id: s1.id,
      source_type: 'youtube',
      last_played_position_sec: 10140,
      last_played_time_formatted: '2h 49m 00s',
      completed: true,
      last_played_at: um1.last_watched_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const prog2 = {
      id: 'prog-2',
      user_id: demoUserId,
      user_movie_id: um2.id,
      source_id: null,
      source_type: null,
      last_played_position_sec: 8880,
      last_played_time_formatted: '2h 28m 00s',
      completed: true,
      last_played_at: um2.last_watched_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const prog3 = {
      id: 'prog-3',
      user_id: demoUserId,
      user_movie_id: um3.id,
      source_id: s2.id,
      source_type: 'ott',
      last_played_position_sec: 4320,
      last_played_time_formatted: '1h 12m 00s',
      completed: false,
      last_played_at: um3.last_watched_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    [prog1, prog2, prog3].forEach(p => this.moviePlaybackProgress.set(p.user_movie_id, p));

    // Seed Watchlists
    const wl1 = {
      id: 'wl-1',
      user_id: demoUserId,
      name: 'Christopher Nolan Masterpieces',
      description: 'Hand-picked films directed by Christopher Nolan in my library.',
      cover_image_url: 'https://image.tmdb.org/t/p/w500/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
      is_smart: false,
      display_order: 1,
      created_at: new Date().toISOString(),
    };
    const wl2 = {
      id: 'wl-2',
      user_id: demoUserId,
      name: 'Weekend Sci-Fi Binge',
      description: 'Unwatched high-concept science fiction.',
      cover_image_url: 'https://image.tmdb.org/t/p/w500/lzWHmYZrARxsMpMp4AcvKaN5vZs.jpg',
      is_smart: false,
      display_order: 2,
      created_at: new Date().toISOString(),
    };
    [wl1, wl2].forEach(wl => this.watchlists.set(wl.id, wl));

    this.watchlistMovies.set('wlm-1', { watchlist_id: wl1.id, user_movie_id: um1.id, sort_order: 1 });
    this.watchlistMovies.set('wlm-2', { watchlist_id: wl1.id, user_movie_id: um2.id, sort_order: 2 });
    this.watchlistMovies.set('wlm-3', { watchlist_id: wl2.id, user_movie_id: um4.id, sort_order: 1 });
  }
}

export const inMemoryDb = new InMemoryStore();

// Universal Query Executor that prioritizes PostgreSQL and falls back safely
async function query(text: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
  if (isPgConnected) {
    try {
      const result = await pool.query(text, params);
      return { rows: result.rows, rowCount: result.rowCount || 0 };
    } catch (err: any) {
      Logger.error(`PostgreSQL query error: ${err.message}`, err, { query: text });
      throw err;
    }
  }
  return { rows: [], rowCount: 0 };
}

export { isPgConnected };
