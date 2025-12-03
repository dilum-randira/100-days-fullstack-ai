import React from "react";
import { fetchPosts, type Post } from "./api";
import { Loader } from "./components/Loader";
import { ErrorMessage } from "./components/ErrorMessage";
import { PostList } from "./components/PostList";
import "./styles.css";

export const App: React.FC = () => {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchPosts();
        setPosts(data.slice(0, 10)); // keep it small for the demo
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Day 9 – React API Demo</h1>
        <p>Fetching posts from JSONPlaceholder and showing loading/error states.</p>
      </header>

      <main>
        {isLoading && <Loader />}
        {error && !isLoading && <ErrorMessage message={error} />}
        {!isLoading && !error && <PostList posts={posts} />}
      </main>
    </div>
  );
};

export default App;
