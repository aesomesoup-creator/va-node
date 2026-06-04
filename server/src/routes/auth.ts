import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { v4 as uuidv4 } from "uuid";
import { getDb, isDbAvailable, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import type { User } from "../db/schema.js";

declare module "express-session" {
  interface SessionData {
    guestId?: string;
    guestName?: string;
  }
}

declare global {
  namespace Express {
    interface User {
      id: string;
      googleId?: string | null;
      email?: string | null;
      name: string;
      avatarUrl?: string | null;
      isGuest: boolean;
    }
  }
}

export function setupPassport() {
  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id: string, done) => {
    try {
      if (!isDbAvailable()) return done(null, null);
      const db = getDb();
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id));
      done(null, user || null);
    } catch (err) {
      done(err, null);
    }
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${process.env.SERVER_URL || "http://localhost:3001"}/api/auth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            if (!isDbAvailable()) {
              return done(null, {
                id: profile.id,
                googleId: profile.id,
                email: profile.emails?.[0]?.value,
                name: profile.displayName,
                avatarUrl: profile.photos?.[0]?.value,
                isGuest: false,
              });
            }
            const db = getDb();
            const [existing] = await db
              .select()
              .from(schema.users)
              .where(eq(schema.users.googleId, profile.id));

            if (existing) {
              return done(null, existing);
            }

            const [newUser] = await db
              .insert(schema.users)
              .values({
                googleId: profile.id,
                email: profile.emails?.[0]?.value,
                name: profile.displayName,
                avatarUrl: profile.photos?.[0]?.value,
                isGuest: false,
              })
              .returning();
            done(null, newUser);
          } catch (err) {
            done(err as Error);
          }
        }
      )
    );
  }
}

const router = Router();

// Lets the client check if Google OAuth is configured before redirecting
router.get("/google/available", (_req, res) => {
  res.json({ available: Boolean(process.env.GOOGLE_CLIENT_ID) });
});

router.get("/me", (req, res) => {
  if (req.isAuthenticated() && req.user) {
    return res.json({ user: req.user, isGuest: false });
  }
  if (req.session.guestId) {
    return res.json({
      user: {
        id: req.session.guestId,
        name: req.session.guestName || "Guest",
        isGuest: true,
      },
      isGuest: true,
    });
  }
  res.json({ user: null });
});

router.post("/guest", (req, res) => {
  req.session.guestId = uuidv4();
  req.session.guestName = "Guest Explorer";
  res.json({
    user: {
      id: req.session.guestId,
      name: req.session.guestName,
      isGuest: true,
    },
  });
});

router.get(
  "/google",
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: "Google OAuth not configured" });
    }
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}?auth=error` }),
  (req, res) => {
    res.redirect(process.env.CLIENT_URL || "http://localhost:5173");
  }
);

router.post("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });
});

export default router;
