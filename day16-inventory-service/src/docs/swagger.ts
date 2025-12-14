import swaggerJsdoc from 'swagger-jsdoc';

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

export const swaggerSpec = swaggerJsdoc(options);
