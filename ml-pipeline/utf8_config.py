"""
UTF-8 Encoding Configuration
Ensures Python stdout/stderr use UTF-8 so emojis work on Windows.
Import this at the top of every script that prints emojis.
"""

import sys
import io
import os

# Force UTF-8 encoding for stdout and stderr
if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except Exception:
        pass  # Fallback: if this fails, just continue

# Also set environment variable for child processes
os.environ.setdefault('PYTHONIOENCODING', 'utf-8')