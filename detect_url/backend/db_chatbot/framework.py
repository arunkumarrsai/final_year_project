import os
import re
import json
import sqlite3

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import StructuredTool
from langchain_community.chat_message_histories import SQLChatMessageHistory

from backend.client import run_scrape_sync, run_query_sync, run_list_tables_sync, run_list_databases_sync
from backend.llm import get_llm


class DatabaseChatbot:
    """
    AI chatbot that scrapes websites, analyses them for legality/security,
    stores results in SQLite, and answers questions using stored data.
    """

    def __init__(self, db_directory: str, model_name: str = "claude-3-5-sonnet-latest"):
        self.db_directory = os.path.abspath(db_directory)
        os.makedirs(self.db_directory, exist_ok=True)

        self.llm = get_llm(model=model_name)
        self._init_db()

        self.agent = create_react_agent(
            self.llm,
            self._get_tools(),
            prompt=self._system_prompt(),
        )

    # ---------------------------------------------------------------- #
    #                     DATABASE SETUP                                 #
    # ---------------------------------------------------------------- #

    def _db_path(self):
        return os.path.join(self.db_directory, "web.db")

    def _init_db(self):
        """Create the websites table if it doesn't exist."""
        conn = sqlite3.connect(self._db_path())
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS websites (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                url        TEXT,
                title      TEXT,
                summary    TEXT,
                category   TEXT,
                legality   TEXT,
                risk_level TEXT,
                content    TEXT,
                raw_json   TEXT
            )
        """)
        conn.commit()
        conn.close()

    # ---------------------------------------------------------------- #
    #                    SYSTEM PROMPT                                   #
    # ---------------------------------------------------------------- #

    def _system_prompt(self):
        return (
            "You are a Web Intelligence Assistant that helps users analyse websites.\n\n"

            "CAPABILITIES:\n"
            "1. When a user provides a URL (starting with http:// or https://):\n"
            "   - Use the ScrapeWebsiteTool to scrape and analyse the website.\n"
            "   - The tool returns a JSON with: url, title, summary, category,\n"
            "     legality, risk_level, reasons, and content.\n"
            "   - Present the analysis results clearly to the user.\n\n"

            "2. When a user asks a question (not a URL):\n"
            "   - Use the QueryDatabaseTool to search previously analysed websites.\n"
            "   - Answer questions like 'Is this website legal?', 'Why is it risky?',\n"
            "     'Does it contain malware?', etc.\n"
            "   - Base your answers on the stored analysis data and provide reasoning.\n\n"

            "3. If the analysed URL is classified as PHISHING or HIGH RISK:\n"
            "   - Provide clear prevention steps to the user.\n"
            "   - Include practical safety advice such as:\n"
            "       • Do NOT enter personal information or passwords\n"
            "       • Avoid clicking links or downloading files\n"
            "       • Close the website immediately\n"
            "       • Report the website if possible\n"
            "       • Enable security measures like 2FA\n"
            "   - Make the warning strong, clear, and easy to understand.\n\n"

            "RESPONSE GUIDELINES:\n"
            "- Always provide clear, structured answers.\n"
            "- When reporting analysis, include: legality status, risk level,\n"
            "  category, and the reasons for the classification.\n"
            "- When answering from stored data, cite the specific data points.\n"
            "- If phishing is detected, ALWAYS include prevention steps.\n"
            "- Be helpful and explain your reasoning.\n"
        )

    # ---------------------------------------------------------------- #
    #                       TOOLS                                       #
    # ---------------------------------------------------------------- #

    def _get_tools(self):

        db_dir = self.db_directory

        def scrape_tool(url: str) -> str:
            """Scrape and analyse a website for legality and security risks."""
            return str(run_scrape_sync(url, db_dir))

        def query_db_tool(query: str) -> str:
            """Run a SELECT query on web.db to retrieve stored website analyses."""
            return str(run_query_sync("web.db", query, db_dir))

        def list_tables_tool() -> str:
            """List all tables in web.db."""
            return str(run_list_tables_sync("web.db", db_dir))

        def list_databases_tool() -> str:
            """List all available databases."""
            return str(run_list_databases_sync(db_dir))

        return [
            StructuredTool.from_function(
                func=scrape_tool,
                name="ScrapeWebsiteTool",
                description=(
                    "Scrape a website URL and analyse it for security and legality. "
                    "Input: a full URL (e.g. https://example.com). "
                    "Returns JSON with title, summary, category, legality, risk_level, and reasons."
                ),
            ),
            StructuredTool.from_function(
                func=query_db_tool,
                name="QueryDatabaseTool",
                description=(
                    "Run a SELECT SQL query on the web.db database to look up previously "
                    "analysed websites. The 'websites' table has columns: id, url, title, "
                    "summary, category, legality, risk_level, content, raw_json. "
                    "Input: a SQL SELECT query string."
                ),
            ),
            StructuredTool.from_function(
                func=list_tables_tool,
                name="ListTablesTool",
                description="List all tables and columns in the web.db database.",
            ),
            StructuredTool.from_function(
                func=list_databases_tool,
                name="ListDatabasesTool",
                description="List all available database files.",
            ),
        ]

    # ---------------------------------------------------------------- #
    #                    DATA STORAGE                                   #
    # ---------------------------------------------------------------- #

    def store(self, data: dict):
        """Store the analysis result into the websites table."""
        conn = sqlite3.connect(self._db_path())
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO websites
               (url, title, summary, category, legality, risk_level, content, raw_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                data.get("url", ""),
                data.get("title", ""),
                data.get("summary", ""),
                data.get("category", ""),
                data.get("legality", ""),
                data.get("risk_level", ""),
                data.get("content", ""),
                json.dumps(data),
            ),
        )
        conn.commit()
        conn.close()

    # ---------------------------------------------------------------- #
    #                    URL DETECTION                                  #
    # ---------------------------------------------------------------- #

    @staticmethod
    def is_url(text: str) -> bool:
        return bool(re.match(r"https?://", text.strip()))

    # ---------------------------------------------------------------- #
    #                      CHAT                                        #
    # ---------------------------------------------------------------- #

    def chat(self, query: str, session_id: str = "default") -> str:
        """
        Main chat entry point.
        - URLs   → scrape, analyse, store, return summary
        - Text   → answer via agent using stored data + chat history
        """
        history = SQLChatMessageHistory(
            session_id=session_id,
            connection=f"sqlite:///{self.db_directory}/history.db",
        )

        # ---- URL FLOW ----
        if self.is_url(query):
            try:
                scraped_raw = run_scrape_sync(query, self.db_directory)
                # MCP returns a list of content objects; get the text
                raw_text = scraped_raw[0].text if scraped_raw else ""
                data = json.loads(raw_text)
            except Exception as e:
                return f"❌ Scraping failed: {e}"

            if "error" in data:
                return f"❌ Could not scrape: {data['error']}"

            self.store(data)

            # Build a user-friendly output
            reasons_str = "\n".join(f"  • {r}" for r in data.get("reasons", []))
            
            risk_level_str = data.get('risk_level', '')
            alert_header = ""
            if "High Risk" in risk_level_str or "Phishing" in risk_level_str or "Danger" in risk_level_str:
                alert_header = "\n\n🚨🚨🚨 WARNING: THIS URL IS DANGEROUS/PHISHING! 🚨🚨🚨\n⚠️ DO NOT ENTER ANY PERSONAL INFORMATION OR DOWNLOAD FILES ⚠️\n"
                
            response = (
                f"{alert_header}✅ Website analysed and stored!\n\n"
                f"🔗  URL:        {data.get('url')}\n"
                f"📄  Title:      {data.get('title')}\n"
                f"📂  Category:   {data.get('category')}\n"
                f"⚖️  Legality:   {data.get('legality')}\n"
                f"🛡️  Risk Level: {risk_level_str}\n"
                f"📝  Summary:    {data.get('summary')}\n"
                f"\nReasons:\n{reasons_str}"
            )

            history.add_user_message(query)
            history.add_ai_message(response)
            return response

        # ---- QUESTION FLOW ----
        past = history.messages
        messages = past + [HumanMessage(content=query)]

        result = self.agent.invoke({"messages": messages})

        ai_msgs = [m for m in result["messages"] if isinstance(m, AIMessage)]
        response = ai_msgs[-1].content if ai_msgs else "I couldn't generate a response."

        history.add_user_message(query)
        history.add_ai_message(response)
        return response