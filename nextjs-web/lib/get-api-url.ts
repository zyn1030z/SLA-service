export const getApiUrl = () => {
  if (typeof window === 'undefined') {
    // Server side
    return process.env.API_URL || 'http://nestjs-api:3000';

  }
  // Client side
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
};

