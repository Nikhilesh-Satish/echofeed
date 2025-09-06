import {
  getProfileByUsername,
  getUserLikedPosts,
  getUserPosts,
} from "@/actions/profile.action";
import { notFound } from "next/navigation";
import React from "react";
import ProfilePageClient from "./ProfilePageClient";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}) {
  const user = await getProfileByUsername(params.username);
  if (!user) return;
  return {
    title: `${user.name ?? user.username}`,
    description:
      user.bio || `Check out ${user.name ?? user.username} profile on Echofeed`,
  };
}

async function ProfilePageServer({ params }: { params: { username: string } }) {
  const user = await getProfileByUsername(params.username);
  if (!user) notFound();

  const [posts, likedPosts] = await Promise.all([
    getUserPosts(user.id),
    getUserLikedPosts(user.id),
  ]);
  // Set isCurrentUserFollowing to false or fetch its value appropriately
  const isCurrentUserFollowing = false;
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return (
    <ProfilePageClient
      user={user}
      posts={posts}
      likedPosts={likedPosts}
      isFollowing={isCurrentUserFollowing}
    />
  );
}

export default ProfilePageServer;
