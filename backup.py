import os
import shutil
from datetime import datetime

def backup_data_file():
    backup_dir = "backups"
    data_file = "data.json"

    # Ensure the backup directory exists
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)

    # List existing backups sorted by creation time
    backups = sorted(
        [f for f in os.listdir(backup_dir) if f.startswith("data_bkup_")],
        key=lambda x: os.path.getctime(os.path.join(backup_dir, x))
    )

    # Create the backup filename with a full timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")
    backup_filename = f"data_bkup_{timestamp}.json"
    backup_path = os.path.join(backup_dir, backup_filename)

    # If there are already 5 backups, delete the oldest one
    if len(backups) >= 5:
        oldest_backup = os.path.join(backup_dir, backups[0])
        os.remove(oldest_backup)
        print(f"Removed oldest backup: {oldest_backup}")

    # Copy data.json to the backup directory
    shutil.copy2(data_file, backup_path)
    print(f"Backup created: {backup_path}")
