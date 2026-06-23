#!/usr/bin/env python3
"""Family Fitness App — Entry Point"""
from app import create_app

app = create_app()

if __name__ == '__main__':
    print("🏋️  家庭健身 — Family Fitness Tracker")
    print("=" * 42)
    print("Starting server at http://0.0.0.0:5000")
    print("Press Ctrl+C to stop")
    print("=" * 42)
    app.run(host='0.0.0.0', port=5000, debug=True)
