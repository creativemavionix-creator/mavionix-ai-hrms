-- ============================================================
-- HireMind AI – Migration 008: Rate Limiting System (Hardened Permissions)
-- Creates an atomic sliding-window rate limit bucket table and RPC.
-- Direct table access is restricted; only SECURITY DEFINER RPC is executable.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
    key          TEXT PRIMARY KEY,
    hits         INT NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rate_limit_buckets IS
    'Shared atomic rate limit bucket tracking across server instances.';

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Service role access policy (service_role only)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'rate_limit_buckets' AND policyname = 'service_role_rate_limits'
    ) THEN
        CREATE POLICY "service_role_rate_limits"
        ON public.rate_limit_buckets FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

-- Revoke direct table access from public, anon, and authenticated roles
REVOKE ALL ON TABLE public.rate_limit_buckets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.rate_limit_buckets TO service_role;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key TEXT,
    p_max_hits INT,
    p_window_seconds INT
) RETURNS TABLE (
    allowed BOOLEAN,
    remaining INT,
    retry_after_seconds INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_window_start TIMESTAMPTZ;
    v_hits INT;
    v_window_interval INTERVAL;
    v_elapsed_seconds INT;
BEGIN
    -- Input sanitization to prevent boundary division/interval errors
    IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
        p_key := 'unknown';
    END IF;

    IF p_max_hits IS NULL OR p_max_hits <= 0 THEN
        p_max_hits := 1;
    END IF;

    IF p_window_seconds IS NULL OR p_window_seconds <= 0 THEN
        p_window_seconds := 60;
    END IF;

    v_window_interval := (p_window_seconds || ' seconds')::INTERVAL;

    -- Atomic upsert row lock (executed with function creator/owner privileges)
    INSERT INTO public.rate_limit_buckets (key, hits, window_start)
    VALUES (p_key, 1, v_now)
    ON CONFLICT (key) DO UPDATE SET
        hits = CASE
            WHEN public.rate_limit_buckets.window_start < v_now - v_window_interval THEN 1
            ELSE public.rate_limit_buckets.hits + 1
        END,
        window_start = CASE
            WHEN public.rate_limit_buckets.window_start < v_now - v_window_interval THEN v_now
            ELSE public.rate_limit_buckets.window_start
        END
    RETURNING public.rate_limit_buckets.hits, public.rate_limit_buckets.window_start
    INTO v_hits, v_window_start;

    v_elapsed_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_window_start))::INT);

    IF v_hits <= p_max_hits THEN
        RETURN QUERY SELECT
            TRUE AS allowed,
            (p_max_hits - v_hits) AS remaining,
            0 AS retry_after_seconds;
    ELSE
        RETURN QUERY SELECT
            FALSE AS allowed,
            0 AS remaining,
            GREATEST(1, p_window_seconds - v_elapsed_seconds) AS retry_after_seconds;
    END IF;
END;
$$;

-- Explicitly grant execute permission on the SECURITY DEFINER function to application roles
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO anon, authenticated, service_role;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
