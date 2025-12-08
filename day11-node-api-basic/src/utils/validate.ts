import { Item } from "../models/item";

export function validateItemPayload(payload: any): {
  valid: boolean;
  message?: string;
} {
  if (!payload || typeof payload !== "object") {
    return { valid: false, message: "Body must be a JSON object." };
  }

  const { name, quantity, price } = payload;

  if (typeof name !== "string" || !name.trim()) {
    return { valid: false, message: "'name' is required and must be a non-empty string." };
  }

  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 0) {
    return { valid: false, message: "'quantity' must be a non-negative number." };
  }

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    return { valid: false, message: "'price' must be a non-negative number." };
  }

  return { valid: true };
}

export function createItemFromPayload(payload: any, id: string): Item {
  const { name, quantity, price } = payload;
  return {
    id,
    name: name.trim(),
    quantity,
    price,
  };
}
