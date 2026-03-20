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
    const awsAccessKeyId = new sst.Secret("AWS_ACCESS_KEY_ID");
    const awsSecretAccessKey = new sst.Secret("AWS_SECRET_ACCESS_KEY");
    const awsRegion = new sst.Secret("AWS_REGION");

    const bucket = new sst.aws.Bucket("MyWebAssets", {
      access: "cloudfront",
    });
    
    const router = new sst.aws.Router("MyWebCdn", {
      routes: {
        "/*": {
          bucket,
          cachePolicy: "658327ea-f89d-4fab-a63d-7e88639e58f6", // CachingOptimized
        }
      }
    });

    new sst.aws.Nextjs("MyWeb", {
      link: [bucket],
      environment: {
        NODE_ENV: "production",
        DATABASE_URL: databaseUrl.value,
        JWT_SECRET: jwtSecret.value,
        MY_RESEND_API_KEY: resendApiKey.value,
        MY_AWS_ACCESS_KEY_ID: awsAccessKeyId.value,
        MY_AWS_SECRET_ACCESS_KEY: awsSecretAccessKey.value,
        MY_AWS_REGION: awsRegion.value,
        S3_BUCKET_NAME: bucket.name,
        CLOUDFRONT_URL: router.url,
      },
    });
  },
});
