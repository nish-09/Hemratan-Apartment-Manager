import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('https://mock-project.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default('mock-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional().default('mock-service-role-key'),
  DATABASE_URL: z.string().optional(),
  APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  OTP_PROVIDER: z.enum(['mock', 'twilio', 'fast2sms']).default('mock'),
  OTP_DEVELOPMENT_MODE: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default(true),
  STORAGE_BUCKET_VISITORS: z.string().default('visitor-media'),
  STORAGE_BUCKET_COMPLAINTS: z.string().default('complaint-media'),
  STORAGE_BUCKET_BILLS: z.string().default('billing-documents'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(runtimeEnv: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(runtimeEnv);

  if (!result.success) {
    const formatted = result.error.format();
    console.error('❌ Invalid environment variables:', formatted);
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}

export const env = validateEnv();
