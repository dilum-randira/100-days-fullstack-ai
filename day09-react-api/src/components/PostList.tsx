import type React from "react";
import type { Post } from "../api";
import { PostCard } from "./PostCard";

export interface PostListProps {
  posts: Post[];
}

export const PostList: React.FC<PostListProps> = ({ posts }) => {
  if (posts.length === 0) {
    return <p>No posts found.</p>;
  }

  return (
    <div className="post-list">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};
