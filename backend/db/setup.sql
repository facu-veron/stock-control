-- 1) Unicidad compuesta para poder referenciar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'products_id_tenant_unique'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT products_id_tenant_unique UNIQUE (id, tenant_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'tags_id_tenant_unique'
  ) THEN
    ALTER TABLE tags
    ADD CONSTRAINT tags_id_tenant_unique UNIQUE (id, tenant_id);
  END IF;
END$$;

-- 2) FKs compuestas (primero borrar FKs anteriores si chupan)
DO $$
BEGIN
  -- FK product_tags → products
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_product_tags_product_tenant'
  ) THEN
    ALTER TABLE product_tags
    ADD CONSTRAINT fk_product_tags_product_tenant
    FOREIGN KEY (product_id, tenant_id)
    REFERENCES products (id, tenant_id)
    ON DELETE CASCADE;
  END IF;

  -- FK product_tags → tags
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_product_tags_tag_tenant'
  ) THEN
    ALTER TABLE product_tags
    ADD CONSTRAINT fk_product_tags_tag_tenant
    FOREIGN KEY (tag_id, tenant_id)
    REFERENCES tags (id, tenant_id)
    ON DELETE CASCADE;
  END IF;
END$$;
