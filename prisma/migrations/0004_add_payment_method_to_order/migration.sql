-- AlterTable: Add paymentMethod column to Order
ALTER TABLE "Order" ADD COLUMN "paymentMethod" VARCHAR(20) NOT NULL DEFAULT 'BANK_TRANSFER';
