import { config } from '../../config/index.js';
import { Logger } from '../../utils/logger.js';
import { ExternalServiceError } from '../../utils/errors.js';

export interface TmdbMovieSummary {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  original_language: string;
  genre_ids: number[];
  media_type?: 'movie' | 'tv';
  number_of_seasons?: number;
  number_of_episodes?: number;
}

export class TmdbService {
  private static mockMovies: any[] = [
    {
      id: 810793,
      title: 'Don',
      original_title: 'டான்',
      overview: 'A reluctant engineering student navigates college life, friction with his strict father, and a ruthless professor while discovering his true passion for filmmaking.',
      release_date: '2022-05-13',
      runtime: 163,
      vote_average: 7.4,
      original_language: 'ta',
      poster_path: '/dI9Wf1Z4r47hLdO01jS62E48kL4.jpg',
      backdrop_path: '/3V4k3a228j7X9955700.jpg',
      director: 'Cibi Chakaravarthi',
      genres: [{ id: 35, name: 'Comedy' }, { id: 18, name: 'Drama' }],
      cast: [
        { name: 'Sivakarthikeyan', character: 'Chakaravathi' },
        { name: 'S. J. Suryah', character: 'Bhoominathan' },
        { name: 'Priyanka Arul Mohan', character: 'Angayarkanni' },
        { name: 'Samuthirakani', character: 'Ganesan' },
      ],
      keywords: ['college', 'father son', 'tamil', 'don'],
      trailer_url: 'https://www.youtube.com/watch?v=F0fUq6-S1z8',
    },
    {
      id: 2575,
      title: 'Don',
      original_title: 'डॉन',
      overview: 'A simple man named Vijay is recruited by a police officer to masquerade as the ruthless criminal leader Don.',
      release_date: '2006-10-20',
      runtime: 171,
      vote_average: 7.1,
      original_language: 'hi',
      poster_path: '/g1N4lP5g0g0c9W7bC1c9w8K9z7a.jpg',
      backdrop_path: '/b8Wb0W8Wb0W8Wb0W8Wb0W8Wb0W8.jpg',
      director: 'Farhan Akhtar',
      genres: [{ id: 28, name: 'Action' }, { id: 80, name: 'Crime' }, { id: 53, name: 'Thriller' }],
      cast: [
        { name: 'Shah Rukh Khan', character: 'Don / Vijay' },
        { name: 'Priyanka Chopra', character: 'Roma' },
        { name: 'Boman Irani', character: 'DCP DeSilva' },
      ],
      keywords: ['action', 'hindi', 'don', 'shah rukh khan'],
      trailer_url: 'https://www.youtube.com/watch?v=8k76V3H06rA',
    },
    {
      id: 1184918,
      title: 'The Greatest of All Time',
      original_title: 'தி கிரேட்டஸ்ட் ஆஃப் ஆல் டைம்',
      overview: 'A once decorated member of the Special Anti-Terrorism Squad (SATS) is called back into action by his former colleagues for an important mission, setting him on a dangerous collision course with his own past.',
      release_date: '2024-09-05',
      runtime: 183,
      vote_average: 7.2,
      original_language: 'ta',
      poster_path: '/bISaBno8132kXp4qB8l8eQnN3B.jpg',
      backdrop_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      director: 'Venkat Prabhu',
      genres: [{ id: 28, name: 'Action' }, { id: 18, name: 'Drama' }, { id: 53, name: 'Thriller' }],
      cast: [
        { name: 'Vijay', character: 'Gandhi / Jeevan', profile_path: null },
        { name: 'Prashanth', character: 'Sunil Thiagarajan', profile_path: null },
        { name: 'Prabhu Deva', character: 'Kalyan Sundaram', profile_path: null },
        { name: 'Sneha', character: 'Anuradha Gandhi', profile_path: null },
        { name: 'Meenakshi Chaudhary', character: 'Srinidhi', profile_path: null },
        { name: 'Mohan', character: 'Rajiv Menon', profile_path: null },
        { name: 'Jayaram', character: 'Nazeer', profile_path: null },
        { name: 'Ajmal Ameer', character: 'Ajay', profile_path: null },
        { name: 'Vaibhav', character: 'Diamond Babu', profile_path: null },
        { name: 'Premgi Amaren', character: 'Seenu', profile_path: null },
        { name: 'Y. G. Mahendran', character: 'Rawther', profile_path: null },
      ],
      crew_members: [
        { name: 'Venkat Prabhu', job: 'Director', department: 'Directing' },
        { name: 'Yuvan Shankar Raja', job: 'Original Music Composer', department: 'Sound' },
        { name: 'Siddhartha Nuni', job: 'Director of Photography', department: 'Camera' },
        { name: 'Venkat Raajen', job: 'Editor', department: 'Editing' },
        { name: 'Venkat Prabhu', job: 'Writer', department: 'Writing' },
        { name: 'Kalpathi S. Aghoram', job: 'Producer', department: 'Production' },
        { name: 'Rajeevan', job: 'Production Design', department: 'Art' },
        { name: 'Dileep Subbarayan', job: 'Stunt Coordinator', department: 'Crew' },
      ],
      keywords: ['sats squad', 'cloning', 'father son', 'action thriller', 'revenge'],
      trailer_url: 'https://www.youtube.com/watch?v=OKBMCL-frPU',
    },
    {
      id: 157336,
      title: 'Interstellar',
      original_title: 'Interstellar',
      overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.',
      release_date: '2014-11-05',
      runtime: 169,
      vote_average: 8.4,
      original_language: 'en',
      poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      backdrop_path: '/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
      director: 'Christopher Nolan',
      genres: [{ id: 12, name: 'Adventure' }, { id: 18, name: 'Drama' }, { id: 878, name: 'Science Fiction' }],
      cast: [
        { name: 'Matthew McConaughey', character: 'Joseph Cooper' },
        { name: 'Anne Hathaway', character: 'Dr. Amelia Brand' },
        { name: 'Jessica Chastain', character: 'Murphy Cooper' },
        { name: 'Michael Caine', character: 'Professor John Brand' },
        { name: 'Matt Damon', character: 'Dr. Mann' },
        { name: 'John Lithgow', character: 'Donald' },
      ],
      crew_members: [
        { name: 'Christopher Nolan', job: 'Director', department: 'Directing' },
        { name: 'Hans Zimmer', job: 'Original Music Composer', department: 'Sound' },
        { name: 'Hoyte van Hoytema', job: 'Director of Photography', department: 'Camera' },
        { name: 'Lee Smith', job: 'Editor', department: 'Editing' },
        { name: 'Jonathan Nolan', job: 'Writer', department: 'Writing' },
        { name: 'Emma Thomas', job: 'Producer', department: 'Production' },
        { name: 'Nathan Crowley', job: 'Production Design', department: 'Art' },
      ],
      keywords: ['wormhole', 'space travel', 'relativity', 'black hole'],
      trailer_url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
    },
    {
      id: 27205,
      title: 'Inception',
      original_title: 'Inception',
      overview: 'Cobb, a skilled thief who steals corporate secrets through use of dream-sharing technology, is given the inverse task of planting an idea.',
      release_date: '2010-07-15',
      runtime: 148,
      vote_average: 8.4,
      original_language: 'en',
      poster_path: '/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
      backdrop_path: '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
      director: 'Christopher Nolan',
      genres: [{ id: 28, name: 'Action' }, { id: 878, name: 'Science Fiction' }, { id: 12, name: 'Adventure' }],
      cast: [
        { name: 'Leonardo DiCaprio', character: 'Dom Cobb' },
        { name: 'Joseph Gordon-Levitt', character: 'Arthur' },
        { name: 'Elliot Page', character: 'Ariadne' },
        { name: 'Tom Hardy', character: 'Eames' },
        { name: 'Ken Watanabe', character: 'Saito' },
        { name: 'Cillian Murphy', character: 'Robert Fischer' },
      ],
      crew_members: [
        { name: 'Christopher Nolan', job: 'Director', department: 'Directing' },
        { name: 'Hans Zimmer', job: 'Original Music Composer', department: 'Sound' },
        { name: 'Wally Pfister', job: 'Director of Photography', department: 'Camera' },
        { name: 'Lee Smith', job: 'Editor', department: 'Editing' },
        { name: 'Christopher Nolan', job: 'Writer', department: 'Writing' },
        { name: 'Emma Thomas', job: 'Producer', department: 'Production' },
      ],
      keywords: ['dream', 'subconscious', 'heist'],
      trailer_url: 'https://www.youtube.com/watch?v=YoHD9XEInc0',
    },
    {
      id: 438631,
      title: 'Dune',
      original_title: 'Dune',
      overview: "Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe.",
      release_date: '2021-09-15',
      runtime: 155,
      vote_average: 7.8,
      original_language: 'en',
      poster_path: '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
      backdrop_path: '/lzWHmYZrARxsMpMp4AcvKaN5vZs.jpg',
      director: 'Denis Villeneuve',
      genres: [{ id: 878, name: 'Science Fiction' }, { id: 12, name: 'Adventure' }],
      cast: [
        { name: 'Timothée Chalamet', character: 'Paul Atreides' },
        { name: 'Rebecca Ferguson', character: 'Lady Jessica Atreides' },
        { name: 'Oscar Isaac', character: 'Duke Leto Atreides' },
        { name: 'Josh Brolin', character: 'Gurney Halleck' },
        { name: 'Zendaya', character: 'Chani' },
      ],
      crew_members: [
        { name: 'Denis Villeneuve', job: 'Director', department: 'Directing' },
        { name: 'Hans Zimmer', job: 'Original Music Composer', department: 'Sound' },
        { name: 'Greig Fraser', job: 'Director of Photography', department: 'Camera' },
        { name: 'Joe Walker', job: 'Editor', department: 'Editing' },
        { name: 'Jon Spaihts', job: 'Screenplay', department: 'Writing' },
        { name: 'Mary Parent', job: 'Producer', department: 'Production' },
      ],
      keywords: ['desert', 'spice', 'sandworm'],
      trailer_url: 'https://www.youtube.com/watch?v=n9xhJrPXop4',
    },
    {
      id: 329865,
      title: 'Arrival',
      original_title: 'Arrival',
      overview: 'Taking place after alien crafts land around the world, an expert linguist is recruited by the military to determine whether they come in peace.',
      release_date: '2016-11-10',
      runtime: 116,
      vote_average: 7.6,
      original_language: 'en',
      poster_path: '/x2OAHw29RA129hdF9Gzsz7tZl3r.jpg',
      backdrop_path: '/y2v4D2Jm4m6Yc2rG1L7n2E4k5mR.jpg',
      director: 'Denis Villeneuve',
      genres: [{ id: 18, name: 'Drama' }, { id: 878, name: 'Science Fiction' }, { id: 9648, name: 'Mystery' }],
      cast: [
        { name: 'Amy Adams', character: 'Dr. Louise Banks' },
        { name: 'Jeremy Renner', character: 'Ian Donnelly' },
        { name: 'Forest Whitaker', character: 'Colonel Weber' },
      ],
      crew_members: [
        { name: 'Denis Villeneuve', job: 'Director', department: 'Directing' },
        { name: 'Jóhann Jóhannsson', job: 'Original Music Composer', department: 'Sound' },
        { name: 'Bradford Young', job: 'Director of Photography', department: 'Camera' },
        { name: 'Joe Walker', job: 'Editor', department: 'Editing' },
        { name: 'Eric Heisserer', job: 'Writer', department: 'Writing' },
      ],
      keywords: ['alien invasion', 'linguistics', 'non-linear time'],
      trailer_url: 'https://www.youtube.com/watch?v=tFMo3UJ4B4g',
    },
    {
      id: 872585,
      title: 'Oppenheimer',
      original_title: 'Oppenheimer',
      overview: 'The story of J. Robert Oppenheimer’s role in the development of the atomic bomb during World War II.',
      release_date: '2023-07-19',
      runtime: 181,
      vote_average: 8.1,
      original_language: 'en',
      poster_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      backdrop_path: '/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
      director: 'Christopher Nolan',
      genres: [{ id: 18, name: 'Drama' }, { id: 36, name: 'History' }],
      cast: [
        { name: 'Cillian Murphy', character: 'J. Robert Oppenheimer' },
        { name: 'Emily Blunt', character: 'Katherine Oppenheimer' },
        { name: 'Matt Damon', character: 'Leslie Groves' },
        { name: 'Robert Downey Jr.', character: 'Lewis Strauss' },
        { name: 'Florence Pugh', character: 'Jean Tatlock' },
      ],
      crew_members: [
        { name: 'Christopher Nolan', job: 'Director', department: 'Directing' },
        { name: 'Ludwig Göransson', job: 'Original Music Composer', department: 'Sound' },
        { name: 'Hoyte van Hoytema', job: 'Director of Photography', department: 'Camera' },
        { name: 'Jennifer Lame', job: 'Editor', department: 'Editing' },
        { name: 'Emma Thomas', job: 'Producer', department: 'Production' },
      ],
      keywords: ['atomic bomb', 'manhattan project', 'physicist'],
      trailer_url: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
    },
    {
      id: 872906,
      title: 'Vikram',
      original_title: 'விக்ரம்',
      overview: 'A special investigator discovers a case of serial killings is not what it seems to be, and leading down this path is only going to end in a war between everyone involved.',
      release_date: '2022-06-03',
      runtime: 174,
      vote_average: 7.7,
      original_language: 'ta',
      poster_path: '/bISaBno8132kXp4qB8l8eQnN3B.jpg',
      backdrop_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      director: 'Lokesh Kanagaraj',
      genres: [{ id: 28, name: 'Action' }, { id: 53, name: 'Thriller' }],
      cast: [
        { name: 'Kamal Haasan', character: 'Vikram' },
        { name: 'Vijay Sethupathi', character: 'Santhanam' },
        { name: 'Fahadh Faasil', character: 'Amar' },
        { name: 'Suriya', character: 'Rolex' },
      ],
      crew_members: [
        { name: 'Lokesh Kanagaraj', job: 'Director', department: 'Directing' },
        { name: 'Anirudh Ravichander', job: 'Original Music Composer', department: 'Sound' },
        { name: 'Girish Gangadharan', job: 'Director of Photography', department: 'Camera' },
        { name: 'Philomin Raj', job: 'Editor', department: 'Editing' },
        { name: 'Lokesh Kanagaraj', job: 'Writer', department: 'Writing' },
        { name: 'Kamal Haasan', job: 'Producer', department: 'Production' },
        { name: 'Anbariv', job: 'Stunt Coordinator', department: 'Crew' },
      ],
      keywords: ['drug cartel', 'undercover', 'revenge'],
      trailer_url: 'https://www.youtube.com/watch?v=OKBMCL-frPU',
    },
    {
      id: 1396,
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
      vote_average: 8.9,
      original_language: 'en',
      poster_path: '/ztkUQFLlC19CCMYHW9o1zWhJAGq.jpg',
      backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
      director: 'Vince Gilligan',
      created_by: [{ id: 66633, name: 'Vince Gilligan', profile_path: null }],
      genres: [{ id: 18, name: 'Drama' }, { id: 80, name: 'Crime' }],
      cast: [
        { name: 'Bryan Cranston', character: 'Walter White', profile_path: null },
        { name: 'Aaron Paul', character: 'Jesse Pinkman', profile_path: null },
        { name: 'Anna Gunn', character: 'Skyler White', profile_path: null },
        { name: 'Dean Norris', character: 'Hank Schrader', profile_path: null },
        { name: 'Giancarlo Esposito', character: 'Gustavo Fring', profile_path: null },
        { name: 'Bob Odenkirk', character: 'Saul Goodman', profile_path: null },
      ],
      crew_members: [
        { name: 'Vince Gilligan', job: 'Creator', department: 'Writing' },
        { name: 'Dave Porter', job: 'Original Music Composer', department: 'Sound' },
        { name: 'Michael Slovis', job: 'Director of Photography', department: 'Camera' },
        { name: 'Kelley Dixon', job: 'Editor', department: 'Editing' },
      ],
      seasons: [
        { id: 3572, season_number: 1, name: 'Season 1', episode_count: 7, air_date: '2008-01-20', poster_path: '/1BP4xYv9ZG4ZVHkL7ocOEZBbSYH.jpg' },
        { id: 3573, season_number: 2, name: 'Season 2', episode_count: 13, air_date: '2009-03-08', poster_path: '/e3olIEA0Jc4Jz6cHzR3pBf2WbJ5.jpg' },
        { id: 3575, season_number: 3, name: 'Season 3', episode_count: 13, air_date: '2010-03-21', poster_path: '/ffP8Q8ew048Y3Z2f25bO89l2b1R.jpg' },
        { id: 3576, season_number: 4, name: 'Season 4', episode_count: 13, air_date: '2011-07-17', poster_path: '/5p72M0z03q5k1s0Z3mR89Qk2b1R.jpg' },
        { id: 3578, season_number: 5, name: 'Season 5', episode_count: 16, air_date: '2012-07-15', poster_path: '/r3z2l1s03q5k1s0Z3mR89Qk2b1R.jpg' },
      ],
      keywords: ['methamphetamine', 'chemistry teacher', 'drug lord', 'cancer', 'anti hero'],
      trailer_url: 'https://www.youtube.com/watch?v=HhesaQXLuRY',
    },
    {
      id: 66732,
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
      vote_average: 8.6,
      original_language: 'en',
      poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
      backdrop_path: '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
      director: 'The Duffer Brothers',
      created_by: [{ id: 1179419, name: 'The Duffer Brothers', profile_path: null }],
      genres: [{ id: 10765, name: 'Sci-Fi & Fantasy' }, { id: 9648, name: 'Mystery' }, { id: 18, name: 'Drama' }],
      cast: [
        { name: 'Millie Bobby Brown', character: 'Eleven', profile_path: null },
        { name: 'Finn Wolfhard', character: 'Mike Wheeler', profile_path: null },
        { name: 'Winona Ryder', character: 'Joyce Byers', profile_path: null },
        { name: 'David Harbour', character: 'Jim Hopper', profile_path: null },
      ],
      crew_members: [
        { name: 'Matt Duffer', job: 'Creator', department: 'Writing' },
        { name: 'Ross Duffer', job: 'Creator', department: 'Writing' },
        { name: 'Kyle Dixon', job: 'Original Music Composer', department: 'Sound' },
        { name: 'Michael Stein', job: 'Original Music Composer', department: 'Sound' },
      ],
      seasons: [
        { id: 77680, season_number: 1, name: 'Season 1', episode_count: 8, air_date: '2016-07-15', poster_path: '/rb5U2Qv0moxb9IPfGn8AIqMGskD.jpg' },
        { id: 85937, season_number: 2, name: 'Season 2', episode_count: 9, air_date: '2017-10-27', poster_path: '/lWJfeN0moxb9IPfGn8AIqMGskD.jpg' },
        { id: 115216, season_number: 3, name: 'Season 3', episode_count: 8, air_date: '2019-07-04', poster_path: '/sWJfeN0moxb9IPfGn8AIqMGskD.jpg' },
        { id: 144361, season_number: 4, name: 'Season 4', episode_count: 9, air_date: '2022-05-27', poster_path: '/tWJfeN0moxb9IPfGn8AIqMGskD.jpg' },
      ],
      keywords: ['upside down', 'supernatural', 'telepathy', 'monsters', '1980s nostalgia'],
      trailer_url: 'https://www.youtube.com/watch?v=b9EkMc79ZSU',
    },
    {
      id: 87108,
      title: 'Chernobyl',
      original_title: 'Chernobyl',
      media_type: 'tv',
      number_of_seasons: 1,
      number_of_episodes: 5,
      series_status: 'Ended',
      first_air_date: '2019-05-06',
      overview: 'The true story of one of the worst man-made catastrophes in history: the catastrophic nuclear accident at Chernobyl. A tale of the brave men and women who sacrificed to save Europe from unimaginable disaster.',
      release_date: '2019-05-06',
      runtime: 60,
      vote_average: 8.9,
      original_language: 'en',
      poster_path: '/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg',
      backdrop_path: '/uL6Ad12W0wZkU57v6vH9r5L7X4l.jpg',
      director: 'Craig Mazin',
      created_by: [{ id: 116805, name: 'Craig Mazin', profile_path: null }],
      genres: [{ id: 18, name: 'Drama' }, { id: 36, name: 'History' }],
      cast: [
        { name: 'Jared Harris', character: 'Valery Legasov', profile_path: null },
        { name: 'Stellan Skarsgård', character: 'Boris Shcherbina', profile_path: null },
        { name: 'Emily Watson', character: 'Ulana Khomyuk', profile_path: null },
      ],
      crew_members: [
        { name: 'Craig Mazin', job: 'Creator', department: 'Writing' },
        { name: 'Johan Renck', job: 'Director', department: 'Directing' },
        { name: 'Hildur Guðnadóttir', job: 'Original Music Composer', department: 'Sound' },
      ],
      seasons: [
        { id: 118498, season_number: 1, name: 'Miniseries', episode_count: 5, air_date: '2019-05-06', poster_path: '/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg' },
      ],
      keywords: ['nuclear disaster', 'radiation', 'soviet union', 'sacrifice', 'coverup'],
      trailer_url: 'https://www.youtube.com/watch?v=s9APLXM9Ei8',
    },
    {
      id: 93345,
      title: 'The Family Man',
      original_title: 'The Family Man',
      media_type: 'tv',
      number_of_seasons: 2,
      number_of_episodes: 19,
      series_status: 'Returning Series',
      first_air_date: '2019-09-20',
      overview: 'A middle-class man who works for a special cell of the National Investigation Agency, while desperately trying to protect the nation from terrorism, must also protect his family from the impact of his secretive high-pressure job.',
      release_date: '2019-09-20',
      runtime: 45,
      vote_average: 8.3,
      original_language: 'hi',
      poster_path: '/bISaBno8132kXp4qB8l8eQnN3B.jpg',
      backdrop_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      director: 'Raj & DK',
      created_by: [{ id: 125368, name: 'Raj Nidimoru', profile_path: null }, { id: 125369, name: 'Krishna D.K.', profile_path: null }],
      genres: [{ id: 10759, name: 'Action & Adventure' }, { id: 18, name: 'Drama' }, { id: 35, name: 'Comedy' }],
      cast: [
        { name: 'Manoj Bajpayee', character: 'Srikant Tiwari', profile_path: null },
        { name: 'Priyamani', character: 'Suchitra Tiwari', profile_path: null },
        { name: 'Sharib Hashmi', character: 'JK Talpade', profile_path: null },
        { name: 'Samantha Ruth Prabhu', character: 'Raji', profile_path: null },
      ],
      crew_members: [
        { name: 'Raj Nidimoru', job: 'Director / Creator', department: 'Directing' },
        { name: 'Krishna D.K.', job: 'Director / Creator', department: 'Directing' },
        { name: 'Sachin-Jigar', job: 'Original Music Composer', department: 'Sound' },
      ],
      seasons: [
        { id: 131804, season_number: 1, name: 'Season 1', episode_count: 10, air_date: '2019-09-20', poster_path: '/bISaBno8132kXp4qB8l8eQnN3B.jpg' },
        { id: 184512, season_number: 2, name: 'Season 2', episode_count: 9, air_date: '2021-06-04', poster_path: '/bISaBno8132kXp4qB8l8eQnN3B.jpg' },
      ],
      keywords: ['national investigation agency', 'covert ops', 'anti terrorism', 'family life'],
      trailer_url: 'https://www.youtube.com/watch?v=ngTZ3z89j9w',
    },
    {
      id: 70523,
      title: 'Dark',
      original_title: 'Dark',
      media_type: 'tv',
      number_of_seasons: 3,
      number_of_episodes: 26,
      series_status: 'Ended',
      first_air_date: '2017-12-01',
      overview: 'A missing child sets four families on a frantic hunt for answers as they unearth a mind-bending mystery that spans three generations in a small German town nestled beside a nuclear plant.',
      release_date: '2017-12-01',
      runtime: 55,
      vote_average: 8.5,
      original_language: 'de',
      poster_path: '/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg',
      backdrop_path: '/2A53tW43o10Lg0G9N63v0H5N5G4.jpg',
      director: 'Baran bo Odar',
      created_by: [{ id: 1254710, name: 'Baran bo Odar', profile_path: null }, { id: 1254711, name: 'Jantje Friese', profile_path: null }],
      genres: [{ id: 10765, name: 'Sci-Fi & Fantasy' }, { id: 9648, name: 'Mystery' }, { id: 18, name: 'Drama' }],
      cast: [
        { name: 'Louis Hofmann', character: 'Jonas Kahnwald', profile_path: null },
        { name: 'Oliver Masucci', character: 'Ulrich Nielsen', profile_path: null },
        { name: 'Jördis Triebel', character: 'Katharina Nielsen', profile_path: null },
      ],
      crew_members: [
        { name: 'Baran bo Odar', job: 'Director / Creator', department: 'Directing' },
        { name: 'Jantje Friese', job: 'Writer / Creator', department: 'Writing' },
        { name: 'Ben Frost', job: 'Original Music Composer', department: 'Sound' },
      ],
      seasons: [
        { id: 94002, season_number: 1, name: 'Season 1', episode_count: 10, air_date: '2017-12-01', poster_path: '/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg' },
        { id: 119864, season_number: 2, name: 'Season 2', episode_count: 8, air_date: '2019-06-21', poster_path: '/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg' },
        { id: 147571, season_number: 3, name: 'Season 3', episode_count: 8, air_date: '2020-06-27', poster_path: '/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg' },
      ],
      keywords: ['time travel', 'nuclear power plant', 'family secrets', 'cave', 'parallel worlds'],
      trailer_url: 'https://www.youtube.com/watch?v=rrwycJ08PSA',
    }
  ];

