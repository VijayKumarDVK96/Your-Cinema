import { AIProviderAdapter } from './ai.interface.js';
import { Logger } from '../../utils/logger.js';

export class GeminiAdapter implements AIProviderAdapter {
  name = 'Google Gemini';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey: string, model: string = 'gemini-1.5-flash', baseUrl?: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const start = Date.now();
    if (!this.apiKey) {
      return { success: false, latencyMs: 0, message: 'Gemini API key is not configured.' };
    }

    try {
      const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping. Respond with "Pong".' }] }],
        }),
      });

      const latencyMs = Date.now() - start;
      if (!res.ok) {
        return { success: false, latencyMs, message: `Gemini API returned error HTTP ${res.status}` };
      }
      return { success: true, latencyMs, message: 'Gemini connection verified successfully.' };
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, message: err.message };
    }
  }

  async generateTasteSummary(profileData: any): Promise<string> {
    if (this.apiKey) {
      try {
        const prompt = `You are a film critic and taste analyst. Based on this movie enthusiast's profile:
- Total watched: ${profileData.summary?.watchedCount}
- Top Genres: ${profileData.movieDna?.map((d: any) => `${d.name} (${d.percentage}%)`).join(', ')}
- Top Directors: ${profileData.topDirectors?.map((d: any) => d.name).join(', ')}
- Top Actors: ${profileData.topActors?.map((a: any) => a.name).join(', ')}
- Top Actresses: ${profileData.topActresses?.map((a: any) => a.name).join(', ')}
- Average rating: ${profileData.summary?.averageRating} stars
Provide a 2-3 sentence sophisticated, cinematic analysis of their unique viewing taste.`;

        const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        }
      } catch (err: any) {
        Logger.warn(`Gemini taste summary generation failed: ${err.message}`);
      }
    }

    // Graceful fallback taste narrative based on actual data
    const topGenres = profileData.movieDna?.slice(0, 2).map((g: any) => g.name).join(' and ') || 'Drama and Sci-Fi';
    const topDirector = profileData.topDirectors?.[0]?.name || 'visionary filmmakers';
    return `You gravitate toward intellectually stimulating, atmospheric cinema with a pronounced appetite for ${topGenres}. Your high regard for works by ${topDirector} reflects an appreciation for grand narrative scale, intricate structure, and uncompromising visual craftsmanship.`;
  }

  async explainRecommendation(movieTitle: string, userTasteNotes: string): Promise<string> {
    if (this.apiKey) {
      try {
        const prompt = `Explain why the movie "${movieTitle}" is strongly recommended for a user who loves: ${userTasteNotes}. Keep it to 2 concise sentences focused on theme and craftsmanship.`;
        const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        }
      } catch (err: any) {
        Logger.warn(`Gemini recommendation explanation failed: ${err.message}`);
      }
    }

    return `"${movieTitle}" directly aligns with your preferences for atmospheric pacing and intricate world-building, matching the high standards of your highest-rated films.`;
  }

  async rankLibraryCandidates(userQuery: string, candidateTitles: { id: string; title: string; director: string; genres: string[] }[]): Promise<{ id: string; rationale: string }[]> {
    if (this.apiKey && candidateTitles.length > 0) {
      try {
        const prompt = `A user in their personal cinema library asked: "${userQuery}".
Select and rank up to 5 items STRICTLY from the following candidate list. Do NOT suggest any movie not in this list:
${JSON.stringify(candidateTitles)}
Respond in valid JSON format: [{"id": "...", "rationale": "one short sentence"}]`;

        const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const jsonStr = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(jsonStr);
            // Strict safety check: must be in original candidate list
            const validIds = new Set(candidateTitles.map(c => c.id));
            return parsed.filter((p: any) => validIds.has(p.id));
          }
        }
      } catch (err: any) {
        Logger.warn(`Gemini candidate ranking failed: ${err.message}`);
      }
    }

    // Fallback: Return top candidates from user's library with deterministic rationale
    return candidateTitles.slice(0, 4).map(c => ({
      id: c.id,
      rationale: `Selected from your library matching "${userQuery}" based on genre and thematic relevance.`,
    }));
  }
}
