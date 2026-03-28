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
    // 1. Define Secrets (Must be set via 'npx sst secret set' for each stage)
    const databaseUrl = new sst.Secret("DATABASE_URL");
    const jwtSecret = new sst.Secret("JWT_SECRET");
    const resendApiKey = new sst.Secret("RESEND_API_KEY");
    const nextPublicCloudfrontUrl = new sst.Secret("NEXT_PUBLIC_CLOUDFRONT_URL");

    // 2. Create the S3 Bucket for Assets
    const bucket = new sst.aws.Bucket("MyWebAssets", {
      access: "cloudfront",
    });

    const isProd = $app.stage === "production";

    // 3. Deploy the Next.js App
    const app = new sst.aws.Nextjs("MyWeb", {
      link: [bucket, databaseUrl, jwtSecret, resendApiKey, nextPublicCloudfrontUrl],
      environment: {
        S3_BUCKET_NAME: bucket.name,
        DATABASE_URL: databaseUrl.value,
        JWT_SECRET: jwtSecret.value,
        RESEND_API_KEY: resendApiKey.value,
        // Pulls the unique URL (www.galerievarinchi.com or d3jb...cloudfront.net) from Secrets
        NEXT_PUBLIC_CLOUDFRONT_URL: nextPublicCloudfrontUrl.value,
      },
    });

    // 4. Create the Router/CDN
    const router = new sst.aws.Router("MyWebCdn", {
      domain: isProd ? {
        name: "galerievarinchi.com",
        dns: false,
        cert: "arn:aws:acm:us-east-1:531472034733:certificate/a93810e5-6295-46cf-9442-e6c80f3c0654",
        aliases: ["www.galerievarinchi.com"]
      } : undefined,
      routes: {
        "/assets/*": {
          bucket: bucket,
        },
        "/*": app.url,
      }
    });

    // 5. Output the results to the terminal
    return {
      stage: $app.stage,
      appUrl: app.url,
      siteUrl: isProd ? "https://www.galerievarinchi.com" : router.url,
    };
  },
});