// vercel-config.js

// Set up Vercel environment variables

const VERCEL_ENV = process.env.VERCEL_ENV;
const VERCEL_URL = process.env.VERCEL_URL;
const DATABASE_URL = process.env.DATABASE_URL;

// Example of how to use these variables in your application
if (VERCEL_ENV === 'production') {
    console.log('Running in production mode');
} else {
    console.log('Running in development mode');
}

module.exports = {
    VERCEL_URL,
    DATABASE_URL,
};