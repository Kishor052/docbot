from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated
import google.generativeai as genai
#from google.generativeai import APIError 
import os
from dotenv import load_dotenv
import logging

# Load environment variables from a .env file (e.g., GEMINI_API_KEY)
load_dotenv()

# --- Gemini Client Setup ---
# The client object is necessary for using the File API (upload/delete)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set.")

client = genai.Client(api_key=GEMINI_API_KEY) 

app = FastAPI()

# Configure simple logging for debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable CORS for communication with the React front-end (allows Vercel deployment)
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"], # In production, restrict this to your Vercel URL
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

@app.post("/upload-and-translate/")
async def upload_and_translate(
 file: Annotated[UploadFile, File()],
 prompt: Annotated[str, Form()]
):
    """
    Handles file upload, uploads it to the Gemini File API, queries the model,
    and then deletes the uploaded file.
    """
    uploaded_file = None
    try:
        # 1. Read uploaded file bytes
        file_bytes = await file.read()
        
        # 2. Upload file to the Gemini File API
        logger.info("Uploading file to Gemini File API...")
        uploaded_file = client.files.upload(
            file=file_bytes,
            display_name=file.filename,
            mime_type=file.content_type
        )
        logger.info("File uploaded successfully: %s", uploaded_file.name)
        
        # --- Model Selection ---
        # Use a model that supports documents (gemini-2.5-flash is a good default)
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash") 
        model = client.models[model_name]
        
        # 3. Generate content using the uploaded file reference
        logger.info("Generating content with model: %s", model_name)
        
        response = model.generate_content([
            f"Given the content of this document, perform this task: {prompt}",
            uploaded_file, # Use the file object as input
        ])

        return {"translation": response.text}
        
    except APIError as e:
        # Catch errors from the Gemini API (e.g., Invalid API Key, unsupported file type)
        logger.error("Gemini API Error: %s", str(e))
        return {"error": f"Gemini API Error (Check API Key/Model): {str(e)}"}
    
    except Exception as e:
        # Catch general errors (e.g., file reading, network)
        logger.error("General Error: %s", str(e))
        return {"error": f"Internal Server Error: {str(e)}"}
        
    finally:
        # 4. Cleanup: Delete the file after use to free up space
        if uploaded_file:
            try:
                client.files.delete(name=uploaded_file.name)
                logger.info("Cleaned up uploaded file: %s", uploaded_file.name)
            except Exception as e:
                logger.warning("Failed to delete uploaded file (may be normal if API call failed earlier): %s", str(e))