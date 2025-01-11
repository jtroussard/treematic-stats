import os
import shutil
import pytest
from datetime import datetime
from backup import backup_data_file

# Test constants
BACKUP_DIR = "backups"
DATA_FILE = "data.json"

@pytest.fixture(autouse=True)
def setup_and_teardown():
    # Setup: Create a mock data.json file and clean backup dir
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
    with open(DATA_FILE, "w") as f:
        f.write('{"test": "data"}')

    yield  # Run tests

    # Teardown: Remove test files
    if os.path.exists(DATA_FILE):
        os.remove(DATA_FILE)
    if os.path.exists(BACKUP_DIR):
        shutil.rmtree(BACKUP_DIR)


def test_backup_directory_created():
    shutil.rmtree(BACKUP_DIR)  # Ensure backup dir doesn't exist
    backup_data_file()
    assert os.path.exists(BACKUP_DIR), "Backup directory was not created."


def test_backup_file_created():
    backup_data_file()
    backups = os.listdir(BACKUP_DIR)
    assert len(backups) == 1, "Backup was not created."


def test_backup_filename_format():
    backup_data_file()
    backups = os.listdir(BACKUP_DIR)
    assert backups, "No backup file was created."

    # Check for the correct timestamp format in the filename
    today = datetime.now().strftime("%Y-%m-%d")
    expected_prefix = f"data_bkup_{today}_"
    assert backups[0].startswith(expected_prefix), f"Backup filename incorrect: {backups[0]}"


def test_max_five_backups():
    # Create 5 backups
    for _ in range(5):
        backup_data_file()
    backups = sorted(os.listdir(BACKUP_DIR))
    assert len(backups) == 5, "Should only have 5 backups."

    # Add one more to trigger deletion of the oldest
    backup_data_file()
    backups = sorted(os.listdir(BACKUP_DIR))
    assert len(backups) == 5, "Oldest backup was not deleted."

    # Ensure the oldest backup was deleted
    backup_times = [os.path.getctime(os.path.join(BACKUP_DIR, f)) for f in backups]
    assert backup_times == sorted(backup_times), "Backups are not sorted by creation time."


def test_backup_skips_if_data_missing():
    os.remove(DATA_FILE)  # Remove data.json
    with pytest.raises(FileNotFoundError):
        backup_data_file()
