// Zentraler, typisierter Zugriff auf die statischen Preisdaten.
import rawPrices from "@/data/prices.json";
import type { PriceData } from "./types";

export const priceData = rawPrices as unknown as PriceData;
