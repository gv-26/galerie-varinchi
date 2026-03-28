import { relations } from "drizzle-orm/relations";
import { category, subCategory, product, user, cartItem, wishlistItem, order, orderItem, artistProfile, artRequest, session, testimonial, coupon, artistWallet, commissionLedger } from "./schema";

export const subCategoryRelations = relations(subCategory, ({one, many}) => ({
	category: one(category, {
		fields: [subCategory.categoryId],
		references: [category.id]
	}),
	products: many(product),
	artRequests: many(artRequest),
}));

export const categoryRelations = relations(category, ({many}) => ({
	subCategories: many(subCategory),
	artRequests: many(artRequest),
}));

export const productRelations = relations(product, ({one, many}) => ({
	subCategory: one(subCategory, {
		fields: [product.subCategoryId],
		references: [subCategory.id]
	}),
	artistProfile: one(artistProfile, {
		fields: [product.artistProfileId],
		references: [artistProfile.id]
	}),
	cartItems: many(cartItem),
	wishlistItems: many(wishlistItem),
	orderItems: many(orderItem),
	testimonials: many(testimonial),
	commissionLedgers: many(commissionLedger),
}));

export const cartItemRelations = relations(cartItem, ({one}) => ({
	user: one(user, {
		fields: [cartItem.userId],
		references: [user.id]
	}),
	product: one(product, {
		fields: [cartItem.productId],
		references: [product.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	cartItems: many(cartItem),
	wishlistItems: many(wishlistItem),
	orders: many(order),
	sessions: many(session),
	testimonials: many(testimonial),
	artistProfiles: many(artistProfile),
}));

export const wishlistItemRelations = relations(wishlistItem, ({one}) => ({
	user: one(user, {
		fields: [wishlistItem.userId],
		references: [user.id]
	}),
	product: one(product, {
		fields: [wishlistItem.productId],
		references: [product.id]
	}),
}));

export const orderRelations = relations(order, ({one, many}) => ({
	user: one(user, {
		fields: [order.userId],
		references: [user.id]
	}),
	coupon: one(coupon, {
		fields: [order.couponId],
		references: [coupon.id]
	}),
	orderItems: many(orderItem),
}));

export const orderItemRelations = relations(orderItem, ({one}) => ({
	order: one(order, {
		fields: [orderItem.orderId],
		references: [order.id]
	}),
	product: one(product, {
		fields: [orderItem.productId],
		references: [product.id]
	}),
}));

export const artRequestRelations = relations(artRequest, ({one}) => ({
	artistProfile: one(artistProfile, {
		fields: [artRequest.artistId],
		references: [artistProfile.id]
	}),
	category: one(category, {
		fields: [artRequest.categoryId],
		references: [category.id]
	}),
	subCategory: one(subCategory, {
		fields: [artRequest.subCategoryId],
		references: [subCategory.id]
	}),
}));

export const artistProfileRelations = relations(artistProfile, ({one, many}) => ({
	artRequests: many(artRequest),
	products: many(product),
	user: one(user, {
		fields: [artistProfile.userId],
		references: [user.id]
	}),
	wallet: one(artistWallet, {
		fields: [artistProfile.id],
		references: [artistWallet.artistId]
	}),
	commissionLedgers: many(commissionLedger),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const testimonialRelations = relations(testimonial, ({one}) => ({
	user: one(user, {
		fields: [testimonial.userId],
		references: [user.id]
	}),
	product: one(product, {
		fields: [testimonial.productId],
		references: [product.id]
	}),
}));

export const couponRelations = relations(coupon, ({many}) => ({
	orders: many(order),
}));

export const artistWalletRelations = relations(artistWallet, ({one}) => ({
	artistProfile: one(artistProfile, {
		fields: [artistWallet.artistId],
		references: [artistProfile.id]
	}),
}));

export const commissionLedgerRelations = relations(commissionLedger, ({one}) => ({
	artistProfile: one(artistProfile, {
		fields: [commissionLedger.artistId],
		references: [artistProfile.id]
	}),
	product: one(product, {
		fields: [commissionLedger.productId],
		references: [product.id]
	}),
}));