import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PublicShopView from "@/components/shop/PublicShopView";

export default async function PublicShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const shop = await prisma.shop.findFirst({
    where: {
      OR: [{ slug: slug }, { customDomain: slug }],
      isActive: true,
    },
    include: {
      products: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
      pickupPoints: {
        where: { isActive: true },
        include: { windows: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { start: "asc" }] } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!shop) {
    return notFound();
  }

  const serializedShop = {
    ...shop,
    products: shop.products.map((p: any) => ({
      ...p,
      price: Number(p.price),
    })),
  };

  return <PublicShopView shop={serializedShop} />;
}
