/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "galerievarinchie",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          region: "ap-south-1",
        },
      },
    };
  },
  async run() {
    const databaseUrl = new sst.Secret("DATABASE_URL");
    const jwtSecret = new sst.Secret("JWT_SECRET");
    const resendApiKey = new sst.Secret("RESEND_API_KEY");

    new sst.aws.Nextjs("MyWeb", {
      environment: {
        NODE_ENV: "production",
        DATABASE_URL: $interpolate`${databaseUrl.value}`,
        JWT_SECRET: $interpolate`${jwtSecret.value}`,
        RESEND_API_KEY: $interpolate`${resendApiKey.value}`,
      },
    });
  },
});
