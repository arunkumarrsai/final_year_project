import asyncio
from mcp import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters
import os


def _server_params(db_directory: str = "."):
    """Build MCP stdio server parameters pointing at server.py."""
    server_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "mcp", "server.py")
    )
    env = os.environ.copy()
    env["DB_DIRECTORY"] = os.path.abspath(db_directory)

    return StdioServerParameters(
        command="python",
        args=[server_path],
        env=env,
    )


async def _call(tool: str, args: dict, db_directory: str):
    """Call a single MCP tool and return the result content."""
    async with stdio_client(_server_params(db_directory)) as (r, w):
        async with ClientSession(r, w) as session:
            await session.initialize()
            result = await session.call_tool(tool, args)
            return result.content


# ------------------------------------------------------------------ #
#               SYNCHRONOUS WRAPPERS                                   #
# ------------------------------------------------------------------ #

def run_scrape_sync(url: str, db_dir: str):
    """Scrape a website via the MCP scrape_website tool."""
    return asyncio.run(_call("scrape_website", {"url": url}, db_dir))


def run_query_sync(db: str, q: str, db_dir: str):
    """Run a SELECT query via the MCP run_sql tool."""
    return asyncio.run(_call("run_sql", {"database_name": db, "query": q}, db_dir))


def run_list_tables_sync(db: str, db_dir: str):
    """List tables in a database via the MCP list_tables tool."""
    return asyncio.run(_call("list_tables", {"database_name": db}, db_dir))


def run_list_databases_sync(db_dir: str):
    """List all databases via the MCP list_databases tool."""
    return asyncio.run(_call("list_databases", {}, db_dir))