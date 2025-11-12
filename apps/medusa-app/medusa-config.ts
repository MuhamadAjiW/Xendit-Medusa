import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || "",
      adminCors: process.env.ADMIN_CORS || "",
      authCors: process.env.AUTH_CORS || "",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "xendit-medusa/providers/xendit",
            id: "xendit",
            options: {
              api_key: process.env.XENDIT_SECRET_KEY || "",
              webhook_token: process.env.XENDIT_WEBHOOK_TOKEN,
              default_country: process.env.XENDIT_DEFAULT_COUNTRY || "ID",
            },
          },
        ],
      },
    },
  ],
});
