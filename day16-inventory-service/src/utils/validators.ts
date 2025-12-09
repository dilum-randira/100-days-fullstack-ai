import { isValidObjectId } from 'mongoose';

interface ValidationResult {
  valid: boolean;
  message?: string;
}

export const validateInventoryInput = (data: any): ValidationResult => {
  if (!data) {
    return { valid: false, message: 'Request body is required' };
  }

  if (!data.productName || typeof data.productName !== 'string' || data.productName.trim().length === 0) {
    return { valid: false, message: 'productName is required and must be a non-empty string' };
  }

  if (data.quantity !== undefined && (typeof data.quantity !== 'number' || data.quantity < 0)) {
    return { valid: false, message: 'quantity must be a non-negative number' };
  }

  if (!data.unit || typeof data.unit !== 'string') {
    return { valid: false, message: 'unit is required and must be a string' };
  }

  if (!data.location || typeof data.location !== 'string') {
    return { valid: false, message: 'location is required and must be a string' };
  }

  if (data.minThreshold !== undefined && (typeof data.minThreshold !== 'number' || data.minThreshold < 0)) {
    return { valid: false, message: 'minThreshold must be a non-negative number' };
  }

  if (data.status && !['available', 'reserved', 'damaged', 'sold'].includes(data.status)) {
    return { valid: false, message: 'status must be one of available, reserved, damaged, sold' };
  }

  return { valid: true };
};

export const validateObjectId = (id: string): ValidationResult => {
  if (!isValidObjectId(id)) {
    return { valid: false, message: 'Invalid ID format' };
  }
  return { valid: true };
};
