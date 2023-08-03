/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
// https://developers.cloudflare.com/workers/configuration/environment-variables/#add-secrets-to-your-project

export interface Env {
  CHANGE_EMAIL_URL: string;
  CHECK_IN_URL: string;
}

export default {
  async fetch(
      request: Request,
      env: Env,
      ctx: ExecutionContext
  ) {

    const url = (new URL(request.url)).searchParams;

    const proxyOf = url.get("proxyOf");
    if (!proxyOf) return new Response("Missing proxyOf query parameter", { status: 400 });
    const url_key = proxyOf.trim().toUpperCase() + "_URL";

    // @ts-ignore
    const proxyOfEnv = env[url_key];
    if (!proxyOfEnv) return new Response("Invalid proxyOf query parameter", { status: 400 });

    const response = await fetch(proxyOfEnv, request);
    const newResponse = new Response(response.body, response);
    newResponse.headers.set("Access-Control-Allow-Origin", "*")
    newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    return newResponse;
  },
};
