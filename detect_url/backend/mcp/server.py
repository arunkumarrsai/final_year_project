import sqlite3
import os
import glob
import json
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from bs4 import BeautifulSoup
from mcp.server.fastmcp import FastMCP

# ------------------------------------------------------------------ #
#                          LOGGING                                     #
# ------------------------------------------------------------------ #
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "server.log")

def log(msg):
    with open(LOG_FILE, "a") as f:
        f.write(str(msg) + "\n")

# ------------------------------------------------------------------ #
#                        MCP SERVER                                    #
# ------------------------------------------------------------------ #
mcp = FastMCP('web_scraper_server')

DB_DIRECTORY = os.environ.get("DB_DIRECTORY", ".")

def get_db_path(db_name: str) -> str:
    if ".." in db_name:
        raise ValueError("Invalid DB name")
    return os.path.join(DB_DIRECTORY, db_name)

# ------------------------------------------------------------------ #
#                     DATABASE TOOLS                                   #
# ------------------------------------------------------------------ #

@mcp.tool()
def list_databases() -> list:
    """List all SQLite database files in the data directory."""
    db_files = glob.glob(os.path.join(DB_DIRECTORY, "*.db"))
    return [os.path.basename(f) for f in db_files]

@mcp.tool()
def list_tables(database_name: str) -> list:
    """List all tables and their columns in a given database."""
    conn = sqlite3.connect(get_db_path(database_name))
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cur.fetchall()]
    result = []
    for t in tables:
        cur.execute(f"PRAGMA table_info({t})")
        cols = [c[1] for c in cur.fetchall()]
        result.append({"table": t, "columns": cols})
    conn.close()
    return result

@mcp.tool()
def run_sql(database_name: str, query: str):
    """Run a SELECT query on the given database. Only SELECT queries are allowed."""
    if not query.strip().upper().startswith("SELECT"):
        return "Only SELECT queries are allowed."
    conn = sqlite3.connect(get_db_path(database_name))
    cur = conn.cursor()
    try:
        cur.execute(query)
        data = cur.fetchall()
    except Exception as e:
        data = f"SQL error: {e}"
    finally:
        conn.close()
    return data

# ------------------------------------------------------------------ #
#              KEYWORD HEURISTICS FOR ANALYSIS                         #
# ------------------------------------------------------------------ #

SUSPICIOUS_KEYWORDS = [
    "crack", "cracked", "hack", "hacked", "exploit", "torrent",
    "piracy", "pirated", "warez", "keygen", "serial key",
    "free download", "nulled", "mod apk", "leaked", "phishing",
    "malware", "ransomware", "trojan", "spyware", "adware",
    "casino", "gambling", "bet online", "dark web", "darknet",
]

SAFE_CATEGORIES = [
    "educational", "university", "school", "college", "government",
    "blog", "news", "ecommerce", "company", "corporate",
    "documentation", "open source", "wikipedia", "research",
]

def _count_keyword_hits(text: str, keywords: list) -> list:
    """Return list of matched keywords found in text."""
    text_lower = text.lower()
    return [kw for kw in keywords if kw in text_lower]

def _classify_category(title: str, text: str, meta: str) -> str:
    """Heuristic category classification based on content."""
    combined = (title + " " + text + " " + meta).lower()

    category_map = {
        "Educational":  ["university", "school", "college", "course", "learn", "tutorial", "education"],
        "News":         ["news", "breaking", "headline", "journalism", "reporter"],
        "E-Commerce":   ["shop", "buy", "cart", "product", "price", "ecommerce", "store"],
        "Blog":         ["blog", "article", "post", "author", "opinion"],
        "Corporate":    ["company", "about us", "careers", "our team", "enterprise"],
        "Government":   ["government", ".gov", "public service", "ministry"],
        "Documentation":["documentation", "docs", "api reference", "getting started"],
        "Social Media": ["profile", "followers", "feed", "social"],
    }

    for cat, terms in category_map.items():
        if any(t in combined for t in terms):
            return cat

    return "General"

