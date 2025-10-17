import { useState } from 'react';
// Using Lucide icons for a clean, modern look
import { CloudUpload, Send, Bot, AlertTriangle, Loader2 } from 'lucide-react';

const App = () => {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); // State for displaying UI-friendly errors

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setTranslation('');
    setError(''); // Clear error on new file selection
  };

  const handlePromptChange = (event) => {
    setPrompt(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(''); // Clear previous error
    
    if (!file) {
      setError("Please select a PDF file before submitting.");
      return;
    }
    if (!prompt.trim()) {
      setError("Please enter a prompt (e.g., 'Translate to French') to start the task.");
      return;
    }

    setLoading(true);
    setTranslation('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', prompt);

    // Endpoint for your FastAPI backend
    const API_URL = 'http://localhost:8000/upload-and-translate/';

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.error) {
        // Handle API key errors or other backend failures
        setError(`Processing Failed: ${data.error}`);
        setTranslation('');
      } else {
        setTranslation(data.translation);
        setPrompt(''); // Clear prompt after successful submission
      }

    } catch (err) {
      console.error("Network or Fetch Error:", err);
      setError("Could not connect to the backend. Ensure FastAPI is running on http://localhost:8000.");
      setTranslation('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black flex flex-col items-center p-4">
      <div className="w-full max-w-3xl bg-gray-900 shadow-2xl rounded-xl p-6 md:p-10 border border-gray-800
                      shadow-red-900/40 transition-shadow duration-500 hover:shadow-red-800/60">
        
        {/* Header and Title */}
        <h1 className="text-4xl font-extrabold text-white mb-8 text-center flex items-center justify-center">
          <Bot className="w-8 h-8 mr-3 text-red-600 animate-pulse" />
          <span className="text-red-600">Kishor's </span>
          <span className="text-gray-200">DocBot</span>
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* File Upload Area */}
          <div className="p-5 border-2 border-dashed rounded-xl transition duration-300 transform
                      text-gray-400 border-gray-700 bg-gray-800 cursor-pointer
                      hover:text-red-400 hover:border-red-500/50 hover:shadow-xl hover:shadow-red-900/20">
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center space-y-2">
              <CloudUpload className="w-8 h-8" />
              <span className="text-base font-medium">
                {file ? (
                  <span className="text-white font-bold block text-center truncate w-64 md:w-auto">{`File Loaded: ${file.name}`}</span>
                ) : (
                  'Click to upload PDF Document'
                )}
              </span>
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          
          {/* Prompt Input */}
          <div className="relative">
            <input
              type="text"
              value={prompt}
              onChange={handlePromptChange}
              placeholder="What should I do? (e.g., 'Translate the conclusion to German.')"
              disabled={loading}
              className="w-full p-4 pr-16 bg-gray-800 text-white border border-gray-700 rounded-xl 
                         focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={loading || !file}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-3 rounded-xl transition-all duration-300 shadow-lg
                ${loading 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-red-600 text-white hover:bg-red-500 shadow-red-500/50 hover:scale-[1.03] active:scale-[0.97] active:shadow-none'
                }
              `}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Status Area (Loading/Error/Response) */}
        <div className="mt-8 space-y-4">
          
          {/* Loading Indicator */}
          {loading && (
            <div className="p-4 bg-red-900/30 text-red-400 rounded-xl text-center font-semibold flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing document and generating response...</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-900/30 text-red-400 rounded-xl font-medium flex items-center space-x-2 border border-red-700">
              <AlertTriangle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          )}

          {/* Translation Output */}
          {translation && (
            <div className="border-t border-gray-800 pt-6">
              <h2 className="text-xl font-bold text-red-500 mb-3 flex items-center">
                <Bot className="w-5 h-5 mr-2" />
                AI Response
              </h2>
              <div className="bg-gray-950 p-5 rounded-xl shadow-inner border border-red-800/50">
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{translation}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;


/*
run the backend and frontend servers with these commands:
PS C:\Users\lenov\OneDrive\Desktop\my_chatbot\backend> venv\Scripts\activate
(venv) PS C:\Users\lenov\OneDrive\Desktop\my_chatbot\backend> uvicorn main:app --reload

PS C:\Users\lenov\OneDrive\Desktop\my_chatbot\frontend> npm start
*/