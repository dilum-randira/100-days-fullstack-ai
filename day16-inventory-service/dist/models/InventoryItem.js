"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryItem = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const inventoryItemSchema = new mongoose_1.Schema({
    productName: {
        type: String,
        required: true,
        trim: true,
    },
    batchId: {
        type: String,
        required: false,
        trim: true,
    },
    sku: {
        type: String,
        required: false,
        trim: true,
        index: true,
    },
    quantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    unit: {
        type: String,
        required: true,
        trim: true,
    },
    location: {
        type: String,
        required: true,
        trim: true,
    },
    supplier: {
        type: String,
        required: false,
        trim: true,
    },
    status: {
        type: String,
        enum: ['available', 'reserved', 'damaged', 'sold'],
        default: 'available',
    },
    minThreshold: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false,
        index: true,
    },
    deletedAt: {
        type: Date,
        required: false,
        default: null,
    },
}, {
    timestamps: true,
});
exports.InventoryItem = mongoose_1.default.model('InventoryItem', inventoryItemSchema);
