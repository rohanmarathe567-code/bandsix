// 2024 NSW/ACT University ATAR selection ranks (approximate published minimums).
// Source: UAC 2024 published selection ranks and university handbooks.
// These change each year - treat as a guide only.

export interface UniCourse {
  university: string
  short: string    // abbreviation shown in UI
  course: string
  atar: number     // approximate 2024 minimum selection rank
  url?: string
}

export const UNI_CUTOFFS: UniCourse[] = [
  // ── UNSW Sydney ────────────────────────────────────────────────
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Medicine/Surgery (MBBS)',         atar: 99.00, url: 'https://www.unsw.edu.au' },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Laws (LLB) / Commerce',           atar: 99.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Laws (LLB) / Arts',               atar: 97.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Law (Juris Doctor)',               atar: 98.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Actuarial Studies',                atar: 96.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Commerce (Financial Technology)',  atar: 95.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Commerce',                         atar: 93.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Commerce (Liberal Studies)',        atar: 90.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Computer Science',                 atar: 88.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Data Science & Decisions',         atar: 90.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Architecture',                     atar: 87.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Engineering (Software)',            atar: 88.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Engineering (Electrical)',          atar: 83.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Engineering (Civil)',               atar: 83.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Engineering (Mechanical)',          atar: 85.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Engineering (Chemical)',            atar: 82.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Psychology (Honours)',              atar: 82.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Science',                           atar: 80.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Arts',                              atar: 72.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Social Work',                       atar: 63.00 },
  { university: 'UNSW Sydney',           short: 'UNSW', course: 'Education',                         atar: 65.00 },

  // ── University of Sydney ────────────────────────────────────────
  { university: 'University of Sydney',  short: 'USyd', course: 'Medicine (MBBS)',                  atar: 99.00 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Law',                              atar: 98.50 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Law / Arts',                       atar: 97.00 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Dental Surgery',                   atar: 99.00 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Actuarial Studies',                atar: 96.00 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Commerce',                         atar: 91.00 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Engineering Honours',              atar: 88.00 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Computer Science',                 atar: 88.00 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Architecture',                     atar: 87.50 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Economics',                        atar: 86.00 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Pharmacy',                         atar: 85.00 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Veterinary Science',               atar: 90.00 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Psychology',                       atar: 82.00 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Science',                          atar: 80.00 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Nursing',                          atar: 72.00 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Arts',                             atar: 70.00 },
  { university: 'University of Sydney',  short: 'USyd', course: 'Education',                        atar: 65.00 },

  // ── University of Technology Sydney ────────────────────────────
  { university: 'University of Technology Sydney', short: 'UTS', course: 'Law',                    atar: 87.00 },
  { university: 'University of Technology Sydney', short: 'UTS', course: 'Journalism',              atar: 80.00 },
  { university: 'University of Technology Sydney', short: 'UTS', course: 'Communication',           atar: 77.00 },
  { university: 'University of Technology Sydney', short: 'UTS', course: 'Architecture',            atar: 82.00 },
  { university: 'University of Technology Sydney', short: 'UTS', course: 'Design (Visual Comm.)',   atar: 80.00 },
  { university: 'University of Technology Sydney', short: 'UTS', course: 'Engineering',             atar: 77.00 },
  { university: 'University of Technology Sydney', short: 'UTS', course: 'Computer Science',        atar: 75.00 },
  { university: 'University of Technology Sydney', short: 'UTS', course: 'Cybersecurity',           atar: 75.00 },
  { university: 'University of Technology Sydney', short: 'UTS', course: 'Business',                atar: 75.00 },
  { university: 'University of Technology Sydney', short: 'UTS', course: 'Accounting',              atar: 70.00 },
  { university: 'University of Technology Sydney', short: 'UTS', course: 'Science',                 atar: 72.00 },
  { university: 'University of Technology Sydney', short: 'UTS', course: 'Nursing',                 atar: 68.00 },
  { university: 'University of Technology Sydney', short: 'UTS', course: 'Education',               atar: 62.00 },

  // ── Macquarie University ────────────────────────────────────────
  { university: 'Macquarie University',  short: 'MQ',   course: 'Law',                             atar: 87.00 },
  { university: 'Macquarie University',  short: 'MQ',   course: 'Actuarial Studies',               atar: 90.00 },
  { university: 'Macquarie University',  short: 'MQ',   course: 'Commerce / IT',                   atar: 78.00 },
  { university: 'Macquarie University',  short: 'MQ',   course: 'Commerce',                        atar: 75.00 },
  { university: 'Macquarie University',  short: 'MQ',   course: 'Psychology (Honours)',             atar: 75.00 },
  { university: 'Macquarie University',  short: 'MQ',   course: 'Engineering',                     atar: 72.00 },
  { university: 'Macquarie University',  short: 'MQ',   course: 'IT',                              atar: 68.00 },
  { university: 'Macquarie University',  short: 'MQ',   course: 'Science',                         atar: 65.00 },
  { university: 'Macquarie University',  short: 'MQ',   course: 'Arts',                            atar: 60.00 },
  { university: 'Macquarie University',  short: 'MQ',   course: 'Education',                       atar: 55.00 },
  { university: 'Macquarie University',  short: 'MQ',   course: 'Nursing',                         atar: 60.00 },

  // ── Western Sydney University ───────────────────────────────────
  { university: 'Western Sydney University', short: 'WSU', course: 'Medicine (MBBS)',              atar: 80.00 },
  { university: 'Western Sydney University', short: 'WSU', course: 'Law',                          atar: 72.00 },
  { university: 'Western Sydney University', short: 'WSU', course: 'Engineering',                  atar: 65.00 },
  { university: 'Western Sydney University', short: 'WSU', course: 'Nursing',                      atar: 60.00 },
  { university: 'Western Sydney University', short: 'WSU', course: 'Psychology',                   atar: 65.00 },
  { university: 'Western Sydney University', short: 'WSU', course: 'Business',                     atar: 60.00 },
  { university: 'Western Sydney University', short: 'WSU', course: 'IT',                           atar: 60.00 },
  { university: 'Western Sydney University', short: 'WSU', course: 'Education',                    atar: 55.00 },
  { university: 'Western Sydney University', short: 'WSU', course: 'Arts',                         atar: 50.00 },
  { university: 'Western Sydney University', short: 'WSU', course: 'Social Work',                  atar: 58.00 },

  // ── Australian National University ─────────────────────────────
  { university: 'Australian National University', short: 'ANU', course: 'Medicine (MBBS)',         atar: 99.00 },
  { university: 'Australian National University', short: 'ANU', course: 'Law',                     atar: 92.00 },
  { university: 'Australian National University', short: 'ANU', course: 'International Relations', atar: 86.00 },
  { university: 'Australian National University', short: 'ANU', course: 'Computer Science',        atar: 80.00 },
  { university: 'Australian National University', short: 'ANU', course: 'Engineering',             atar: 80.00 },
  { university: 'Australian National University', short: 'ANU', course: 'Economics',               atar: 80.00 },
  { university: 'Australian National University', short: 'ANU', course: 'Science',                 atar: 78.00 },
  { university: 'Australian National University', short: 'ANU', course: 'Arts',                    atar: 68.00 },

  // ── University of Newcastle ─────────────────────────────────────
  { university: 'University of Newcastle', short: 'UoN', course: 'Medicine (MBBS)',               atar: 85.00 },
  { university: 'University of Newcastle', short: 'UoN', course: 'Law',                           atar: 80.00 },
  { university: 'University of Newcastle', short: 'UoN', course: 'Engineering',                   atar: 68.00 },
  { university: 'University of Newcastle', short: 'UoN', course: 'Nursing',                       atar: 62.00 },
  { university: 'University of Newcastle', short: 'UoN', course: 'Psychology',                    atar: 68.00 },
  { university: 'University of Newcastle', short: 'UoN', course: 'Business',                      atar: 62.00 },
  { university: 'University of Newcastle', short: 'UoN', course: 'Education',                     atar: 55.00 },
  { university: 'University of Newcastle', short: 'UoN', course: 'Science',                       atar: 60.00 },

  // ── University of Wollongong ────────────────────────────────────
  { university: 'University of Wollongong', short: 'UOW', course: 'Law',                          atar: 78.00 },
  { university: 'University of Wollongong', short: 'UOW', course: 'Engineering',                  atar: 65.00 },
  { university: 'University of Wollongong', short: 'UOW', course: 'Computer Science',             atar: 65.00 },
  { university: 'University of Wollongong', short: 'UOW', course: 'Business',                     atar: 60.00 },
  { university: 'University of Wollongong', short: 'UOW', course: 'Nursing',                      atar: 62.00 },
  { university: 'University of Wollongong', short: 'UOW', course: 'Science',                      atar: 60.00 },
  { university: 'University of Wollongong', short: 'UOW', course: 'Education',                    atar: 55.00 },
  { university: 'University of Wollongong', short: 'UOW', course: 'Arts',                         atar: 55.00 },
]

// Group cut-offs by university for display
export function groupByUniversity(cutoffs: UniCourse[]): Record<string, UniCourse[]> {
  return cutoffs.reduce((acc, c) => {
    if (!acc[c.university]) acc[c.university] = []
    acc[c.university].push(c)
    return acc
  }, {} as Record<string, UniCourse[]>)
}

// Return only courses where the ATAR qualifies
export function matchingCourses(atar: number, cutoffs: UniCourse[] = UNI_CUTOFFS): UniCourse[] {
  return cutoffs.filter(c => atar >= c.atar).sort((a, b) => b.atar - a.atar)
}