def _analyze_security(scraped: dict) -> dict:
    """
    Analyze a scraped website for legality and security risks.
    Returns structured analysis dict.
    """
    url     = scraped.get("url", "")
    title   = scraped.get("title", "")
    content = scraped.get("content", "")
    meta    = scraped.get("meta_description", "")
    headings = " ".join(scraped.get("headings", []))
    links   = scraped.get("links", [])

    full_text = f"{title} {headings} {content} {meta}"

    # --- keyword hits ---
    suspicious_hits = _count_keyword_hits(full_text, SUSPICIOUS_KEYWORDS)

    # --- link analysis ---
    suspicious_link_count = 0
    for link in links:
        link_hits = _count_keyword_hits(link, SUSPICIOUS_KEYWORDS)
        suspicious_link_count += len(link_hits)

    # --- url analysis ---
    suspicious_url_keywords = ["login", "update", "verify", "secure", "account", "banking", "free", "gift", "support", "auth"]
    url_hits = _count_keyword_hits(url, suspicious_url_keywords)
    if ".xyz" in url or ".top" in url or ".tk" in url:
        url_hits.append("suspicious_tld")

    # --- category ---
    category = _classify_category(title, content, meta)

    # --- legality ---
    reasons = []
    if len(suspicious_hits) >= 3:
        legality = "Suspicious"
        reasons.append(f"Multiple suspicious keywords found: {', '.join(suspicious_hits[:5])}")
    elif len(suspicious_hits) >= 1:
        legality = "Suspicious"
        reasons.append(f"Suspicious keywords detected: {', '.join(suspicious_hits)}")
    else:
        legality = "Legal"
        reasons.append("No suspicious keywords found in content.")

    # check for missing info
    if not title or title.strip() == "":
        reasons.append("Website has no title — could indicate low quality or deceptive site.")
        if legality == "Legal":
            legality = "Suspicious"

    if not meta or meta.strip() == "":
        reasons.append("No meta description found.")

    # --- risk level ---
    risk_score = len(suspicious_hits) + suspicious_link_count + (len(url_hits) * 3)
    if risk_score == 0:
        risk_level = "Safe"
    elif risk_score <= 2:
        risk_level = "Suspicious"
        reasons.append("Low number of risk indicators detected.")
    else:
        risk_level = "High Risk - Danger/Phishing/Malware"
        reasons.append(f"High number of risk indicators ({risk_score}) detected across content, links, and URL structure.")
        if url_hits:
            reasons.append(f"URL itself contains highly suspicious deceptive patterns: {', '.join(url_hits)}.")

    # --- summary ---
    summary = (
        f"This website titled '{title}' is categorized as '{category}'. "
        f"Legality assessment: {legality}. Risk level: {risk_level}."
    )

    return {
        "url":        url,
        "title":      title,
        "summary":    summary,
        "category":   category,
        "legality":   legality,
        "risk_level": risk_level,
        "reasons":    reasons,
        "content":    content[:2000],   # truncate for storage
    }

# ------------------------------------------------------------------ #
#                      SCRAPER TOOL                                    #
# ------------------------------------------------------------------ #

@mcp.tool()
def scrape_website(url: str) -> str:
    """
    Scrape a website and perform security/legality analysis.
    Extracts title, headings, paragraphs, meta description, and links.
    Returns a JSON string with the analysis results.
    """
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        }
        session = requests.Session()
        retry = Retry(connect=3, backoff_factor=0.5)
        adapter = HTTPAdapter(max_retries=retry)
        session.mount('http://', adapter)
        session.mount('https://', adapter)

        res = session.get(url, timeout=15, headers=headers, verify=False)
        if res.status_code == 403:
            # Simple fallback for 403 Forbidden
            headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
            res = session.get(url, timeout=15, headers=headers, verify=False)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")

        # --- extract data ---
        title = soup.title.string.strip() if soup.title and soup.title.string else ""

        headings = []
        for tag in soup.find_all(["h1", "h2", "h3"]):
            txt = tag.get_text(strip=True)
            if txt:
                headings.append(txt)

        paragraphs = []
        for p in soup.find_all("p"):
            txt = p.get_text(strip=True)
            if txt:
                paragraphs.append(txt)

        # meta description
        meta_tag = soup.find("meta", attrs={"name": "description"})
        meta_description = meta_tag["content"].strip() if meta_tag and meta_tag.get("content") else ""

        # links (first 50)
        links = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("http"):
                links.append(href)
            if len(links) >= 50:
                break

        scraped = {
            "url":              url,
            "title":            title,
            "headings":         headings[:20],
            "content":          " ".join(paragraphs[:50]),
            "meta_description": meta_description,
            "links":            links,
        }

        # --- analyze ---
        analysis = _analyze_security(scraped)

        log(f"Scraped & analyzed: {url}")

        return json.dumps(analysis, indent=2)

    except requests.exceptions.RequestException as e:
        log(f"Connection error scraping {url}: {e} - Website blocked scraper.")
        
        # Explicitly state the website is not allowed
        scraped = {
            "url": url,
            "title": "Access Denied",
            "headings": [],
            "content": "This website is not allowed to be scraped by the chatbot.",
            "meta_description": "",
            "links": []
        }
        
        analysis = _analyze_security(scraped)
        # Override the summary explicitly
        analysis["summary"] = "The website does not allow the chatbot to scrape it, but the URL was analyzed."
        analysis["legality"] = "Unknown (Blocked)"
        
        # If the URL analysis caught phishing patterns, keep the High Risk flag.
        if "High Risk" not in analysis.get("risk_level", ""):
            analysis["risk_level"] = "Unknown (Blocked)"
            
        analysis["category"] = "Unknown"
        analysis["reasons"].append("The website actively blocked the scraper connection.")
        
        return json.dumps(analysis, indent=2)

    except Exception as e:
        log(f"Error scraping {url}: {e}")
        return json.dumps({"error": str(e), "url": url})

# ------------------------------------------------------------------ #
if __name__ == "__main__":
    mcp.run()