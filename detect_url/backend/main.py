import os
import sys

# Add the project root to sys.path so 'backend.db_chatbot' imports work when run directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.db_chatbot import DatabaseChatbot


def main():
    print("=" * 55)
    print("   🌐  Web Intelligence Assistant")
    print("   Analyse websites for legality & security risks")
    print("=" * 55)

    # Database directory
    db_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "db"))
    os.makedirs(db_dir, exist_ok=True)

    print(f"\n📂 Database directory: {db_dir}")
    print("⏳ Initialising chatbot...\n")

    try:
        bot = DatabaseChatbot(db_directory=db_dir)
    except Exception as e:
        print(f"❌ Failed to initialise: {e}")
        sys.exit(1)

    session_id = input("Enter session ID (or press Enter for 'default'): ").strip() or "default"

    print(f"\n🟢 Ready! Session: {session_id}")
    print("─" * 55)
    print("Usage:")
    print("  • Paste a URL  → scrape, analyse & store")
    print("  • Ask a question → get answers from stored data")
    print("  • Type 'exit'  → quit")
    print("─" * 55)

    while True:
        try:
            query = input(f"\n[{session_id}] You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not query:
            continue
        if query.lower() == "exit":
            print("Goodbye! 👋")
            break

        try:
            response = bot.chat(query, session_id)
            print(f"\n🤖 AI: {response}")
        except Exception as e:
            print(f"\n❌ Error: {e}")


if __name__ == "__main__":
    main()