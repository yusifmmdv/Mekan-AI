import type { Role } from "@/generated/prisma/client";
export const canManageStore = (role: Role, actorId: string, ownerId: string) =>
  role === "STORE_OWNER" && actorId === ownerId;
export const canReadProject = (actorId: string, ownerId: string) =>
  actorId === ownerId;
export const canAdmin = (role: Role) => role === "ADMIN";
