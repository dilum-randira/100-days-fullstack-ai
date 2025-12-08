import { Request, Response } from "express";
import { Item } from "../models/item";
import { ApiResponse } from "../types/api";
import { createItemFromPayload, validateItemPayload } from "../utils/validate";

let items: Item[] = [];
let nextId = 1;

export function getItems(req: Request, res: Response<ApiResponse<Item[]>>): void {
  res.json({ success: true, data: items });
}

export function getItemById(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<Item>>,
): void {
  const { id } = req.params;
  const item = items.find((i) => i.id === id);

  if (!item) {
    res.status(404).json({
      success: false,
      error: { message: "Item not found" },
    });
    return;
  }

  res.json({ success: true, data: item });
}

export function createItem(
  req: Request,
  res: Response<ApiResponse<Item>>,
): void {
  const validation = validateItemPayload(req.body);

  if (!validation.valid) {
    res.status(400).json({
      success: false,
      error: { message: validation.message ?? "Invalid payload" },
    });
    return;
  }

  const id = String(nextId++);
  const item = createItemFromPayload(req.body, id);
  items.push(item);

  res.status(201).json({ success: true, data: item });
}

export function updateItem(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<Item>>,
): void {
  const { id } = req.params;
  const existingIndex = items.findIndex((i) => i.id === id);

  if (existingIndex === -1) {
    res.status(404).json({
      success: false,
      error: { message: "Item not found" },
    });
    return;
  }

  const validation = validateItemPayload(req.body);
  if (!validation.valid) {
    res.status(400).json({
      success: false,
      error: { message: validation.message ?? "Invalid payload" },
    });
    return;
  }

  const updated = createItemFromPayload(req.body, id);
  items[existingIndex] = updated;

  res.json({ success: true, data: updated });
}

export function deleteItem(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<null>>,
): void {
  const { id } = req.params;
  const existingIndex = items.findIndex((i) => i.id === id);

  if (existingIndex === -1) {
    res.status(404).json({
      success: false,
      error: { message: "Item not found" },
    });
    return;
  }

  items.splice(existingIndex, 1);

  res.json({ success: true, data: null });
}
