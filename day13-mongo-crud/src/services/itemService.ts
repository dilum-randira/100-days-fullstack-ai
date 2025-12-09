import Item, { IItem, IItemDocument } from '../models/Item';
import { AppError } from '../middlewares/errorHandler';

// Input type for creating an item (without timestamps)
export interface CreateItemInput {
  name: string;
  quantity: number;
  price: number;
}

// Input type for updating an item (all fields optional)
export interface UpdateItemInput {
  name?: string;
  quantity?: number;
  price?: number;
}

// Pagination options
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Paginated result
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

class ItemService {
  /**
   * Get all items with optional pagination
   */
  async getAllItems(options: PaginationOptions = {}): Promise<PaginatedResult<IItemDocument>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [items, totalItems] = await Promise.all([
      Item.find().sort(sortOptions).skip(skip).limit(limit),
      Item.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: items,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get a single item by ID
   */
  async getItemById(id: string): Promise<IItemDocument> {
    const item = await Item.findById(id);

    if (!item) {
      throw new AppError(`Item with ID ${id} not found`, 404);
    }

    return item;
  }

  /**
   * Create a new item
   */
  async createItem(input: CreateItemInput): Promise<IItemDocument> {
    const item = new Item(input);
    await item.save();
    return item;
  }

  /**
   * Update an existing item
   */
  async updateItem(id: string, input: UpdateItemInput): Promise<IItemDocument> {
    const item = await Item.findByIdAndUpdate(
      id,
      { $set: input },
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validators
      }
    );

    if (!item) {
      throw new AppError(`Item with ID ${id} not found`, 404);
    }

    return item;
  }

  /**
   * Delete an item
   */
  async deleteItem(id: string): Promise<IItemDocument> {
    const item = await Item.findByIdAndDelete(id);

    if (!item) {
      throw new AppError(`Item with ID ${id} not found`, 404);
    }

    return item;
  }

  /**
   * Search items by name
   */
  async searchItems(query: string): Promise<IItemDocument[]> {
    const items = await Item.find({
      name: { $regex: query, $options: 'i' },
    });

    return items;
  }

  /**
   * Get items count
   */
  async getItemsCount(): Promise<number> {
    return Item.countDocuments();
  }

  /**
   * Delete all items (use with caution!)
   */
  async deleteAllItems(): Promise<number> {
    const result = await Item.deleteMany({});
    return result.deletedCount;
  }
}

export const itemService = new ItemService();
