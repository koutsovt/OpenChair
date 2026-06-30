import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url(),
    TWILIO_ACCOUNT_SID: z
      .string()
      .min(1)
      .refine((v) => v !== 'placeholder', 'must not be the literal placeholder'),
    TWILIO_AUTH_TOKEN: z
      .string()
      .min(1)
      .refine((v) => v !== 'placeholder', 'must not be the literal placeholder'),
    TWILIO_PHONE_NUMBER: z.string().min(1),
    TWILIO_SKIP_SIGNATURE: z.string().optional(),
    CRON_SECRET: z.string().min(1),
    ENABLE_DEMO_LOGIN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    TWILIO_SKIP_SIGNATURE: process.env.TWILIO_SKIP_SIGNATURE,
    CRON_SECRET: process.env.CRON_SECRET,
    ENABLE_DEMO_LOGIN: process.env.ENABLE_DEMO_LOGIN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
