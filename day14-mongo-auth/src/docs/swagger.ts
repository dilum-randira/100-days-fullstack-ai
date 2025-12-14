import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Auth Service API',
    version: '1.0.0',
    description: 'Authentication API (v1) with JWT-based auth and rate limits',
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Local auth server',
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
