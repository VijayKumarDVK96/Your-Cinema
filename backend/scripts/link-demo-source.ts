import { pool } from '../src/db';

async function main() {
  await pool.query(
    `INSERT INTO movie_sources (id, user_movie_id, source_type, provider_name, provider_icon, external_url, external_file_id, quality)
     VALUES (gen_random_uuid(), 'fc1529dc-6cab-42e3-afd5-834726bf0af8', 'google_drive', 'Google Drive', 'google_drive', 'https://drive.google.com/file/d/1SJve-e4ygr_h3jMZBvg_Lmj8W8zrFSb4', '1SJve-e4ygr_h3jMZBvg_Lmj8W8zrFSb4', '1080p')
     ON CONFLICT DO NOTHING`
  );
  console.log('Source successfully linked to demo user movie!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
