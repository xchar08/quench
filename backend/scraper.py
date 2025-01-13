import requests
from bs4 import BeautifulSoup

def scrape_hydrants(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")
    hydrants = []
    # Modify selectors based on the actual page structure
    for item in soup.find_all(class_="hydrant-info"):
        lat = item.find(class_="latitude").text.strip()
        lon = item.find(class_="longitude").text.strip()
        hydrants.append({'latitude': float(lat), 'longitude': float(lon)})
    return hydrants

if __name__ == "__main__":
    url = "https://example.com/hydrants-data"
    data = scrape_hydrants(url)
    print(data)
