import Item from '../models/Item';

// Sample items data
const sampleItems = [
  {
    name: 'Wireless Mouse',
    quantity: 50,
    price: 29.99,
  },
  {
    name: 'Mechanical Keyboard',
    quantity: 30,
    price: 79.99,
  },
  {
    name: 'USB-C Hub',
    quantity: 100,
    price: 49.99,
  },
  {
    name: 'Monitor Stand',
    quantity: 25,
    price: 39.99,
  },
  {
    name: 'Webcam HD 1080p',
    quantity: 40,
    price: 59.99,
  },
  {
    name: 'Laptop Sleeve 15"',
    quantity: 75,
    price: 24.99,
  },
  {
    name: 'Wireless Earbuds',
    quantity: 60,
    price: 89.99,
  },
  {
    name: 'Desk Lamp LED',
    quantity: 45,
    price: 34.99,
  },
  {
    name: 'Mouse Pad XL',
    quantity: 200,
    price: 14.99,
  },
  {
    name: 'HDMI Cable 6ft',
    quantity: 150,
    price: 12.99,
  },
];

/**
 * Seeds the database with sample items
 * @param clearExisting - If true, deletes all existing items before seeding
 * @returns Object with count of created items
 */
export const seedDatabase = async (clearExisting: boolean = false): Promise<{
  cleared: number;
  created: number;
  items: any[];
}> => {
  let cleared = 0;

  if (clearExisting) {
    const result = await Item.deleteMany({});
    cleared = result.deletedCount;
  }

  const createdItems = await Item.insertMany(sampleItems);

  return {
    cleared,
    created: createdItems.length,
    items: createdItems,
  };
};

/**
 * Check if database is empty
 */
export const isDatabaseEmpty = async (): Promise<boolean> => {
  const count = await Item.countDocuments();
  return count === 0;
};

export { sampleItems };
