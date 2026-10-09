import { z } from "zod";
import { roomTypes, styles } from "./config";
const text = (max = 500) => z.string().trim().min(1).max(max);
export const registerSchema = z.object({
  name: text(100),
  email: z.email().transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(12)
    .max(72)
    .refine(
      (s) => Buffer.byteLength(s, "utf8") <= 72,
      "Şifrə UTF-8 formatında ən çox 72 bayt ola bilər.",
    ),
  role: z
    .enum(["CUSTOMER", "REALTOR", "STORE_OWNER", "DESIGNER"])
    .default("CUSTOMER"),
});
export const loginSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(72),
});
export const productSchema = z
  .object({
    id: z.string().optional(),
    name: text(180),
    description: text(5000),
    categoryId: text(100),
    price: z.coerce.number().positive().max(1000000),
    discountPrice: z.coerce.number().positive().optional(),
    brand: z.string().max(100).optional(),
    width: z.coerce.number().positive().max(10000).optional(),
    height: z.coerce.number().positive().max(10000).optional(),
    depth: z.coerce.number().positive().max(10000).optional(),
    materials: z.array(text(80)).max(20).default([]),
    colors: z.array(text(80)).max(20).default([]),
    tags: z.array(text(80)).max(20).default([]),
    roomTypes: z.array(z.enum(roomTypes)).min(1),
    styles: z.array(z.enum(styles)).min(1),
    stock: z.coerce.number().int().min(0).max(100000),
    sku: text(100),
    imageIds: z.array(text(100)).max(10).default([]),
  })
  .refine((v) => !v.discountPrice || v.discountPrice < v.price, {
    message: "Endirim qiyməti əsas qiymətdən aşağı olmalıdır.",
    path: ["discountPrice"],
  });
export const projectSchema = z.object({
  galleryIds: z.array(text(100)).max(5).default([]),
  spaceType: z.enum(["HOME", "OFFICE", "STUDIO"]).default("HOME"),
  title: text(180),
  imageId: text(100),
  roomType: z.enum(roomTypes),
  style: z.enum(styles),
  width: z.coerce.number().positive().max(100),
  length: z.coerce.number().positive().max(100),
  colors: z.array(text(80)).max(10),
  requirements: z.string().max(2000),
  budget: z.coerce.number().positive().max(1000000),
  propertyId: z.string().optional(),
});
export const propertySchema = z.object({
  id: z.string().optional(),
  title: text(180),
  location: text(300),
  type: text(100),
  roomCount: z.coerce.number().int().min(1).max(100),
  area: z.coerce.number().positive().max(100000),
  description: text(3000),
  imageIds: z.array(text(100)).max(20).default([]),
});
export const storeSchema = z.object({
  name: text(180),
  description: text(3000),
  phone: text(80),
  email: z.email(),
  address: text(500),
  logoAssetId: z.string().optional(),
});
export const designerSchema = z.object({
  displayName: text(180),
  bio: text(3000),
  city: text(100),
  available: z.boolean(),
});
export const serviceSchema = z.object({
  id: z.string().optional(),
  title: text(180),
  description: text(3000),
  price: z.coerce.number().nonnegative().max(1000000),
  active: z.boolean().default(true),
});
export const planSchema = z.object({
  id: z.string().optional(),
  name: text(100),
  role: z.enum(["CUSTOMER", "REALTOR", "STORE_OWNER", "DESIGNER"]),
  price: z.coerce.number().nonnegative().max(1000000),
  credits: z.coerce.number().int().min(0).max(100000),
  durationDays: z.coerce.number().int().min(1).max(3650),
  active: z.boolean(),
  sample: z.boolean(),
});
export const requestStatus = z.enum([
  "NEW",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);
export const idempotency = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
