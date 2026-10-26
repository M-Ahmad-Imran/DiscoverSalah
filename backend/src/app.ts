import { credentialRoutes } from "./modules/auth/credentials.js";
import { workspaceRoutes } from "./modules/venues/workspace.js";
import { changeRoutes } from "./modules/venues/changes.js";
import express from "express";
import { discoveryRoutes } from "./modules/schedules/discovery.js";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import type { Config } from "./config/env.js";
import type { Database } from "./db/database.js";
import type { PhoneProvider } from "./providers/phone.js";
import {
  DisabledPhoneProvider,
  GatewayPhoneProvider,
} from "./providers/phone.js";
import { ApiError } from "./lib/errors.js";
import {
  originGuard,
  requireAuth,
  csrf,
  rateLimit,
} from "./middleware/security.js";
import { authRoutes } from "./modules/auth/routes.js";
import {
  publicRoutes,
  managementVenueRoutes,
} from "./modules/venues/routes.js";
import {
  communityPublic,
  communityManagement,
} from "./modules/community/routes.js";
import { noticePublic, noticeManagement } from "./modules/notices/routes.js";
import { adminRoutes } from "./modules/admin/routes.js";
export function createApp(
  d: Database,
  c: Config,
  provider: PhoneProvider = c.PHONE_PROVIDER === "gateway"
    ? new GatewayPhoneProvider(c)
    : new DisabledPhoneProvider(),
) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", c.TRUST_PROXY_HOPS);
  app.set("etag", "weak");
  app.use(helmet());
  app.use(
    cors({
      origin: c.WEB_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token", "Idempotency-Key"],
      exposedHeaders: ["X-Request-Id", "X-Server-Time", "Retry-After"],
    }),
  );
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    res.setHeader("X-Server-Time", new Date().toISOString());
    res.setHeader("Cache-Control", "no-store");
    const start = Date.now();
    res.on("finish", () => {
      if (c.NODE_ENV !== "test")
        console.info(
          JSON.stringify({
            requestId: req.requestId,
            method: req.method,
            status: res.statusCode,
            ms: Date.now() - start,
          }),
        );
    });
    next();
  });
  app.use(
    compression({
      threshold: 1024,
      filter: (req, res) =>
        req.method === "GET" &&
        !req.path.startsWith("/api/v1/management") &&
        !req.path.startsWith("/api/v1/session") &&
        compression.filter(req, res),
    }),
  );
  app.use(express.json({ limit: "32kb", strict: true }));
  app.use(cookieParser());
  app.get("/health/live", (_req, res) => res.json({ status: "ok" }));
  app.get("/health/ready", async (_req, res) => {
    await d.db.command({ ping: 1 }, { timeoutMS: 1000 });
    res.json({ status: "ready" });
  });
  app.use("/api/v1", originGuard(c), rateLimit(d, c, "api", 300, 60));
  app.use(
    "/api/v1",
    authRoutes(d, c, provider),
    publicRoutes(d),
    workspaceRoutes(d, c),
    discoveryRoutes(d),
    communityPublic(d, c),
    noticePublic(d),
  );
  app.use(
    "/api/v1/management",
    requireAuth(d, c),
    csrf,
    managementVenueRoutes(d, c),
    credentialRoutes(d, c),
    workspaceRoutes(d, c, true),
    changeRoutes(d, c),
    communityManagement(d, c),
    noticeManagement(d, c),
    adminRoutes(d, c),
  );
  app.use((_req, res) =>
    res
      .status(404)
      .json({ error: { code: "NOT_FOUND", message: "Endpoint not found." } }),
  );
  app.use(
    (
      error: unknown,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      let status = 500,
        code = "INTERNAL_ERROR",
        message = "Unable to complete this request.",
        fieldErrors: unknown;
      if (error instanceof ApiError) {
        ({ status, code, message } = error);
      } else if (error instanceof ZodError) {
        status = 422;
        code = "VALIDATION_FAILED";
        message = "Check the submitted fields.";
        fieldErrors = error.flatten().fieldErrors;
      } else if ((error as { type?: string })?.type === "entity.too.large") {
        status = 413;
        code = "PAYLOAD_TOO_LARGE";
        message = "Request is too large.";
      } else if (error instanceof SyntaxError) {
        status = 400;
        code = "INVALID_JSON";
        message = "Invalid JSON body.";
      } else if ((error as { code?: number })?.code === 11000) {
        status = 409;
        code = "CONFLICT";
        message =
          "This record already exists or was updated concurrently. Retry the same idempotency key.";
      }
      if (status === 500 && c.NODE_ENV !== "test")
        console.error(
          JSON.stringify({ event: "request_failed", requestId: req.requestId }),
        );
      res.status(status).json({
        error: { code, message, fieldErrors, requestId: req.requestId },
      });
    },
  );
  return app;
}
