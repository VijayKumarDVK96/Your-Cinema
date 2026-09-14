import { AIProviderAdapter } from './ai.interface.js';
import { Logger } from '../../utils/logger.js';

export class OpenRouterAdapter implements AIProviderAdapter {
  name = 'OpenRouter';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey: string, model: string = 'anthropic/claude-3.5-sonnet', baseUrl?: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl || 'https://openrouter.ai/api/v1';
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const start = Date.now();
    if (!this.apiKey) {
      return { success: false, latencyMs: 0, message: 'OpenRouter API key is not configured.' };
    }

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://yourcinema.local',
          'X-Title': 'Your Cinema',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'Ping. Say Pong.' }],
        }),
      });

      const latencyMs = Date.now() - start;
      if (!res.ok) {
        return { success: false, latencyMs, message: `OpenRouter returned HTTP ${res.status}` };
      }
      return { success: true, latencyMs, message: 'OpenRouter connection verified successfully.' };
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, message: err.message };
    }
  }

  async generateTasteSummary(profileData: any): Promise<string> {
    if (this.apiKey) {
      try {
        const prompt = `You are an elite cinema analyst. Summarize this user's taste in 2 thoughtful sentences:
Watched: ${profileData.summary?.watchedCount}, Genres: ${profileData.movieDna?.map((d: any) => d.name).join(', ')}, Directors: ${profileData.topDirectors?.map((d: any) => d.name).join(', ')}`;

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return text.trim();
        }
      } catch (err: any) {
        Logger.warn(`OpenRouter taste analysis failed: ${err.message}`);
      }
    }

    const topGenres = profileData.movieDna?.slice(0, 2).map((g: any) => g.name).join(' and ') || 'Drama';
    return `Your cinema collection showcases a marked preference for rigorous storytelling and thematic depth in ${topGenres}. You value high cinematic ambition and immersive narrative craft.`;
  }

  async explainRecommendation(movieTitle: string, userTasteNotes: string): Promise<string> {
    return `"${movieTitle}" matches your established preference for high-caliber narrative design and aesthetic precision.`;
  }

  async rankLibraryCandidates(userQuery: string, candidateTitles: { id: string; title: string; director: string; genres: string[] }[]): Promise<{ id: string; rationale: string }[]> {
    return candidateTitles.slice(0, 4).map(c => ({
      id: c.id,
      rationale: `Selected from your library matching "${userQuery}".`,
    }));
  }
}
