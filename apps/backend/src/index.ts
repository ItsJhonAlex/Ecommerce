import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { loadEnv } from "./env";
import { v1 } from "./routes/v1";

const env = loadEnv();

export const app = new Hono();

// Logging de requests (método, path, status, latencia).
app.use("/api/*", logger());

// CORS para toda la API (auth con cookies de sesión => credentials: true).
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:4321", "http://localhost:5174"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

// Handler de Better Auth: /api/auth/*
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// API v1.
app.route("/api/v1", v1);

// Healthcheck.
app.get("/health", (c) => c.json({ status: "ok" }));

// Red de seguridad: cualquier throw no controlado responde 500 uniforme y se
// loguea con stack del lado servidor (sin filtrar internals al cliente).
app.onError((err, c) => {
  console.error("Error no controlado:", err);
  return c.json({ error: "Error interno del servidor" }, 500);
});

export default {
  port: env.PORT,
  fetch: app.fetch,
};
