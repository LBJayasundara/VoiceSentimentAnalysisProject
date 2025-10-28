from flask import Flask, request, jsonify
from flask_cors import CORS
from flair.models import TextClassifier
from flair.data import Sentence
import whisper
import os

app = Flask(__name__)
CORS(app)  # allow React frontend requests

# Load models
print("Loading Whisper (speech-to-text)...")
whisper_model = whisper.load_model("small")

print("Loading Flair (emotion model)...")
emotion_model = TextClassifier.load('en-sentiment')

@app.route("/analyze", methods=["POST"])
def analyze():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file uploaded"}), 400

    audio_file = request.files["audio"]
    path = f"temp/{audio_file.filename}"
    os.makedirs("temp", exist_ok=True)
    audio_file.save(path)

    try:
        # Step 1: Transcribe audio
        result = whisper_model.transcribe(path)
        text = result["text"]

        # Step 2: Sentiment analysis
        sentence = Sentence(text)
        emotion_model.predict(sentence)
        label = sentence.labels[0].value
        score = sentence.labels[0].score

        # Step 3: Return transcript + sentiment
        return jsonify({
            "emotion": f"{label} ({round(score*100, 2)}%)",
            "text": text
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if os.path.exists(path):
            os.remove(path)

if __name__ == "__main__":
    app.run(debug=True)
