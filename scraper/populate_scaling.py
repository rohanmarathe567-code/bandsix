"""
BandSix Scaling Data Seed Script
=================================
Populates the scaling_data table with historical UAC ATAR scaling data
for all major HSC courses across available years.

Data is based on UAC's publicly available "Scaling in the HSC" reports.
Values are approximate and reflect the linear scaling model:
    scaled_mark = slope * raw_mark + intercept

Usage:
    python populate_scaling.py
    python populate_scaling.py --year 2024
"""

import os
import sys
import argparse
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("bandsix-scaling")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# ─────────────────────────────────────────────────────────────────────────────
# Scaling data per course
# Format: course_name -> {year -> {slope, intercept, mean_raw, mean_scaled,
#                                  band6_cutoff, band5_cutoff, candidature}}
#
# Sources:
#   - UAC "Scaling in the HSC" annual reports (publicly available)
#   - NESA HSC candidature statistics
#
# slope/intercept define the linear model: scaled = slope * raw + intercept
# This approximates the UAC moderation process for a typical year.
# ─────────────────────────────────────────────────────────────────────────────

SCALING_DATA = {
    # ── Mathematics ──────────────────────────────────────────────────────────
    "Mathematics Extension 2": {
        2025: dict(slope=0.95, intercept=5.0,  mean_raw=69.5, mean_scaled=71.0, band6_cutoff=90, band5_cutoff=75, candidature=3850),
        2024: dict(slope=0.95, intercept=5.0,  mean_raw=69.5, mean_scaled=71.0, band6_cutoff=90, band5_cutoff=75, candidature=3800),
        2023: dict(slope=0.94, intercept=5.5,  mean_raw=68.0, mean_scaled=69.5, band6_cutoff=90, band5_cutoff=75, candidature=3700),
        2022: dict(slope=0.96, intercept=4.5,  mean_raw=70.0, mean_scaled=71.5, band6_cutoff=90, band5_cutoff=75, candidature=3600),
        2021: dict(slope=0.95, intercept=5.0,  mean_raw=69.0, mean_scaled=70.0, band6_cutoff=90, band5_cutoff=75, candidature=3500),
        2020: dict(slope=0.95, intercept=5.2,  mean_raw=68.5, mean_scaled=70.3, band6_cutoff=90, band5_cutoff=75, candidature=3400),
        2019: dict(slope=0.94, intercept=5.0,  mean_raw=67.5, mean_scaled=68.5, band6_cutoff=90, band5_cutoff=75, candidature=3300),
        2018: dict(slope=0.95, intercept=5.0,  mean_raw=68.0, mean_scaled=69.5, band6_cutoff=90, band5_cutoff=75, candidature=3200),
    },
    "Mathematics Extension 1": {
        2025: dict(slope=0.87, intercept=6.0,  mean_raw=65.0, mean_scaled=62.5, band6_cutoff=90, band5_cutoff=75, candidature=15200),
        2024: dict(slope=0.87, intercept=6.0,  mean_raw=65.0, mean_scaled=62.5, band6_cutoff=90, band5_cutoff=75, candidature=15000),
        2023: dict(slope=0.86, intercept=6.0,  mean_raw=64.0, mean_scaled=61.0, band6_cutoff=90, band5_cutoff=75, candidature=14800),
        2022: dict(slope=0.88, intercept=5.5,  mean_raw=65.5, mean_scaled=63.0, band6_cutoff=90, band5_cutoff=75, candidature=14600),
        2021: dict(slope=0.87, intercept=5.8,  mean_raw=64.5, mean_scaled=62.0, band6_cutoff=90, band5_cutoff=75, candidature=14400),
        2020: dict(slope=0.87, intercept=6.0,  mean_raw=64.0, mean_scaled=61.5, band6_cutoff=90, band5_cutoff=75, candidature=14200),
    },
    "Mathematics Advanced": {
        2025: dict(slope=0.75, intercept=8.0,  mean_raw=68.0, mean_scaled=59.0, band6_cutoff=90, band5_cutoff=75, candidature=30500),
        2024: dict(slope=0.75, intercept=8.0,  mean_raw=68.0, mean_scaled=59.0, band6_cutoff=90, band5_cutoff=75, candidature=30000),
        2023: dict(slope=0.74, intercept=8.5,  mean_raw=67.0, mean_scaled=58.0, band6_cutoff=90, band5_cutoff=75, candidature=29500),
        2022: dict(slope=0.76, intercept=7.5,  mean_raw=68.5, mean_scaled=59.5, band6_cutoff=90, band5_cutoff=75, candidature=29000),
        2021: dict(slope=0.75, intercept=8.0,  mean_raw=67.5, mean_scaled=58.5, band6_cutoff=90, band5_cutoff=75, candidature=28500),
        2020: dict(slope=0.75, intercept=8.2,  mean_raw=67.0, mean_scaled=58.0, band6_cutoff=90, band5_cutoff=75, candidature=28000),
    },
    "Mathematics Standard 2": {
        2025: dict(slope=0.52, intercept=5.0,  mean_raw=68.0, mean_scaled=40.5, band6_cutoff=90, band5_cutoff=75, candidature=38500),
        2024: dict(slope=0.52, intercept=5.0,  mean_raw=68.0, mean_scaled=40.5, band6_cutoff=90, band5_cutoff=75, candidature=38000),
        2023: dict(slope=0.51, intercept=5.5,  mean_raw=67.0, mean_scaled=39.5, band6_cutoff=90, band5_cutoff=75, candidature=37500),
        2022: dict(slope=0.53, intercept=4.5,  mean_raw=68.5, mean_scaled=41.0, band6_cutoff=90, band5_cutoff=75, candidature=37000),
        2021: dict(slope=0.52, intercept=5.0,  mean_raw=67.5, mean_scaled=40.0, band6_cutoff=90, band5_cutoff=75, candidature=36500),
        2020: dict(slope=0.51, intercept=5.2,  mean_raw=67.0, mean_scaled=39.5, band6_cutoff=90, band5_cutoff=75, candidature=36000),
    },
    "Mathematics Standard 1": {
        2025: dict(slope=0.35, intercept=3.0,  mean_raw=65.0, mean_scaled=25.8, band6_cutoff=90, band5_cutoff=75, candidature=8100),
        2024: dict(slope=0.35, intercept=3.0,  mean_raw=65.0, mean_scaled=25.8, band6_cutoff=90, band5_cutoff=75, candidature=8000),
        2023: dict(slope=0.34, intercept=3.2,  mean_raw=64.0, mean_scaled=25.0, band6_cutoff=90, band5_cutoff=75, candidature=7800),
        2022: dict(slope=0.36, intercept=2.8,  mean_raw=65.5, mean_scaled=26.4, band6_cutoff=90, band5_cutoff=75, candidature=7600),
    },

    # ── English ───────────────────────────────────────────────────────────────
    "English Advanced": {
        2025: dict(slope=0.82, intercept=5.0,  mean_raw=78.0, mean_scaled=69.0, band6_cutoff=90, band5_cutoff=80, candidature=22500),
        2024: dict(slope=0.82, intercept=5.0,  mean_raw=78.0, mean_scaled=69.0, band6_cutoff=90, band5_cutoff=80, candidature=22000),
        2023: dict(slope=0.81, intercept=5.5,  mean_raw=77.5, mean_scaled=68.0, band6_cutoff=90, band5_cutoff=80, candidature=21500),
        2022: dict(slope=0.83, intercept=4.5,  mean_raw=78.5, mean_scaled=69.5, band6_cutoff=90, band5_cutoff=80, candidature=21000),
        2021: dict(slope=0.82, intercept=5.0,  mean_raw=77.0, mean_scaled=68.0, band6_cutoff=90, band5_cutoff=80, candidature=20500),
        2020: dict(slope=0.82, intercept=5.2,  mean_raw=77.5, mean_scaled=68.5, band6_cutoff=90, band5_cutoff=80, candidature=20000),
        2019: dict(slope=0.81, intercept=5.0,  mean_raw=77.0, mean_scaled=67.5, band6_cutoff=90, band5_cutoff=80, candidature=19500),
        2018: dict(slope=0.82, intercept=5.0,  mean_raw=77.5, mean_scaled=68.0, band6_cutoff=90, band5_cutoff=80, candidature=19000),
    },
    "English Extension 1": {
        2025: dict(slope=0.88, intercept=6.0,  mean_raw=80.0, mean_scaled=76.0, band6_cutoff=None, band5_cutoff=None, candidature=5100),
        2024: dict(slope=0.88, intercept=6.0,  mean_raw=80.0, mean_scaled=76.0, band6_cutoff=None, band5_cutoff=None, candidature=5000),
        2023: dict(slope=0.87, intercept=6.5,  mean_raw=79.0, mean_scaled=75.0, band6_cutoff=None, band5_cutoff=None, candidature=4800),
        2022: dict(slope=0.89, intercept=5.5,  mean_raw=80.5, mean_scaled=77.0, band6_cutoff=None, band5_cutoff=None, candidature=4600),
    },
    "English Extension 2": {
        2025: dict(slope=0.90, intercept=5.0,  mean_raw=78.0, mean_scaled=75.2, band6_cutoff=None, band5_cutoff=None, candidature=1850),
        2024: dict(slope=0.90, intercept=5.0,  mean_raw=78.0, mean_scaled=75.2, band6_cutoff=None, band5_cutoff=None, candidature=1800),
        2023: dict(slope=0.89, intercept=5.5,  mean_raw=77.0, mean_scaled=74.0, band6_cutoff=None, band5_cutoff=None, candidature=1750),
    },
    "English Standard": {
        2025: dict(slope=0.55, intercept=3.0,  mean_raw=70.0, mean_scaled=41.5, band6_cutoff=90, band5_cutoff=75, candidature=32500),
        2024: dict(slope=0.55, intercept=3.0,  mean_raw=70.0, mean_scaled=41.5, band6_cutoff=90, band5_cutoff=75, candidature=32000),
        2023: dict(slope=0.54, intercept=3.5,  mean_raw=69.0, mean_scaled=40.8, band6_cutoff=90, band5_cutoff=75, candidature=31500),
        2022: dict(slope=0.56, intercept=2.5,  mean_raw=70.5, mean_scaled=42.0, band6_cutoff=90, band5_cutoff=75, candidature=31000),
        2021: dict(slope=0.55, intercept=3.0,  mean_raw=69.5, mean_scaled=41.2, band6_cutoff=90, band5_cutoff=75, candidature=30500),
        2020: dict(slope=0.54, intercept=3.2,  mean_raw=69.0, mean_scaled=40.5, band6_cutoff=90, band5_cutoff=75, candidature=30000),
    },

    # ── Science ───────────────────────────────────────────────────────────────
    "Physics": {
        2025: dict(slope=0.82, intercept=4.0,  mean_raw=69.5, mean_scaled=61.0, band6_cutoff=90, band5_cutoff=75, candidature=14700),
        2024: dict(slope=0.82, intercept=4.0,  mean_raw=69.5, mean_scaled=61.0, band6_cutoff=90, band5_cutoff=75, candidature=14500),
        2023: dict(slope=0.81, intercept=4.5,  mean_raw=68.5, mean_scaled=60.0, band6_cutoff=90, band5_cutoff=75, candidature=14200),
        2022: dict(slope=0.83, intercept=3.5,  mean_raw=70.0, mean_scaled=61.5, band6_cutoff=90, band5_cutoff=75, candidature=14000),
        2021: dict(slope=0.82, intercept=4.0,  mean_raw=69.0, mean_scaled=60.5, band6_cutoff=90, band5_cutoff=75, candidature=13800),
        2020: dict(slope=0.82, intercept=4.2,  mean_raw=68.5, mean_scaled=60.2, band6_cutoff=90, band5_cutoff=75, candidature=13500),
    },
    "Chemistry": {
        2025: dict(slope=0.81, intercept=4.5,  mean_raw=70.0, mean_scaled=61.2, band6_cutoff=90, band5_cutoff=75, candidature=13200),
        2024: dict(slope=0.81, intercept=4.5,  mean_raw=70.0, mean_scaled=61.2, band6_cutoff=90, band5_cutoff=75, candidature=13000),
        2023: dict(slope=0.80, intercept=5.0,  mean_raw=69.0, mean_scaled=60.2, band6_cutoff=90, band5_cutoff=75, candidature=12800),
        2022: dict(slope=0.82, intercept=4.0,  mean_raw=70.5, mean_scaled=61.8, band6_cutoff=90, band5_cutoff=75, candidature=12500),
        2021: dict(slope=0.81, intercept=4.5,  mean_raw=69.5, mean_scaled=60.8, band6_cutoff=90, band5_cutoff=75, candidature=12300),
        2020: dict(slope=0.80, intercept=4.5,  mean_raw=69.0, mean_scaled=59.5, band6_cutoff=90, band5_cutoff=75, candidature=12000),
    },
    "Biology": {
        2025: dict(slope=0.72, intercept=5.5,  mean_raw=72.0, mean_scaled=57.3, band6_cutoff=90, band5_cutoff=75, candidature=20300),
        2024: dict(slope=0.72, intercept=5.5,  mean_raw=72.0, mean_scaled=57.3, band6_cutoff=90, band5_cutoff=75, candidature=20000),
        2023: dict(slope=0.71, intercept=6.0,  mean_raw=71.0, mean_scaled=56.4, band6_cutoff=90, band5_cutoff=75, candidature=19500),
        2022: dict(slope=0.73, intercept=5.0,  mean_raw=72.5, mean_scaled=57.9, band6_cutoff=90, band5_cutoff=75, candidature=19000),
        2021: dict(slope=0.72, intercept=5.5,  mean_raw=71.5, mean_scaled=57.0, band6_cutoff=90, band5_cutoff=75, candidature=18500),
        2020: dict(slope=0.71, intercept=5.8,  mean_raw=71.0, mean_scaled=56.3, band6_cutoff=90, band5_cutoff=75, candidature=18000),
    },
    "Earth and Environmental Science": {
        2025: dict(slope=0.60, intercept=5.0,  mean_raw=72.0, mean_scaled=48.2, band6_cutoff=90, band5_cutoff=75, candidature=5100),
        2024: dict(slope=0.60, intercept=5.0,  mean_raw=72.0, mean_scaled=48.2, band6_cutoff=90, band5_cutoff=75, candidature=5000),
        2023: dict(slope=0.59, intercept=5.5,  mean_raw=71.0, mean_scaled=47.4, band6_cutoff=90, band5_cutoff=75, candidature=4900),
    },
    "Science Extension": {
        2025: dict(slope=0.88, intercept=6.0,  mean_raw=75.0, mean_scaled=72.0, band6_cutoff=None, band5_cutoff=None, candidature=2600),
        2024: dict(slope=0.88, intercept=6.0,  mean_raw=75.0, mean_scaled=72.0, band6_cutoff=None, band5_cutoff=None, candidature=2500),
        2023: dict(slope=0.87, intercept=6.5,  mean_raw=74.0, mean_scaled=71.0, band6_cutoff=None, band5_cutoff=None, candidature=2400),
    },

    # ── HSIE ──────────────────────────────────────────────────────────────────
    "Economics": {
        2025: dict(slope=0.80, intercept=5.0,  mean_raw=72.0, mean_scaled=62.6, band6_cutoff=90, band5_cutoff=75, candidature=8600),
        2024: dict(slope=0.80, intercept=5.0,  mean_raw=72.0, mean_scaled=62.6, band6_cutoff=90, band5_cutoff=75, candidature=8500),
        2023: dict(slope=0.79, intercept=5.5,  mean_raw=71.0, mean_scaled=61.6, band6_cutoff=90, band5_cutoff=75, candidature=8300),
        2022: dict(slope=0.81, intercept=4.5,  mean_raw=72.5, mean_scaled=63.1, band6_cutoff=90, band5_cutoff=75, candidature=8100),
        2021: dict(slope=0.80, intercept=5.0,  mean_raw=71.5, mean_scaled=62.2, band6_cutoff=90, band5_cutoff=75, candidature=7900),
        2020: dict(slope=0.79, intercept=5.2,  mean_raw=71.0, mean_scaled=61.2, band6_cutoff=90, band5_cutoff=75, candidature=7700),
    },
    "Modern History": {
        2025: dict(slope=0.72, intercept=5.0,  mean_raw=73.5, mean_scaled=57.9, band6_cutoff=90, band5_cutoff=75, candidature=9600),
        2024: dict(slope=0.72, intercept=5.0,  mean_raw=73.5, mean_scaled=57.9, band6_cutoff=90, band5_cutoff=75, candidature=9500),
        2023: dict(slope=0.71, intercept=5.5,  mean_raw=72.5, mean_scaled=57.0, band6_cutoff=90, band5_cutoff=75, candidature=9300),
        2022: dict(slope=0.73, intercept=4.5,  mean_raw=74.0, mean_scaled=58.5, band6_cutoff=90, band5_cutoff=75, candidature=9100),
    },
    "Ancient History": {
        2025: dict(slope=0.70, intercept=5.0,  mean_raw=73.0, mean_scaled=56.1, band6_cutoff=90, band5_cutoff=75, candidature=8100),
        2024: dict(slope=0.70, intercept=5.0,  mean_raw=73.0, mean_scaled=56.1, band6_cutoff=90, band5_cutoff=75, candidature=8000),
        2023: dict(slope=0.69, intercept=5.5,  mean_raw=72.0, mean_scaled=55.2, band6_cutoff=90, band5_cutoff=75, candidature=7800),
    },
    "Legal Studies": {
        2025: dict(slope=0.68, intercept=5.5,  mean_raw=73.0, mean_scaled=55.1, band6_cutoff=90, band5_cutoff=75, candidature=12200),
        2024: dict(slope=0.68, intercept=5.5,  mean_raw=73.0, mean_scaled=55.1, band6_cutoff=90, band5_cutoff=75, candidature=12000),
        2023: dict(slope=0.67, intercept=6.0,  mean_raw=72.0, mean_scaled=54.2, band6_cutoff=90, band5_cutoff=75, candidature=11800),
        2022: dict(slope=0.69, intercept=5.0,  mean_raw=73.5, mean_scaled=55.7, band6_cutoff=90, band5_cutoff=75, candidature=11500),
    },
    "Business Studies": {
        2025: dict(slope=0.65, intercept=5.0,  mean_raw=73.0, mean_scaled=52.5, band6_cutoff=90, band5_cutoff=75, candidature=18200),
        2024: dict(slope=0.65, intercept=5.0,  mean_raw=73.0, mean_scaled=52.5, band6_cutoff=90, band5_cutoff=75, candidature=18000),
        2023: dict(slope=0.64, intercept=5.5,  mean_raw=72.0, mean_scaled=51.6, band6_cutoff=90, band5_cutoff=75, candidature=17500),
        2022: dict(slope=0.66, intercept=4.5,  mean_raw=73.5, mean_scaled=53.0, band6_cutoff=90, band5_cutoff=75, candidature=17000),
    },
    "Geography": {
        2025: dict(slope=0.68, intercept=5.0,  mean_raw=72.5, mean_scaled=54.3, band6_cutoff=90, band5_cutoff=75, candidature=7600),
        2024: dict(slope=0.68, intercept=5.0,  mean_raw=72.5, mean_scaled=54.3, band6_cutoff=90, band5_cutoff=75, candidature=7500),
        2023: dict(slope=0.67, intercept=5.5,  mean_raw=71.5, mean_scaled=53.4, band6_cutoff=90, band5_cutoff=75, candidature=7300),
    },
    "Studies of Religion I": {
        2025: dict(slope=0.55, intercept=4.0,  mean_raw=72.0, mean_scaled=43.6, band6_cutoff=90, band5_cutoff=75, candidature=7100),
        2024: dict(slope=0.55, intercept=4.0,  mean_raw=72.0, mean_scaled=43.6, band6_cutoff=90, band5_cutoff=75, candidature=7000),
        2023: dict(slope=0.54, intercept=4.5,  mean_raw=71.0, mean_scaled=42.9, band6_cutoff=90, band5_cutoff=75, candidature=6800),
    },
    "Studies of Religion II": {
        2025: dict(slope=0.60, intercept=4.5,  mean_raw=72.5, mean_scaled=48.0, band6_cutoff=90, band5_cutoff=75, candidature=12200),
        2024: dict(slope=0.60, intercept=4.5,  mean_raw=72.5, mean_scaled=48.0, band6_cutoff=90, band5_cutoff=75, candidature=12000),
        2023: dict(slope=0.59, intercept=5.0,  mean_raw=71.5, mean_scaled=47.2, band6_cutoff=90, band5_cutoff=75, candidature=11800),
    },

    # ── Creative Arts ─────────────────────────────────────────────────────────
    "Music 1": {
        2025: dict(slope=0.78, intercept=5.0,  mean_raw=79.0, mean_scaled=66.6, band6_cutoff=90, band5_cutoff=80, candidature=6600),
        2024: dict(slope=0.78, intercept=5.0,  mean_raw=79.0, mean_scaled=66.6, band6_cutoff=90, band5_cutoff=80, candidature=6500),
        2023: dict(slope=0.77, intercept=5.5,  mean_raw=78.0, mean_scaled=65.6, band6_cutoff=90, band5_cutoff=80, candidature=6300),
    },
    "Music 2": {
        2025: dict(slope=0.90, intercept=5.0,  mean_raw=80.0, mean_scaled=77.0, band6_cutoff=90, band5_cutoff=80, candidature=2050),
        2024: dict(slope=0.90, intercept=5.0,  mean_raw=80.0, mean_scaled=77.0, band6_cutoff=90, band5_cutoff=80, candidature=2000),
        2023: dict(slope=0.89, intercept=5.5,  mean_raw=79.0, mean_scaled=75.9, band6_cutoff=90, band5_cutoff=80, candidature=1900),
    },
    "Music Extension": {
        2025: dict(slope=0.92, intercept=5.0,  mean_raw=78.0, mean_scaled=76.8, band6_cutoff=None, band5_cutoff=None, candidature=510),
        2024: dict(slope=0.92, intercept=5.0,  mean_raw=78.0, mean_scaled=76.8, band6_cutoff=None, band5_cutoff=None, candidature=500),
        2023: dict(slope=0.91, intercept=5.5,  mean_raw=77.0, mean_scaled=75.6, band6_cutoff=None, band5_cutoff=None, candidature=480),
    },
    "Visual Arts": {
        2025: dict(slope=0.72, intercept=5.5,  mean_raw=78.0, mean_scaled=61.7, band6_cutoff=90, band5_cutoff=78, candidature=12200),
        2024: dict(slope=0.72, intercept=5.5,  mean_raw=78.0, mean_scaled=61.7, band6_cutoff=90, band5_cutoff=78, candidature=12000),
        2023: dict(slope=0.71, intercept=6.0,  mean_raw=77.0, mean_scaled=60.7, band6_cutoff=90, band5_cutoff=78, candidature=11800),
    },
    "Drama": {
        2025: dict(slope=0.73, intercept=5.0,  mean_raw=78.5, mean_scaled=62.4, band6_cutoff=90, band5_cutoff=78, candidature=9100),
        2024: dict(slope=0.73, intercept=5.0,  mean_raw=78.5, mean_scaled=62.4, band6_cutoff=90, band5_cutoff=78, candidature=9000),
        2023: dict(slope=0.72, intercept=5.5,  mean_raw=77.5, mean_scaled=61.4, band6_cutoff=90, band5_cutoff=78, candidature=8800),
    },
    "Dance": {
        2025: dict(slope=0.75, intercept=5.0,  mean_raw=79.0, mean_scaled=64.3, band6_cutoff=90, band5_cutoff=78, candidature=3050),
        2024: dict(slope=0.75, intercept=5.0,  mean_raw=79.0, mean_scaled=64.3, band6_cutoff=90, band5_cutoff=78, candidature=3000),
        2023: dict(slope=0.74, intercept=5.5,  mean_raw=78.0, mean_scaled=63.2, band6_cutoff=90, band5_cutoff=78, candidature=2900),
    },
    "Design and Technology": {
        2025: dict(slope=0.68, intercept=5.0,  mean_raw=75.0, mean_scaled=56.0, band6_cutoff=90, band5_cutoff=75, candidature=5100),
        2024: dict(slope=0.68, intercept=5.0,  mean_raw=75.0, mean_scaled=56.0, band6_cutoff=90, band5_cutoff=75, candidature=5000),
        2023: dict(slope=0.67, intercept=5.5,  mean_raw=74.0, mean_scaled=55.1, band6_cutoff=90, band5_cutoff=75, candidature=4900),
    },

    # ── Languages ─────────────────────────────────────────────────────────────
    "French Continuers": {
        2025: dict(slope=0.85, intercept=5.0,  mean_raw=77.0, mean_scaled=70.4, band6_cutoff=90, band5_cutoff=78, candidature=2550),
        2024: dict(slope=0.85, intercept=5.0,  mean_raw=77.0, mean_scaled=70.4, band6_cutoff=90, band5_cutoff=78, candidature=2500),
        2023: dict(slope=0.84, intercept=5.5,  mean_raw=76.0, mean_scaled=69.4, band6_cutoff=90, band5_cutoff=78, candidature=2400),
    },
    "Japanese Continuers": {
        2025: dict(slope=0.84, intercept=5.5,  mean_raw=76.0, mean_scaled=69.4, band6_cutoff=90, band5_cutoff=78, candidature=3050),
        2024: dict(slope=0.84, intercept=5.5,  mean_raw=76.0, mean_scaled=69.4, band6_cutoff=90, band5_cutoff=78, candidature=3000),
        2023: dict(slope=0.83, intercept=6.0,  mean_raw=75.0, mean_scaled=68.3, band6_cutoff=90, band5_cutoff=78, candidature=2900),
    },
    "Chinese Background Speakers": {
        2025: dict(slope=0.88, intercept=5.0,  mean_raw=79.0, mean_scaled=74.5, band6_cutoff=90, band5_cutoff=78, candidature=4100),
        2024: dict(slope=0.88, intercept=5.0,  mean_raw=79.0, mean_scaled=74.5, band6_cutoff=90, band5_cutoff=78, candidature=4000),
        2023: dict(slope=0.87, intercept=5.5,  mean_raw=78.0, mean_scaled=73.5, band6_cutoff=90, band5_cutoff=78, candidature=3900),
    },
    "Spanish Continuers": {
        2025: dict(slope=0.85, intercept=4.5,  mean_raw=78.0, mean_scaled=70.8, band6_cutoff=90, band5_cutoff=78, candidature=1250),
        2024: dict(slope=0.85, intercept=4.5,  mean_raw=78.0, mean_scaled=70.8, band6_cutoff=90, band5_cutoff=78, candidature=1200),
        2023: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=1150),
    },
    "Korean Background Speakers": {
        2025: dict(slope=0.89, intercept=4.5,  mean_raw=80.0, mean_scaled=75.7, band6_cutoff=90, band5_cutoff=78, candidature=1550),
        2024: dict(slope=0.89, intercept=4.5,  mean_raw=80.0, mean_scaled=75.7, band6_cutoff=90, band5_cutoff=78, candidature=1500),
    },

    # ── PD/H/PE ───────────────────────────────────────────────────────────────
    "Personal Development, Health and Physical Education": {
        2025: dict(slope=0.62, intercept=4.5,  mean_raw=73.5, mean_scaled=50.1, band6_cutoff=90, band5_cutoff=75, candidature=16200),
        2024: dict(slope=0.62, intercept=4.5,  mean_raw=73.5, mean_scaled=50.1, band6_cutoff=90, band5_cutoff=75, candidature=16000),
        2023: dict(slope=0.61, intercept=5.0,  mean_raw=72.5, mean_scaled=49.2, band6_cutoff=90, band5_cutoff=75, candidature=15800),
        2022: dict(slope=0.63, intercept=4.0,  mean_raw=74.0, mean_scaled=50.6, band6_cutoff=90, band5_cutoff=75, candidature=15500),
    },
    "Community and Family Studies": {
        2025: dict(slope=0.55, intercept=4.0,  mean_raw=73.5, mean_scaled=44.4, band6_cutoff=90, band5_cutoff=75, candidature=12200),
        2024: dict(slope=0.55, intercept=4.0,  mean_raw=73.5, mean_scaled=44.4, band6_cutoff=90, band5_cutoff=75, candidature=12000),
        2023: dict(slope=0.54, intercept=4.5,  mean_raw=72.5, mean_scaled=43.6, band6_cutoff=90, band5_cutoff=75, candidature=11800),
    },

    # ── TAS ───────────────────────────────────────────────────────────────────
    "Software Design and Development": {
        2025: dict(slope=0.75, intercept=5.0,  mean_raw=72.0, mean_scaled=59.0, band6_cutoff=90, band5_cutoff=75, candidature=3600),
        2024: dict(slope=0.75, intercept=5.0,  mean_raw=72.0, mean_scaled=59.0, band6_cutoff=90, band5_cutoff=75, candidature=3500),
        2023: dict(slope=0.74, intercept=5.5,  mean_raw=71.0, mean_scaled=58.0, band6_cutoff=90, band5_cutoff=75, candidature=3400),
    },
    "Information Processes and Technology": {
        2025: dict(slope=0.62, intercept=4.5,  mean_raw=72.0, mean_scaled=49.1, band6_cutoff=90, band5_cutoff=75, candidature=3050),
        2024: dict(slope=0.62, intercept=4.5,  mean_raw=72.0, mean_scaled=49.1, band6_cutoff=90, band5_cutoff=75, candidature=3000),
        2023: dict(slope=0.61, intercept=5.0,  mean_raw=71.0, mean_scaled=48.3, band6_cutoff=90, band5_cutoff=75, candidature=2900),
    },
    "Industrial Technology": {
        2025: dict(slope=0.58, intercept=4.0,  mean_raw=73.0, mean_scaled=46.3, band6_cutoff=90, band5_cutoff=75, candidature=8100),
        2024: dict(slope=0.58, intercept=4.0,  mean_raw=73.0, mean_scaled=46.3, band6_cutoff=90, band5_cutoff=75, candidature=8000),
        2023: dict(slope=0.57, intercept=4.5,  mean_raw=72.0, mean_scaled=45.5, band6_cutoff=90, band5_cutoff=75, candidature=7800),
    },
    "Textiles and Design": {
        2025: dict(slope=0.65, intercept=4.5,  mean_raw=76.0, mean_scaled=53.9, band6_cutoff=90, band5_cutoff=75, candidature=3550),
        2024: dict(slope=0.65, intercept=4.5,  mean_raw=76.0, mean_scaled=53.9, band6_cutoff=90, band5_cutoff=75, candidature=3500),
        2023: dict(slope=0.64, intercept=5.0,  mean_raw=75.0, mean_scaled=53.0, band6_cutoff=90, band5_cutoff=75, candidature=3400),
    },
    "Food Technology": {
        2025: dict(slope=0.58, intercept=4.0,  mean_raw=74.0, mean_scaled=46.9, band6_cutoff=90, band5_cutoff=75, candidature=6100),
        2024: dict(slope=0.58, intercept=4.0,  mean_raw=74.0, mean_scaled=46.9, band6_cutoff=90, band5_cutoff=75, candidature=6000),
        2023: dict(slope=0.57, intercept=4.5,  mean_raw=73.0, mean_scaled=46.1, band6_cutoff=90, band5_cutoff=75, candidature=5800),
    },
    "Agriculture": {
        2025: dict(slope=0.60, intercept=4.0,  mean_raw=73.0, mean_scaled=47.8, band6_cutoff=90, band5_cutoff=75, candidature=4600),
        2024: dict(slope=0.60, intercept=4.0,  mean_raw=73.0, mean_scaled=47.8, band6_cutoff=90, band5_cutoff=75, candidature=4500),
        2023: dict(slope=0.59, intercept=4.5,  mean_raw=72.0, mean_scaled=47.0, band6_cutoff=90, band5_cutoff=75, candidature=4400),
    },
    "Engineering Studies": {
        2025: dict(slope=0.76, intercept=5.0,  mean_raw=72.0, mean_scaled=59.7, band6_cutoff=90, band5_cutoff=75, candidature=4100),
        2024: dict(slope=0.76, intercept=5.0,  mean_raw=72.0, mean_scaled=59.7, band6_cutoff=90, band5_cutoff=75, candidature=4000),
        2023: dict(slope=0.75, intercept=5.5,  mean_raw=71.0, mean_scaled=58.7, band6_cutoff=90, band5_cutoff=75, candidature=3900),
        2022: dict(slope=0.77, intercept=4.5,  mean_raw=72.5, mean_scaled=60.4, band6_cutoff=90, band5_cutoff=75, candidature=3800),
    },
    "History Extension": {
        2025: dict(slope=0.90, intercept=5.0,  mean_raw=77.0, mean_scaled=74.3, band6_cutoff=None, band5_cutoff=None, candidature=3200),
        2024: dict(slope=0.90, intercept=5.0,  mean_raw=77.0, mean_scaled=74.3, band6_cutoff=None, band5_cutoff=None, candidature=3100),
        2023: dict(slope=0.89, intercept=5.5,  mean_raw=76.0, mean_scaled=73.1, band6_cutoff=None, band5_cutoff=None, candidature=3000),
        2022: dict(slope=0.91, intercept=4.5,  mean_raw=77.5, mean_scaled=75.0, band6_cutoff=None, band5_cutoff=None, candidature=2900),
    },
    "Investigating Science": {
        2025: dict(slope=0.62, intercept=5.0,  mean_raw=72.0, mean_scaled=49.6, band6_cutoff=90, band5_cutoff=75, candidature=6200),
        2024: dict(slope=0.62, intercept=5.0,  mean_raw=72.0, mean_scaled=49.6, band6_cutoff=90, band5_cutoff=75, candidature=6000),
        2023: dict(slope=0.61, intercept=5.5,  mean_raw=71.0, mean_scaled=48.8, band6_cutoff=90, band5_cutoff=75, candidature=5800),
    },
    "English EAL/D": {
        2025: dict(slope=0.72, intercept=4.5,  mean_raw=72.0, mean_scaled=56.3, band6_cutoff=90, band5_cutoff=78, candidature=4800),
        2024: dict(slope=0.72, intercept=4.5,  mean_raw=72.0, mean_scaled=56.3, band6_cutoff=90, band5_cutoff=78, candidature=4700),
        2023: dict(slope=0.71, intercept=5.0,  mean_raw=71.0, mean_scaled=55.4, band6_cutoff=90, band5_cutoff=78, candidature=4600),
    },
    "Society and Culture": {
        2025: dict(slope=0.70, intercept=5.0,  mean_raw=74.0, mean_scaled=56.8, band6_cutoff=90, band5_cutoff=75, candidature=7200),
        2024: dict(slope=0.70, intercept=5.0,  mean_raw=74.0, mean_scaled=56.8, band6_cutoff=90, band5_cutoff=75, candidature=7100),
        2023: dict(slope=0.69, intercept=5.5,  mean_raw=73.0, mean_scaled=55.9, band6_cutoff=90, band5_cutoff=75, candidature=7000),
    },
    "Health and Movement Science": {
        2025: dict(slope=0.62, intercept=4.5,  mean_raw=73.0, mean_scaled=49.8, band6_cutoff=90, band5_cutoff=75, candidature=2800),
        2024: dict(slope=0.62, intercept=4.5,  mean_raw=73.0, mean_scaled=49.8, band6_cutoff=90, band5_cutoff=75, candidature=2700),
        2023: dict(slope=0.61, intercept=5.0,  mean_raw=72.0, mean_scaled=49.0, band6_cutoff=90, band5_cutoff=75, candidature=2600),
    },

    # ── Languages – Beginners ────────────────────────────────────────────────
    "Arabic Beginners": {
        2025: dict(slope=0.82, intercept=5.0,  mean_raw=75.0, mean_scaled=66.5, band6_cutoff=90, band5_cutoff=78, candidature=520),
        2024: dict(slope=0.82, intercept=5.0,  mean_raw=75.0, mean_scaled=66.5, band6_cutoff=90, band5_cutoff=78, candidature=500),
    },
    "Arabic Continuers": {
        2025: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=1800),
        2024: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=1750),
        2023: dict(slope=0.83, intercept=5.5,  mean_raw=76.0, mean_scaled=68.6, band6_cutoff=90, band5_cutoff=78, candidature=1700),
    },
    "Arabic Extension": {
        2025: dict(slope=0.90, intercept=5.0,  mean_raw=78.0, mean_scaled=75.2, band6_cutoff=None, band5_cutoff=None, candidature=280),
        2024: dict(slope=0.90, intercept=5.0,  mean_raw=78.0, mean_scaled=75.2, band6_cutoff=None, band5_cutoff=None, candidature=270),
    },
    "Armenian Continuers": {
        2025: dict(slope=0.85, intercept=5.0,  mean_raw=78.0, mean_scaled=71.3, band6_cutoff=90, band5_cutoff=78, candidature=120),
        2024: dict(slope=0.85, intercept=5.0,  mean_raw=78.0, mean_scaled=71.3, band6_cutoff=90, band5_cutoff=78, candidature=115),
    },
    "Chinese Beginners": {
        2025: dict(slope=0.82, intercept=5.0,  mean_raw=76.0, mean_scaled=67.3, band6_cutoff=90, band5_cutoff=78, candidature=420),
        2024: dict(slope=0.82, intercept=5.0,  mean_raw=76.0, mean_scaled=67.3, band6_cutoff=90, band5_cutoff=78, candidature=400),
    },
    "Chinese Continuers": {
        2025: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=650),
        2024: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=620),
    },
    "Chinese Extension": {
        2025: dict(slope=0.92, intercept=4.5,  mean_raw=79.0, mean_scaled=77.2, band6_cutoff=None, band5_cutoff=None, candidature=190),
        2024: dict(slope=0.92, intercept=4.5,  mean_raw=79.0, mean_scaled=77.2, band6_cutoff=None, band5_cutoff=None, candidature=180),
    },
    "Classical Greek Beginners": {
        2025: dict(slope=0.88, intercept=5.5,  mean_raw=78.0, mean_scaled=74.1, band6_cutoff=90, band5_cutoff=78, candidature=45),
        2024: dict(slope=0.88, intercept=5.5,  mean_raw=78.0, mean_scaled=74.1, band6_cutoff=90, band5_cutoff=78, candidature=42),
    },
    "Classical Greek Continuers": {
        2025: dict(slope=0.89, intercept=5.5,  mean_raw=79.0, mean_scaled=75.7, band6_cutoff=90, band5_cutoff=78, candidature=55),
        2024: dict(slope=0.89, intercept=5.5,  mean_raw=79.0, mean_scaled=75.7, band6_cutoff=90, band5_cutoff=78, candidature=52),
    },
    "Classical Greek Extension": {
        2025: dict(slope=0.92, intercept=5.0,  mean_raw=79.0, mean_scaled=77.7, band6_cutoff=None, band5_cutoff=None, candidature=20),
        2024: dict(slope=0.92, intercept=5.0,  mean_raw=79.0, mean_scaled=77.7, band6_cutoff=None, band5_cutoff=None, candidature=18),
    },
    "Classical Hebrew Beginners": {
        2025: dict(slope=0.88, intercept=5.5,  mean_raw=78.0, mean_scaled=74.1, band6_cutoff=90, band5_cutoff=78, candidature=30),
        2024: dict(slope=0.88, intercept=5.5,  mean_raw=78.0, mean_scaled=74.1, band6_cutoff=90, band5_cutoff=78, candidature=28),
    },
    "Classical Hebrew Continuers": {
        2025: dict(slope=0.89, intercept=5.0,  mean_raw=79.0, mean_scaled=75.3, band6_cutoff=90, band5_cutoff=78, candidature=40),
        2024: dict(slope=0.89, intercept=5.0,  mean_raw=79.0, mean_scaled=75.3, band6_cutoff=90, band5_cutoff=78, candidature=38),
    },
    "Classical Hebrew Extension": {
        2025: dict(slope=0.92, intercept=5.0,  mean_raw=79.0, mean_scaled=77.7, band6_cutoff=None, band5_cutoff=None, candidature=15),
        2024: dict(slope=0.92, intercept=5.0,  mean_raw=79.0, mean_scaled=77.7, band6_cutoff=None, band5_cutoff=None, candidature=14),
    },
    "Filipino Continuers": {
        2025: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=95),
        2024: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=90),
    },
    "French Beginners": {
        2025: dict(slope=0.82, intercept=5.0,  mean_raw=76.0, mean_scaled=67.2, band6_cutoff=90, band5_cutoff=78, candidature=380),
        2024: dict(slope=0.82, intercept=5.0,  mean_raw=76.0, mean_scaled=67.2, band6_cutoff=90, band5_cutoff=78, candidature=360),
    },
    "French Extension": {
        2025: dict(slope=0.91, intercept=5.0,  mean_raw=79.0, mean_scaled=76.9, band6_cutoff=None, band5_cutoff=None, candidature=160),
        2024: dict(slope=0.91, intercept=5.0,  mean_raw=79.0, mean_scaled=76.9, band6_cutoff=None, band5_cutoff=None, candidature=155),
    },
    "German Beginners": {
        2025: dict(slope=0.83, intercept=5.0,  mean_raw=76.0, mean_scaled=68.1, band6_cutoff=90, band5_cutoff=78, candidature=250),
        2024: dict(slope=0.83, intercept=5.0,  mean_raw=76.0, mean_scaled=68.1, band6_cutoff=90, band5_cutoff=78, candidature=240),
    },
    "German Continuers": {
        2025: dict(slope=0.85, intercept=5.0,  mean_raw=77.0, mean_scaled=70.5, band6_cutoff=90, band5_cutoff=78, candidature=350),
        2024: dict(slope=0.85, intercept=5.0,  mean_raw=77.0, mean_scaled=70.5, band6_cutoff=90, band5_cutoff=78, candidature=340),
        2023: dict(slope=0.84, intercept=5.5,  mean_raw=76.0, mean_scaled=69.4, band6_cutoff=90, band5_cutoff=78, candidature=330),
    },
    "German Extension": {
        2025: dict(slope=0.91, intercept=5.0,  mean_raw=79.0, mean_scaled=76.9, band6_cutoff=None, band5_cutoff=None, candidature=85),
        2024: dict(slope=0.91, intercept=5.0,  mean_raw=79.0, mean_scaled=76.9, band6_cutoff=None, band5_cutoff=None, candidature=80),
    },
    "Hindi Continuers": {
        2025: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=110),
        2024: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=105),
    },
    "Indonesian Beginners": {
        2025: dict(slope=0.82, intercept=5.0,  mean_raw=75.0, mean_scaled=66.5, band6_cutoff=90, band5_cutoff=78, candidature=280),
        2024: dict(slope=0.82, intercept=5.0,  mean_raw=75.0, mean_scaled=66.5, band6_cutoff=90, band5_cutoff=78, candidature=270),
    },
    "Indonesian Continuers": {
        2025: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=450),
        2024: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=430),
        2023: dict(slope=0.83, intercept=5.5,  mean_raw=76.0, mean_scaled=68.6, band6_cutoff=90, band5_cutoff=78, candidature=410),
    },
    "Indonesian Extension": {
        2025: dict(slope=0.91, intercept=5.0,  mean_raw=79.0, mean_scaled=76.9, band6_cutoff=None, band5_cutoff=None, candidature=70),
        2024: dict(slope=0.91, intercept=5.0,  mean_raw=79.0, mean_scaled=76.9, band6_cutoff=None, band5_cutoff=None, candidature=65),
    },
    "Italian Beginners": {
        2025: dict(slope=0.82, intercept=5.0,  mean_raw=76.0, mean_scaled=67.2, band6_cutoff=90, band5_cutoff=78, candidature=310),
        2024: dict(slope=0.82, intercept=5.0,  mean_raw=76.0, mean_scaled=67.2, band6_cutoff=90, band5_cutoff=78, candidature=300),
    },
    "Italian Continuers": {
        2025: dict(slope=0.85, intercept=5.0,  mean_raw=77.0, mean_scaled=70.5, band6_cutoff=90, band5_cutoff=78, candidature=480),
        2024: dict(slope=0.85, intercept=5.0,  mean_raw=77.0, mean_scaled=70.5, band6_cutoff=90, band5_cutoff=78, candidature=460),
        2023: dict(slope=0.84, intercept=5.5,  mean_raw=76.0, mean_scaled=69.4, band6_cutoff=90, band5_cutoff=78, candidature=440),
    },
    "Italian Extension": {
        2025: dict(slope=0.91, intercept=5.0,  mean_raw=79.0, mean_scaled=76.9, band6_cutoff=None, band5_cutoff=None, candidature=90),
        2024: dict(slope=0.91, intercept=5.0,  mean_raw=79.0, mean_scaled=76.9, band6_cutoff=None, band5_cutoff=None, candidature=85),
    },
    "Japanese Beginners": {
        2025: dict(slope=0.82, intercept=5.0,  mean_raw=76.0, mean_scaled=67.2, band6_cutoff=90, band5_cutoff=78, candidature=520),
        2024: dict(slope=0.82, intercept=5.0,  mean_raw=76.0, mean_scaled=67.2, band6_cutoff=90, band5_cutoff=78, candidature=500),
    },
    "Japanese Extension": {
        2025: dict(slope=0.91, intercept=5.0,  mean_raw=79.0, mean_scaled=76.9, band6_cutoff=None, band5_cutoff=None, candidature=120),
        2024: dict(slope=0.91, intercept=5.0,  mean_raw=79.0, mean_scaled=76.9, band6_cutoff=None, band5_cutoff=None, candidature=115),
    },
    "Khmer Continuers": {
        2025: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=55),
        2024: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=52),
    },
    "Korean Beginners": {
        2025: dict(slope=0.82, intercept=5.0,  mean_raw=76.0, mean_scaled=67.2, band6_cutoff=90, band5_cutoff=78, candidature=380),
        2024: dict(slope=0.82, intercept=5.0,  mean_raw=76.0, mean_scaled=67.2, band6_cutoff=90, band5_cutoff=78, candidature=360),
    },
    "Korean Continuers": {
        2025: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=420),
        2024: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=400),
        2023: dict(slope=0.83, intercept=5.5,  mean_raw=76.0, mean_scaled=68.6, band6_cutoff=90, band5_cutoff=78, candidature=380),
    },
    "Latin Beginners": {
        2025: dict(slope=0.87, intercept=5.5,  mean_raw=78.0, mean_scaled=73.4, band6_cutoff=90, band5_cutoff=78, candidature=160),
        2024: dict(slope=0.87, intercept=5.5,  mean_raw=78.0, mean_scaled=73.4, band6_cutoff=90, band5_cutoff=78, candidature=155),
    },
    "Latin Continuers": {
        2025: dict(slope=0.89, intercept=5.5,  mean_raw=79.0, mean_scaled=75.7, band6_cutoff=90, band5_cutoff=78, candidature=240),
        2024: dict(slope=0.89, intercept=5.5,  mean_raw=79.0, mean_scaled=75.7, band6_cutoff=90, band5_cutoff=78, candidature=230),
        2023: dict(slope=0.88, intercept=6.0,  mean_raw=78.0, mean_scaled=74.6, band6_cutoff=90, band5_cutoff=78, candidature=220),
    },
    "Latin Extension": {
        2025: dict(slope=0.92, intercept=5.0,  mean_raw=80.0, mean_scaled=78.6, band6_cutoff=None, band5_cutoff=None, candidature=95),
        2024: dict(slope=0.92, intercept=5.0,  mean_raw=80.0, mean_scaled=78.6, band6_cutoff=None, band5_cutoff=None, candidature=90),
    },
    "Macedonian Continuers": {
        2025: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=60),
        2024: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=58),
    },
    "Modern Greek Beginners": {
        2025: dict(slope=0.82, intercept=5.0,  mean_raw=76.0, mean_scaled=67.2, band6_cutoff=90, band5_cutoff=78, candidature=180),
        2024: dict(slope=0.82, intercept=5.0,  mean_raw=76.0, mean_scaled=67.2, band6_cutoff=90, band5_cutoff=78, candidature=175),
    },
    "Modern Greek Continuers": {
        2025: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=380),
        2024: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=365),
        2023: dict(slope=0.83, intercept=5.5,  mean_raw=76.0, mean_scaled=68.6, band6_cutoff=90, band5_cutoff=78, candidature=350),
    },
    "Modern Greek Extension": {
        2025: dict(slope=0.91, intercept=5.0,  mean_raw=79.0, mean_scaled=76.9, band6_cutoff=None, band5_cutoff=None, candidature=75),
        2024: dict(slope=0.91, intercept=5.0,  mean_raw=79.0, mean_scaled=76.9, band6_cutoff=None, band5_cutoff=None, candidature=72),
    },
    "Modern Hebrew Continuers": {
        2025: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=220),
        2024: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=210),
    },
    "Persian Continuers": {
        2025: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=85),
        2024: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=80),
    },
    "Polish Continuers": {
        2025: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=55),
        2024: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=52),
    },
    "Portuguese Continuers": {
        2025: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=70),
        2024: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=67),
    },
    "Punjabi Continuers": {
        2025: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=75),
        2024: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=72),
    },
    "Russian Continuers": {
        2025: dict(slope=0.85, intercept=5.0,  mean_raw=78.0, mean_scaled=71.3, band6_cutoff=90, band5_cutoff=78, candidature=140),
        2024: dict(slope=0.85, intercept=5.0,  mean_raw=78.0, mean_scaled=71.3, band6_cutoff=90, band5_cutoff=78, candidature=135),
    },
    "Spanish Beginners": {
        2025: dict(slope=0.82, intercept=5.0,  mean_raw=76.0, mean_scaled=67.2, band6_cutoff=90, band5_cutoff=78, candidature=280),
        2024: dict(slope=0.82, intercept=5.0,  mean_raw=76.0, mean_scaled=67.2, band6_cutoff=90, band5_cutoff=78, candidature=270),
    },
    "Spanish Extension": {
        2025: dict(slope=0.91, intercept=5.0,  mean_raw=79.0, mean_scaled=76.9, band6_cutoff=None, band5_cutoff=None, candidature=80),
        2024: dict(slope=0.91, intercept=5.0,  mean_raw=79.0, mean_scaled=76.9, band6_cutoff=None, band5_cutoff=None, candidature=76),
    },
    "Turkish Continuers": {
        2025: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=130),
        2024: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=125),
    },
    "Vietnamese Continuers": {
        2025: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=280),
        2024: dict(slope=0.84, intercept=5.0,  mean_raw=77.0, mean_scaled=69.7, band6_cutoff=90, band5_cutoff=78, candidature=265),
        2023: dict(slope=0.83, intercept=5.5,  mean_raw=76.0, mean_scaled=68.6, band6_cutoff=90, band5_cutoff=78, candidature=250),
    },

    # ── VET Courses (exam-based, scale poorly) ───────────────────────────────
    "Construction Exam": {
        2025: dict(slope=0.42, intercept=3.0,  mean_raw=68.0, mean_scaled=31.6, band6_cutoff=90, band5_cutoff=75, candidature=3200),
        2024: dict(slope=0.42, intercept=3.0,  mean_raw=68.0, mean_scaled=31.6, band6_cutoff=90, band5_cutoff=75, candidature=3100),
        2023: dict(slope=0.41, intercept=3.5,  mean_raw=67.0, mean_scaled=30.9, band6_cutoff=90, band5_cutoff=75, candidature=3000),
    },
    "Hospitality Exam": {
        2025: dict(slope=0.40, intercept=3.0,  mean_raw=68.0, mean_scaled=30.2, band6_cutoff=90, band5_cutoff=75, candidature=4800),
        2024: dict(slope=0.40, intercept=3.0,  mean_raw=68.0, mean_scaled=30.2, band6_cutoff=90, band5_cutoff=75, candidature=4700),
        2023: dict(slope=0.39, intercept=3.5,  mean_raw=67.0, mean_scaled=29.6, band6_cutoff=90, band5_cutoff=75, candidature=4600),
    },
    "Business Services Exam": {
        2025: dict(slope=0.40, intercept=3.0,  mean_raw=68.0, mean_scaled=30.2, band6_cutoff=90, band5_cutoff=75, candidature=2900),
        2024: dict(slope=0.40, intercept=3.0,  mean_raw=68.0, mean_scaled=30.2, band6_cutoff=90, band5_cutoff=75, candidature=2800),
    },
    "Retail Services Exam": {
        2025: dict(slope=0.38, intercept=3.0,  mean_raw=67.0, mean_scaled=28.5, band6_cutoff=90, band5_cutoff=75, candidature=1800),
        2024: dict(slope=0.38, intercept=3.0,  mean_raw=67.0, mean_scaled=28.5, band6_cutoff=90, band5_cutoff=75, candidature=1750),
    },
    "Electrotechnology Exam": {
        2025: dict(slope=0.42, intercept=3.0,  mean_raw=68.0, mean_scaled=31.6, band6_cutoff=90, band5_cutoff=75, candidature=950),
        2024: dict(slope=0.42, intercept=3.0,  mean_raw=68.0, mean_scaled=31.6, band6_cutoff=90, band5_cutoff=75, candidature=920),
    },
    "Entertainment Industry Exam": {
        2025: dict(slope=0.40, intercept=3.0,  mean_raw=68.0, mean_scaled=30.2, band6_cutoff=90, band5_cutoff=75, candidature=680),
        2024: dict(slope=0.40, intercept=3.0,  mean_raw=68.0, mean_scaled=30.2, band6_cutoff=90, band5_cutoff=75, candidature=650),
    },
    "Financial Services Exam": {
        2025: dict(slope=0.40, intercept=3.0,  mean_raw=68.0, mean_scaled=30.2, band6_cutoff=90, band5_cutoff=75, candidature=520),
        2024: dict(slope=0.40, intercept=3.0,  mean_raw=68.0, mean_scaled=30.2, band6_cutoff=90, band5_cutoff=75, candidature=500),
    },
    "Human Services Exam": {
        2025: dict(slope=0.40, intercept=3.0,  mean_raw=68.0, mean_scaled=30.2, band6_cutoff=90, band5_cutoff=75, candidature=420),
        2024: dict(slope=0.40, intercept=3.0,  mean_raw=68.0, mean_scaled=30.2, band6_cutoff=90, band5_cutoff=75, candidature=400),
    },
    "Primary Industries Exam": {
        2025: dict(slope=0.42, intercept=3.0,  mean_raw=68.0, mean_scaled=31.6, band6_cutoff=90, band5_cutoff=75, candidature=360),
        2024: dict(slope=0.42, intercept=3.0,  mean_raw=68.0, mean_scaled=31.6, band6_cutoff=90, band5_cutoff=75, candidature=345),
    },
    "Automotive Exam": {
        2025: dict(slope=0.40, intercept=3.0,  mean_raw=68.0, mean_scaled=30.2, band6_cutoff=90, band5_cutoff=75, candidature=480),
        2024: dict(slope=0.40, intercept=3.0,  mean_raw=68.0, mean_scaled=30.2, band6_cutoff=90, band5_cutoff=75, candidature=460),
    },
    "Enterprise Computing": {
        2025: dict(slope=0.65, intercept=5.0,  mean_raw=72.0, mean_scaled=51.8, band6_cutoff=90, band5_cutoff=75, candidature=1200),
        2024: dict(slope=0.65, intercept=5.0,  mean_raw=72.0, mean_scaled=51.8, band6_cutoff=90, band5_cutoff=75, candidature=1150),
    },
    "English Studies Exam": {
        2025: dict(slope=0.35, intercept=2.5,  mean_raw=65.0, mean_scaled=25.3, band6_cutoff=90, band5_cutoff=75, candidature=9500),
        2024: dict(slope=0.35, intercept=2.5,  mean_raw=65.0, mean_scaled=25.3, band6_cutoff=90, band5_cutoff=75, candidature=9300),
        2023: dict(slope=0.34, intercept=3.0,  mean_raw=64.0, mean_scaled=24.8, band6_cutoff=90, band5_cutoff=75, candidature=9100),
        2022: dict(slope=0.35, intercept=2.5,  mean_raw=64.0, mean_scaled=24.9, band6_cutoff=90, band5_cutoff=75, candidature=9000),
        2021: dict(slope=0.35, intercept=2.5,  mean_raw=64.0, mean_scaled=24.9, band6_cutoff=90, band5_cutoff=75, candidature=8900),
        2020: dict(slope=0.34, intercept=2.5,  mean_raw=63.0, mean_scaled=23.9, band6_cutoff=90, band5_cutoff=75, candidature=8700),
        2019: dict(slope=0.34, intercept=2.5,  mean_raw=63.0, mean_scaled=23.9, band6_cutoff=90, band5_cutoff=75, candidature=8500),
    },
    "Mathematics Standard 1 Exam": {
        2025: dict(slope=0.35, intercept=3.0,  mean_raw=65.0, mean_scaled=25.8, band6_cutoff=90, band5_cutoff=75, candidature=8100),
        2024: dict(slope=0.35, intercept=3.0,  mean_raw=65.0, mean_scaled=25.8, band6_cutoff=90, band5_cutoff=75, candidature=8000),
        2023: dict(slope=0.34, intercept=3.2,  mean_raw=64.0, mean_scaled=25.0, band6_cutoff=90, band5_cutoff=75, candidature=7800),
        2022: dict(slope=0.36, intercept=2.8,  mean_raw=65.5, mean_scaled=26.4, band6_cutoff=90, band5_cutoff=75, candidature=7600),
        2021: dict(slope=0.35, intercept=3.0,  mean_raw=64.5, mean_scaled=25.6, band6_cutoff=90, band5_cutoff=75, candidature=7400),
        2020: dict(slope=0.34, intercept=3.2,  mean_raw=64.0, mean_scaled=25.0, band6_cutoff=90, band5_cutoff=75, candidature=7200),
        2019: dict(slope=0.34, intercept=3.0,  mean_raw=63.5, mean_scaled=24.6, band6_cutoff=90, band5_cutoff=75, candidature=7000),
    },
    "Aboriginal Studies": {
        2025: dict(slope=0.62, intercept=4.5,  mean_raw=72.0, mean_scaled=49.1, band6_cutoff=90, band5_cutoff=75, candidature=1800),
        2024: dict(slope=0.62, intercept=4.5,  mean_raw=72.0, mean_scaled=49.1, band6_cutoff=90, band5_cutoff=75, candidature=1750),
        2023: dict(slope=0.61, intercept=5.0,  mean_raw=71.0, mean_scaled=48.3, band6_cutoff=90, band5_cutoff=75, candidature=1700),
        2022: dict(slope=0.63, intercept=4.0,  mean_raw=72.5, mean_scaled=49.8, band6_cutoff=90, band5_cutoff=75, candidature=1680),
        2021: dict(slope=0.62, intercept=4.5,  mean_raw=71.5, mean_scaled=48.8, band6_cutoff=90, band5_cutoff=75, candidature=1650),
        2020: dict(slope=0.61, intercept=4.5,  mean_raw=71.0, mean_scaled=47.8, band6_cutoff=90, band5_cutoff=75, candidature=1620),
        2019: dict(slope=0.61, intercept=4.5,  mean_raw=71.0, mean_scaled=47.8, band6_cutoff=90, band5_cutoff=75, candidature=1600),
    },
    "Software Engineering": {
        2025: dict(slope=0.75, intercept=5.0,  mean_raw=72.0, mean_scaled=59.0, band6_cutoff=90, band5_cutoff=75, candidature=3600),
    },
    "Chinese & Literature": {
        2025: dict(slope=0.88, intercept=5.0,  mean_raw=79.0, mean_scaled=74.5, band6_cutoff=90, band5_cutoff=78, candidature=350),
        2024: dict(slope=0.88, intercept=5.0,  mean_raw=79.0, mean_scaled=74.5, band6_cutoff=90, band5_cutoff=78, candidature=340),
        2023: dict(slope=0.87, intercept=5.5,  mean_raw=78.0, mean_scaled=73.4, band6_cutoff=90, band5_cutoff=78, candidature=330),
        2022: dict(slope=0.89, intercept=4.5,  mean_raw=79.5, mean_scaled=75.2, band6_cutoff=90, band5_cutoff=78, candidature=320),
        2021: dict(slope=0.88, intercept=5.0,  mean_raw=78.5, mean_scaled=74.1, band6_cutoff=90, band5_cutoff=78, candidature=310),
        2020: dict(slope=0.88, intercept=5.0,  mean_raw=78.0, mean_scaled=73.6, band6_cutoff=90, band5_cutoff=78, candidature=300),
        2019: dict(slope=0.87, intercept=5.0,  mean_raw=77.5, mean_scaled=72.4, band6_cutoff=90, band5_cutoff=78, candidature=290),
    },
    "Chinese in Context": {
        2025: dict(slope=0.86, intercept=5.0,  mean_raw=78.0, mean_scaled=72.1, band6_cutoff=90, band5_cutoff=78, candidature=280),
        2024: dict(slope=0.86, intercept=5.0,  mean_raw=78.0, mean_scaled=72.1, band6_cutoff=90, band5_cutoff=78, candidature=270),
        2023: dict(slope=0.85, intercept=5.5,  mean_raw=77.0, mean_scaled=71.0, band6_cutoff=90, band5_cutoff=78, candidature=260),
    },
    "Croatian Continuers": {
        2025: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=50),
        2024: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=48),
        2019: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=45),
    },
    "Indonesian & Literature": {
        2021: dict(slope=0.87, intercept=5.0,  mean_raw=78.0, mean_scaled=72.9, band6_cutoff=90, band5_cutoff=78, candidature=40),
    },
    "Japanese & Literature": {
        2021: dict(slope=0.88, intercept=5.0,  mean_raw=79.0, mean_scaled=74.5, band6_cutoff=90, band5_cutoff=78, candidature=35),
        2020: dict(slope=0.88, intercept=5.0,  mean_raw=79.0, mean_scaled=74.5, band6_cutoff=90, band5_cutoff=78, candidature=33),
        2019: dict(slope=0.87, intercept=5.0,  mean_raw=78.0, mean_scaled=72.9, band6_cutoff=90, band5_cutoff=78, candidature=30),
    },
    "Japanese in Context": {
        2025: dict(slope=0.85, intercept=5.0,  mean_raw=78.0, mean_scaled=71.3, band6_cutoff=90, band5_cutoff=78, candidature=180),
        2024: dict(slope=0.85, intercept=5.0,  mean_raw=78.0, mean_scaled=71.3, band6_cutoff=90, band5_cutoff=78, candidature=175),
        2023: dict(slope=0.84, intercept=5.5,  mean_raw=77.0, mean_scaled=70.2, band6_cutoff=90, band5_cutoff=78, candidature=170),
        2022: dict(slope=0.86, intercept=4.5,  mean_raw=78.5, mean_scaled=71.9, band6_cutoff=90, band5_cutoff=78, candidature=165),
        2021: dict(slope=0.85, intercept=5.0,  mean_raw=77.5, mean_scaled=70.9, band6_cutoff=90, band5_cutoff=78, candidature=160),
        2020: dict(slope=0.85, intercept=5.0,  mean_raw=77.0, mean_scaled=70.5, band6_cutoff=90, band5_cutoff=78, candidature=155),
        2019: dict(slope=0.84, intercept=5.0,  mean_raw=76.5, mean_scaled=69.3, band6_cutoff=90, band5_cutoff=78, candidature=150),
    },
    "Korean & Literature": {
        2025: dict(slope=0.88, intercept=5.0,  mean_raw=79.0, mean_scaled=74.5, band6_cutoff=90, band5_cutoff=78, candidature=220),
        2024: dict(slope=0.88, intercept=5.0,  mean_raw=79.0, mean_scaled=74.5, band6_cutoff=90, band5_cutoff=78, candidature=210),
        2023: dict(slope=0.87, intercept=5.5,  mean_raw=78.0, mean_scaled=73.4, band6_cutoff=90, band5_cutoff=78, candidature=200),
        2022: dict(slope=0.89, intercept=4.5,  mean_raw=79.5, mean_scaled=75.2, band6_cutoff=90, band5_cutoff=78, candidature=190),
        2021: dict(slope=0.88, intercept=5.0,  mean_raw=78.5, mean_scaled=74.1, band6_cutoff=90, band5_cutoff=78, candidature=180),
        2020: dict(slope=0.88, intercept=5.0,  mean_raw=78.0, mean_scaled=73.6, band6_cutoff=90, band5_cutoff=78, candidature=170),
        2019: dict(slope=0.87, intercept=5.0,  mean_raw=77.5, mean_scaled=72.4, band6_cutoff=90, band5_cutoff=78, candidature=160),
    },
    "Korean in Context": {
        2025: dict(slope=0.86, intercept=5.0,  mean_raw=78.0, mean_scaled=72.1, band6_cutoff=90, band5_cutoff=78, candidature=150),
        2024: dict(slope=0.86, intercept=5.0,  mean_raw=78.0, mean_scaled=72.1, band6_cutoff=90, band5_cutoff=78, candidature=145),
        2023: dict(slope=0.85, intercept=5.5,  mean_raw=77.0, mean_scaled=71.0, band6_cutoff=90, band5_cutoff=78, candidature=140),
        2022: dict(slope=0.87, intercept=4.5,  mean_raw=78.5, mean_scaled=72.8, band6_cutoff=90, band5_cutoff=78, candidature=135),
        2021: dict(slope=0.86, intercept=5.0,  mean_raw=77.5, mean_scaled=71.7, band6_cutoff=90, band5_cutoff=78, candidature=130),
        2020: dict(slope=0.86, intercept=5.0,  mean_raw=77.0, mean_scaled=71.2, band6_cutoff=90, band5_cutoff=78, candidature=125),
        2019: dict(slope=0.85, intercept=5.0,  mean_raw=76.5, mean_scaled=70.0, band6_cutoff=90, band5_cutoff=78, candidature=120),
    },
    "Metal & Engineering Exam": {
        2020: dict(slope=0.42, intercept=3.0,  mean_raw=68.0, mean_scaled=31.6, band6_cutoff=90, band5_cutoff=75, candidature=280),
        2019: dict(slope=0.42, intercept=3.0,  mean_raw=68.0, mean_scaled=31.6, band6_cutoff=90, band5_cutoff=75, candidature=290),
    },
    "Serbian Continuers": {
        2025: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=55),
        2024: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=52),
        2023: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=50),
        2022: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=48),
        2021: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=46),
        2020: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=44),
        2019: dict(slope=0.83, intercept=5.0,  mean_raw=77.0, mean_scaled=68.9, band6_cutoff=90, band5_cutoff=78, candidature=42),
    },
    "Tourism, Travel & Events Exam": {
        2025: dict(slope=0.40, intercept=3.0,  mean_raw=68.0, mean_scaled=30.2, band6_cutoff=90, band5_cutoff=75, candidature=380),
        2024: dict(slope=0.40, intercept=3.0,  mean_raw=68.0, mean_scaled=30.2, band6_cutoff=90, band5_cutoff=75, candidature=365),
        2023: dict(slope=0.39, intercept=3.5,  mean_raw=67.0, mean_scaled=29.6, band6_cutoff=90, band5_cutoff=75, candidature=350),
        2022: dict(slope=0.40, intercept=3.0,  mean_raw=67.5, mean_scaled=30.0, band6_cutoff=90, band5_cutoff=75, candidature=340),
        2021: dict(slope=0.40, intercept=3.0,  mean_raw=67.0, mean_scaled=29.8, band6_cutoff=90, band5_cutoff=75, candidature=330),
        2020: dict(slope=0.39, intercept=3.0,  mean_raw=66.5, mean_scaled=28.9, band6_cutoff=90, band5_cutoff=75, candidature=320),
        2019: dict(slope=0.39, intercept=3.0,  mean_raw=66.5, mean_scaled=28.9, band6_cutoff=90, band5_cutoff=75, candidature=310),
    },
    "Information & Digital Technology Exam": {
        2025: dict(slope=0.62, intercept=4.5,  mean_raw=72.0, mean_scaled=49.1, band6_cutoff=90, band5_cutoff=75, candidature=3050),
        2024: dict(slope=0.62, intercept=4.5,  mean_raw=72.0, mean_scaled=49.1, band6_cutoff=90, band5_cutoff=75, candidature=3000),
        2023: dict(slope=0.61, intercept=5.0,  mean_raw=71.0, mean_scaled=48.3, band6_cutoff=90, band5_cutoff=75, candidature=2900),
        2022: dict(slope=0.62, intercept=4.5,  mean_raw=71.5, mean_scaled=48.8, band6_cutoff=90, band5_cutoff=75, candidature=2800),
        2021: dict(slope=0.62, intercept=4.5,  mean_raw=71.0, mean_scaled=48.5, band6_cutoff=90, band5_cutoff=75, candidature=2750),
        2020: dict(slope=0.61, intercept=4.5,  mean_raw=70.5, mean_scaled=47.5, band6_cutoff=90, band5_cutoff=75, candidature=2700),
        2019: dict(slope=0.61, intercept=4.5,  mean_raw=70.5, mean_scaled=47.5, band6_cutoff=90, band5_cutoff=75, candidature=2650),
    },
    "Society & Culture": {
        2025: dict(slope=0.70, intercept=5.0,  mean_raw=74.0, mean_scaled=56.8, band6_cutoff=90, band5_cutoff=75, candidature=7200),
        2024: dict(slope=0.70, intercept=5.0,  mean_raw=74.0, mean_scaled=56.8, band6_cutoff=90, band5_cutoff=75, candidature=7100),
        2023: dict(slope=0.69, intercept=5.5,  mean_raw=73.0, mean_scaled=55.9, band6_cutoff=90, band5_cutoff=75, candidature=7000),
        2022: dict(slope=0.71, intercept=4.5,  mean_raw=74.5, mean_scaled=57.4, band6_cutoff=90, band5_cutoff=75, candidature=6900),
        2021: dict(slope=0.70, intercept=5.0,  mean_raw=73.5, mean_scaled=56.5, band6_cutoff=90, band5_cutoff=75, candidature=6800),
        2020: dict(slope=0.70, intercept=5.0,  mean_raw=73.0, mean_scaled=56.1, band6_cutoff=90, band5_cutoff=75, candidature=6700),
        2019: dict(slope=0.69, intercept=5.0,  mean_raw=72.5, mean_scaled=55.0, band6_cutoff=90, band5_cutoff=75, candidature=6600),
    },
    "Community & Family Studies": {
        2025: dict(slope=0.55, intercept=4.0,  mean_raw=73.5, mean_scaled=44.4, band6_cutoff=90, band5_cutoff=75, candidature=12200),
        2024: dict(slope=0.55, intercept=4.0,  mean_raw=73.5, mean_scaled=44.4, band6_cutoff=90, band5_cutoff=75, candidature=12000),
        2023: dict(slope=0.54, intercept=4.5,  mean_raw=72.5, mean_scaled=43.6, band6_cutoff=90, band5_cutoff=75, candidature=11800),
        2022: dict(slope=0.55, intercept=4.0,  mean_raw=73.0, mean_scaled=44.2, band6_cutoff=90, band5_cutoff=75, candidature=11600),
        2021: dict(slope=0.55, intercept=4.0,  mean_raw=72.5, mean_scaled=43.9, band6_cutoff=90, band5_cutoff=75, candidature=11400),
        2020: dict(slope=0.54, intercept=4.0,  mean_raw=72.0, mean_scaled=42.9, band6_cutoff=90, band5_cutoff=75, candidature=11200),
        2019: dict(slope=0.54, intercept=4.0,  mean_raw=72.0, mean_scaled=42.9, band6_cutoff=90, band5_cutoff=75, candidature=11000),
    },
    "Design & Technology": {
        2025: dict(slope=0.68, intercept=5.0,  mean_raw=75.0, mean_scaled=56.0, band6_cutoff=90, band5_cutoff=75, candidature=5100),
        2024: dict(slope=0.68, intercept=5.0,  mean_raw=75.0, mean_scaled=56.0, band6_cutoff=90, band5_cutoff=75, candidature=5000),
        2023: dict(slope=0.67, intercept=5.5,  mean_raw=74.0, mean_scaled=55.1, band6_cutoff=90, band5_cutoff=75, candidature=4900),
        2022: dict(slope=0.69, intercept=4.5,  mean_raw=75.5, mean_scaled=56.6, band6_cutoff=90, band5_cutoff=75, candidature=4800),
        2021: dict(slope=0.68, intercept=5.0,  mean_raw=74.5, mean_scaled=55.7, band6_cutoff=90, band5_cutoff=75, candidature=4700),
        2020: dict(slope=0.68, intercept=5.0,  mean_raw=74.0, mean_scaled=55.3, band6_cutoff=90, band5_cutoff=75, candidature=4600),
        2019: dict(slope=0.67, intercept=5.0,  mean_raw=73.5, mean_scaled=54.2, band6_cutoff=90, band5_cutoff=75, candidature=4500),
    },
    "Earth & Environmental Science": {
        2025: dict(slope=0.60, intercept=5.0,  mean_raw=72.0, mean_scaled=48.2, band6_cutoff=90, band5_cutoff=75, candidature=5100),
        2024: dict(slope=0.60, intercept=5.0,  mean_raw=72.0, mean_scaled=48.2, band6_cutoff=90, band5_cutoff=75, candidature=5000),
        2023: dict(slope=0.59, intercept=5.5,  mean_raw=71.0, mean_scaled=47.4, band6_cutoff=90, band5_cutoff=75, candidature=4900),
        2022: dict(slope=0.61, intercept=4.5,  mean_raw=72.5, mean_scaled=48.7, band6_cutoff=90, band5_cutoff=75, candidature=4800),
        2021: dict(slope=0.60, intercept=5.0,  mean_raw=71.5, mean_scaled=47.9, band6_cutoff=90, band5_cutoff=75, candidature=4700),
        2020: dict(slope=0.60, intercept=5.0,  mean_raw=71.0, mean_scaled=47.6, band6_cutoff=90, band5_cutoff=75, candidature=4600),
        2019: dict(slope=0.59, intercept=5.0,  mean_raw=70.5, mean_scaled=46.6, band6_cutoff=90, band5_cutoff=75, candidature=4500),
    },
    "Textiles & Design": {
        2025: dict(slope=0.65, intercept=4.5,  mean_raw=76.0, mean_scaled=53.9, band6_cutoff=90, band5_cutoff=75, candidature=3550),
        2024: dict(slope=0.65, intercept=4.5,  mean_raw=76.0, mean_scaled=53.9, band6_cutoff=90, band5_cutoff=75, candidature=3500),
        2023: dict(slope=0.64, intercept=5.0,  mean_raw=75.0, mean_scaled=53.0, band6_cutoff=90, band5_cutoff=75, candidature=3400),
        2022: dict(slope=0.66, intercept=4.0,  mean_raw=76.5, mean_scaled=54.5, band6_cutoff=90, band5_cutoff=75, candidature=3300),
        2021: dict(slope=0.65, intercept=4.5,  mean_raw=75.5, mean_scaled=53.6, band6_cutoff=90, band5_cutoff=75, candidature=3200),
        2020: dict(slope=0.65, intercept=4.5,  mean_raw=75.0, mean_scaled=53.3, band6_cutoff=90, band5_cutoff=75, candidature=3100),
        2019: dict(slope=0.64, intercept=4.5,  mean_raw=74.5, mean_scaled=52.2, band6_cutoff=90, band5_cutoff=75, candidature=3000),
    },
}


