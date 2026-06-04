// Direct browser → AniList GraphQL calls (no server needed for search)
// AniList is a free public API: https://graphql.anilist.co

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

const SEARCH_QUERY = `
  query SearchAnime($search: String) {
    Page(page: 1, perPage: 15) {
      media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
        id
        title { romaji english native }
        coverImage { large medium }
        episodes
        status
        seasonYear
        genres
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
