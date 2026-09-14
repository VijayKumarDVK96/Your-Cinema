export interface AIProviderAdapter {
  name: string;
  generateTasteSummary(profileData: any): Promise<string>;
  explainRecommendation(movieTitle: string, userTasteNotes: string): Promise<string>;
  rankLibraryCandidates(userQuery: string, candidateTitles: { id: string; title: string; director: string; genres: string[] }[]): Promise<{ id: string; rationale: string }[]>;
  testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }>;
}