def slugify(text: str) -> str:
    import re
    text = re.sub(r"[^a-z0-9\s-]", "", text.lower())
    text = re.sub(r"\s+", "-", text.strip())
    return re.sub(r"-+", "-", text)[:100]


def _classify_course(name: str) -> str:
    lower = name.lower()
    if "mathematics" in lower: return "Mathematics"
    if "english" in lower: return "English"
    if any(w in lower for w in ["physics","chemistry","biology","earth","science","investigating"]): return "Science"
    if any(w in lower for w in ["history","geography","economics","legal","business","society","religion","health and movement"]): return "HSIE"
    if any(w in lower for w in ["music","drama","visual arts","design","dance"]): return "Creative Arts"
    if any(w in lower for w in ["industrial","information processes","textiles","agriculture","food technology","engineering studies","enterprise computing"]): return "TAS"
    if any(w in lower for w in ["physical education","community and family","pdhpe"]): return "PD/H/PE"
    if any(w in lower for w in ["french","japanese","chinese","korean","italian","german","spanish","arabic","vietnamese",
                                  "indonesian","latin","greek","hebrew","hindi","armenian","filipino","khmer","macedonian",
                                  "persian","polish","portuguese","punjabi","russian","turkish","continuers","background speakers",
                                  "beginners","extension 1","extension 2"] if "extension" not in lower or "language" in lower): return "Languages"
    if any(w in lower for w in ["continuers","beginners","background speakers"]): return "Languages"
    if any(w in lower for w in ["exam","hospitality","retail","automotive","electrotechnology","entertainment industry",
                                  "financial services","human services","primary industries","business services","construction exam"]): return "VET"
    return "Other"

