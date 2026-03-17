# Galerie Varinchie - Admin & Setup Guide

Welcome to the Galerie Varinchie e-commerce platform. This statement-art gallery has been crafted to display curated collections beautifully, enabling seamless purchasing for collectors and powerful dynamic controls for admins.

---

## 🚀 Setting Up the Application

### 1. Prerequisites
- **Node.js**: v18+ recommended
- **Nitin/SQL database** or a local SQLite setup (currently configured for a local `dev.db` file)

### 2. Installations
```bash
# Install dependencies
npm install

# Setup Prisma and push current schema into your local DB
npx prisma db push

# Generate client models for typescript support
npx prisma generate

# Seed the database with initial categories and admin user
node prisma/seed.js
```

### 3. Local Development
Run the dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the storefront.

---

## 👑 Administrative Controls (Dashboard)

To access admin controls, login with any authorized administrator account (e.g., `admin@galerievarinchie.com`). You'll notice access to the **/admin** panel containing everything needed to manage operations without code modifications.

### 1. Managing Product Taxonomy
Access: `Admin Panel -> Website Content`

- **Categories**: Create core catalog pillars (e.g. "Art Prints", "Handmade Art"). 
- **Sub-Categories**: Groups nested inside pillars to target queries (e.g. "Botanical", "Ceramics").
  > ⚠️ **Destructive warning**: Deleting a category or subcategory cascade-deletes any downstream categories or products beneath it. Therefore, a **Type-Name Confirmation prompt** acts as a buffer safeguards for safety.

### 2. Adding & Configuring Products
Access: `Admin Panel -> Add Product`

- **Core Fields**: Standard setups for Titles, Rich Descriptions, remote thumbnail paths, and Base Pricing setup.
- **Dynamic Specifications System**:
  - Instead of hardcoded specs, admins can dynamically "+ Add Specification" builders (like **Frame Size**, **Frame Border Material**, **Surface Finish**).
  - Admins can customize exact multiple variants options layout (e.g. "Matte finish", "Satin finish").
- **Prices Modifiers**: Creates customized pricing grids setups combining all valid specifications dynamically for checkout safely.

---

## 🛒 User Features

- **Standard Cart Flows**: Securely handles adding variants modifiers, frame sizes directly to dynamic user payloads safely.
- **Wishlist & Auth support**: Secure logins keeping favorite artwork persistent.
- **Dynamic Homepage grid**: Responsive feeds rendering Collections swiftly.
- **Collector Testimonials**: Allowed validated profiles to select items and place quick descriptive text rendering instantly setup with cascading grid widgets directly on standard homepage frames.

---

## 🔧 Deployment or Re-scaling Setup

Deployment builds output static chunks combined:
```bash
npm run build
npm run start
```
To update database schemas scaling simply run `npx prisma db push` targeting variables.
