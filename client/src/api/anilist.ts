// Direct browser → AniList GraphQL (no server, no key needed)

const ANILIST_URL = "https://graphql.anilist.co";

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const json = (await res.json()) as { data: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

// ── Search ──────────────────────────────────────────────────────────────────

const SEARCH_QUERY = `
  query SearchAnime($search: String) {
    Page(page: 1, perPage: 15) {
      media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
        id
        title { romaji english native }
        coverImage { large medium }
        episodes status seasonYear genres
      }
    }
  }
`;

export interface AnilistResult {
  id: number;
  title: { romaji: string; english?: string; native?: string };
  coverImage: { large: string; medium: string };
  episodes?: number;
  status: string;
  seasonYear?: number;
  genres: string[];
}

export async function searchAnilist(search: string): Promise<AnilistResult[]> {
  const data = await gql<{ Page: { media: AnilistResult[] } }>(SEARCH_QUERY, { search });
  return data.Page.media;
}

// ── User completed list ──────────────────────────────────────────────────────

const USER_LIST_QUERY = `
  query ($username: String) {
    MediaListCollection(userName: $username, type: ANIME, status: COMPLETED, forceSingleCompletedList: true) {
      lists {
        entries {
          media {
            id
            title { romaji english }
            coverImage { medium large }
          }
        }
      }
    }
  }
`;

export interface AnilistUserAnime {
  id: number;
  title: string;
  coverImage: string;
}

export async function getUserCompletedAnime(username: string): Promise<AnilistUserAnime[]> {
  const data = await gql<{
    MediaListCollection: {
      lists: Array<{
        entries: Array<{
          media: {
            id: number;
            title: { romaji: string; english?: string | null };
            coverImage: { medium: string; large: string };
          };
        }>;
      }>;
    };
  }>(USER_LIST_QUERY, { username });

  const seen = new Set<number>();
  return data.MediaListCollection.lists
    .flatMap((l) => l.entries)
    .filter((e) => {
      if (seen.has(e.media.id)) return false;
      seen.add(e.media.id);
      return true;
    })
    .map((e) => ({
      id: e.media.id,
      title: e.media.title.english || e.media.title.romaji,
      coverImage: e.media.coverImage.medium || e.media.coverImage.large,
    }));
}

// ── Anime detail with characters + VA ───────────────────────────────────────

const DETAIL_QUERY = `
  query GetAnimeDetail($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english native }
      coverImage { large }
      characters(page: 1, perPage: 50, sort: [ROLE, RELEVANCE]) {
        edges {
          node {
            id
            name { full }
            image { large medium }
          }
          voiceActors(language: JAPANESE) {
            id
            name { full }
            image { large }
          }
        }
      }
    }
  }
`;

export interface AnimeCharacterRaw {
  id: number;
  name: string;
  image: string;
  seiyuuId?: number;
  seiyuuName?: string;
  seiyuuImage?: string;
}

export interface AnimeDetailRaw {
  id: number;
  title: string;
  coverImage: string;
  characters: AnimeCharacterRaw[];
}

export async function getAnimeDetail(id: number): Promise<AnimeDetailRaw> {
  const data = await gql<{
    Media: {
      id: number;
      title: { romaji: string | null; english?: string | null; native?: string | null };
      coverImage: { large: string };
      characters: {
        edges: {
          node: { id: number; name: { full: string }; image: { large: string; medium: string } };
          voiceActors: { id: number; name: { full: string }; image: { large: string } }[];
        }[];
      };
    };
  }>(DETAIL_QUERY, { id });

  const m = data.Media;
  return {
    id: m.id,
    title: m.title.english || m.title.romaji || m.title.native || "Unknown Anime",
    coverImage: m.coverImage.large,
    characters: m.characters.edges
      .map((edge) => {
        const va = edge.voiceActors[0];
        return {
          id: edge.node.id,
          name: edge.node.name.full,
          image: edge.node.image.large || edge.node.image.medium,
          seiyuuId: va?.id,
          seiyuuName: va?.name.full,
          seiyuuImage: va?.image.large,
        };
      })
      .filter((c) => c.seiyuuId != null),
  };
}
