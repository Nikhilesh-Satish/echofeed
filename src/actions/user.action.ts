"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { get } from "http";
import { revalidatePath } from "next/cache";

// User payload interface
interface UserPayload {
  userId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email: string;
  image?: string;
}

export async function syncUser(user: UserPayload) {
  const { userId: clerkId } = await auth();
  if (!user.userId) return null;

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: user.userId },
    });

    if (existingUser) return existingUser;

    // Create new user in DB
    const dbUser = await prisma.user.create({
      data: {
        clerkId: user.userId,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        username: user.username ?? user.email.split("@")[0],
        email: user.email,
        image: user.image,
      },
    });

    return dbUser;
  } catch (error) {
    console.error("Error syncing user:", error);
    throw error;
  }
}

export async function getUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({
    where: {
      clerkId,
    },
    include: {
      _count: {
        select: {
          followers: true,
          following: true,
          posts: true,
        },
      },
    },
  });
}

export async function getDbUserId() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error("User not found");
  return user.id;
}

export async function getRandomUsers() {
  try {
    const userId = await getDbUserId();
    if(!userId) return ;
    const randomUsers = await prisma.user.findMany({
      where: {
        AND: [
          { NOT: { id: userId } },
          { NOT: { followers: { some: { followerId: userId } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        _count: {
          select: {
            followers: true,
          },
        },
      },
      take: 3,
    });
    return randomUsers;
  } catch (error) {
    console.log("Error fetching random users:", error);
    return [];
  }
}

export async function toggleFollow(targetUserId: string) {
  try {
    const userId = await getDbUserId();
    if (userId === targetUserId) throw new Error("You cannot follow yourself");
    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });
    if (existingFollow) {
      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
      });
    } else {
      await prisma.$transaction([
        prisma.follows.create({
          data: {
            followerId: userId,
            followingId: targetUserId,
          },
        }),
        prisma.notification.create({
          data: {
            type: "FOLLOW",
            userId: targetUserId,
            creatorId: userId,
          },
        }),
      ]);
    }
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.log("Error in toggleFollow", error);
    return { success: false, error: "Failed to toggle follow" };
  }
}
