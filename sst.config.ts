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
    const s3BucketName = new sst.Secret("S3_BUCKET_NAME");

    new sst.aws.Nextjs("MyWeb", {
      link: [databaseUrl, jwtSecret, resendApiKey, awsAccessKeyId, awsSecretAccessKey, awsRegion, s3BucketName],
      environment: {
        NODE_ENV: "production",
        DATABASE_URL: databaseUrl.value,
        JWT_SECRET: jwtSecret.value,
        RESEND_API_KEY: resendApiKey.value,
        AWS_ACCESS_KEY_ID: awsAccessKeyId.value,
        AWS_SECRET_ACCESS_KEY: awsSecretAccessKey.value,
        AWS_REGION: awsRegion.value,
        S3_BUCKET_NAME: s3BucketName.value,
      },
    });
  },
});
