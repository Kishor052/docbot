# backend/main.py
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated
import google.generativeai as genai
import os
from dotenv import load_dotenv
import logging

# Load environment variables from a .env file
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

# Configure simple logging for debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable CORS for communication with the React front-end
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload-and-translate/")
async def upload_and_translate(
    file: Annotated[UploadFile, File()],
    prompt: Annotated[str, Form()]
):
    try:
        # Read uploaded file bytes directly; avoid using the File API upload
        # which may trigger service endpoints that require additional parameters
        # like `ragStoreName`. Passing the file as inline blob data avoids that.
        file_bytes = await file.read()

        # Choose a model that is known to be available on newer accounts. You can
        # override this by setting the GEMINI_MODEL environment variable.
        # Example: set GEMINI_MODEL=models/gemini-2.5-pro
        desired_model = os.getenv("GEMINI_MODEL", "models/gemini-2.5-flash")

        # Query available models and attempt to pick a supported one if the
        # desired model is not available for this API key/account.
        try:
            available = [m.name for m in genai.list_models()]
        except Exception:
            available = []

        if desired_model in available:
            model_name = desired_model
        else:
            # Prefer a 2.5 flash/pro model if available, otherwise fall back to
            # the first listed model.
            fallback = None
            for candidate in available:
                if "2.5" in candidate and "flash" in candidate:
                    fallback = candidate
                    break
            if not fallback and available:
                fallback = available[0]

            model_name = fallback or desired_model

        # Log which model we're going to use and which models are visible to this API key
        logger.info("Selected model for generation: %s", model_name)
        logger.info("Available models (sample): %s", available[:10])

        model = genai.GenerativeModel(model_name)

        try:
            response = model.generate_content([
                f"Given the following PDF document, perform this task: {prompt}",
                {"inline_data": {"mime_type": "application/pdf", "data": file_bytes}},
            ])
            return {"translation": response.text}
        except Exception as e:
            # If the model isn't available for this account, the underlying
            # SDK often returns an informative error. Try to list available
            # models to help the developer debug which models are supported.
            try:
                models = [m.name for m in genai.list_models()]
                msg = f"{str(e)}. Available models: {models[:10]}{'...' if len(models)>10 else ''}"
            except Exception:
                msg = str(e)
            return {"error": msg}
    except Exception as e:
        return {"error": str(e)}