export interface Post {
  userId: number;
  id: number;
  title: string;
  body: string;
}

/**
 * Fetch posts from the JSONPlaceholder API.
 */
export async function fetchPosts(): Promise<Post[]> {
  const response = await fetch("https://jsonplaceholder.typicode.com/posts");

  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status}`);
  }

  const data = (await response.json()) as Post[];
  return data;
}
