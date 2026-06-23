#!/usr/bin/env python3
"""Workout Diary App — Entry Point"""
from app import create_app, APP_NAME, APP_EMOJI, APP_TITLE

app = create_app()

if __name__ == '__main__':
    print(f"{APP_TITLE} — Workout Diary")
    print("=" * 42)
    print("Starting server at http://0.0.0.0:5000")
    print("Press Ctrl+C to stop")
    print("=" * 42)
    app.run(host='0.0.0.0', port=5000, debug=True)
