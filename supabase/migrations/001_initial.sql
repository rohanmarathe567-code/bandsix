-- ============================================================
-- BandSix — Supabase PostgreSQL Schema
-- ============================================================

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "unaccent";  -- accent-insensitive search

-- ============================================================
-- SCHOOLS
-- ============================================================
CREATE TABLE schools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT CHECK (type IN ('public', 'catholic', 'independent', 'other')) DEFAULT 'other',
  slug        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schools_slug  ON schools(slug);
CREATE INDEX idx_schools_name  ON schools USING GIN (name gin_trgm_ops);
CREATE INDEX idx_schools_type  ON schools(type);

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  category    TEXT,           -- e.g. 'Mathematics', 'English', 'Science', 'HSIE', 'Creative Arts', 'TAS', 'PD/H/PE', 'Languages', 'VET'
  units       INTEGER DEFAULT 2,
  is_extension BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_courses_slug  ON courses(slug);
CREATE INDEX idx_courses_name  ON courses USING GIN (name gin_trgm_ops);
CREATE INDEX idx_courses_category ON courses(category);

-- ============================================================
-- HONOUR ROLL ENTRIES  (Distinguished / All-round Achievers)
-- ============================================================
CREATE TABLE honour_roll_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  year                INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2030),
  student_first_name  TEXT NOT NULL,
  student_last_name   TEXT NOT NULL,
  is_first_in_course  BOOLEAN DEFAULT FALSE,
  state_rank          INTEGER CHECK (state_rank BETWEEN 1 AND 50),
  is_all_rounder      BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hre_school_year   ON honour_roll_entries(school_id, year);
CREATE INDEX idx_hre_course_year   ON honour_roll_entries(course_id, year);
CREATE INDEX idx_hre_year          ON honour_roll_entries(year);
CREATE INDEX idx_hre_state_rank    ON honour_roll_entries(state_rank) WHERE state_rank IS NOT NULL;
CREATE INDEX idx_hre_first_course  ON honour_roll_entries(is_first_in_course) WHERE is_first_in_course = TRUE;
CREATE INDEX idx_hre_all_rounder   ON honour_roll_entries(is_all_rounder) WHERE is_all_rounder = TRUE;

-- Prevent exact duplicate entries
CREATE UNIQUE INDEX idx_hre_unique
  ON honour_roll_entries(school_id, course_id, year, student_first_name, student_last_name);

-- ============================================================
-- SCHOOL YEARLY STATS  (pre-computed for performance)
-- ============================================================
CREATE TABLE school_yearly_stats (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  year                INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2030),
  total_b6            INTEGER DEFAULT 0,
  unique_students     INTEGER DEFAULT 0,
  state_ranks_count   INTEGER DEFAULT 0,
  all_rounders_count  INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, year)
);

CREATE INDEX idx_sys_school_year ON school_yearly_stats(school_id, year);
CREATE INDEX idx_sys_year        ON school_yearly_stats(year);
CREATE INDEX idx_sys_total_b6    ON school_yearly_stats(year, total_b6 DESC);

-- ============================================================
-- COURSE YEARLY STATS  (pre-computed for performance)
-- ============================================================
CREATE TABLE course_yearly_stats (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  year                INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2030),
  total_b6            INTEGER DEFAULT 0,
  state_ranks_count   INTEGER DEFAULT 0,
  first_in_course_student_name TEXT,
  first_in_course_school_name  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, year)
);

CREATE INDEX idx_cys_course_year ON course_yearly_stats(course_id, year);
CREATE INDEX idx_cys_year        ON course_yearly_stats(year);

-- ============================================================
-- SCALING DATA  (for ATAR calculator)
-- ============================================================
CREATE TABLE scaling_data (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  year          INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2030),
  -- HSC mark thresholds for performance bands
  band6_cutoff  DECIMAL(5,2),   -- minimum raw mark for Band 6 / E4
  band5_cutoff  DECIMAL(5,2),
  band4_cutoff  DECIMAL(5,2),
  -- Scaling parameters (linear model: scaled = slope * raw + intercept)
  slope         DECIMAL(6,4) DEFAULT 1.0,
  intercept     DECIMAL(6,4) DEFAULT 0.0,
  -- Population statistics
  mean_raw      DECIMAL(5,2),
  mean_scaled   DECIMAL(5,2),
  median_raw    DECIMAL(5,2),
  median_scaled DECIMAL(5,2),
  std_dev_raw   DECIMAL(5,2),
  std_dev_scaled DECIMAL(5,2),
  candidature   INTEGER,        -- number of students who sat the exam
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, year)
);

CREATE INDEX idx_scaling_course_year ON scaling_data(course_id, year);

-- ============================================================
-- VIEWS  (convenience)
-- ============================================================

-- Full honour roll with joined school and course names
CREATE VIEW v_honour_roll AS
SELECT
  hre.id,
  hre.year,
  hre.student_first_name,
  hre.student_last_name,
  hre.student_first_name || ' ' || hre.student_last_name AS student_full_name,
  hre.is_first_in_course,
  hre.state_rank,
  hre.is_all_rounder,
  s.id   AS school_id,
  s.name AS school_name,
  s.slug AS school_slug,
  s.type AS school_type,
  c.id   AS course_id,
  c.name AS course_name,
  c.slug AS course_slug,
  c.category AS course_category,
  c.units AS course_units
FROM honour_roll_entries hre
JOIN schools s ON s.id = hre.school_id
JOIN courses c ON c.id = hre.course_id;

