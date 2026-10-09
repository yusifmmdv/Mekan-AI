import "dotenv/config";
import { db } from "../lib/db";
import { hashPassword } from "../lib/auth";
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Demo seed is forbidden in production.");
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 12)
    throw new Error("Set SEED_DEMO_PASSWORD (12+ characters).");
  const passwordHash = await hashPassword(password);
  const roles = [
    "CUSTOMER",
    "REALTOR",
    "STORE_OWNER",
    "DESIGNER",
    "ADMIN",
  ] as const;
  for (const role of roles)
    await db.user.upsert({
      where: { email: `${role.toLowerCase()}@demo.mekan.test` },
      create: {
        email: `${role.toLowerCase()}@demo.mekan.test`,
        name: `Demo ${role}`,
        role,
        passwordHash,
        demo: true,
        emailVerified: new Date(),
        wallet: { create: { balance: 10 } },
        cart: { create: {} },
        profile: { create: {} },
      },
      update: {},
    });
  const demoWallets = await db.creditWallet.findMany({
    where: { user: { demo: true } },
  });
  for (const wallet of demoWallets)
    await db.creditTransaction.upsert({
      where: { idempotencyKey: `demo_initial_${wallet.userId}` },
      create: {
        walletId: wallet.id,
        amount: 10,
        reason: "DEMO_INITIAL_CREDITS",
        idempotencyKey: `demo_initial_${wallet.userId}`,
      },
      update: {},
    });
  const owner = await db.user.findUniqueOrThrow({
    where: { email: "store_owner@demo.mekan.test" },
  });
  const store = await db.store.upsert({
    where: { slug: "demo-forma" },
    create: {
      ownerId: owner.id,
      name: "Forma Studio · Demo",
      slug: "demo-forma",
      description:
        "Təbii materiallar və rahat yaşayış üçün hazırlanmış nümunə kolleksiya. Bu, sınaq mağazasıdır; məhsullar satış təklifi deyil.",
      phone: "+994 00 000 00 00",
      email: owner.email,
      address: "Bakı · Demo ünvan",
      approval: "APPROVED",
      demo: true,
    },
    update: {},
  });
  const categories = [
    ["Divanlar", "sofas"],
    ["Kreslolar", "chairs"],
    ["Masalar", "tables"],
    ["İşıqlandırma", "lighting"],
    ["Yataqlar", "beds"],
    ["Saxlama", "storage"],
  ];
  for (const [name, slug] of categories)
    await db.productCategory.upsert({
      where: { slug },
      create: { name, slug },
      update: {},
    });
  const products = [
    [
      "Luna modul divan",
      "sofas",
      1890,
      220,
      85,
      95,
      "photo-1555041469-a586c61ea9bc",
      "Scandinavian",
    ],
    [
      "Forma istirahət kreslosu",
      "chairs",
      640,
      80,
      90,
      85,
      "photo-1567538096630-e0c55bd6374c",
      "Minimalist",
    ],
    [
      "Terra palıd masa",
      "tables",
      420,
      110,
      40,
      60,
      "photo-1499933374294-4584851497cc",
      "Modern",
    ],
    [
      "Arc döşəmə lampası",
      "lighting",
      185,
      45,
      160,
      45,
      "photo-1507473885765-e6ed057f782c",
      "Contemporary",
    ],
    [
      "Sera yumşaq yataq",
      "beds",
      1250,
      180,
      100,
      210,
      "photo-1505693416388-ac5ce068fe85",
      "Luxury",
    ],
    [
      "Noma saxlama dolabı",
      "storage",
      790,
      120,
      180,
      45,
      "photo-1556020685-ae41abfc9365",
      "Minimalist",
    ],
    [
      "Atelier yemək masası",
      "tables",
      960,
      160,
      75,
      90,
      "photo-1617806118233-18e1de247200",
      "Classic",
    ],
    [
      "Moss rahat kreslo",
      "chairs",
      520,
      75,
      85,
      80,
      "photo-1598300042247-d088f8ab3a91",
      "Modern",
    ],
  ] as const;
  for (let n = 0; n < products.length; n++) {
    const [name, cat, price, width, height, depth, img, style] = products[n];
    const category = await db.productCategory.findUniqueOrThrow({
      where: { slug: cat },
    });
    await db.product.upsert({
      where: { slug: `demo-product-${n + 1}` },
      create: {
        storeId: store.id,
        categoryId: category.id,
        name,
        slug: `demo-product-${n + 1}`,
        description:
          "Nümunə kataloq məhsulu. Şəkil illüstrativdir və göstərilən ölçülərlə konkret satış məhsulunun təsdiqi deyil. Təbii tekstura, sadə forma və isti neytral rənglər.",
        price,
        width,
        height,
        depth,
        materials: ["Parça", "Palıd"],
        colors: ["Bej", "İvori"],
        tags: ["Demo", "Təbii"],
        roomTypes:
          cat === "beds"
            ? ["Bedroom"]
            : ["Living room", "Office", "Dining room"],
        styles: [style, "Modern"],
        stock: 8,
        sku: `DEMO-${n + 1}`,
        status: "ACTIVE",
        demo: true,
        images: {
          create: {
            url: `https://images.unsplash.com/${img}?auto=format&fit=crop&w=1000&q=85`,
            alt: `${name} · illüstrativ foto`,
          },
        },
      },
      update: {},
    });
  }
  const designerUser = await db.user.findUniqueOrThrow({
    where: { email: "designer@demo.mekan.test" },
  });
  const designer = await db.designerProfile.upsert({
    where: { userId: designerUser.id },
    create: {
      userId: designerUser.id,
      displayName: "Məkan Design · Demo",
      slug: "demo-designer",
      bio: "Nümunə dizayner profili. İsti minimalist məkanlar, funksional planlama və material seçimi.",
      city: "Bakı",
      approval: "APPROVED",
      demo: true,
    },
    update: {},
  });
  if (!(await db.designerService.count({ where: { designerId: designer.id } })))
    await db.designerService.create({
      data: {
        designerId: designer.id,
        title: "Otaq üçün dizayn konsultasiyası · Demo",
        description:
          "Stil, rəng və mebel seçimi üzrə nümunə konsultasiya xidməti.",
        price: 150,
      },
    });
  if (!(await db.subscriptionPlan.count()))
    await db.subscriptionPlan.createMany({
      data: [
        { name: "Başlanğıc · Nümunə", role: "CUSTOMER", price: 9, credits: 5 },
        { name: "Əmlak · Nümunə", role: "REALTOR", price: 49, credits: 30 },
        { name: "Mağaza · Nümunə", role: "STORE_OWNER", price: 29, credits: 0 },
        { name: "Dizayner · Nümunə", role: "DESIGNER", price: 0, credits: 0 },
      ],
    });
  await db.systemSetting.upsert({
    where: { key: "commissionRate" },
    create: { key: "commissionRate", value: 0 },
    update: {},
  });
  console.log(
    "Demo seed completed. Accounts: <role>@demo.mekan.test. Password: your SEED_DEMO_PASSWORD.",
  );
}
main().finally(() => db.$disconnect());
