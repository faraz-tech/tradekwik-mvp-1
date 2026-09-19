/** Emoji shown on category tiles. Unknown slugs fall back to a generic bag. */
const ICONS: Record<string, string> = {
  "embroidery-machines": "🧵",
  "ice-cream-desserts": "🍨",
  "garments-tailoring": "👔",
  "home-decoration": "🪴",
  "furniture": "🪑",
  "kitchen-dining": "🍽️",
  "handicrafts-gifts": "🎁",
  "packaging-printing": "📦",
  "hardware-tools": "🔧",
  "electricals-electronics": "💡",
  "industrial-machines": "⚙️",
  "building-material": "🧱",
  "agriculture-farming": "🌾",
  "food-beverages": "🍱",
  "beauty-wellness": "🧴",
  "stationery-office": "✏️",
  "sports-fitness": "🏏",
  "toys-baby": "🧸",
  "auto-parts": "🔩",
  "textiles-fabrics": "🧶",
  "jewellery-accessories": "💍",
  "footwear": "👟",
};

export function categoryIcon(slug: string): string {
  return ICONS[slug] ?? "🛍️";
}
