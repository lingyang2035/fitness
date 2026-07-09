#!/usr/bin/env python3
"""Workout Diary App — Entry Point"""
import os
from app import create_app, APP_NAME, APP_EMOJI, APP_TITLE

app = create_app()

if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    if debug:
        print("⚠ DEBUG MODE ENABLED — do not use in production")
    print(f"{APP_TITLE} — Workout Diary")
    print("=" * 42)
    print("Starting server at http://0.0.0.0:5000")
    print("Press Ctrl+C to stop")
    print("=" * 42)
    app.run(host='0.0.0.0', port=5000, debug=debug)
