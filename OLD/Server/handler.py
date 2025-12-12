import os, json
import openai
import anthropic 
import requests

PARENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(PARENT_DIR, "..", "A.I.s", "apikeys.json")
with open(DATA_FILE, "r") as f:
    API_DATA = {entry["name"]: entry["api_key"] for entry in json.load(f)}

def ProcessPrompt(name, string):
    api_key = API_DATA.get(name)

    if name == "openai":
        openai.api_key = api_key
        try:
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": string}],
                temperature=0.7,
                max_tokens=200
            )
            return response.choices[0].message['content']

        except Exception as e:
            return f"OpenAI error: {e}"
    
    elif name == "claude":
        try:
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",  # or claude-3-opus-20240229
                max_tokens=200,
                temperature=0.7,
                messages=[{"role": "user", "content": string}]
            )
            return response.content[0].text
        except Exception as e:
            return f"Claude error: {e}"
    
    elif name == "deepseek":
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "deepseek-chat",  # Available models: deepseek-chat, deepseek-coder
                "messages": [{"role": "user", "content": string}],
                "temperature": 0.7,
                "max_tokens": 200,
                "stream": False
            }
            response = requests.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30  # Add timeout to prevent hanging
            )
            # Check for HTTP errors
            response.raise_for_status()
            # Parse the response
            result = response.json()
            return result["choices"][0]["message"]["content"]
        except requests.exceptions.RequestException as e:
            return f"DeepSeek API request error: {e}"
        except KeyError as e:
            return f"DeepSeek response format error: {e}"
        except Exception as e:
            return f"DeepSeek unexpected error: {e}"
    
    else:
        return "Prompt error"