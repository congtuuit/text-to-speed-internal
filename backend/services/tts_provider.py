import requests
import base64
import os

class TTSProvider:
    def __init__(self, api_key: str = None):
        self.api_key = api_key

    def process_text_to_speech(self, text: str, output_path: str, voice: str, model_name: str = "gemini-3.1-flash-tts-preview"):
        if not self.api_key:
            print("No API Key provided")
            return False

        try:
            clean_model = model_name.replace("models/", "")
            print(f"Generating Gemini Audio for voice {voice} using {clean_model}...")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={self.api_key}"
            
            payload = {
                "contents": [{"parts": [{"text": text}]}],
                "generationConfig": {
                    "responseModalities": ["AUDIO"],
                    "speechConfig": {
                        "voiceConfig": {
                            "prebuiltVoiceConfig": {
                                "voiceName": voice
                            }
                        }
                    }
                }
            }
            
            headers = {"Content-Type": "application/json"}
            response = requests.post(url, json=payload, headers=headers)
            
            # Log lỗi chi tiết nếu có
            if response.status_code != 200:
                err_msg = "Unknown error"
                try:
                    err_msg = response.json().get('error', {}).get('message', response.text)
                except:
                    err_msg = response.text
                print(f"Gemini API Error: {err_msg}")
                raise Exception(f"Gemini API: {err_msg}")
                
            data = response.json()
            
            # Parse audio from response (base64 encoded)
            candidates = data.get('candidates', [])
            if candidates:
                parts = candidates[0].get('content', {}).get('parts', [])
                for part in parts:
                    inline_data = part.get('inlineData', {})
                    if inline_data.get('mimeType', '').startswith('audio/'):
                        audio_base64 = inline_data.get('data', '')
                        if audio_base64:
                            audio_bytes = base64.b64decode(audio_base64)
                            with open(output_path, 'wb') as f:
                                f.write(audio_bytes)
                            print(f"Saved Gemini audio to {output_path}")
                            return True
                            
            print("No audio found in Gemini response")
            return False
            
        except Exception as e:
            print(f"Gemini TTS Runtime Error: {e}")
            return False
