-- These columns are intentionally removed; existing values in them will be deleted.
ALTER TABLE public.nasabahs
    DROP COLUMN IF EXISTS kategori,
    DROP COLUMN IF EXISTS alamat_pic;
