/** Public storefront base URL, used to link sellers to their live store. */
export const STOREFRONT_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const storeUrl = (slug: string) => `${STOREFRONT_URL}/store/${slug}`;
export const storeAboutUrl = (slug: string) => `${STOREFRONT_URL}/store/${slug}/about`;