  static async searchMovies(query: string, page: number = 1, type: 'all' | 'movie' | 'tv' = 'all'): Promise<{ results: TmdbMovieSummary[]; total_results: number }> {
    if (!query || query.trim().length === 0) {
      return { results: [], total_results: 0 };
    }

    const trimmed = query.trim().toLowerCase();

    // 0. Direct TMDB URL or TMDB ID lookup (e.g. https://www.themoviedb.org/movie/810793-don or 810793)
    const tmdbUrlMatch = trimmed.match(/(?:themoviedb\.org\/(movie|tv)\/(\d+)|^(movie|tv)\/(\d+)$)/i);
    const rawIdMatch = trimmed.match(/^\d+$/);

    if (tmdbUrlMatch || rawIdMatch) {
      const explicitType = tmdbUrlMatch?.[1] || tmdbUrlMatch?.[3];
      const mediaType = (explicitType || (type !== 'all' ? type : 'movie')).toLowerCase() as 'movie' | 'tv';
      const tmdbId = parseInt(tmdbUrlMatch?.[2] || tmdbUrlMatch?.[4] || rawIdMatch![0], 10);
      try {
        let item = await this.getMediaDetails(tmdbId, mediaType);
        let resolvedType = mediaType;
        if ((!item || (!item.title && !item.name)) && !explicitType && type === 'all') {
          item = await this.getMediaDetails(tmdbId, 'tv');
          resolvedType = 'tv';
        }
        if (item && (item.title || item.name)) {
          return {
            results: [{
              id: item.id || item.tmdb_id || tmdbId,
              title: item.title || item.name || '',
              original_title: item.original_title || item.original_name || item.title || item.name || '',
              overview: item.overview || '',
              release_date: item.release_date || item.first_air_date || '',
              poster_path: item.poster_path || '',
              backdrop_path: item.backdrop_path || '',
              vote_average: item.vote_average || 0,
              original_language: item.original_language || 'en',
              genre_ids: Array.isArray(item.genres) ? item.genres.map((g: any) => typeof g === 'object' ? g.id : g) : [],
              media_type: resolvedType,
            }],
            total_results: 1,
          };
        }
      } catch {
        // Fall back to normal search
      }
    }

    // Exact Match & Relevance Score Calculator
    const scoreItem = (item: any) => {
      const titleLower = (item.title || item.name || '').toLowerCase();
      const origLower = (item.original_title || item.original_name || '').toLowerCase();
      let score = 0;
      if (titleLower === trimmed || origLower === trimmed) score += 2000;
      else if (titleLower.startsWith(trimmed) || origLower.startsWith(trimmed)) score += 500;
      else if (` ${titleLower} `.includes(` ${trimmed} `) || ` ${origLower} `.includes(` ${trimmed} `)) score += 200;
      score += (item.vote_average || 0) * 10;
      return score;
    };

    // Use TMDB API if key is present
    if (config.tmdb.apiKey && config.tmdb.apiKey !== 'mock_or_demo_key') {
      try {
        let endpoint = 'search/multi';
        if (type === 'movie') endpoint = 'search/movie';
        else if (type === 'tv') endpoint = 'search/tv';

        const fetchUrl = (p: number) => `${config.tmdb.baseUrl}/${endpoint}?api_key=${config.tmdb.apiKey}&query=${encodeURIComponent(trimmed)}&page=${p}&include_adult=false`;

        const res = await fetch(fetchUrl(page));
        let rawResults: any[] = [];
        if (res.ok) {
          const data: any = await res.json();
          rawResults = data.results || [];

          // For short queries (e.g. "don", "v"), fetch page 2 as well to ensure exact title matches buried on page 2 are found
          if (trimmed.length <= 6 && data.total_pages > 1 && page === 1) {
            try {
              const res2 = await fetch(fetchUrl(2));
              if (res2.ok) {
                const data2: any = await res2.json();
                rawResults = [...rawResults, ...(data2.results || [])];
              }
            } catch {
              // Ignore page 2 fetch error
            }
          }
        } else {
          throw new Error(`TMDB HTTP error ${res.status}`);
        }

        const filtered = rawResults.filter(item => item.media_type !== 'person');
        const uniqueItems = Array.from(new Map(filtered.map(i => [i.id, i])).values());

        const normalized = uniqueItems.map(item => {
          const isTv = item.media_type === 'tv' || type === 'tv';
          return {
            id: item.id,
            title: isTv ? (item.name || item.original_name) : item.title,
            original_title: isTv ? (item.original_name || item.name) : item.original_title,
            overview: item.overview,
            release_date: isTv ? (item.first_air_date || '') : (item.release_date || ''),
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            vote_average: item.vote_average,
            original_language: item.original_language,
            genre_ids: item.genre_ids || [],
            media_type: (isTv ? 'tv' : 'movie') as 'movie' | 'tv',
          };
        });

        // Boost exact matches (e.g. "Don" 2022) to the top
        normalized.sort((a, b) => scoreItem(b) - scoreItem(a));

        return {
          results: normalized,
          total_results: normalized.length,
        };
      } catch (err: any) {
        Logger.warn(`TMDB API call failed (${err.message}). Using resilient search matcher.`);
      }
    }

    // Resilient fallback matcher for local preview / mock mode
    let matches = this.mockMovies.filter(m =>
      m.title.toLowerCase().includes(trimmed) ||
      m.original_title.toLowerCase().includes(trimmed) ||
      (m.director && m.director.toLowerCase().includes(trimmed))
    );

    if (type !== 'all') {
      matches = matches.filter(m => (m.media_type || 'movie') === type);
    }

    matches.sort((a, b) => scoreItem(b) - scoreItem(a));

    return {
      results: matches.map(m => ({
        id: m.id,
        title: m.title,
        original_title: m.original_title,
        overview: m.overview,
        release_date: m.release_date || m.first_air_date || '',
        poster_path: m.poster_path,
        backdrop_path: m.backdrop_path,
        vote_average: m.vote_average,
        original_language: m.original_language,
        genre_ids: m.genres ? m.genres.map((g: any) => g.id) : [],
        media_type: (m.media_type || 'movie') as 'movie' | 'tv',
        number_of_seasons: m.number_of_seasons,
        number_of_episodes: m.number_of_episodes,
      })),
      total_results: matches.length,
    };
  }

