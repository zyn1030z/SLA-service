/**
 * Get the NestJS API base URL for server-side API routes
 *
 * Priority:
 * 1. API_URL (server-side only, not exposed to client) - Use this for production server
 * 2. NEXT_PUBLIC_API_URL (exposed to client, can be used server-side too)
 * 3. Docker service name (when running in Docker network)
 * 4. localhost (fallback for local development)
 *
 * When deploying to server, set API_URL environment variable to the actual server URL
 * Example: API_URL=http://10.32.35.27:3000 or API_URL=http://your-server.com:3000
 */
export function getApiUrl(): string {
  // Prefer API_URL for server-side (more secure, not exposed to client)
  // This should be set when deploying to actual server
  if (process.env.API_URL) {
    const url = process.env.API_URL;
    console.log(`[getApiUrl] Using API_URL from env: ${url}`);
    return url;
  }

  // Fallback to NEXT_PUBLIC_API_URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    const url = process.env.NEXT_PUBLIC_API_URL;
    console.log(`[getApiUrl] Using NEXT_PUBLIC_API_URL from env: ${url}`);
    return url;
  }

  // Check if running in Docker
  // Use environment variables (most reliable way)
  // For Docker Compose, COMPOSE_PROJECT_NAME is usually set
  const isDocker =
    process.env.DOCKER_ENV === "true" ||
    process.env.COMPOSE_PROJECT_NAME !== undefined ||
    process.env.DOCKER_CONTAINER === "true" ||
    // Check if hostname matches Docker container pattern (12 char hex)
    (process.env.HOSTNAME && /^[a-f0-9]{12}$/i.test(process.env.HOSTNAME));
  console.log(`[getApiUrl] isDocker: ${isDocker}`);
  if (isDocker) {
    const dockerRuntime = process.env.DOCKER_RUNTIME || "local";
    const dockerLocalUrl =
      process.env.DOCKER_LOCAL_API_URL || "http://nestjs-api:3000";
    const dockerProdUrl =
      // process.env.DOCKER_PROD_API_URL || "http://10.32.35.27:3000";
      process.env.DOCKER_PROD_API_URL || "http://nestjs-api:3000";
    const url = dockerRuntime === "prod" ? dockerProdUrl : dockerLocalUrl;
    console.log(
      `[getApiUrl] Running in Docker (${dockerRuntime}), using URL: ${url}`
    );
    return url;
  }

  // Default fallback for local development (outside Docker)
  const url = "http://localhost:3000";
  // const url = "http://10.32.35.27:3000";
  console.log(`[getApiUrl] Using localhost fallback: ${url}`);
  return url;
}
