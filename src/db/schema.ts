import { pgTable, uniqueIndex, text, integer, timestamp, foreignKey, boolean, doublePrecision } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const category = pgTable("Category", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	displayOrder: integer().default(0).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("Category_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const subCategory = pgTable("SubCategory", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	categoryId: text().notNull(),
	displayOrder: integer().default(0).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("SubCategory_categoryId_slug_key").using("btree", table.categoryId.asc().nullsLast().op("text_ops"), table.slug.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [category.id],
			name: "SubCategory_categoryId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const otpToken = pgTable("OtpToken", {
	id: text().primaryKey().notNull(),
	email: text().notNull().unique(),
	otp: text().notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	used: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const product = pgTable("Product", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	image: text().notNull(),
	images: text().default('[]').notNull(),
	subCategoryId: text().notNull(),
	artistProfileId: text(),
	status: text().default('active').notNull(),
	mediums: text().default('[]').notNull(),
	frameTypes: text().default('[]').notNull(),
	frameColors: text().default('[]').notNull(),
	specifications: text().default('[]').notNull(),
	basePrice: doublePrecision().notNull(),
	priceModifiers: text().default('{}').notNull(),
	unitsAvailable: integer(),
	totalCommissionPaid: doublePrecision().default(0).notNull(),
	weight: doublePrecision(),
	length: doublePrecision(),
	width: doublePrecision(),
	height: doublePrecision(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.subCategoryId],
			foreignColumns: [subCategory.id],
			name: "Product_subCategoryId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const cartItem = pgTable("CartItem", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	productId: text().notNull(),
	quantity: integer().default(1).notNull(),
	medium: text(),
	frameType: text(),
	frameColor: text(),
	selectedOptions: text(),
	price: doublePrecision().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "CartItem_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [product.id],
			name: "CartItem_productId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const wishlistItem = pgTable("WishlistItem", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	productId: text().notNull(),
}, (table) => [
	uniqueIndex("WishlistItem_userId_productId_key").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.productId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "WishlistItem_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [product.id],
			name: "WishlistItem_productId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const order = pgTable("Order", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	status: text().default('NEW').notNull(),
	totalAmount: doublePrecision().notNull(),
	transactionId: text(),
	customerName: text(),
	customerEmail: text().notNull(),
	customerPhone: text(),
	customerAddress: text(),
	couponId: text(),
	discountAmount: doublePrecision(),
	shiprocketOrderId: integer(),
	shiprocketShipmentId: integer(),
	awbNumber: text(),
	courierName: text(),
	courierId: integer(),
	shippingStatus: text().default('PENDING'),
	trackingUrl: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Order_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const orderItem = pgTable("OrderItem", {
	id: text().primaryKey().notNull(),
	orderId: text().notNull(),
	productId: text().notNull(),
	quantity: integer().notNull(),
	medium: text(),
	frameType: text(),
	frameColor: text(),
	selectedOptions: text(),
	price: doublePrecision().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [order.id],
			name: "OrderItem_orderId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [product.id],
			name: "OrderItem_productId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const user = pgTable("User", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	name: text(),
	phone: text(),
	address: text(),
	passwordHash: text(),
	isAdmin: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("User_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
]);

export const artRequest = pgTable("ArtRequest", {
	id: text().primaryKey().notNull(),
	artistId: text().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	categoryId: text().notNull(),
	subCategoryId: text().notNull(),
	yearCreated: text().notNull(),
	specifications: text().default('[]').notNull(),
	images: text().default('[]').notNull(),
	price: doublePrecision().notNull(),
	quantity: integer().default(1).notNull(),
	additionalInfo: text(),
	status: text().default('PENDING').notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.artistId],
			foreignColumns: [artistProfile.id],
			name: "ArtRequest_artistId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [category.id],
			name: "ArtRequest_categoryId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.subCategoryId],
			foreignColumns: [subCategory.id],
			name: "ArtRequest_subCategoryId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const session = pgTable("Session", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	token: text().notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("Session_token_key").using("btree", table.token.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Session_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const testimonial = pgTable("Testimonial", {
	id: text().primaryKey().notNull(),
	text: text().notNull(),
	userId: text().notNull(),
	productId: text().notNull(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Testimonial_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [product.id],
			name: "Testimonial_productId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const artistProfile = pgTable("ArtistProfile", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	fullName: text().notNull(),
	email: text().notNull(),
	phone: text().notNull(),
	country: text().notNull(),
	state: text().notNull(),
	area: text().notNull(),
	portfolioLink: text().notNull(),
	bio: text().notNull(),
	specialization: text().notNull(),
	examples: text().default('[]').notNull(),
	profilePhoto: text(),
	ipAddress: text(),
	agreementPdfUrl: text(),
	agreementVersion: text(),
	agreementTimestamp: timestamp({ precision: 3, mode: 'string' }),
	status: text().default('PENDING').notNull(),
	// Bank details (filled by artist after approval)
	bankName: text(),
	accountNumber: text(),
	ifscCode: text(),
	bankBranch: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("ArtistProfile_userId_key").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "ArtistProfile_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const coupon = pgTable("Coupon", {
	id: text().primaryKey().notNull(),
	code: text().notNull(),
	discountPercent: doublePrecision().notNull(),
	isActive: boolean().default(true).notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("Coupon_code_key").using("btree", table.code.asc().nullsLast().op("text_ops")),
]);

export const artistWallet = pgTable("ArtistWallet", {
	id: text().primaryKey().notNull(),
	artistId: text().notNull(),
	availableBalance: doublePrecision().default(0).notNull(),
	pendingBalance: doublePrecision().default(0).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("ArtistWallet_artistId_key").using("btree", table.artistId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.artistId],
			foreignColumns: [artistProfile.id],
			name: "ArtistWallet_artistId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const commissionLedger = pgTable("CommissionLedger", {
	id: text().primaryKey().notNull(),
	orderItemId: text().notNull(),
	artistId: text().notNull(),
	productId: text().notNull(),
	salePrice: doublePrecision().notNull(),
	artistShare: doublePrecision().notNull(),
	commissionType: text().notNull(), // 'INITIAL_33' | 'ROYALTY_7'
	status: text().default('PENDING').notNull(), // 'PENDING' | 'COMPLETED' | 'CANCELLED'
	releaseAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.artistId],
			foreignColumns: [artistProfile.id],
			name: "CommissionLedger_artistId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [product.id],
			name: "CommissionLedger_productId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);
