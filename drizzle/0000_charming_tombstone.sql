CREATE TABLE "AdminNotification" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AgreementVersion" (
	"id" text PRIMARY KEY NOT NULL,
	"versionNumber" text NOT NULL,
	"title" text DEFAULT 'Artist Collaboration Agreement' NOT NULL,
	"content" text NOT NULL,
	"pdfUrl" text,
	"isActive" boolean DEFAULT false NOT NULL,
	"notifyArtists" boolean DEFAULT true NOT NULL,
	"publishedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ArtRequest" (
	"id" text PRIMARY KEY NOT NULL,
	"artistId" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"categoryId" text NOT NULL,
	"subCategoryId" text NOT NULL,
	"yearCreated" text NOT NULL,
	"specifications" text DEFAULT '[]' NOT NULL,
	"images" text DEFAULT '[]' NOT NULL,
	"price" double precision NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"additionalInfo" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ArtistAgreementConsent" (
	"id" text PRIMARY KEY NOT NULL,
	"artistId" text NOT NULL,
	"agreementVersionId" text NOT NULL,
	"signedAt" timestamp(3) NOT NULL,
	"signatureImageUrl" text,
	"agreementPdfUrl" text,
	"ipAddress" text
);
--> statement-breakpoint
CREATE TABLE "ArtistProfile" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"fullName" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"country" text NOT NULL,
	"state" text NOT NULL,
	"area" text NOT NULL,
	"portfolioLink" text NOT NULL,
	"bio" text NOT NULL,
	"specialization" text NOT NULL,
	"examples" text DEFAULT '[]' NOT NULL,
	"profilePhoto" text,
	"ipAddress" text,
	"agreementPdfUrl" text,
	"agreementVersion" text,
	"agreementTimestamp" timestamp(3),
	"status" text DEFAULT 'PENDING' NOT NULL,
	"bankName" text,
	"accountNumber" text,
	"ifscCode" text,
	"bankBranch" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ArtistWallet" (
	"id" text PRIMARY KEY NOT NULL,
	"artistId" text NOT NULL,
	"availableBalance" double precision DEFAULT 0 NOT NULL,
	"pendingBalance" double precision DEFAULT 0 NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BlogPost" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"coverImage" text,
	"authorId" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"publishedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CartItem" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"productId" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"medium" text,
	"frameType" text,
	"frameColor" text,
	"selectedOptions" text,
	"price" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CommissionLedger" (
	"id" text PRIMARY KEY NOT NULL,
	"orderItemId" text NOT NULL,
	"artistId" text NOT NULL,
	"productId" text NOT NULL,
	"salePrice" double precision NOT NULL,
	"artistShare" double precision NOT NULL,
	"commissionType" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"releaseAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Coupon" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"discountPercent" double precision NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"expiresAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FrameImage" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Order" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"status" text DEFAULT 'NEW' NOT NULL,
	"totalAmount" double precision NOT NULL,
	"transactionId" text,
	"customerName" text,
	"customerEmail" text NOT NULL,
	"customerPhone" text,
	"customerAddress" text,
	"couponId" text,
	"discountAmount" double precision,
	"shiprocketOrderId" integer,
	"shiprocketShipmentId" integer,
	"awbNumber" text,
	"courierName" text,
	"courierId" integer,
	"shippingStatus" text DEFAULT 'PENDING',
	"trackingUrl" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "OrderItem" (
	"id" text PRIMARY KEY NOT NULL,
	"orderId" text NOT NULL,
	"productId" text NOT NULL,
	"quantity" integer NOT NULL,
	"medium" text,
	"frameType" text,
	"frameColor" text,
	"selectedOptions" text,
	"price" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "OtpToken" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"otp" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "OtpToken_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ProcessedImage" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"frameImageId" text,
	"sourceImageUrl" text,
	"folderId" text,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProcessedImageFolder" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parentId" text,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Product" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image" text NOT NULL,
	"images" text DEFAULT '[]' NOT NULL,
	"subCategoryId" text NOT NULL,
	"artistProfileId" text,
	"status" text DEFAULT 'active' NOT NULL,
	"mediums" text DEFAULT '[]' NOT NULL,
	"frameTypes" text DEFAULT '[]' NOT NULL,
	"frameColors" text DEFAULT '[]' NOT NULL,
	"specifications" text DEFAULT '[]' NOT NULL,
	"basePrice" double precision NOT NULL,
	"priceModifiers" text DEFAULT '{}' NOT NULL,
	"unitsAvailable" integer,
	"totalCommissionPaid" double precision DEFAULT 0 NOT NULL,
	"weight" double precision,
	"length" double precision,
	"width" double precision,
	"height" double precision,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SubCategory" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"categoryId" text NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Testimonial" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"userId" text NOT NULL,
	"productId" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"phone" text,
	"address" text,
	"passwordHash" text,
	"isAdmin" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WishlistItem" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"productId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ArtRequest" ADD CONSTRAINT "ArtRequest_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."ArtistProfile"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ArtRequest" ADD CONSTRAINT "ArtRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ArtRequest" ADD CONSTRAINT "ArtRequest_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "public"."SubCategory"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ArtistAgreementConsent" ADD CONSTRAINT "ArtistAgreementConsent_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."ArtistProfile"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ArtistAgreementConsent" ADD CONSTRAINT "ArtistAgreementConsent_agreementVersionId_fkey" FOREIGN KEY ("agreementVersionId") REFERENCES "public"."AgreementVersion"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ArtistProfile" ADD CONSTRAINT "ArtistProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ArtistWallet" ADD CONSTRAINT "ArtistWallet_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."ArtistProfile"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."ArtistProfile"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProcessedImage" ADD CONSTRAINT "ProcessedImage_frameImageId_fkey" FOREIGN KEY ("frameImageId") REFERENCES "public"."FrameImage"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProcessedImage" ADD CONSTRAINT "ProcessedImage_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "public"."ProcessedImageFolder"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProcessedImageFolder" ADD CONSTRAINT "ProcessedImageFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."ProcessedImageFolder"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Product" ADD CONSTRAINT "Product_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "public"."SubCategory"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "ArtistProfile_userId_key" ON "ArtistProfile" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ArtistWallet_artistId_key" ON "ArtistWallet" USING btree ("artistId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Category_slug_key" ON "Category" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon" USING btree ("code" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Session_token_key" ON "Session" USING btree ("token" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "SubCategory_categoryId_slug_key" ON "SubCategory" USING btree ("categoryId" text_ops,"slug" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "User_email_key" ON "User" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "WishlistItem_userId_productId_key" ON "WishlistItem" USING btree ("userId" text_ops,"productId" text_ops);