import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  real,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  googleId: text("google_id").unique(),
  email: text("email"),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  isGuest: boolean("is_guest").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userAnime = pgTable(
  "user_anime",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    anilistId: integer("anilist_id").notNull(),
    title: text("title").notNull(),
    coverImage: text("cover_image"),
    positionX: real("position_x").notNull().default(0),
    positionY: real("position_y").notNull().default(0),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => ({
    userAnimeUnique: uniqueIndex("user_anime_unique").on(
      table.userId,
      table.anilistId
    ),
  })
);

export const animeCharacters = pgTable(
  "anime_characters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    anilistAnimeId: integer("anilist_anime_id").notNull(),
    anilistCharacterId: integer("anilist_character_id").notNull(),
    characterName: text("character_name").notNull(),
    characterImage: text("character_image"),
    seiyuuId: integer("seiyuu_id"),
    seiyuuName: text("seiyuu_name"),
    seiyuuImage: text("seiyuu_image"),
  },
  (table) => ({
    animeCharUnique: uniqueIndex("anime_char_unique").on(
      table.anilistAnimeId,
      table.anilistCharacterId
    ),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserAnime = typeof userAnime.$inferSelect;
export type NewUserAnime = typeof userAnime.$inferInsert;
export type AnimeCharacter = typeof animeCharacters.$inferSelect;
export type NewAnimeCharacter = typeof animeCharacters.$inferInsert;
