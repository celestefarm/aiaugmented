#!/usr/bin/env python3
"""
Test script to verify all imports for newly created backend modules
"""

import sys
import traceback

def test_import(module_name, description=""):
    """Test importing a module and report results"""
    try:
        __import__(module_name)
        print(f"✓ {module_name} - {description}")
        return True
    except ImportError as e:
        print(f"✗ {module_name} - {description}")
        print(f"  Error: {e}")
        return False
    except Exception as e:
        print(f"⚠ {module_name} - {description}")
        print(f"  Unexpected error: {e}")
        return False

def main():
    print("Testing imports for newly created backend modules...")
    print("=" * 60)
    
    # Test new dependencies first
    print("\n1. Testing new dependencies:")
    success_count = 0
    total_count = 0
    
    modules_to_test = [
        ("openai", "OpenAI API client"),
        ("cv2", "OpenCV for image processing"),
        ("numpy", "NumPy for numerical operations"),
        ("pandas", "Pandas for data manipulation"),
    ]
    
    for module, desc in modules_to_test:
        total_count += 1
        if test_import(module, desc):
            success_count += 1
    
    print(f"\nDependencies: {success_count}/{total_count} successful")
    
    # Test newly created modules
    print("\n2. Testing newly created modules:")
    new_modules = [
        ("backend.routers.strategist", "Strategist router"),
        ("backend.utils.memory_service", "Memory service"),
        ("backend.utils.data_integration_service", "Data integration service"),
        ("backend.utils.outcome_analysis_service", "Outcome analysis service"),
        ("backend.utils.meta_cognitive_service", "Meta-cognitive service"),
    ]
    
    new_success = 0
    for module, desc in new_modules:
        total_count += 1
        if test_import(module, desc):
            success_count += 1
            new_success += 1
    
    print(f"New modules: {new_success}/{len(new_modules)} successful")
    
    # Test specific imports that might be missing
    print("\n3. Testing specific imports that might be missing:")
    specific_imports = [
        ("backend.utils.cognitive_analysis", "Cognitive analysis utilities"),
        ("backend.utils.document_processor", "Document processor"),
        ("backend.utils.performance_monitor", "Performance monitor"),
        ("backend.database_memory", "Database memory module"),
    ]
    
    missing_modules = []
    for module, desc in specific_imports:
        total_count += 1
        if test_import(module, desc):
            success_count += 1
        else:
            missing_modules.append((module, desc))
    
    print(f"\nOverall: {success_count}/{total_count} imports successful")
    
    if missing_modules:
        print(f"\n⚠ Missing modules that need to be created:")
        for module, desc in missing_modules:
            print(f"  - {module} ({desc})")
    
    return success_count == total_count

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)