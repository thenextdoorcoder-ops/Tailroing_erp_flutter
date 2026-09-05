import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const getEnv = (key: string, defaultValue?: string): string => {
    const value = process.env[key] || defaultValue;

    if (isProd && !process.env[key] && defaultValue?.includes('localhost')) {
        throw new Error(
            `Critical environment variable ${key} must be explicitly set in production (currently defaulting to localhost)`
        );
    }

    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is required`);
    }

    return value || '';
};

export const config = {
    env: getEnv('NODE_ENV', 'development'),
    isProd,
    port: parseInt(getEnv('PORT', '5000'), 10),

    frontendUrl: getEnv('FRONTEND_URL', 'http://localhost:3000'),
    corsOrigins: getEnv('CORS_ORIGINS', '*').split(','),

    jwtSecret: getEnv('JWT_SECRET', 'ktown-tailoring-super-secret-key-2026-production'),
    jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),

    databaseUrl: getEnv('DATABASE_URL'),

    email: {
        host: getEnv('EMAIL_HOST', 'smtp.gmail.com'),
        port: parseInt(getEnv('EMAIL_PORT', '587'), 10),
        user: getEnv('EMAIL_USER', ''),
        pass: getEnv('EMAIL_PASS', ''),
    },

    google: {
        clientId: getEnv('GOOGLE_CLIENT_ID', ''),
        clientSecret: getEnv('GOOGLE_CLIENT_SECRET', ''),
        callbackUrl: getEnv(
            'GOOGLE_CALLBACK_URL',
            'http://localhost:5000/api/auth/google/callback'
        ),
    },

    appName: getEnv('APP_NAME', 'KTown Aari Works Tailoring'),

    twilioWhatsapp: {
        whatsappNumber: getEnv('TWILIO_WHATSAPP_NUMBER', ''),
    },

    msg91: {
        authKey: getEnv('MSG91_AUTH_KEY', ''),
        templateId: getEnv('MSG91_TEMPLATE_ID', ''),
        senderId: getEnv('MSG91_SENDER_ID', 'KTWAAW'),
        whatsappIntegrationId: getEnv('MSG91_WHATSAPP_INTEGRATION_ID', ''),
    },

    r2: {
        endpoint: getEnv('R2_ENDPOINT', ''),
        accessKeyId: getEnv('R2_ACCESS_KEY_ID', ''),
        secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY', ''),
        bucketName: getEnv('R2_BUCKET_NAME', ''),
        publicDomain: getEnv('R2_PUBLIC_DOMAIN', ''),
    },

    redisUrl: getEnv('REDIS_URL', ''),
};