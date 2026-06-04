const ANILIST_URL = "https://graphql.anilist.co";

async function query<T>(gql: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: gql, variables }),
  });
  if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
  const json = (await res.json()) as { data: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

const SEARCH_QUERY = `
  query SearchAnime($search: String) {
    Page(page: 1, perPage: 12) {
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

const CHARACTERS_QUERY = `
  query GetAnimeCharacters($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english }
      coverImage { large }
      characters(page: 1, perPage: 25, sort: [ROLE, RELEVANCE]) {
        edges {
          role
          node {
            id
            name { full }
            image { large medium }
          }
          voiceActors(language: JAPANESE) {
            id
            name { full native }
            image { large medium }
          }
        }
      }
    }
  }
`;

export interface AnilistAnime {
  id: number;
  title: { romaji: string; english?: string; native?: string };
  coverImage: { large: string; medium: string };
  episodes?: number;
  status: string;
  seasonYear?: number;
  genres: string[];
}

export interface AnilistCharacter {
  id: number;
  name: string;
  image?: string;
  seiyuuId?: number;
  seiyuuName?: string;
  seiyuuImage?: string;
}

export interface AnilistAnimeDetail {
  id: number;
  title: string;
  coverImage: string;
  characters: AnilistCharacter[];
}

export async function searchAnime(search: string): Promise<AnilistAnime[]> {
  const data = await query<{ Page: { media: AnilistAnime[] } }>(SEARCH_QUERY, { search });
  return data.Page.media;
}

export async function getAnimeWithCharacters(id: number): Promise<AnilistAnimeDetail> {
  const data = await query<{
    Media: {
      id: number;
      title: { romaji: string | null; english?: string | null; native?: string | null };
      coverImage: { large: string };
      characters: {
        edges: {
          role: string;
          node: { id: number; name: { full: string }; image: { large: string; medium: string } };
          voiceActors: { id: number; name: { full: string; native: string }; image: { large: string } }[];
        }[];
      };
    };
  }>(CHARACTERS_QUERY, { id });

  const media = data.Media;
  const characters: AnilistCharacter[] = media.characters.edges
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
    .filter((c) => c.seiyuuId != null);

  return {
    id: media.id,
    title: media.title.english || media.title.romaji || media.title.native || "Unknown Anime",
    coverImage: media.coverImage.large,
    characters,
  };
}