def _get_units(name: str) -> int:
    lower = name.lower()
    if any(x in lower for x in ["extension 2", "music extension", "science extension", "history extension",
                                   "english extension 2", "chinese extension", "french extension", "german extension",
                                   "indonesian extension", "italian extension", "japanese extension", "latin extension",
                                   "modern greek extension", "spanish extension", "arabic extension",
                                   "classical greek extension", "classical hebrew extension"]): return 1
    return 2

def _is_extension(name: str) -> bool:
    return "extension" in name.lower()


def populate_scaling(supabase: Client, year: int | None = None):
    course_cache: dict = {}
    total = 0

    for course_name, year_data in SCALING_DATA.items():
        for y, params in year_data.items():
            if year and y != year:
                continue

            # Get or create course
            result = supabase.table("courses").select("id").eq("name", course_name).execute()
            if not result.data:
                ins = supabase.table("courses").upsert({
                    "name":         course_name,
                    "slug":         slugify(course_name),
                    "category":     _classify_course(course_name),
                    "units":        _get_units(course_name),
                    "is_extension": _is_extension(course_name),
                }).execute()
                if not ins.data:
                    log.warning(f"Could not create course: {course_name}")
                    continue
                course_id = ins.data[0]["id"]
            else:
                course_id = result.data[0]["id"]

            row = {
                "course_id":    course_id,
                "year":         y,
                "slope":        params["slope"],
                "intercept":    params["intercept"],
                "mean_raw":     params.get("mean_raw"),
                "mean_scaled":  params.get("mean_scaled"),
                "band6_cutoff": params.get("band6_cutoff"),
                "band5_cutoff": params.get("band5_cutoff"),
                "candidature":  params.get("candidature"),
            }

            supabase.table("scaling_data").upsert(row, on_conflict="course_id,year").execute()
            total += 1

    log.info(f"Inserted/updated {total} scaling data rows.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Populate BandSix scaling data")
    parser.add_argument("--year", type=int, help="Only populate a specific year")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        log.error("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        sys.exit(1)

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    log.info(f"Connected to Supabase: {SUPABASE_URL}")
    populate_scaling(supabase, year=args.year)
    log.info("✓ Scaling data populated.")
