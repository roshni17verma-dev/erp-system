-- ============================================================
-- DATABASE SAFETY CONSTRAINTS
-- Smart ERP System
-- ============================================================

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------

ALTER TABLE "products"
ADD CONSTRAINT "products_base_price_non_negative"
CHECK ("base_price" >= 0);


-- ------------------------------------------------------------
-- INVENTORY
-- ------------------------------------------------------------

ALTER TABLE "inventory"
ADD CONSTRAINT "inventory_physical_quantity_non_negative"
CHECK ("physical_quantity" >= 0);

ALTER TABLE "inventory"
ADD CONSTRAINT "inventory_reserved_quantity_non_negative"
CHECK ("reserved_quantity" >= 0);

ALTER TABLE "inventory"
ADD CONSTRAINT "inventory_reserved_not_greater_than_physical"
CHECK ("reserved_quantity" <= "physical_quantity");


-- ------------------------------------------------------------
-- ENQUIRY ITEMS
-- ------------------------------------------------------------

ALTER TABLE "enquiry_items"
ADD CONSTRAINT "enquiry_items_quantity_positive"
CHECK ("quantity" > 0);


-- ------------------------------------------------------------
-- QUOTATION
-- ------------------------------------------------------------

ALTER TABLE "quotations"
ADD CONSTRAINT "quotations_grand_total_non_negative"
CHECK ("grand_total" >= 0);


-- ------------------------------------------------------------
-- QUOTATION ITEMS
-- ------------------------------------------------------------

ALTER TABLE "quotation_items"
ADD CONSTRAINT "quotation_items_quantity_positive"
CHECK ("quantity" > 0);

ALTER TABLE "quotation_items"
ADD CONSTRAINT "quotation_items_unit_price_non_negative"
CHECK ("unit_price" >= 0);

ALTER TABLE "quotation_items"
ADD CONSTRAINT "quotation_items_discount_percent_valid"
CHECK ("discount_percent" >= 0 AND "discount_percent" <= 100);

ALTER TABLE "quotation_items"
ADD CONSTRAINT "quotation_items_gst_percent_valid"
CHECK ("gst_percent" >= 0 AND "gst_percent" <= 100);

ALTER TABLE "quotation_items"
ADD CONSTRAINT "quotation_items_line_amount_non_negative"
CHECK ("line_amount" >= 0);


-- ------------------------------------------------------------
-- SALES ORDERS
-- ------------------------------------------------------------

ALTER TABLE "sales_orders"
ADD CONSTRAINT "sales_orders_total_amount_non_negative"
CHECK ("total_amount" >= 0);


-- ------------------------------------------------------------
-- SALES ORDER ITEMS
-- ------------------------------------------------------------

ALTER TABLE "sales_order_items"
ADD CONSTRAINT "sales_order_items_quantity_positive"
CHECK ("quantity" > 0);


-- ------------------------------------------------------------
-- DISPATCH ITEMS
-- ------------------------------------------------------------

ALTER TABLE "dispatch_items"
ADD CONSTRAINT "dispatch_items_quantity_positive"
CHECK ("quantity" > 0);