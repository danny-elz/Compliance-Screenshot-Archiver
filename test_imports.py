#!/usr/bin/env python3
"""Test script to isolate import issues."""

print("Testing imports step by step...")

try:
    print("1. Testing basic imports...")
    import json
    import logging
    from typing import Any

    print("   ✓ Basic imports OK")
except Exception as e:
    print(f"   ✗ Basic imports failed: {e}")
    exit(1)

try:
    print("2. Testing mangum import...")
    from mangum import Mangum

    print("   ✓ Mangum import OK")
except Exception as e:
    print(f"   ✗ Mangum import failed: {e}")
    exit(1)

try:
    print("3. Testing core.logging import...")
    from app.core.logging import jlog

    print("   ✓ Core logging import OK")
except Exception as e:
    print(f"   ✗ Core logging import failed: {e}")
    exit(1)

try:
    print("4. Testing lambda_handler create_handler function...")
    from app.lambda_handler import create_handler

    print("   ✓ create_handler import OK")
except Exception as e:
    print(f"   ✗ create_handler import failed: {e}")
    exit(1)

try:
    print("5. Testing main app import...")
    from app.main import app

    print("   ✓ Main app import OK")
except Exception as e:
    print(f"   ✗ Main app import failed: {e}")
    exit(1)

try:
    print("6. Testing handler creation...")
    handler = create_handler()
    print("   ✓ Handler creation OK")
except Exception as e:
    print(f"   ✗ Handler creation failed: {e}")
    exit(1)

print("All imports successful!")
