# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from flair.models import TextClassifier
from flair.data import Sentence
import whisper
import requests
import os
import time
from pydub import AudioSegment
from azure.storage.blob import BlobServiceClient, ContentSettings, generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta, timezone

# -------------------------
# Flask App Setup
# -------------------------
app = Flask(__name__)
CORS(app)

# -------------------------
# Load Models
# -------------------------
print("Loading Whisper...")
whisper_model = whisper.load_model("small")

print("Loading Flair Sentiment Model...")
sentiment_model = TextClassifier.load("en-sentiment")

# -------------------------
# Pyannote API Key
# -------------------------
PYANNOTE_API_KEY = "sk_84cc8e714c76462da393f9c875c051ba"

# -------------------------
# Azure Blob Config
# -------------------------
AZURE_CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=allcenterrecord;AccountKey=34GH8vzIXzYFrDdJsDE04xl4s+dfHVORkxwRm+NtvEfy9lIr+lvcsX8NNOKD6a8VDxUXXIx/4vUP+AStT40sOQ==;EndpointSuffix=core.windows.net"
AZURE_CONTAINER_NAME = "audio-files"

blob_service_client = BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING)
container_client = blob_service_client.get_container_client(AZURE_CONTAINER_NAME)

# -------------------------
# Upload audio to Azure and generate SAS URL
# -------------------------
def upload_to_azure(file_path, filename):
    blob_client = container_client.get_blob_client(filename)
    with open(file_path, "rb") as f:
        blob_client.upload_blob(f, overwrite=True,
                                content_settings=ContentSettings(content_type="audio/wav"))

    # Generate SAS URL valid for 1 hour
    sas_token = generate_blob_sas(
        account_name=blob_client.account_name,
        container_name=AZURE_CONTAINER_NAME,
        blob_name=filename,
        account_key=blob_service_client.credential.account_key,
        permission=BlobSasPermissions(read=True),
        expiry=datetime.now(timezone.utc) + timedelta(hours=1)
    )

    public_url = f"https://{blob_client.account_name}.blob.core.windows.net/{AZURE_CONTAINER_NAME}/{filename}?{sas_token}"
    return public_url

# -------------------------
# Pyannote Diarization
# -------------------------
def diarize_audio(public_url):
    url = "https://api.pyannote.ai/v1/diarize"
    headers = {"Authorization": f"Bearer {PYANNOTE_API_KEY}", "Content-Type": "application/json"}

    resp = requests.post(url, json={"url": public_url}, headers=headers)
    resp.raise_for_status()
    job_id = resp.json()["jobId"]

    # Poll until complete
    job_url = f"https://api.pyannote.ai/v1/jobs/{job_id}"
    while True:
        r = requests.get(job_url, headers=headers)
        data = r.json()
        if data["status"] == "succeeded":
            diarization = data.get("output", {}).get("diarization")
            if not diarization:
                raise RuntimeError("Diarization output missing 'diarization' key")
            return diarization
        if data["status"] in ["failed", "canceled"]:
            raise RuntimeError("Diarization job failed: " + str(data))
        time.sleep(5)

# -------------------------
# Analyze Endpoint
# -------------------------
@app.route("/analyze", methods=["POST"])
def analyze():
    if "audio" not in request.files:
        return jsonify({"error": "No audio uploaded"}), 400

    audio_file = request.files["audio"]
    os.makedirs("temp", exist_ok=True)
    save_path = f"temp/{audio_file.filename}"
    audio_file.save(save_path)

    try:
        # 1️⃣ Upload audio to Azure and get public SAS URL
        azure_url = upload_to_azure(save_path, audio_file.filename)

        # 2️⃣ Diarization via Pyannote
        segments = diarize_audio(azure_url)

        # 3️⃣ Load full audio
        audio = AudioSegment.from_file(save_path)
        speakers = {}

        # 4️⃣ Process each speaker segment
        for seg in segments:
            speaker = seg["speaker"]
            start_ms = int(seg["start"] * 1000)
            end_ms = int(seg["end"] * 1000)
            audio_chunk = audio[start_ms:end_ms]

            # Temporary segment file
            seg_path = f"temp/segment_{speaker}_{start_ms}.wav"
            audio_chunk.export(seg_path, format="wav")

            # Transcribe with Whisper
            text = whisper_model.transcribe(seg_path)["text"].strip()
            if not text:
                os.remove(seg_path)
                continue

            # Sentiment analysis
            sentence = Sentence(text)
            sentiment_model.predict(sentence)
            label = sentence.labels[0].value
            score = sentence.labels[0].score
            final_sentiment = "NEUTRAL" if score < 0.6 else label

            # Aggregate speaker data
            if speaker not in speakers:
                speakers[speaker] = {"transcript": text, "segments": []}
            else:
                speakers[speaker]["transcript"] += " " + text

            speakers[speaker]["segments"].append({
                "start": seg["start"],
                "end": seg["end"],
                "text": text,
                "sentiment": final_sentiment,
                "confidence": round(score * 100, 2)
            })

            # Cleanup temp segment
            os.remove(seg_path)

        # 5️⃣ Calculate sentiment percentages per speaker
        for spk, data in speakers.items():
            pos = sum(s["confidence"] for s in data["segments"] if s["sentiment"]=="POSITIVE")
            neg = sum(s["confidence"] for s in data["segments"] if s["sentiment"]=="NEGATIVE")
            neu = sum(s["confidence"] for s in data["segments"] if s["sentiment"]=="NEUTRAL")
            total = pos + neg + neu or 1
            data["positive"] = round((pos/total)*100,2)
            data["negative"] = round((neg/total)*100,2)
            data["neutral"] = round((neu/total)*100,2)

        return jsonify({"speakers": speakers})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if os.path.exists(save_path):
            os.remove(save_path)

# -------------------------
# Run Flask
# -------------------------
if __name__ == "__main__":
    app.run(debug=True)
