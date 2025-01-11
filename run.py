import requests
from bs4 import BeautifulSoup
from datetime import datetime
from updater import update_installs_data
import argparse

def fetch_installs():
    url = "https://marketplace.visualstudio.com/items?itemName=DevLife4Me.tree-meh"
    headers = {"User-Agent": "Mozilla/5.0"}

    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')

    # Extract the installs number (adjust the selector if necessary)
    installs_text = soup.find("span", {"class": "installs-text"}).text.strip().split(" ")[0]
    installs_number = installs_text.replace(",", "")  # Remove commas for clean numbers

    return int(installs_number)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--check-only', action='store_true', help="Only fetch installs without updating data.json")
    args = parser.parse_args()

    installs = fetch_installs()

    if args.check_only:
        print(installs)  # For GitHub Action check step
    else:
        current_date = datetime.now().strftime("%Y-%m-%d")
        update_installs_data(date=current_date, installs=installs)
