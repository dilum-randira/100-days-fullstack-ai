"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swaggerDefinition = {
    openapi: '3.0.3',
    info: {
        title: 'Inventory Service API',
        version: '1.0.0',
        description: 'Inventory, batches, and health/metrics API (v1)',
    },
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Local server',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
    },
};
const options = {
    swaggerDefinition,
    apis: ['src/routes/*.ts', 'src/app.ts'],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
