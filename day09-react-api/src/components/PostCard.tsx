import type React from "react";
import type { Post } from "../api";

export interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  return (
    <article className="post-card">
      <h2>{post.title}</h2>
      <p>{post.body}</p>
      <small>User ID: {post.userId}</small>
    </article>
  );
};
