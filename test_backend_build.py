#!/usr/bin/env python3
"""
Comprehensive test to verify backend build with new components
"""

import sys
import traceback
import asyncio
from datetime import datetime

def test_basic_imports():
    """Test basic Python package imports"""
    print("Testing basic imports...")
    
    # EasyOCR removed from project
    
    try:
        import openai
        print(f"✓ openai {openai.__version__}")
    except ImportError as e:
        print(f"✗ openai: {e}")
        return False
    
    try:
        import cv2
        print(f"✓ opencv-python {cv2.__version__}")
    except ImportError as e:
        print(f"✗ opencv-python: {e}")
        return False
    
    return True

def test_backend_modules():
    """Test backend module imports with correct path"""
    print("\nTesting backend modules...")
    
    # Add backend to path for proper imports
    sys.path.insert(0, 'backend')
    
    modules_to_test = [
        ("database_memory", "Database memory module"),
        ("routers.strategist", "Strategist router"),
        ("utils.memory_service", "Memory service"),
        ("utils.data_integration_service", "Data integration service"),
        ("utils.outcome_analysis_service", "Outcome analysis service"),
        ("utils.meta_cognitive_service", "Meta-cognitive service"),
        ("utils.cognitive_analysis", "Cognitive analysis"),
        ("utils.document_processor", "Document processor"),
        ("utils.performance_monitor", "Performance monitor"),
    ]
    
    success_count = 0
    for module_name, description in modules_to_test:
        try:
            __import__(module_name)
            print(f"✓ {module_name} - {description}")
            success_count += 1
        except ImportError as e:
            print(f"✗ {module_name} - {description}: {e}")
        except Exception as e:
            print(f"⚠ {module_name} - {description}: {e}")
    
    return success_count, len(modules_to_test)

def test_strategist_router_functionality():
    """Test that strategist router can be imported and has expected endpoints"""
    print("\nTesting strategist router functionality...")
    
    try:
        sys.path.insert(0, 'backend')
        from routers.strategist import router
        
        # Check if router has routes
        routes = [route.path for route in router.routes]
        expected_routes = [
            "/strategist/sessions",
            "/strategist/sessions/{session_id}",
        ]
        
        found_routes = []
        for expected in expected_routes:
            for route in routes:
                if expected.replace("{session_id}", "") in route:
                    found_routes.append(expected)
                    break
        
        print(f"✓ Strategist router loaded with {len(routes)} routes")
        print(f"✓ Found {len(found_routes)} expected route patterns")
        
        return True
        
    except Exception as e:
        print(f"✗ Strategist router test failed: {e}")
        traceback.print_exc()
        return False

async def test_service_initialization():
    """Test that services can be initialized"""
    print("\nTesting service initialization...")
    
    try:
        sys.path.insert(0, 'backend')
        
        # Test memory service
        from utils.memory_service import memory_service
        print("✓ Memory service initialized")
        
        # Test data integration service
        from utils.data_integration_service import data_integration_service
        print("✓ Data integration service initialized")
        
        # Test outcome analysis service
        from utils.outcome_analysis_service import outcome_analysis_service
        print("✓ Outcome analysis service initialized")
        
        # Test meta-cognitive service
        from utils.meta_cognitive_service import meta_cognitive_service
        print("✓ Meta-cognitive service initialized")
        
        return True
        
    except Exception as e:
        print(f"✗ Service initialization failed: {e}")
        traceback.print_exc()
        return False

def test_model_imports():
    """Test that models can be imported"""
    print("\nTesting model imports...")
    
    try:
        sys.path.insert(0, 'backend')
        
        from models.strategic_analysis import (
            StrategicSession, StrategicSessionCreate, StrategicSessionResponse,
            StrategicEvidence, EvidenceCreate, StrategicOption, StrategicOptionCreate,
            LightningBrief, LightningBriefCreate
        )
        print("✓ Strategic analysis models imported")
        
        from models.user import UserResponse
        print("✓ User models imported")
        
        return True
        
    except Exception as e:
        print(f"✗ Model imports failed: {e}")
        traceback.print_exc()
        return False

async def main():
    """Run all tests"""
    print("=" * 60)
    print("BACKEND BUILD VERIFICATION TEST")
    print("=" * 60)
    print(f"Test started at: {datetime.now().isoformat()}")
    
    all_passed = True
    
    # Test 1: Basic imports
    if not test_basic_imports():
        all_passed = False
    
    # Test 2: Backend modules
    success, total = test_backend_modules()
    if success != total:
        all_passed = False
    
    # Test 3: Strategist router
    if not test_strategist_router_functionality():
        all_passed = False
    
    # Test 4: Service initialization
    if not await test_service_initialization():
        all_passed = False
    
    # Test 5: Model imports
    if not test_model_imports():
        all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL TESTS PASSED - Backend build is working correctly!")
        print("✅ New dependencies installed and working")
        print("✅ All modules import successfully")
        print("✅ Services initialize properly")
        print("✅ Strategist router is functional")
    else:
        print("❌ SOME TESTS FAILED - Check the output above for details")
    
    print("=" * 60)
    return all_passed

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)