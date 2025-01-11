import requests
from bs4 import BeautifulSoup
from datetime import datetime
from updater import update_installs_data

def fetch_installs():
    url = "https://marketplace.visualstudio.com/items?itemName=DevLife4Me.tree-meh"
    headers = {"User-Agent": "Mozilla/5.0"}

    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')

    # Extract the installs number (adjust the selector if necessary)
    installs_text = soup.find("span", {"class": "installs-text"}).text.strip().split(" ")[0]
    installs_number = installs_text.replace(",", "")  # Remove commas for clean numbers

    print(f"Fetched Installs: {installs_number}")
    return installs_number

if __name__ == "__main__":
    installs = fetch_installs()
    current_date = datetime.now().strftime("%Y-%m-%d")
    
    # Update data.json on GitHub with the new installs count
    update_installs_data(date=current_date, installs=installs)
