import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
// Load .env from repo root regardless of cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });
import express from "express";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import helmet from "helmet";
import { setupPassport } from "./routes/auth.js";
import authRouter from "./routes/auth.js";
import animeRouter from "./routes/anime.js";
import graphRouter from "./routes/graph.js";
import adminRouter from "./routes/admin.js";
import { isDbAvailable, initDb, getPool } from "./db/index.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Trust Railway's reverse proxy so secure cookies work over HTTPS
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-guest-id"],
  exposedHeaders: ["set-cookie"],
}));
app.use(express.json());

// Session store — use pg if DB available, else in-memory
let sessionStore: session.Store | undefined;

if (isDbAvailable()) {
  try {
    const { default: pgSession } = await import("connect-pg-simple");
    const PgStore = pgSession(session);
    sessionStore = new PgStore({
      pool: getPool(),
      createTableIfMissing: true,
    });
    console.log("✓ Session store: PostgreSQL");
  } catch (err) {
    console.warn("⚠ Could not init pg session store, using memory store:", err);
  }
} else {
  console.warn("⚠ DATABASE_URL not set — using in-memory session store (data lost on restart)");
}

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "va-node-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  })
);

setupPassport();
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/anime", animeRouter);
app.use("/api/graph", graphRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, db: isDbAvailable(), ts: Date.now() });
});

app.listen(PORT, () => {
  console.log(`\n🟢 VAnode server running on http://localhost:${PORT}`);
  console.log(`   DB available: ${isDbAvailable()}`);
  console.log(`   Google OAuth: ${Boolean(process.env.GOOGLE_CLIENT_ID)}\n`);
  initDb().catch((err) => console.error("⚠ initDb failed (server keeps running):", err));
});
