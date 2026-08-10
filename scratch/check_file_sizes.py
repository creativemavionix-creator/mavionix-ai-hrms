import os

zip1 = r"C:\Users\Pramod\Downloads\mavionix_hiremind_integrated.zip"
zip2 = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard_final.zip"

if os.path.exists(zip1):
    size_mb1 = os.path.getsize(zip1) / (1024 * 1024)
    print(f"mavionix_hiremind_integrated.zip size: {size_mb1:.2f} MB")

if os.path.exists(zip2):
    size_mb2 = os.path.getsize(zip2) / (1024 * 1024)
    print(f"hr-dashboard_final.zip size: {size_mb2:.2f} MB")
