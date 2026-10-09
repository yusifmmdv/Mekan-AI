import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { db } from "@/lib/db";
import {
  requireUser,
  createSession,
  checkPassword,
  hashPassword,
  logout,
  currentUser,
} from "@/lib/auth";
import {
  requireOrigin,
  rateLimit,
  hashToken,
  boundedBody,
} from "@/lib/security";
import { AppError, assert } from "@/lib/errors";
import * as v from "@/lib/validation";
import { sendAuthMail, mailConfigured } from "@/lib/mail";
import { storeImage, deleteObject, MAX_IMAGE_BYTES } from "@/lib/storage";
import { enqueueGeneration } from "@/lib/generations";
import { importDemoProject } from "@/lib/demo-project";
import { requestOrder, updateOrder } from "@/lib/marketplace";
import { adjustCredits } from "@/lib/credits";
import { Prisma } from "@/generated/prisma/client";
export const runtime = "nodejs";
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60) +
  "-" +
  crypto.randomUUID().slice(0, 8);
const id = z.string().min(1).max(100);
const msg = z.string().trim().min(5).max(3000);
async function perform(request: Request, path: string) {
  requireOrigin(request);
  if (
    Number(request.headers.get("content-length") || 0) >
    MAX_IMAGE_BYTES + 65536
  )
    throw new AppError(413, "BODY_SIZE", "Fayl çox böyükdür.");
  const user = await currentUser();
  await rateLimit(`api:${user?.id || "anonymous"}:${path}`, user ? 60 : 120);
  if (path === "uploads") {
    const u = await requireUser();
    const bytes = await boundedBody(request, MAX_IMAGE_BYTES + 65536);
    const bounded = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: new Uint8Array(bytes),
    });
    const form = await bounded.formData();
    const file = form.get("file");
    const purpose = z
      .enum(["ROOM", "PRODUCT", "LOGO", "PORTFOLIO", "PROPERTY"])
      .parse(form.get("purpose") || "ROOM");
    assert(file instanceof File, 400, "FILE", "Şəkil seçin.");
    assert(
      file.size <= MAX_IMAGE_BYTES,
      400,
      "FILE_SIZE",
      "Şəkil ən çox 10 MB ola bilər.",
    );
    if (purpose === "PRODUCT" || purpose === "LOGO")
      assert(
        u.role === "STORE_OWNER",
        403,
        "ROLE",
        "Mağaza hesabı tələb olunur.",
      );
    if (purpose === "PORTFOLIO")
      assert(
        u.role === "DESIGNER",
        403,
        "ROLE",
        "Dizayner hesabı tələb olunur.",
      );
    return storeImage(
      u.id,
      Buffer.from(await file.arrayBuffer()),
      file.type,
      purpose,
    );
  }
  const bodyBytes = await boundedBody(request, 65536);
  let b: unknown;
  try {
    b = JSON.parse(bodyBytes.toString());
  } catch {
    throw new AppError(400, "JSON", "Sorğu JSON formatında olmalıdır.");
  }
  switch (path) {
    case "auth/register": {
      const data = v.registerSchema.parse(b);
      if (process.env.REQUIRE_EMAIL_VERIFICATION === "true")
        assert(
          mailConfigured(),
          503,
          "MAIL_NOT_CONFIGURED",
          "E-poçt xidməti konfiqurasiya edilməyib.",
        );
      const exists = await db.user.findUnique({ where: { email: data.email } });
      assert(!exists, 409, "EMAIL", "Bu e-poçtla qeydiyyat mümkün deyil.");
      const u = await db.user.create({
        data: {
          email: data.email,
          name: data.name,
          role: data.role,
          passwordHash: await hashPassword(data.password),
          profile: { create: {} },
          wallet: { create: { balance: 0 } },
          cart: { create: {} },
        },
      });
      if (process.env.REQUIRE_EMAIL_VERIFICATION === "true")
        await sendAuthMail(u.id, u.email, "VERIFY");
      else await createSession(u.id);
      return {
        verificationRequired: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
      };
    }
    case "auth/login": {
      const data = v.loginSchema.parse(b);
      await rateLimit(`login:${hashToken(data.email)}`, 10, 60);
      const u = await db.user.findUnique({ where: { email: data.email } });
      const valid = await checkPassword(
        data.password,
        u?.passwordHash ||
          "$2b$12$C6UzMDM.H6dfI/f/IKcEe.0hL.yHvIN/uG0SOsQOvy3bFnyuXjYRe",
      );
      assert(
        u && valid && !u.disabled,
        401,
        "LOGIN",
        "E-poçt və ya şifrə yanlışdır.",
      );
      assert(
        process.env.REQUIRE_EMAIL_VERIFICATION !== "true" || u.emailVerified,
        403,
        "VERIFY",
        "Əvvəlcə e-poçtunuzu təsdiqləyin.",
      );
      await createSession(u.id);
      return { ok: true };
    }
    case "auth/logout":
      await logout();
      return { ok: true };
    case "auth/forgot": {
      assert(
        mailConfigured(),
        503,
        "MAIL_NOT_CONFIGURED",
        "E-poçt xidməti konfiqurasiya edilməyib.",
      );
      const { email } = z.object({ email: z.email() }).parse(b);
      const u = await db.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (u) await sendAuthMail(u.id, u.email, "RESET");
      return { message: "Hesab mövcuddursa, yeniləmə linki göndəriləcək." };
    }
    case "auth/reset": {
      const data = z
        .object({ token: id, password: z.string().min(12).max(72) })
        .parse(b);
      const hash = await hashPassword(data.password);
      await db.$transaction(async (tx) => {
        const token = await tx.authToken.findUnique({
          where: { tokenHash: hashToken(data.token) },
        });
        assert(
          token && token.kind === "RESET" && token.expiresAt > new Date(),
          400,
          "TOKEN",
          "Link etibarsızdır və ya vaxtı bitib.",
        );
        await tx.authToken.delete({ where: { id: token.id } });
        await tx.user.update({
          where: { id: token.userId },
          data: { passwordHash: hash },
        });
        await tx.session.deleteMany({ where: { userId: token.userId } });
      });
      return { ok: true };
    }
    case "auth/verify": {
      const { token } = z.object({ token: id }).parse(b);
      await db.$transaction(async (tx) => {
        const t = await tx.authToken.findUnique({
          where: { tokenHash: hashToken(token) },
        });
        assert(
          t && t.kind === "VERIFY" && t.expiresAt > new Date(),
          400,
          "TOKEN",
          "Link etibarsızdır.",
        );
        await tx.authToken.delete({ where: { id: t.id } });
        await tx.user.update({
          where: { id: t.userId },
          data: { emailVerified: new Date() },
        });
      });
      return { ok: true };
    }
    case "profile": {
      const u = await requireUser();
      const data = z
        .object({
          name: z.string().min(1).max(100),
          phone: z.string().max(80),
          city: z.string().max(100),
          bio: z.string().max(2000),
        })
        .parse(b);
      const { name, ...profile } = data;
      await db.user.update({
        where: { id: u.id },
        data: {
          name,
          profile: { upsert: { create: profile, update: profile } },
        },
      });
      return { ok: true };
    }
    case "sessions/revoke": {
      const u = await requireUser();
      const { sessionId } = z.object({ sessionId: id }).parse(b);
      await db.session.deleteMany({ where: { id: sessionId, userId: u.id } });
      return { ok: true };
    }
    case "favorites": {
      const u = await requireUser();
      const { productId } = z.object({ productId: id }).parse(b);
      const p = await db.product.findFirst({
        where: {
          id: productId,
          status: "ACTIVE",
          store: { approval: "APPROVED" },
        },
      });
      assert(p, 404, "PRODUCT", "Məhsul tapılmadı.");
      const favorite = await db.favorite.findUnique({
        where: { userId_productId: { userId: u.id, productId } },
      });
      if (favorite)
        await db.favorite.delete({
          where: { userId_productId: { userId: u.id, productId } },
        });
      else await db.favorite.create({ data: { userId: u.id, productId } });
      return { saved: !favorite };
    }
    case "cart": {
      const u = await requireUser();
      const { productId, quantity, add } = z
        .object({
          productId: id,
          quantity: z.number().int().min(0).max(100),
          add: z.boolean().default(false),
        })
        .parse(b);
      return db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${u.id} FOR UPDATE`;
        const p = await tx.product.findFirst({
          where: {
            id: productId,
            status: "ACTIVE",
            store: { approval: "APPROVED" },
          },
        });
        assert(p, 404, "PRODUCT", "Məhsul tapılmadı.");
        const cart = await tx.cart.upsert({
          where: { userId: u.id },
          create: { userId: u.id },
          update: {},
        });
        const existing = await tx.cartItem.findUnique({
          where: { cartId_productId: { cartId: cart.id, productId } },
        });
        const next = add ? (existing?.quantity || 0) + quantity : quantity;
        assert(
          next <= p.stock && next <= 100,
          409,
          "STOCK",
          "Stok və ya səbət limiti kifayət deyil.",
        );
        if (!next)
          await tx.cartItem.deleteMany({
            where: { cartId: cart.id, productId },
          });
        else
          await tx.cartItem.upsert({
            where: { cartId_productId: { cartId: cart.id, productId } },
            create: { cartId: cart.id, productId, quantity: next },
            update: { quantity: next },
          });
        return { ok: true };
      });
    }

    case "orders": {
      const u = await requireUser();
      const { key, contact, note } = z
        .object({
          key: v.idempotency,
          contact: z.string().min(5).max(300),
          note: z.string().max(2000).optional(),
        })
        .parse(b);
      return requestOrder(u.id, key, contact, note);
    }
    case "inquiries": {
      const u = await requireUser();
      const data = z
        .object({
          storeId: id,
          productId: id.optional(),
          projectId: id.optional(),
          message: msg,
        })
        .parse(b);
      if (data.projectId)
        assert(
          await db.designProject.findFirst({
            where: { id: data.projectId, userId: u.id },
          }),
          404,
          "PROJECT",
          "Layihə tapılmadı.",
        );
      const s = await db.store.findFirst({
        where: { id: data.storeId, approval: "APPROVED" },
      });
      assert(s, 404, "STORE", "Mağaza tapılmadı.");
      if (data.productId)
        assert(
          await db.product.findFirst({
            where: { id: data.productId, storeId: s.id, status: "ACTIVE" },
          }),
          404,
          "PRODUCT",
          "Məhsul tapılmadı.",
        );
      return db.$transaction(async (tx) => {
        const inquiry = await tx.inquiry.create({
          data: { ...data, userId: u.id },
        });
        if (data.productId)
          await tx.analyticsEvent.create({
            data: { productId: data.productId, kind: "INQUIRY" },
          });
        await tx.notification.create({
          data: { userId: s.ownerId, title: "Yeni sorğu", body: data.message },
        });
        return inquiry;
      });
    }
    case "projects": {
      const u = await requireUser();
      const data = v.projectSchema.parse(b);
      const asset = await db.imageAsset.findFirst({
        where: {
          id: data.imageId,
          ownerId: u.id,
          purpose: { in: ["ROOM", "PROPERTY"] },
        },
      });
      assert(asset, 404, "IMAGE", "Şəklə giriş yoxdur.");
      const photos = [...new Set(data.galleryIds)];
      assert(
        (await db.imageAsset.count({
          where: {
            id: { in: photos },
            ownerId: u.id,
            purpose: { in: ["ROOM", "PROPERTY"] },
          },
        })) === photos.length,
        403,
        "IMAGE",
        "Əlavə şəkillərə giriş yoxdur.",
      );
      const { propertyId, ...project } = data;
      if (propertyId) {
        assert(
          u.role === "REALTOR",
          403,
          "ROLE",
          "Əmlak agenti hesabı tələb olunur.",
        );
        assert(
          await db.property.findFirst({
            where: { id: propertyId, userId: u.id },
          }),
          404,
          "PROPERTY",
          "Əmlak tapılmadı.",
        );
      }
      return db.designProject.create({
        data: {
          ...project,
          userId: u.id,
          ...(propertyId
            ? { staging: { create: { userId: u.id, propertyId } } }
            : {}),
        },
      });
    }
    case "generations": {
      const u = await requireUser();
      const { projectId, key } = z
        .object({ projectId: id, key: v.idempotency })
        .parse(b);
      return enqueueGeneration(u.id, projectId, key);
    }
    case "demo-project": {
      const u = await requireUser();
      const { sampleId, key } = z.object({ sampleId: z.enum(["home", "office", "studio"]), key: v.idempotency }).parse(b);
      await rateLimit(`demo-project:${u.id}`, 10);
      return importDemoProject(u.id, sampleId, key);
    }
    case "furniture-analysis": {
      const u = await requireUser();
      const { generationId } = z.object({ generationId: id }).parse(b);
      const generation = await db.designGeneration.findFirst({ where: { id: generationId, project: { userId: u.id }, status: "SUCCEEDED", outputImageId: { not: null } } });
      assert(generation, 404, "GENERATION", "Dizayn tapılmadı.");
      const updated = await db.designGeneration.updateMany({ where: { id: generationId, analysisStatus: { in: ["NONE", "FAILED"] } }, data: { analysisStatus: "QUEUED", analysisError: null } });
      return { queued: !!updated.count, status: updated.count ? "QUEUED" : generation.analysisStatus };
    }
    case "properties": {
      const u = await requireUser(["REALTOR"]);
      const data = v.propertySchema.parse(b);
      const { id: propertyId, imageIds, ...rest } = data;
      assert(
        (await db.imageAsset.count({
          where: { id: { in: imageIds }, ownerId: u.id, purpose: "PROPERTY" },
        })) === imageIds.length,
        403,
        "IMAGES",
        "Şəkillərə giriş yoxdur.",
      );
      if (propertyId)
        assert(
          await db.property.findFirst({
            where: { id: propertyId, userId: u.id },
          }),
          404,
          "PROPERTY",
          "Əmlak tapılmadı.",
        );
      return db.$transaction(async (tx) => {
        const p = propertyId
          ? await tx.property.update({ where: { id: propertyId }, data: rest })
          : await tx.property.create({ data: { ...rest, userId: u.id } });
        await tx.propertyImage.deleteMany({ where: { propertyId: p.id } });
        if (imageIds.length)
          await tx.propertyImage.createMany({
            data: imageIds.map((assetId) => ({ propertyId: p.id, assetId })),
          });
        return p;
      });
    }
    case "store/profile": {
      const u = await requireUser(["STORE_OWNER"]);
      const data = v.storeSchema.parse(b);
      if (data.logoAssetId)
        assert(
          await db.imageAsset.findFirst({
            where: { id: data.logoAssetId, ownerId: u.id, purpose: "LOGO" },
          }),
          403,
          "LOGO",
          "Şəklə giriş yoxdur.",
        );
      return db.store.upsert({
        where: { ownerId: u.id },
        create: { ...data, ownerId: u.id, slug: slug(data.name) },
        update: { ...data, approval: "PENDING" },
      });
    }
    case "store/products": {
      const u = await requireUser(["STORE_OWNER"]);
      assert(u.store, 400, "STORE", "Əvvəlcə mağaza yaradın.");
      const data = v.productSchema.parse(b);
      const { id: productId, imageIds, ...rest } = data;
      assert(
        await db.productCategory.findUnique({ where: { id: rest.categoryId } }),
        400,
        "CATEGORY",
        "Kateqoriya tapılmadı.",
      );
      assert(
        (await db.imageAsset.count({
          where: { id: { in: imageIds }, ownerId: u.id, purpose: "PRODUCT" },
        })) === imageIds.length,
        403,
        "IMAGES",
        "Şəkillərə giriş yoxdur.",
      );
      if (productId)
        assert(
          await db.product.findFirst({
            where: { id: productId, storeId: u.store.id },
          }),
          404,
          "PRODUCT",
          "Məhsul tapılmadı.",
        );
      return db.$transaction(async (tx) => {
        const p = productId
          ? await tx.product.update({
              where: { id: productId },
              data: { ...rest, status: "PENDING" },
            })
          : await tx.product.create({
              data: {
                ...rest,
                storeId: u.store!.id,
                slug: slug(data.name),
                status: "PENDING",
              },
            });
        await tx.productImage.deleteMany({ where: { productId: p.id } });
        await tx.productImage.createMany({
          data: imageIds.map((assetId, position) => ({
            productId: p.id,
            assetId,
            alt: p.name,
            position,
          })),
        });
        return p;
      });
    }
    case "store/archive": {
      const u = await requireUser(["STORE_OWNER"]);
      const { productId } = z.object({ productId: id }).parse(b);
      const r = await db.product.updateMany({
        where: { id: productId, store: { ownerId: u.id } },
        data: { status: "ARCHIVED" },
      });
      assert(r.count, 404, "PRODUCT", "Məhsul tapılmadı.");
      return { ok: true };
    }
    case "store/orders": {
      const u = await requireUser(["STORE_OWNER"]);
      const { orderId, status } = z
        .object({ orderId: id, status: v.requestStatus })
        .parse(b);
      return updateOrder(u.id, orderId, status);
    }
    case "store/inquiries": {
      const u = await requireUser(["STORE_OWNER"]);
      const { inquiryId, reply } = z
        .object({ inquiryId: id, reply: msg })
        .parse(b);
      const r = await db.inquiry.updateMany({
        where: { id: inquiryId, store: { ownerId: u.id } },
        data: { reply, status: "COMPLETED" },
      });
      assert(r.count, 404, "INQUIRY", "Sorğu tapılmadı.");
      return { ok: true };
    }
    case "designer/profile": {
      const u = await requireUser(["DESIGNER"]);
      const data = v.designerSchema.parse(b);
      return db.designerProfile.upsert({
        where: { userId: u.id },
        create: { ...data, userId: u.id, slug: slug(data.displayName) },
        update: { ...data, approval: "PENDING" },
      });
    }
    case "designer/services": {
      const u = await requireUser(["DESIGNER"]);
      assert(u.designer, 400, "DESIGNER", "Əvvəlcə profil yaradın.");
      const { id: serviceId, ...data } = v.serviceSchema.parse(b);
      if (serviceId) {
        assert(
          await db.designerService.findFirst({
            where: { id: serviceId, designerId: u.designer.id },
          }),
          404,
          "SERVICE",
          "Xidmət tapılmadı.",
        );
        return db.designerService.update({ where: { id: serviceId }, data });
      }
      return db.designerService.create({
        data: { ...data, designerId: u.designer.id },
      });
    }
    case "designer/portfolio": {
      const u = await requireUser(["DESIGNER"]);
      assert(u.designer, 400, "DESIGNER", "Profil yaradın.");
      const { assetId, title } = z
        .object({ assetId: id, title: z.string().min(1).max(180) })
        .parse(b);
      assert(
        await db.imageAsset.findFirst({
          where: { id: assetId, ownerId: u.id, purpose: "PORTFOLIO" },
        }),
        403,
        "IMAGE",
        "Şəklə giriş yoxdur.",
      );
      return db.portfolioItem.create({
        data: { designerId: u.designer.id, assetId, title },
      });
    }
    case "designer/portfolio-delete": {
      const u = await requireUser(["DESIGNER"]);
      const { itemId } = z.object({ itemId: id }).parse(b);
      await db.portfolioItem.deleteMany({
        where: { id: itemId, designer: { userId: u.id } },
      });
      return { ok: true };
    }
    case "designer/requests": {
      const u = await requireUser(["DESIGNER"]);
      const { requestId, status, reply } = z
        .object({
          requestId: id,
          status: v.requestStatus,
          reply: z.string().max(3000),
        })
        .parse(b);
      return db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "DesignerRequest" WHERE "id"=${requestId} FOR UPDATE`;
        const r = await tx.designerRequest.findFirst({
          where: { id: requestId, designer: { userId: u.id } },
        });
        assert(r, 404, "REQUEST", "Sorğu tapılmadı.");
        assert(
          !["COMPLETED", "CANCELLED"].includes(r.status),
          409,
          "FINAL_STATUS",
          "Sorğu yekunlaşdırılıb.",
        );
        if (status === "COMPLETED") {
          const setting = await tx.systemSetting.findUnique({
            where: { key: "commissionRate" },
          });
          const rate = Number(setting?.value || 0);
          await tx.commission.create({
            data: {
              requestId,
              rate,
              amount: Math.round(Number(r.quotedPrice) * rate) / 100,
            },
          });
        }
        return tx.designerRequest.update({
          where: { id: requestId },
          data: { status, reply },
        });
      });
    }
    case "designer-request": {
      const u = await requireUser();
      const { serviceId, brief, contact, projectId } = z
        .object({
          serviceId: id,
          projectId: id.optional(),
          brief: msg,
          contact: z.string().min(5).max(300),
        })
        .parse(b);
      if (projectId)
        assert(
          await db.designProject.findFirst({
            where: { id: projectId, userId: u.id },
          }),
          404,
          "PROJECT",
          "Layihə tapılmadı.",
        );
      const s = await db.designerService.findFirst({
        where: {
          id: serviceId,
          active: true,
          designer: { approval: "APPROVED", available: true },
        },
      });
      assert(s, 404, "SERVICE", "Xidmət hazırda əlçatan deyil.");
      return db.designerRequest.create({
        data: {
          userId: u.id,
          designerId: s.designerId,
          serviceId,
          projectId,
          brief,
          contact,
          quotedPrice: s.price,
        },
      });
    }
    case "reviews": {
      const u = await requireUser();
      const { requestId, rating, text } = z
        .object({
          requestId: id,
          rating: z.number().int().min(1).max(5),
          text: msg,
        })
        .parse(b);
      assert(
        await db.designerRequest.findFirst({
          where: { id: requestId, userId: u.id, status: "COMPLETED" },
        }),
        403,
        "REVIEW",
        "Rəy yalnız tamamlanmış xidmət üçün yazıla bilər.",
      );
      return db.review.create({ data: { requestId, rating, text } });
    }
    case "billing/request": {
      const u = await requireUser();
      const { planId, key } = z
        .object({ planId: id, key: v.idempotency })
        .parse(b);
      const p = await db.subscriptionPlan.findFirst({
        where: { id: planId, active: true, role: u.role },
      });
      assert(p, 400, "PLAN", "Bu plan hesab rolunuza uyğun deyil.");
      return db.payment.upsert({
        where: { idempotencyKey: `${u.id}_${key}` },
        create: {
          userId: u.id,
          planId,
          amount: p.price,
          credits: p.credits,
          durationDays: p.durationDays,
          idempotencyKey: `${u.id}_${key}`,
        },
        update: {},
      });
    }
    case "notifications/read": {
      const u = await requireUser();
      await db.notification.updateMany({
        where: { userId: u.id, readAt: null },
        data: { readAt: new Date() },
      });
      return { ok: true };
    }
    case "reports": {
      const u = await requireUser();
      const data = z
        .object({
          targetType: z.enum(["PRODUCT", "STORE", "DESIGNER"]),
          targetId: id,
          reason: msg,
        })
        .parse(b);
      return db.report.create({ data: { ...data, userId: u.id } });
    }
    case "assets/delete": {
      const u = await requireUser();
      const { assetId } = z.object({ assetId: id }).parse(b);
      const a = await db.imageAsset.findFirst({
        where: { id: assetId, ownerId: u.id },
        include: {
          projects: true,
          results: true,
          products: true,
          propertyImages: true,
          stores: true,
          portfolio: true,
          roomDesigns: true,
        },
      });
      assert(a, 404, "IMAGE", "Şəkil tapılmadı.");
      assert(
        !a.projects.length &&
          !a.results.length &&
          !a.products.length &&
          !a.propertyImages.length &&
          !a.stores.length &&
          !a.portfolio.length &&
          !a.roomDesigns.length &&
          !(await db.designProject.count({
            where: { galleryIds: { has: assetId } },
          })),
        409,
        "IN_USE",
        "İstifadə olunan şəkil silinə bilməz.",
      );
      await db.imageAsset.delete({ where: { id: a.id } });
      await deleteObject(a.key);
      return { ok: true };
    }
    case "admin":
      return adminAction(b);
    case "contact": {
      const data = z
        .object({
          name: z.string().min(1).max(100),
          email: z.email(),
          message: msg,
        })
        .parse(b);
      await db.analyticsEvent.create({
        data: { kind: "CONTACT_MESSAGE", metadata: data },
      });
      return { ok: true };
    }
    default:
      throw new AppError(404, "NOT_FOUND", "Əməliyyat tapılmadı.");
  }
}
async function adminAction(body: unknown) {
  const u = await requireUser(["ADMIN"]);
  const { action, targetId, data } = z
    .object({
      action: z.enum([
        "user",
        "store",
        "designer",
        "product",
        "credits",
        "payment",
        "plan",
        "setting",
        "report",
      ]),
      targetId: id,
      data: z.record(z.string(), z.unknown()),
    })
    .parse(body);
  return db.$transaction(async (tx) => {
    let result: unknown;
    switch (action) {
      case "user": {
        const d = z
          .object({
            role: z.enum([
              "CUSTOMER",
              "REALTOR",
              "STORE_OWNER",
              "DESIGNER",
              "ADMIN",
            ]),
            disabled: z.boolean(),
          })
          .parse(data);
        assert(
          targetId !== u.id,
          400,
          "SELF",
          "Öz admin hesabınızı bu formada dəyişdirə bilməzsiniz.",
        );
        const target = await tx.user.findUniqueOrThrow({
          where: { id: targetId },
          include: { store: true, designer: true },
        });
        assert(
          (!target.store || d.role === "STORE_OWNER") &&
            (!target.designer || d.role === "DESIGNER"),
          409,
          "BUSINESS_ROLE",
          "Biznes profili olan hesabın rolunu dəyişməzdən əvvəl profil üzrə inzibati qərar tələb olunur.",
        );
        result = await tx.user.update({
          where: { id: targetId },
          data: d,
          select: { id: true, role: true, disabled: true },
        });
        await tx.session.deleteMany({ where: { userId: targetId } });
        break;
      }
      case "store":
        result = await tx.store.update({
          where: { id: targetId },
          data: {
            approval: z
              .enum(["PENDING", "APPROVED", "REJECTED"])
              .parse(data.approval),
          },
        });
        break;
      case "designer":
        result = await tx.designerProfile.update({
          where: { id: targetId },
          data: {
            approval: z
              .enum(["PENDING", "APPROVED", "REJECTED"])
              .parse(data.approval),
          },
        });
        break;
      case "product":
        result = await tx.product.update({
          where: { id: targetId },
          data: {
            status: z
              .enum(["ACTIVE", "REJECTED", "ARCHIVED", "PENDING"])
              .parse(data.status),
          },
        });
        break;
      case "credits": {
        const d = z
          .object({
            amount: z.number().int().min(-100000).max(100000),
            key: v.idempotency,
            reason: msg,
          })
          .parse(data);
        await tx.$queryRaw`SELECT "id" FROM "CreditWallet" WHERE "userId"=${targetId} FOR UPDATE`;
        result = await adjustCredits(
          tx,
          targetId,
          d.amount,
          `admin_${d.key}`,
          d.reason,
        );
        break;
      }
      case "payment": {
        await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id"=${targetId} FOR UPDATE`;
        const p = await tx.payment.findUniqueOrThrow({
          where: { id: targetId },
        });
        if (p.status !== "PENDING") return p;
        const d = z
          .object({
            status: z.enum(["CONFIRMED", "REJECTED"]),
            reference: z.string().min(5).max(200),
          })
          .parse(data);
        result = await tx.payment.update({
          where: { id: p.id },
          data: {
            status: d.status,
            providerReference: d.reference,
            confirmedAt: d.status === "CONFIRMED" ? new Date() : null,
          },
        });
        if (d.status === "CONFIRMED") {
          await adjustCredits(
            tx,
            p.userId,
            p.credits,
            `payment_${p.id}`,
            "MANUAL_PAYMENT_CONFIRMED",
          );
          await tx.subscription.create({
            data: {
              userId: p.userId,
              planId: p.planId,
              expiresAt: new Date(Date.now() + p.durationDays * 86400000),
            },
          });
        }
        break;
      }
      case "plan": {
        const { id: planId, ...d } = v.planSchema.parse({
          ...data,
          id: targetId === "new" ? undefined : targetId,
        });
        result = planId
          ? await tx.subscriptionPlan.update({ where: { id: planId }, data: d })
          : await tx.subscriptionPlan.create({ data: d });
        break;
      }
      case "setting": {
        assert(
          targetId === "commissionRate",
          400,
          "SETTING",
          "Dəstəklənməyən parametr.",
        );
        const rate = z.number().min(0).max(100).parse(data.value);
        result = await tx.systemSetting.upsert({
          where: { key: targetId },
          create: { key: targetId, value: rate },
          update: { value: rate },
        });
        break;
      }
      case "report":
        result = await tx.report.update({
          where: { id: targetId },
          data: { resolved: z.boolean().parse(data.resolved) },
        });
        break;
    }
    await tx.auditLog.create({
      data: {
        actorId: u.id,
        action,
        targetId,
        metadata: JSON.parse(JSON.stringify(data)),
      },
    });
    return result;
  });
}
export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const { path } = await context.params;
    const result = await perform(request, path.join("/"));
    return NextResponse.json({ data: result, requestId });
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION",
            message: e.issues[0]?.message,
            fields: e.flatten(),
          },
          requestId,
        },
        { status: 400 },
      );
    if (e instanceof AppError)
      return NextResponse.json(
        { error: { code: e.code, message: e.message }, requestId },
        { status: e.status },
      );
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return NextResponse.json(
        {
          error: { code: "CONFLICT", message: "Bu məlumat artıq mövcuddur." },
          requestId,
        },
        { status: 409 },
      );
    console.error(
      JSON.stringify({
        event: "api_error",
        requestId,
        error: e instanceof Error ? e.message : "UNKNOWN",
      }),
    );
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Əməliyyat tamamlanmadı. Yenidən yoxlayın.",
        },
        requestId,
      },
      { status: 500 },
    );
  }
}
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    if (path.join("/") === "generations") {
      const u = await requireUser();
      const projectId = new URL(request.url).searchParams.get("projectId");
      assert(projectId, 400, "PROJECT", "Layihə seçin.");
      assert(
        await db.designProject.findFirst({
          where: { id: projectId, userId: u.id },
        }),
        404,
        "PROJECT",
        "Layihə tapılmadı.",
      );
      return NextResponse.json(
        {
          data: await db.designGeneration.findMany({
            where: { projectId },
            orderBy: { createdAt: "desc" },
            take: 30,
            select: {
              id: true,
              status: true,
              error: true,
              outputImageId: true,
              createdAt: true,
            },
          }),
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    return NextResponse.json(
      { error: { message: "Tapılmadı." } },
      { status: 404 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          message:
            e instanceof AppError ? e.message : "Əməliyyat tamamlanmadı.",
        },
      },
      { status: e instanceof AppError ? e.status : 500 },
    );
  }
}
