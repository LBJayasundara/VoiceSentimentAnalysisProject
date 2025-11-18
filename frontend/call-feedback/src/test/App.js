import React, { useState, useRef } from "react";
import "./App.css";
import { UploadCloud, Phone, Bot, User, Download } from "lucide-react";

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  const analyzeAudio = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("audio", file);

    try {
      const response = await fetch("http://127.0.0.1:5000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert("Error: " + errorData.error);
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Ensure text exists
      const transcriptText = data.text || "";
      const transcriptLines = transcriptText.split("\n").map((line, idx) => ({
        speaker: idx % 2 === 0 ? "Agent" : "Customer", // simple mock
        time: `00:00:${String((idx + 1) * 5).padStart(2, "0")}`,
        text: line,
        score: Math.random() * 0.5 + 0.5,
      }));

      setResult({
        overall: data.emotion,
        transcript: transcriptLines,
      });
    } catch (err) {
      console.error(err);
      alert("Error analyzing audio");
    } finally {
      setLoading(false);
    }
  };

  const downloadTranscript = () => {
    if (!result) return;
    const content = result.transcript
      .map((line) => `[${line.time}] ${line.speaker}: ${line.text}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "call_transcript.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <Phone className="logo-icon" />
          <h1>Call Sentiment Analyzer</h1>
        </div>
        <div className="button-group">
          <button className="btn-primary" disabled>
            Analyze Recorded Call
          </button>
          <button className="btn-secondary">Analyze Live Call</button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="main-content">
        {/* Upload Section */}
        <div className="card upload-card">
          <div
            className="upload-area"
            onClick={() => fileInputRef.current.click()}
          >
            <UploadCloud className="upload-icon" />
            <p className="upload-title">Upload your call audio</p>
            <p className="upload-subtitle">(.wav / .mp3)</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".wav,.mp3"
            />
            {file && <p className="file-name">{file.name}</p>}
          </div>
          <button
            onClick={analyzeAudio}
            disabled={!file || loading}
            className={`analyze-btn ${!file ? "disabled" : ""}`}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
          <p className="supported-text">
            Supported Languages — English | Sinhala | Tamil
          </p>
        </div>

        {/* Result Section */}
        <div className="card result-card">
          <h2 className="result-title">Sentiment Analysis Results</h2>
          {!result ? (
            <div className="placeholder">
              <Phone className="placeholder-icon" />
              <p>Upload an audio file and click “Analyze” to see results here.</p>
            </div>
          ) : (
            <div className="results">
              <p className="overall">
                Overall Sentiment:{" "}
                <span
                  className={
                    result.overall.toLowerCase().includes("positive")
                      ? "positive"
                      : "negative"
                  }
                >
                  {result.overall}
                </span>
              </p>
              {result.transcript.map((line, index) => (
                <div key={index} className="transcript-line">
                  <div className="speaker-row">
                    {line.speaker === "Agent" ? (
                      <Bot className="speaker-icon agent" />
                    ) : (
                      <User className="speaker-icon customer" />
                    )}
                    <strong>{line.speaker}</strong>
                    <span className="timestamp">{line.time}</span>
                    <span className="sentiment-score">
                      {line.score.toFixed(2)}
                    </span>
                  </div>
                  <p className="text">{line.text}</p>
                </div>
              ))}
              <button className="download-btn" onClick={downloadTranscript}>
                <Download className="download-icon" /> Download Transcript
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
