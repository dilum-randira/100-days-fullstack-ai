import { HttpClient } from "./httpClient";

// Type that represents a post from JSONPlaceholder
interface Post {
  userId: number;
  id: number;
  title: string;
  body: string;
}

async function main() {
  const client = new HttpClient({
    baseUrl: "https://jsonplaceholder.typicode.com",
    defaultHeaders: {
      "Content-Type": "application/json",
    },
  });

  console.log("=== GET /posts/1 ===");
  const post = await client.get<Post>("/posts/1");
  console.log(post);

  console.log("\n=== POST /posts (demo) ===");
  const newPost = await client.post<Post>("/posts", {
    title: "Hello from TypeScript HttpClient",
    body: "This is a demo payload.",
    userId: 1,
  });
  console.log(newPost);
}

main().catch((error) => {
  console.error("Error in example:", error);
});
