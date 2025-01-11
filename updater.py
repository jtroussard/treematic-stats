import os
import json
from github import Github
from backup import backup_data_file

def update_installs_data(date, installs):
    # Backup data.json
    backup_data_file()

    # Determine the environment: LOCAL or PROD
    environment = os.getenv("ENVIRONMENT", "LOCAL").upper()

    # Set the data file path
    file_path = "data.json"

    # LOCAL: Read data.json from the current directory
    if environment == "LOCAL":
        try:
            with open(file_path, "r") as file:
                data = json.load(file)
            print(f"[{environment}] Loaded local {file_path}")
        except FileNotFoundError:
            print(f"[{environment}] {file_path} not found. Starting with an empty list.")
            data = []
        except json.JSONDecodeError:
            print(f"[{environment}] {file_path} is not a valid JSON. Starting with an empty list.")
            data = []
    else:
        # PROD: Fetch data.json from the GitHub repository
        token = os.getenv("TOKEN")  # Production GitHub Token
        repo_name = "jtroussard/treematic-stats"

        if not token:
            raise ValueError(f"GitHub token not found for {environment} environment.")

        # Authenticate with GitHub
        g = Github(token)
        repo = g.get_repo(repo_name)

        try:
            file_content = repo.get_contents(file_path)
            data = json.loads(file_content.decoded_content.decode())
            print(f"[{environment}] Fetched {file_path} from GitHub.")
        except Exception as e:
            print(f"Error fetching {file_path} from GitHub: {e}")
            data = []

    
    # Append the new data entry
    new_entry = {
        "date": date,
        "installs": int(installs)
    }
    data.append(new_entry)

    # Convert data back to JSON
    updated_content = json.dumps(data, indent=4)

    # LOCAL: Save updated data.json locally
    if environment == "LOCAL":
        try:
            with open(file_path, "w") as file:
                file.write(updated_content)
            print(f"[{environment}] Local {file_path} updated successfully!")
        except Exception as e:
            print(f"[{environment}] Error writing to {file_path}: {e}")
    else:
        print(f"\n[{environment}] Preview of data.json update:\n{updated_content}")
        try:
            repo.update_file(
                path=file_path,
                message=f"Update installs data on {date}",
                content=updated_content,
                sha=file_content.sha
            )
            print(f"[{environment}] data.json updated successfully on GitHub!")
        except Exception as e:
            print(f"Error updating {file_path} on GitHub: {e}")
