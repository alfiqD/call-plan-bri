ALTER TABLE public.nasabahs
    ADD COLUMN IF NOT EXISTS jenis_nasabah VARCHAR(30),
    ADD COLUMN IF NOT EXISTS jenis_usaha TEXT,
    ADD COLUMN IF NOT EXISTS nama_pic VARCHAR(150),
    ADD COLUMN IF NOT EXISTS alamat_pic TEXT;

ALTER TABLE public.nasabahs
    ADD CONSTRAINT nasabahs_jenis_nasabah_check
    CHECK (jenis_nasabah IS NULL OR jenis_nasabah IN ('Individu', 'Badan Usaha'));