-- School rankings (any year)
CREATE VIEW v_school_rankings AS
SELECT
  s.id,
  s.name,
  s.slug,
  s.type,
  sys.year,
  sys.total_b6,
  sys.unique_students,
  sys.state_ranks_count,
  sys.all_rounders_count,
  RANK() OVER (PARTITION BY sys.year ORDER BY sys.total_b6 DESC) AS rank
FROM school_yearly_stats sys
JOIN schools s ON s.id = sys.school_id;

-- Course rankings (any year)
CREATE VIEW v_course_rankings AS
SELECT
  c.id,
  c.name,
  c.slug,
  c.category,
  c.units,
  cys.year,
  cys.total_b6,
  cys.state_ranks_count,
  cys.first_in_course_student_name,
  cys.first_in_course_school_name,
  RANK() OVER (PARTITION BY cys.year ORDER BY cys.total_b6 DESC) AS rank
FROM course_yearly_stats cys
JOIN courses c ON c.id = cys.course_id;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Recalculate school_yearly_stats for a given school and year
CREATE OR REPLACE FUNCTION recalculate_school_stats(p_school_id UUID, p_year INTEGER)
RETURNS VOID AS $$
DECLARE
  v_total_b6          INTEGER;
  v_unique_students   INTEGER;
  v_state_ranks_count INTEGER;
  v_all_rounders_count INTEGER;
BEGIN
  SELECT
    COUNT(*)::INTEGER,
    COUNT(DISTINCT (student_first_name || '|' || student_last_name))::INTEGER,
    COUNT(*) FILTER (WHERE state_rank IS NOT NULL)::INTEGER,
    COUNT(DISTINCT (student_first_name || '|' || student_last_name)) FILTER (WHERE is_all_rounder = TRUE)::INTEGER
  INTO v_total_b6, v_unique_students, v_state_ranks_count, v_all_rounders_count
  FROM honour_roll_entries
  WHERE school_id = p_school_id AND year = p_year;

  INSERT INTO school_yearly_stats (school_id, year, total_b6, unique_students, state_ranks_count, all_rounders_count)
  VALUES (p_school_id, p_year, v_total_b6, v_unique_students, v_state_ranks_count, v_all_rounders_count)
  ON CONFLICT (school_id, year) DO UPDATE
    SET total_b6           = EXCLUDED.total_b6,
        unique_students    = EXCLUDED.unique_students,
        state_ranks_count  = EXCLUDED.state_ranks_count,
        all_rounders_count = EXCLUDED.all_rounders_count;
END;
$$ LANGUAGE plpgsql;

-- Recalculate course_yearly_stats for a given course and year
CREATE OR REPLACE FUNCTION recalculate_course_stats(p_course_id UUID, p_year INTEGER)
RETURNS VOID AS $$
DECLARE
  v_total_b6         INTEGER;
  v_state_ranks      INTEGER;
  v_fic_name         TEXT;
  v_fic_school       TEXT;
BEGIN
  SELECT COUNT(*)::INTEGER, COUNT(*) FILTER (WHERE state_rank IS NOT NULL)::INTEGER
  INTO v_total_b6, v_state_ranks
  FROM honour_roll_entries
  WHERE course_id = p_course_id AND year = p_year;

  SELECT hre.student_first_name || ' ' || hre.student_last_name, s.name
  INTO v_fic_name, v_fic_school
  FROM honour_roll_entries hre
  JOIN schools s ON s.id = hre.school_id
  WHERE hre.course_id = p_course_id AND hre.year = p_year AND hre.is_first_in_course = TRUE
  LIMIT 1;

  INSERT INTO course_yearly_stats (course_id, year, total_b6, state_ranks_count, first_in_course_student_name, first_in_course_school_name)
  VALUES (p_course_id, p_year, v_total_b6, v_state_ranks, v_fic_name, v_fic_school)
  ON CONFLICT (course_id, year) DO UPDATE
    SET total_b6                     = EXCLUDED.total_b6,
        state_ranks_count            = EXCLUDED.state_ranks_count,
        first_in_course_student_name = EXCLUDED.first_in_course_student_name,
        first_in_course_school_name  = EXCLUDED.first_in_course_school_name;
END;
$$ LANGUAGE plpgsql;

-- Full-text search helper
CREATE OR REPLACE FUNCTION search_schools_and_courses(query TEXT, result_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  type TEXT,
  id   UUID,
  name TEXT,
  slug TEXT,
  extra TEXT
) AS $$
BEGIN
  RETURN QUERY
  (
    SELECT 'school'::TEXT, s.id, s.name, s.slug, s.type
    FROM schools s
    WHERE s.name ILIKE '%' || query || '%'
    ORDER BY s.name
    LIMIT result_limit
  )
  UNION ALL
  (
    SELECT 'course'::TEXT, c.id, c.name, c.slug, c.category
    FROM courses c
    WHERE c.name ILIKE '%' || query || '%'
    ORDER BY c.name
    LIMIT result_limit
  )
  ORDER BY name
  LIMIT result_limit * 2;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY  (read-only public access)
-- ============================================================
ALTER TABLE schools              ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE honour_roll_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_yearly_stats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_yearly_stats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scaling_data         ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "public read schools"             ON schools              FOR SELECT USING (true);
CREATE POLICY "public read courses"             ON courses              FOR SELECT USING (true);
CREATE POLICY "public read honour_roll_entries" ON honour_roll_entries  FOR SELECT USING (true);
CREATE POLICY "public read school_yearly_stats" ON school_yearly_stats  FOR SELECT USING (true);
CREATE POLICY "public read course_yearly_stats" ON course_yearly_stats  FOR SELECT USING (true);
CREATE POLICY "public read scaling_data"        ON scaling_data         FOR SELECT USING (true);
