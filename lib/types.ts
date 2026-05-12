// ============================================================
// BandSix - Shared TypeScript Types
// ============================================================

export type SchoolType = 'public' | 'catholic' | 'independent' | 'other'

export interface School {
  id: string
  name: string
  type: SchoolType
  slug: string
  created_at?: string
}

export interface Course {
  id: string
  name: string
  slug: string
  category?: string
  units: number
  is_extension: boolean
  created_at?: string
}

export interface HonourRollEntry {
  id: string
  school_id: string
  course_id: string
  year: number
  student_first_name: string
  student_last_name: string
  is_first_in_course: boolean
  state_rank: number | null
  is_all_rounder: boolean
  created_at?: string
}

export interface HonourRollEntryFull extends HonourRollEntry {
  school_name: string
  school_slug: string
  school_type: SchoolType
  course_name: string
  course_slug: string
  course_category?: string
  course_units: number
  student_full_name: string
}

export interface SchoolYearlyStats {
  id: string
  school_id: string
  year: number
  total_b6: number
  unique_students: number
  state_ranks_count: number
  all_rounders_count: number
}

export interface CourseYearlyStats {
  id: string
  course_id: string
  year: number
  total_b6: number
  state_ranks_count: number
  first_in_course_student_name?: string
  first_in_course_school_name?: string
}

export interface ScalingData {
  id: string
  course_id: string
  year: number
  band6_cutoff?: number
  band5_cutoff?: number
  band4_cutoff?: number
  slope: number
  intercept: number
  mean_raw?: number
  mean_scaled?: number
  median_raw?: number
  median_scaled?: number
  std_dev_raw?: number
  std_dev_scaled?: number
  candidature?: number
}

// ---- View types (joins) ----

export interface SchoolRanking {
  id: string
  name: string
  slug: string
  type: SchoolType
  year: number
  total_b6: number
  unique_students: number
  state_ranks_count: number
  all_rounders_count: number
  rank: number
}

export interface CourseRanking {
  id: string
  name: string
  slug: string
  category?: string
  units: number
  year: number
  total_b6: number
  state_ranks_count: number
  first_in_course_student_name?: string
  first_in_course_school_name?: string
  rank: number
}

// ---- ATAR Calculator types ----

export interface SubjectEntry {
  course_id: string
  course_name: string
  units: number
  hsc_mark: number
  scaled_mark?: number
}

export interface ATARResult {
  estimated_atar: number
  atar_low: number
  atar_high: number
  aggregate: number
  subjects: SubjectEntryResult[]
}

export interface SubjectEntryResult extends SubjectEntry {
  scaled_mark: number
  scaling_data?: ScalingData
}

// ---- Search types ----

export interface SearchResult {
  type: 'school' | 'course' | 'student'
  id: string
  name: string
  slug: string
  extra?: string // school type OR course category OR school name (for student)
  year?: number  // for student results
}

// ---- API response wrappers ----

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiError {
  error: string
  details?: string
}

// ---- Chart data types ----

export interface TrendDataPoint {
  year: number
  value: number
  label?: string
}

export interface SparklineData {
  years: number[]
  values: number[]
}

// ---- Filter types ----

export interface SchoolFilters {
  year?: number
  type?: SchoolType | 'all'
  search?: string
  sort_by?: 'total_b6' | 'unique_students' | 'state_ranks_count' | 'rank'
  sort_dir?: 'asc' | 'desc'
}

export interface CourseFilters {
  year?: number
  category?: string | 'all'
  search?: string
  sort_by?: 'total_b6' | 'state_ranks_count' | 'rank'
  sort_dir?: 'asc' | 'desc'
}

export type SelectOption = {
  value: string
  label: string
}