  static async getWatchProviders(tmdbId: number, title?: string, originalTitle?: string): Promise<any[]> {
    const normalizedTitle = (title || '').trim().toLowerCase();
    const normalizedOrig = (originalTitle || '').trim().toLowerCase();

    // 1. Check known high-accuracy streaming catalogs
    if (
      normalizedTitle.includes('greatest of all time') ||
      normalizedTitle === 'goat' ||
      normalizedTitle.includes('the g.o.a.t') ||
      normalizedOrig.includes('greatest of all time')
    ) {
      return [
        {
          providerName: 'Netflix',
          providerIcon: 'netflix',
          externalUrl: 'https://www.netflix.com/title/81775791',
          quality: '4K UHD',
          sourceType: 'ott',
        },
      ];
    }

    if (normalizedTitle.includes('interstellar')) {
      return [
        {
          providerName: 'Amazon Prime Video',
          providerIcon: 'prime',
          externalUrl: 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=Interstellar',
          quality: '4K UHD',
          sourceType: 'ott',
        },
        {
          providerName: 'JioCinema',
          providerIcon: 'jiocinema',
          externalUrl: 'https://www.jiocinema.com/search/Interstellar',
          quality: '1080p',
          sourceType: 'ott',
        }
      ];
    }

    if (normalizedTitle.includes('inception')) {
      return [
        {
          providerName: 'Netflix',
          providerIcon: 'netflix',
          externalUrl: 'https://www.netflix.com/search?q=Inception',
          quality: '4K UHD',
          sourceType: 'ott',
        },
      ];
    }

    if (normalizedTitle.includes('dune')) {
      return [
        {
          providerName: 'JioCinema',
          providerIcon: 'jiocinema',
          externalUrl: 'https://www.jiocinema.com/search/Dune',
          quality: '4K UHD',
          sourceType: 'ott',
        },
      ];
    }

    if (normalizedTitle.includes('vikram')) {
      return [
        {
          providerName: 'JioHotstar',
          providerIcon: 'hotstar',
          externalUrl: 'https://www.hotstar.com/in/explore?search_query=Vikram',
          quality: '4K UHD',
          sourceType: 'ott',
        },
      ];
    }

    if (normalizedTitle.includes('oppenheimer')) {
      return [
        {
          providerName: 'JioCinema',
          providerIcon: 'jiocinema',
          externalUrl: 'https://www.jiocinema.com/search/Oppenheimer',
          quality: '4K UHD',
          sourceType: 'ott',
        },
      ];
    }

    // 2. Try online TMDB watch providers if API key is active
    if (config.tmdb.apiKey && config.tmdb.apiKey !== 'mock_or_demo_key') {
      try {
        const url = `${config.tmdb.baseUrl}/movie/${tmdbId}/watch/providers?api_key=${config.tmdb.apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data: any = await res.json();
          const results = data.results || {};
          // Prefer India (IN), then US, then GB, or first country
          const region = results.IN || results.US || results.GB || Object.values(results)[0] as any;
          if (region) {
            const list: any[] = [];
            const flatrate = region.flatrate || [];
            const rentOrBuy = [...(region.rent || []), ...(region.buy || [])];
            
            const providers = flatrate.length > 0 ? flatrate : rentOrBuy;
            for (const p of providers.slice(0, 3)) {
              let iconType = 'ott';
              const pLower = p.provider_name.toLowerCase();
              if (pLower.includes('netflix')) iconType = 'netflix';
              else if (pLower.includes('prime') || pLower.includes('amazon')) iconType = 'prime';
              else if (pLower.includes('hotstar') || pLower.includes('disney')) iconType = 'hotstar';
              else if (pLower.includes('apple')) iconType = 'appletv';
              else if (pLower.includes('jio')) iconType = 'jiocinema';
              else if (pLower.includes('zee')) iconType = 'zee5';
              else if (pLower.includes('sony')) iconType = 'sonyliv';
              else if (pLower.includes('sun nxt') || pLower.includes('sunnxt')) iconType = 'sunnxt';
              else if (pLower.includes('vi movies') || pLower.includes('vi movie') || pLower.includes('vodafone')) iconType = 'vimovies';
              else if (pLower.includes('mubi')) iconType = 'mubi';
              else if (pLower.includes('aha')) iconType = 'aha';

              list.push({
                providerName: p.provider_name,
                providerIcon: p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : iconType,
                externalUrl: region.link || `https://www.google.com/search?q=${encodeURIComponent((title || '') + ' watch online ' + p.provider_name)}`,
                quality: '4K UHD',
                sourceType: 'ott',
              });
            }
            if (list.length > 0) return list;
          }
        }
      } catch (err: any) {
        Logger.warn(`TMDB watch providers fetch failed: ${err.message}`);
      }
    }

    // 3. Fallback: Provide smart OTT search links for title
    if (title && title.trim().length > 0) {
      const q = encodeURIComponent(title.trim());
      return [
        {
          providerName: 'Netflix',
          providerIcon: 'netflix',
          externalUrl: `https://www.netflix.com/search?q=${q}`,
          quality: '4K UHD',
          sourceType: 'ott',
        },
        {
          providerName: 'Amazon Prime Video',
          providerIcon: 'prime',
          externalUrl: `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}`,
          quality: 'HD',
          sourceType: 'ott',
        },
      ];
    }

    return [];
  }

  static async getMovieDetails(tmdbId: number): Promise<any> {
    if (config.tmdb.apiKey && config.tmdb.apiKey !== 'mock_or_demo_key') {
      try {
        const url = `${config.tmdb.baseUrl}/movie/${tmdbId}?api_key=${config.tmdb.apiKey}&append_to_response=credits,keywords,videos,watch/providers`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`TMDB HTTP error ${res.status}`);
        }
        const data: any = await res.json();

        // Extract director
        const director = data.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'Unknown';
        const cast = (data.credits?.cast || []).slice(0, 16).map((c: any) => ({
          name: c.name,
          character: c.character,
          profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        }));

        const keyCrewRoles = [
          'Director',
          'Original Music Composer',
          'Music',
          'Director of Photography',
          'Editor',
          'Screenplay',
          'Writer',
          'Story',
          'Producer',
          'Executive Producer',
          'Production Design',
          'Stunt Coordinator',
        ];

        const crew = (data.credits?.crew || [])
          .filter((c: any) => keyCrewRoles.includes(c.job))
          .slice(0, 18)
          .map((c: any) => ({
            name: c.name,
            job: c.job,
            department: c.department,
            profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
          }));

        const keywords = (data.keywords?.keywords || []).map((k: any) => k.name);
        const trailer = data.videos?.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')?.key;

        // Extract watch providers if available
        const watchProviders = await this.getWatchProviders(data.id, data.title, data.original_title);

        return {
          tmdb_id: data.id,
          imdb_id: data.imdb_id,
          title: data.title,
          original_title: data.original_title,
          overview: data.overview,
          release_date: data.release_date,
          runtime: data.runtime,
          original_language: data.original_language,
          spoken_languages: (data.spoken_languages || []).map((l: any) => l.iso_639_1),
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          vote_average: data.vote_average,
          director,
          cast_members: cast,
          crew_members: crew,
          genres: data.genres || [],
          keywords,
          production_countries: (data.production_countries || []).map((c: any) => c.name),
          trailer_url: trailer ? `https://www.youtube.com/watch?v=${trailer}` : null,
          watch_providers: watchProviders,
        };
      } catch (err: any) {
        Logger.warn(`TMDB details API failed: ${err.message}. Falling back to cached definition.`);
      }
    }

    const found = this.mockMovies.find(m => m.id === tmdbId);
    if (found) {
      const watchProviders = await this.getWatchProviders(found.id, found.title, found.original_title);
      return {
        tmdb_id: found.id,
        imdb_id: `tt${found.id}`,
        title: found.title,
        original_title: found.original_title,
        overview: found.overview,
        release_date: found.release_date,
        runtime: found.runtime,
        original_language: found.original_language,
        spoken_languages: [found.original_language],
        poster_path: found.poster_path,
        backdrop_path: found.backdrop_path,
        vote_average: found.vote_average,
        director: found.director,
        cast_members: found.cast || found.cast_members || [],
        crew_members: found.crew_members || [],
        genres: found.genres,
        keywords: found.keywords,
        production_countries: ['United States'],
        trailer_url: found.trailer_url,
        watch_providers: watchProviders,
      };
    }

    throw new ExternalServiceError('TMDB', 'Could not retrieve movie metadata from TMDB.');
  }

  static async getTvDetails(tmdbId: number): Promise<any> {
    if (config.tmdb.apiKey && config.tmdb.apiKey !== 'mock_or_demo_key') {
      try {
        const url = `${config.tmdb.baseUrl}/tv/${tmdbId}?api_key=${config.tmdb.apiKey}&append_to_response=credits,keywords,videos,watch/providers`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`TMDB HTTP error ${res.status}`);
        }
        const data: any = await res.json();

        const createdBy = (data.created_by || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        }));

        const director = createdBy.length > 0 ? createdBy.map((c: any) => c.name).join(', ') : 'Showrunner';

        const cast = (data.credits?.cast || []).slice(0, 16).map((c: any) => ({
          name: c.name,
          character: c.character,
          profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        }));

        const crew = (data.credits?.crew || [])
          .slice(0, 18)
          .map((c: any) => ({
            name: c.name,
            job: c.job,
            department: c.department,
            profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
          }));

        const seasons = (data.seasons || []).map((s: any) => ({
          id: s.id,
          season_number: s.season_number,
          name: s.name,
          episode_count: s.episode_count,
          air_date: s.air_date,
          overview: s.overview,
          poster_path: s.poster_path ? `https://image.tmdb.org/t/p/w300${s.poster_path}` : null,
        }));

        const keywords = (data.keywords?.results || []).map((k: any) => k.name);
        const trailer = data.videos?.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')?.key;
        const watchProviders = await this.getWatchProviders(data.id, data.name, data.original_name);

        return {
          tmdb_id: data.id,
          imdb_id: null,
          title: data.name,
          original_title: data.original_name,
          overview: data.overview,
          release_date: data.first_air_date,
          first_air_date: data.first_air_date,
          last_air_date: data.last_air_date,
          runtime: data.episode_run_time?.[0] || 45,
          original_language: data.original_language,
          spoken_languages: (data.spoken_languages || []).map((l: any) => l.iso_639_1),
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          vote_average: data.vote_average,
          director,
          created_by: createdBy,
          seasons,
          number_of_seasons: data.number_of_seasons || 1,
          number_of_episodes: data.number_of_episodes || 1,
          series_status: data.status || 'Ended',
          media_type: 'tv',
          cast_members: cast,
          crew_members: crew,
          genres: data.genres || [],
          keywords,
          production_countries: (data.production_countries || []).map((c: any) => c.name),
          trailer_url: trailer ? `https://www.youtube.com/watch?v=${trailer}` : null,
          watch_providers: watchProviders,
        };
      } catch (err: any) {
        Logger.warn(`TMDB TV details API failed: ${err.message}. Falling back to cached definition.`);
      }
    }

    const found = this.mockMovies.find(m => m.id === tmdbId && m.media_type === 'tv') || this.mockMovies.find(m => m.id === tmdbId);
    if (found) {
      const watchProviders = await this.getWatchProviders(found.id, found.title, found.original_title);
      return {
        tmdb_id: found.id,
        imdb_id: `tt${found.id}`,
        title: found.title,
        original_title: found.original_title,
        overview: found.overview,
        release_date: found.release_date || found.first_air_date,
        first_air_date: found.first_air_date || found.release_date,
        last_air_date: found.last_air_date || null,
        runtime: found.runtime || 45,
        original_language: found.original_language,
        spoken_languages: [found.original_language],
        poster_path: found.poster_path,
        backdrop_path: found.backdrop_path,
        vote_average: found.vote_average,
        director: found.director,
        created_by: found.created_by || [{ id: 1, name: found.director, profile_path: null }],
        seasons: found.seasons || [{ id: 1, season_number: 1, name: 'Season 1', episode_count: found.number_of_episodes || 10, air_date: found.release_date, poster_path: found.poster_path }],
        number_of_seasons: found.number_of_seasons || 1,
        number_of_episodes: found.number_of_episodes || 1,
        series_status: found.series_status || 'Ended',
        media_type: 'tv',
        cast_members: found.cast || found.cast_members || [],
        crew_members: found.crew_members || [],
        genres: found.genres,
        keywords: found.keywords,
        production_countries: ['United States'],
        trailer_url: found.trailer_url,
        watch_providers: watchProviders,
      };
    }

    throw new ExternalServiceError('TMDB', 'Could not retrieve series metadata from TMDB.');
  }

  static async getMediaDetails(tmdbId: number, mediaType: 'movie' | 'tv' = 'movie'): Promise<any> {
    if (mediaType === 'tv') {
      return this.getTvDetails(tmdbId);
    }
    return this.getMovieDetails(tmdbId);
  }

  static async getMediaImages(tmdbId: number, mediaType: 'movie' | 'tv' = 'movie'): Promise<{
    backdrops: Array<{ file_path: string; aspect_ratio?: number; width?: number; height?: number }>;
    posters: Array<{ file_path: string; aspect_ratio?: number; width?: number; height?: number }>;
  }> {
    if (config.tmdb.apiKey && config.tmdb.apiKey !== 'mock-key') {
      try {
        const endpoint = mediaType === 'tv' ? `/tv/${tmdbId}/images` : `/movie/${tmdbId}/images`;
        const res = await fetch(`${config.tmdb.baseUrl}${endpoint}?api_key=${config.tmdb.apiKey}&include_image_language=en,ta,hi,te,ml,kn,null`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data: any = await res.json();
          return {
            backdrops: Array.isArray(data.backdrops) ? data.backdrops : [],
            posters: Array.isArray(data.posters) ? data.posters : [],
          };
        }
      } catch (err: any) {
        Logger.warn(`TMDB images API failed for ID ${tmdbId}: ${err.message}`);
      }
    }

    const found = this.mockMovies.find(m => m.id === tmdbId);
    return {
      backdrops: found?.backdrop_path ? [{ file_path: found.backdrop_path, aspect_ratio: 1.78, width: 1920, height: 1080 }] : [],
      posters: found?.poster_path ? [{ file_path: found.poster_path, aspect_ratio: 0.67, width: 1000, height: 1500 }] : [],
    };
  }
}
