import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { v1 } from "./routes/v1";

export const app = new Hono();

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

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
};
