---
name: Galerie Varinchi Deployment
description: Procedural guide for handling AWS credentials and deploying the Galerie Varinchi project using SST.
---

# Galerie Varinchi Deployment Skill

This skill provides the documented procedures for deploying the Galerie Varinchi infrastructure and application using **SST Ion (v4)**.

## 1. AWS Credential Management (Updated for Reliability)
Due to known issues with Pulumi handling AWS profiles on Windows via PowerShell session variables, **AWS credentials should now be stored in `.env.local`** at the project root. This ensures Pulumi and SST natively pick up the credentials without environment context loss.

Your `.env.local` MUST contain:
```env
AWS_ACCESS_KEY_ID="AKIAXX..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="ap-south-1"

# GitHub PAT for CI/CD or registry access
GITHUB_PAT="..."
```
*(Note: `.env.local` is ignored by git, so your keys are safe).*

## 2. SST Secrets Management
To set or update sensitive secrets (neon, jwt, resend etc.):
```powershell
npx sst secret set DATABASE_URL "..." --stage dev
npx sst secret set DATABASE_URL "..." --stage production
```

## 3. Deployment Stages

Because the `aws` provider config block in `sst.config.ts` no longer hard-codes the `profile`, you can deploy directly. It will securely pull credentials from `.env.local`.

### Production Rollout
Deploys to the production-hardened architecture (CloudFront + S3 OAC).
```powershell
npx sst deploy --stage production
```

### Local Development (Live Lambda)
Connects the local development environment to AWS cloud resources.
```powershell
npx sst dev
```

## 4. Post-Deployment Cache Invalidation
The application is behind a CloudFront distribution. Textual or layout changes (such as brand spelling fixes) may require a manual invalidation to propagate to users immediately.

**Distribution ID**: `EKWN2Z4R3N4RA`
To run this, ensure the AWS CLI is configured with the `gv26` profile in `~/.aws/config`, or use environment variables.
```powershell
aws cloudfront create-invalidation --distribution-id EKWN2Z4R3N4RA --paths "/*"
```
