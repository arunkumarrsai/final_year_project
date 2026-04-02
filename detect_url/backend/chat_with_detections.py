import os
import sys
from db_chatbot import DatabaseChatbot

def main():
    print("=== Integrated Object Detection Chatbot ===")
    
    # Point to the central databases folder
    databases_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "databases"))
    
    if not os.path.exists(databases_folder):
        os.makedirs(databases_folder, exist_ok=True)
            
    print(f"\nInitializing chatbot with databases from: {databases_folder}...")
    
    try:
        # Initialize the chatbot framework pointing to our databases directory
        # The model name is kept consistent with the original project
        bot = DatabaseChatbot(db_directory=databases_folder, model_name="gpt-oss:120b-cloud")
        
        session_id = input("ENTER YOUR SESSION ID (or press Enter for 'default'): ").strip() or "default"
        
        print("\nChatbot Ready! You can ask about the objects detected in the video.")
        print("Example: 'What objects were detected?' or 'How many cars were moving fast?'")
        print("Type 'exit' to quit.")
        
        while True:
            query = input(f"\n[{session_id}] YOU: ").strip()
            
            if query.lower() == 'exit':
                print("Exiting. Goodbye!")
                break
                
            if not query:
                continue
                
            try:
                response = bot.chat(query, session_id)
                print(f"AI: {response}")
            except Exception as e:
                print(f"Error during chat: {e}")
                
    except Exception as e:
        print(f"Failed to initialize chatbot: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
