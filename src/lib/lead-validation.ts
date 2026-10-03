import { z } from 'zod';
import { locales } from '@/lib/i18n/dictionary';

export const leadSchema = z.object({
  projectType: z.string().min(2).max(100),
  budget: z.string().min(2).max(100),
  timeline: z.string().min(2).max(100),
  name: z.string().min(2).max(160),
  email: z.email().max(255),
  phone: z.string().min(8).max(40),
  details: z.string().min(15).max(5000),
  consent: z.literal(true),
  /** Language of the page the form was sent from. Older clients omit it, which means Persian. */
  locale: z.enum(locales).optional(),
  /** Honeypot: real visitors never see or fill this field. */
  website: z.string().max(200).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
