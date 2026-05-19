import { z } from 'zod';

export const KeywordRankingSchema = z.object({
  keyword: z.string().min(1),
  position: z.number().int().positive(),
  url: z.string().url(),
  searchVolume: z.number().int().nonnegative().optional(),
});

export const SeoReportSchema = z.object({
  clientId: z.string().uuid(),
  generatedAt: z.coerce.date(),
  rankings: z.array(KeywordRankingSchema),
  organicTraffic: z.number().int().nonnegative(),
});

export type KeywordRanking = z.infer<typeof KeywordRankingSchema>;
export type SeoReport = z.infer<typeof SeoReportSchema>;
