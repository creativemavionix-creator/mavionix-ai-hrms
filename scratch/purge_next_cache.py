import shutil
import os

next_dir = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\.next"

if os.path.exists(next_dir):
    print(f"Deleting stale .next cache directory at {next_dir}...")
    shutil.rmtree(next_dir, ignore_errors=True)
    print(".next cache directory purged successfully!")
else:
    print(".next directory does not exist.")
