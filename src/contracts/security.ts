export const securitySchemes = {
  "admin-basic": { type: "http", scheme: "basic" },
  bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
} as const;
