import React, { useState, useRef, useMemo } from "react";
import "./App.css";

import {
  UploadCloud,
  Phone,
  Bot,
  User,
  Download,
  X,
  Loader,
  CheckCircle,
  Mic,
  Pause,
  Search,
  UserCheck,
  CalendarDays,
  Eye,
  Trash2,
  FileText,
  FileSpreadsheet,
  Smile,
  ArrowLeft,
  Clock,
  BarChart2,
  AlertTriangle,
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SentimentBadge = ({ score }) => {
  const getSentimentStyle = (s) => {
    if (s >= 0.7) return { emoji: "😊", className: "sentiment-badge positive" };
    if (s >= 0.4) return { emoji: "😐", className: "sentiment-badge neutral" };
    return { emoji: "😠", className: "sentiment-badge negative" };
  };
  const { emoji, className } = getSentimentStyle(score);

  return (
    <span className={className}>
      <span style={{ fontSize: "1rem", marginRight: "4px" }}>{emoji}</span>
      {score.toFixed(2)}
    </span>
  );
};

const AudioWaveform = () => (
  <div className="audio-waveform">
    {[...Array(30)].map((_, i) => (
      <div
        key={i}
        className="waveform-bar"
        style={{
          height: `${
            Math.abs(Math.sin(i * 0.4 + Date.now() * 0.01)) * 40 + 5
          }px`,
          animation: `wave 1.${i % 3}s ease-in-out infinite alternate`,
        }}
      ></div>
    ))}
  </div>
);

const LiveAnalyzer = () => {
  const [isLive, setIsLive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [overallSentiment, setOverallSentiment] = useState(null);
  const timerRef = useRef(null);
  const transcriptRef = useRef(null);
  const scrollRef = useRef(null);

  const mockLiveTranscript = [
    {
      speaker: "Agent",
      text: "Hello! How can I assist you today?",
      score: 0.78,
    },
    { speaker: "Customer", text: "I'm very upset about my bill.", score: 0.22 },
    {
      speaker: "Agent",
      text: "I understand, let me check that for you.",
      score: 0.55,
    },
    { speaker: "Customer", text: "Thank you, I appreciate it.", score: 0.81 },
    {
      speaker: "Agent",
      text: "Is there anything else I can help you with?",
      score: 0.75,
    },
    { speaker: "Customer", text: "No, that will be all.", score: 0.65 },
  ];

  React.useEffect(() => {
    if (transcript.length === 0) {
      setOverallSentiment(null);
      return;
    }
    const totalScore = transcript.reduce((acc, curr) => acc + curr.score, 0);
    const avgScore = totalScore / transcript.length;

    if (avgScore >= 0.6) {
      setOverallSentiment({
        text: "Satisfied",
        className: "sentiment-positive",
      });
    } else if (avgScore >= 0.4) {
      setOverallSentiment({ text: "Neutral", className: "sentiment-neutral" });
    } else {
      setOverallSentiment({
        text: "Unsatisfied",
        className: "sentiment-negative",
      });
    }
  }, [transcript]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const startAnalysis = () => {
    setIsLive(true);
    setIsPaused(false);
    setTranscript([]);
    setOverallSentiment(null);
    setTime(0);

    timerRef.current = setInterval(() => {
      setTime((prevTime) => prevTime + 1);
    }, 1000);

    let transcriptIndex = 0;
    transcriptRef.current = setInterval(() => {
      setTime((currentTime) => {
        if (transcriptIndex < mockLiveTranscript.length) {
          const newItem = {
            ...mockLiveTranscript[transcriptIndex],
            time: formatTime(currentTime),
          };
          setTranscript((prev) => [...prev, newItem]);
          transcriptIndex++;
        } else {
          clearInterval(transcriptRef.current);
        }
        return currentTime;
      });
    }, 4000);
  };

  const endAnalysis = () => {
    setIsLive(false);
    setIsPaused(false);
    clearInterval(timerRef.current);
    clearInterval(transcriptRef.current);
    setTime(0);
  };

  const togglePause = () => {
    if (isPaused) {
      timerRef.current = setInterval(
        () => setTime((prevTime) => prevTime + 1),
        1000
      );
      setIsPaused(false);
    } else {
      clearInterval(timerRef.current);
      setIsPaused(true);
    }
  };

  const [, setForceRender] = React.useState(0);
  React.useEffect(() => {
    let animationFrameId;
    if (isLive && !isPaused) {
      const animate = () => {
        setForceRender((c) => c + 1);
        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [isLive, isPaused]);

  const downloadTranscript = () => {
    const content = transcript
      .map(
        (t) =>
          `[${t.time}] ${t.speaker} (Score: ${t.score.toFixed(2)}): ${t.text}`
      )
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "live_transcript.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="main-content">
      {/* Live Call Controls */}
      <div className="card live-controls-card">
        <div className="live-controls-buttons">
          <button
            onClick={startAnalysis}
            disabled={isLive}
            className="btn-green"
          >
            Start Live Call
          </button>
          <button onClick={endAnalysis} disabled={!isLive} className="btn-red">
            End Call
          </button>
        </div>

        <div className="live-waveform-container">
          {isLive ? (
            <AudioWaveform />
          ) : (
            <div className="live-waveform-placeholder">
              Audio visualization appears here
            </div>
          )}
          <p className="live-timer">{formatTime(time)}</p>
        </div>

        <div className="live-pause-button">
          <button
            onClick={togglePause}
            disabled={!isLive}
            className="btn-secondary"
          >
            {isPaused ? (
              <Mic className="download-icon" />
            ) : (
              <Pause className="download-icon" />
            )}
            {isPaused ? "Resume Analysis" : "Pause Analysis"}
          </button>
        </div>
      </div>

      {/* Live Analysis Results */}
      <div className="card result-card">
        <h2 className="result-title">Sentiment Analysis Results</h2>

        {transcript.length > 0 && overallSentiment && (
          <div className="overall-header">
            <p className="overall">
              Overall Result :{" "}
              <span className={overallSentiment.className}>
                {overallSentiment.text}
              </span>
            </p>
            <button
              onClick={downloadTranscript}
              disabled={transcript.length === 0}
              className="transcript-btn"
            >
              <Download className="download-icon" /> Transcript
            </button>
          </div>
        )}

        <div className="results live-transcript-container" ref={scrollRef}>
          {transcript.length > 0 && (
            <h3 className="live-transcript-title">Live Transcript</h3>
          )}
          {transcript.map((item, index) => (
            <div key={index} className="transcript-line">
              <div className="line-content">
                <div className="speaker-info">
                  {item.speaker === "Agent" ? (
                    <Bot className="speaker-icon agent" />
                  ) : (
                    <User className="speaker-icon customer" />
                  )}
                  <strong>{item.speaker}</strong>
                  <span className="timestamp">{item.time}</span>
                </div>
                <p className="text">{item.text}</p>
              </div>
              <SentimentBadge score={item.score} />
            </div>
          ))}
          {!isLive && transcript.length === 0 && (
            <div className="placeholder">
              <Mic className="placeholder-icon" />
              <p>
                Click 'Start Live Call' to begin analysis. The transcript will
                appear here in real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- UploadAnalyzer Component ---
const UploadAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  };

  const handleCancelUpload = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

 

  const handleCancelAnalysis = () => {
    setCanceling(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log("Fetch request aborted by user.");
    }
    handleCancelUpload();
  };

  const analyzeAudio = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
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

      // Flatten speaker segments for display
      const transcriptLines = [];
      Object.entries(data.speakers).forEach(([speaker, info]) => {
        info.segments.forEach((seg) => {
          transcriptLines.push({
            speaker: speaker,
            time: `00:00:${String(Math.floor(seg.start)).padStart(2, "0")}`,
            text: seg.text,
            sentiment: seg.sentiment,
            confidence: seg.confidence
          });
        });
      });

      setResult({ data, transcriptLines });
    } catch (err) {
      console.error(err);
      alert("Error analyzing audio");
    } finally {
      setLoading(false);
    }
  };

  const downloadTranscript = () => {
    if (!result) return;
    const content = result.transcriptLines
      .map(line => `[${line.time}] ${line.speaker}: ${line.text} (${line.sentiment})`)
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
    <div className="main-content">
      {/* Upload Card */}
      <div className="card upload-card">
        <div
          className="upload-area"
          onClick={() => !(loading || canceling) && fileInputRef.current && fileInputRef.current.click()}
          style={{ cursor: loading || canceling ? "not-allowed" : "pointer" }}
        >
          {loading ? (
            <>
              <Loader className="spinner-icon upload-icon" size={50} />
              <p className="upload-title" style={{ marginTop: "15px" }}>
                {canceling ? "Canceling..." : "Analyzing Audio..."}
              </p>
              {file && <p className="upload-subtitle">{file.name}</p>}
            </>
          ) : result ? (
            <>
              <CheckCircle className="upload-icon" style={{ color: "#16a34a" }} />
              <p className="upload-title" style={{ marginTop: "10px" }}>
                Analysis Completed
              </p>
              {file && (
                <div className="file-display" style={{ marginTop: "10px" }}>
                  <p className="file-name">{file.name}</p>
                  <button
                    className="cancel-btn"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                    title="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <UploadCloud className="upload-icon" />
              <p className="upload-title">Upload your call audio</p>
              <p className="upload-subtitle">(.wav / .mp3)</p>
              {file && (
                <div className="file-display">
                  <p className="file-name">{file.name}</p>
                  <button
                    className="cancel-btn"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    title="Cancel selection"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".wav,.mp3"
            disabled={loading || canceling}
          />
        </div>

        {/* Analyze Button */}
        <div className="button-container">
          <button
            onClick={analyzeAudio}
            disabled={!file || loading || canceling}
            className={`analyze-btn ${!file ? "disabled" : ""}`}
          >
            {canceling ? "Canceling..." : loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

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
            {/* Transcript */}
            <div className="transcript-section">
              <h3>Transcript</h3>
              {result.transcriptLines.map((line, idx) => (
                <p key={idx} className={`text ${line.sentiment.toLowerCase()}`}>
                  [{line.time}] {line.speaker}: {line.text} ({line.sentiment})
                </p>
              ))}
            </div>

            {/* Download button */}
            <button className="download-btn" onClick={downloadTranscript}>
              <Download className="download-icon" /> Download Transcript
            </button>
          </div>
        )}
      </div>
    </div>
  );}




// --- DownloadModal Component ---
const DownloadModal = ({
  isOpen,
  onClose,
  onDownloadCSV,
  onDownloadPDF,
  hasData,
}) => {
  if (!isOpen) return null;

  const handleCSV = () => {
    onDownloadCSV();
    onClose();
  };

  const handlePDF = () => {
    onDownloadPDF();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Download Report</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {!hasData ? (
            <p className="modal-no-data">
              No data available for the selected filters. Please adjust your
              filters to download a report.
            </p>
          ) : (
            <>
              <button className="modal-option-btn" onClick={handleCSV}>
                <FileSpreadsheet size={20} />
                <div>
                  <strong>Download CSV</strong>
                  <p>A simple comma-separated values file.</p>
                </div>
              </button>
              <button className="modal-option-btn" onClick={handlePDF}>
                <FileText size={20} />
                <div>
                  <strong>Download PDF (Table)</strong>
                  <p>A simple PDF document containing the data table.</p>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- ConfirmModal Component ---
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {/* --- New modal body with icon and centered layout --- */}
        <div className="modal-body confirm-modal-body">
          <div className="confirm-modal-icon-wrapper">
            <AlertTriangle className="confirm-modal-icon" size={48} />
          </div>
          <p>{message}</p>
          <div className="confirm-modal-actions">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-red" onClick={onConfirm}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MOCK DATA ---

// --- New Helper Component: SentimentTag ---
// We define this here so both Dashboard and CallDetailView can use it
const SentimentTag = ({ sentiment, className = "" }) => {
  if (!sentiment) return null; // Handle cases where sentiment might be missing
  const sentimentClass = sentiment.toLowerCase();
  const emoji =
    sentiment === "Positive" ? "😊" : sentiment === "Negative" ? "😠" : "😐";
  return (
    <span className={`sentiment-tag ${sentimentClass} ${className}`}>
      {emoji} {sentiment}
    </span>
  );
};

// ---This is the summary data for the dashboard table ---
const initialMockCalls = [
  {
    id: 101,
    agent: "Nadeesha",
    duration: "4:35",
    agentSentiment: "Positive",
    customerSentiment: "Positive",
    dateTime: "2025-11-05T10:30:00",
  },
  {
    id: 102,
    agent: "Kasun",
    duration: "6:12",
    agentSentiment: "Neutral",
    customerSentiment: "Negative",
    dateTime: "2025-11-05T11:15:00",
  },
  {
    id: 103,
    agent: "Anjana",
    duration: "5:20",
    agentSentiment: "Positive",
    customerSentiment: "Positive",
    dateTime: "2025-11-06T09:05:00",
  },
  {
    id: 104,
    agent: "Ravi",
    duration: "8:02",
    agentSentiment: "Positive",
    customerSentiment: "Positive",
    dateTime: "2025-11-06T14:22:00",
  },
  {
    id: 105,
    agent: "Saman",
    duration: "3:15",
    agentSentiment: "Neutral",
    customerSentiment: "Negative",
    dateTime: "2025-11-07T08:30:00",
  },
  {
    id: 106,
    agent: "Nimal",
    duration: "7:45",
    agentSentiment: "Positive",
    customerSentiment: "Positive",
    dateTime: "2025-11-07T10:10:00",
  },
  {
    id: 107,
    agent: "Nadeesha",
    duration: "5:55",
    agentSentiment: "Neutral",
    customerSentiment: "Negative",
    dateTime: "2025-11-07T11:00:00",
  },
  {
    id: 108,
    agent: "Kamal",
    duration: "4:10",
    agentSentiment: "Positive",
    customerSentiment: "Neutral",
    dateTime: "2025-11-07T12:00:00",
  },
  {
    id: 109,
    agent: "Kasun",
    duration: "3:30",
    agentSentiment: "Neutral",
    customerSentiment: "Neutral",
    dateTime: "2025-11-07T13:15:00",
  },
  {
    id: 110,
    agent: "Ravi",
    duration: "5:05",
    agentSentiment: "Neutral",
    customerSentiment: "Neutral",
    dateTime: "2025-11-07T15:00:00",
  },
];

// --- Detailed mock data for the CallDetailView ---
// This maps Call IDs to their full transcript
const detailedMockCalls = {
  101: {
    transcript: [
      {
        speaker: "Agent",
        text: "Thank you for calling SLT, this is Nadeesha. How can I help you?",
        score: 0.8,
        time: "00:12",
      },
      {
        speaker: "Customer",
        text: "Hi, I just wanted to say my new fiber connection is working perfectly. The installation was so smooth!",
        score: 0.95,
        time: "00:25",
      },
      {
        speaker: "Agent",
        text: "That is wonderful to hear! We are so glad you are happy with the service.",
        score: 0.9,
        time: "00:38",
      },
      {
        speaker: "Customer",
        text: "Yes, thank you so much for the help.",
        score: 0.85,
        time: "00:49",
      },
    ],
  },
  102: {
    transcript: [
      {
        speaker: "Agent",
        text: "Thank you for calling, this is Kasun.",
        score: 0.6,
        time: "00:08",
      },
      {
        speaker: "Customer",
        text: "I am extremely angry! My internet has been down for three hours and I have work to do!",
        score: 0.1,
        time: "00:20",
      },
      {
        speaker: "Agent",
        text: "I am very sorry to hear that. Let me get your account number to check for any outages in your area.",
        score: 0.4,
        time: "00:35",
      },
      {
        speaker: "Customer",
        text: "This is ridiculous. I pay so much money for this!",
        score: 0.15,
        time: "00:47",
      },
      {
        speaker: "Agent",
        text: "I understand your frustration. I am looking into it right now.",
        score: 0.3,
        time: "01:02",
      },
    ],
  },
  103: {
    transcript: [
      {
        speaker: "Agent",
        text: "SLT, Anjana speaking. How may I help?",
        score: 0.7,
        time: "00:09",
      },
      {
        speaker: "Customer",
        text: "Hi Anjana, you helped me yesterday and I just wanted to say thank you, the problem is fixed!",
        score: 0.9,
        time: "00:21",
      },
    ],
  },
  104: {
    transcript: [
      {
        speaker: "Agent",
        text: "Customer service, this is Ravi.",
        score: 0.8,
        time: "00:05",
      },
      {
        speaker: "Customer",
        text: "Hello, I got my new PEO TV connection and it's amazing! The quality is great.",
        score: 0.92,
        time: "00:19",
      },
      {
        speaker: "Agent",
        text: "That's fantastic news! We're thrilled you're enjoying it.",
        score: 0.88,
        time: "00:30",
      },
    ],
  },
  105: {
    transcript: [
      {
        speaker: "Agent",
        text: "Thank you for calling SLT, Saman speaking.",
        score: 0.6,
        time: "00:11",
      },
      {
        speaker: "Customer",
        text: "I can't believe this, my bill is wrong again! This is the third time!",
        score: 0.1,
        time: "00:24",
      },
      {
        speaker: "Agent",
        text: "I sincerely apologize for this. Let's pull up your account and review the charges immediately.",
        score: 0.3,
        time: "00:40",
      },
    ],
  },
  106: {
    transcript: [
      {
        speaker: "Agent",
        text: "SLT, this is Nimal, how can I help?",
        score: 0.7,
        time: "00:07",
      },
      {
        speaker: "Customer",
        text: "Your technician who visited today was so professional and helpful. Please pass on my thanks!",
        score: 0.95,
        time: "00:22",
      },
      {
        speaker: "Agent",
        text: "I will certainly do that! Thank you for the kind feedback.",
        score: 0.85,
        time: "00:35",
      },
    ],
  },
  107: {
    transcript: [
      {
        speaker: "Agent",
        text: "Thank you for calling SLT, this is Nadeesha.",
        score: 0.7,
        time: "00:10",
      },
      {
        speaker: "Customer",
        text: "I was promised a callback an hour ago and no one called! This is terrible service!",
        score: 0.05,
        time: "00:25",
      },
      {
        speaker: "Agent",
        text: "I am extremely sorry for that lapse in service. Let me take ownership of this issue for you right now.",
        score: 0.2,
        time: "00:41",
      },
    ],
  },
  108: {
    transcript: [
      {
        speaker: "Agent",
        text: "SLT Customer Service, Kamal speaking.",
        score: 0.7,
        time: "00:06",
      },
      {
        speaker: "Customer",
        text: "Hi, I was just calling to check the status of my router order.",
        score: 0.6,
        time: "00:18",
      },
      {
        speaker: "Agent",
        text: "Certainly, can I have your order reference number?",
        score: 0.75,
        time: "00:29",
      },
      {
        speaker: "Customer",
        text: "Yes, it is 123-456.",
        score: 0.65,
        time: "00:40",
      },
      {
        speaker: "Agent",
        text: "Thank you. I see it's scheduled for delivery tomorrow.",
        score: 0.7,
        time: "00:55",
      },
    ],
  },
  109: {
    transcript: [
      {
        speaker: "Agent",
        text: "This is Kasun at SLT.",
        score: 0.7,
        time: "00:04",
      },
      {
        speaker: "Customer",
        text: "Hello, I need to update my billing address.",
        score: 0.6,
        time: "00:15",
      },
      {
        speaker: "Agent",
        text: "I can help with that. Can you please verify your National ID number?",
        score: 0.7,
        time: "00:28",
      },
    ],
  },
  110: {
    transcript: [
      {
        speaker: "Agent",
        text: "Customer service, Ravi speaking.",
        score: 0.7,
        time: "00:08",
      },
      {
        speaker: "Customer",
        text: "I'm just calling to confirm my data package details.",
        score: 0.65,
        time: "00:20",
      },
      {
        speaker: "Agent",
        text: "Of course. Let me open your account.",
        score: 0.7,
        time: "00:31",
      },
    ],
  },
};

// Helper function to format date and time
const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

// --- Dashboard Component ---
const Dashboard = ({ onViewCall }) => {
  const [calls, setCalls] = useState(initialMockCalls);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSentiment, setSelectedSentiment] = useState("");
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [callToDeleteId, setCallToDeleteId] = useState(null);

  const agents = useMemo(() => {
    const agentSet = new Set(initialMockCalls.map((call) => call.agent));
    return ["All Agents", ...Array.from(agentSet)];
  }, []);

  const sentiments = ["All Sentiments", "Positive", "Negative", "Neutral"];

  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      const matchesSearch =
        searchTerm === "" ||
        call.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.id.toString().includes(searchTerm);

      const matchesAgent =
        selectedAgent === "" ||
        selectedAgent === "All Agents" ||
        call.agent === selectedAgent;

      const matchesDate =
        selectedDate === "" || call.dateTime.startsWith(selectedDate);

      // --- THIS IS THE UPDATED FILTER LOGIC ---
      const matchesSentiment =
        selectedSentiment === "" ||
        selectedSentiment === "All Sentiments" ||
        call.agentSentiment === selectedSentiment ||
        call.customerSentiment === selectedSentiment;

      return matchesSearch && matchesAgent && matchesDate && matchesSentiment;
    });
  }, [calls, searchTerm, selectedAgent, selectedDate, selectedSentiment]);

  // --- Action handlers ---
  const handleView = (call) => {
    // This now calls the function passed from the App component
    onViewCall(call);
  };

  const handleDelete = (callId) => {
    setCallToDeleteId(callId);
    setIsConfirmModalOpen(true);
  };

  const executeDelete = () => {
    setCalls((prevCalls) =>
      prevCalls.filter((call) => call.id !== callToDeleteId)
    );
    setIsConfirmModalOpen(false);
    setCallToDeleteId(null);
  };

  // --- Download Handlers ---
  const handleDownloadCSV = () => {
    if (filteredCalls.length === 0) {
      console.error("No data to download.");
      return;
    }
    // --- Headers ---
    const headers = [
      "Call ID",
      "Agent",
      "Date & Time",
      "Duration",
      "Agent Sentiment",
      "Customer Sentiment",
    ];
    const csvContent = [
      headers.join(","),
      // --- Data mapping ---
      ...filteredCalls.map((call) =>
        [
          call.id,
          call.agent,
          `"${formatDateTime(call.dateTime)}"`,
          call.duration,
          call.agentSentiment,
          call.customerSentiment,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSimplePDF = () => {
    if (filteredCalls.length === 0) {
      console.error("No data to download.");
      return;
    }
    const doc = new jsPDF();
    doc.text("Call Report", 14, 15);

    // --- Headers ---
    const tableColumns = [
      "Call ID",
      "Agent",
      "Date & Time",
      "Duration",
      "Agent Sentiment",
      "Customer Sentiment",
    ];
    // --- Data mapping ---
    const tableRows = filteredCalls.map((call) => [
      call.id,
      call.agent,
      formatDateTime(call.dateTime),
      call.duration,
      call.agentSentiment,
      call.customerSentiment,
    ]);

    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: 20,
    });

    doc.save(`call_report_table_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="dashboard-main-content">
      <div className="card dashboard-container">
        <h2 className="dashboard-title">SLT Call Center Dashboard</h2>

        <div className="dashboard-filters">
          <div className="filter-input">
            <CalendarDays size={18} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="filter-control"
            />
            {selectedDate && (
              <X
                size={16}
                className="clear-filter"
                onClick={() => setSelectedDate("")}
              />
            )}
          </div>

          <div className="filter-input">
            <UserCheck size={18} />
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="filter-control"
            >
              {agents.map((agent) => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-input">
            <Smile size={18} />
            <select
              value={selectedSentiment}
              onChange={(e) => setSelectedSentiment(e.target.value)}
              className="filter-control"
            >
              {sentiments.map((sentiment) => (
                <option key={sentiment} value={sentiment}>
                  {sentiment}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-input search-input">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by Agent or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-control"
            />
            {searchTerm && (
              <X
                size={16}
                className="clear-filter"
                onClick={() => setSearchTerm("")}
              />
            )}
          </div>

          <button
            className="btn-primary download-report-btn"
            onClick={() => setIsDownloadModalOpen(true)}
          >
            <Download size={18} />
            Download Report
          </button>
        </div>

        <div className="table-wrapper">
          <table className="dashboard-table">
            {/* --- Table Head --- */}
            <thead>
              <tr>
                <th>Call ID</th>
                <th>Agent</th>
                <th>Date & Time</th>
                <th>Duration</th>
                <th>Agent Sentiment</th>
                <th>Customer Sentiment</th>
                <th>Actions</th>
              </tr>
            </thead>
            {/* --- Table Body --- */}
            <tbody>
              {filteredCalls.length > 0 ? (
                filteredCalls.map((call) => (
                  <tr key={call.id}>
                    <td>{call.id}</td>
                    <td>{call.agent}</td>
                    <td>{formatDateTime(call.dateTime)}</td>
                    <td>{call.duration}</td>
                    <td className="sentiment-cell">
                      <SentimentTag sentiment={call.agentSentiment} />
                    </td>
                    <td className="sentiment-cell">
                      <SentimentTag sentiment={call.customerSentiment} />
                    </td>
                    <td className="actions-cell">
                      <button
                        className="action-btn view-btn"
                        onClick={() => handleView(call)}
                        title="View Call"
                      >
                        <Eye size={16} /> View
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDelete(call.id)}
                        title="Delete Call"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  {/* --- ColSpan to 7 --- */}
                  <td colSpan="7" className="no-results-cell">
                    No calls found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        onDownloadCSV={handleDownloadCSV}
        onDownloadPDF={handleDownloadSimplePDF}
        hasData={filteredCalls.length > 0}
      />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={executeDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete call ID ${callToDeleteId}? This action cannot be undone.`}
      />
    </div>
  );
};

// --- CallDetailView Component ---
// This is the new page for viewing a single call
const CallDetailView = ({ call, onBackToDashboard }) => {
  // Find the detailed transcript from our mock data using the call ID
  // In a real app, you might fetch this from an API
  const callDetails = detailedMockCalls[call.id] || { transcript: [] };

  const downloadTranscript = () => {
    const content = callDetails.transcript
      .map(
        (t) =>
          `[${t.time}] ${t.speaker} (Score: ${t.score.toFixed(2)}): ${t.text}`
      )
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call_${call.id}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSentimentDisplay = (score) => {
    if (score >= 0.7) return { emoji: "🙂", className: "sentiment-positive" };
    if (score <= 0.35) return { emoji: "😠", className: "sentiment-negative" };
    return { emoji: "😐", className: "sentiment-neutral" };
  };

  return (
    <div className="main-content">
      {/* --- Left Card: Call Details --- */}
      <div className="card call-details-card">
        <button onClick={onBackToDashboard} className="back-button">
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <h2 className="call-details-title">Call Details</h2>

        <div className="detail-item">
          <BarChart2 className="detail-icon" />
          <div className="detail-text">
            <span className="detail-label">Call ID</span>
            <span className="detail-value">{call.id}</span>
          </div>
        </div>

        <div className="detail-item">
          <UserCheck className="detail-icon" />
          <div className="detail-text">
            <span className="detail-label">Agent</span>
            <span className="detail-value">{call.agent}</span>
          </div>
        </div>

        <div className="detail-item">
          <CalendarDays className="detail-icon" />
          <div className="detail-text">
            <span className="detail-label">Date & Time</span>
            <span className="detail-value">
              {formatDateTime(call.dateTime)}
            </span>
          </div>
        </div>

        <div className="detail-item">
          <Clock className="detail-icon" />
          <div className="detail-text">
            <span className="detail-label">Duration</span>
            <span className="detail-value">{call.duration}</span>
          </div>
        </div>

        {/* --- Replaced Overall Sentiment with Agent and Customer Sentiment --- */}
        <div className="detail-item">
          <Bot className="detail-icon agent" />
          <div className="detail-text">
            <span className="detail-label">Agent Sentiment</span>
            <SentimentTag
              sentiment={call.agentSentiment}
              className="detail-tag"
            />
          </div>
        </div>
        <div className="detail-item">
          <User className="detail-icon customer" />
          <div className="detail-text">
            <span className="detail-label">Customer Sentiment</span>
            <SentimentTag
              sentiment={call.customerSentiment}
              className="detail-tag"
            />
          </div>
        </div>
      </div>

      {/* --- Right Card: Call Transcript --- */}
      <div className="card result-card">
        <div className="results">
          <div className="overall-header">
            <h2 className="result-title">Call Transcript</h2>
            <button className="transcript-btn" onClick={downloadTranscript}>
              <Download className="download-icon" /> Transcript
            </button>
          </div>

          {callDetails.transcript.length > 0 ? (
            callDetails.transcript.map((line, index) => {
              const { emoji, className } = getSentimentDisplay(line.score);
              return (
                <div key={index} className="transcript-line">
                  <div className="line-content">
                    <div className="speaker-info">
                      {line.speaker === "Agent" ? (
                        <Bot className="speaker-icon agent" />
                      ) : (
                        <User className="speaker-icon customer" />
                      )}
                      <strong>{line.speaker}</strong>
                      <span className="timestamp">{line.time}</span>
                    </div>
                    <p className="text">{line.text}</p>
                  </div>
                  <div className={`sentiment-box ${className}`}>
                    <span>{emoji}</span>
                    <span>{line.score.toFixed(2)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="placeholder">
              <FileText className="placeholder-icon" />
              <p>No transcript is available for this call.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- This is the main App component  ---
function App() {
  // --- State now includes selectedCall ---
  const [mode, setMode] = useState("dashboard"); // 'upload', 'live', 'dashboard', or 'detail'
  const [selectedCall, setSelectedCall] = useState(null);

  // --- Handler to switch to the detail view ---
  const handleViewCall = (call) => {
    setSelectedCall(call);
    setMode("detail");
  };

  // --- Handler to go back to the dashboard ---
  const handleBackToDashboard = () => {
    setMode("dashboard");
    setSelectedCall(null);
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <Phone className="logo-icon" />
          <h1>Call Sentiment Analyzer</h1>
        </div>

        {/* --- THIS IS THE UPDATED SECTION (Reverted to hide buttons on detail page) --- */}
        <div className="button-group">
          {mode !== "detail" ? (
            <>
              <button
                onClick={() => setMode("dashboard")}
                className={
                  mode === "dashboard" ? "btn-primary" : "btn-secondary"
                }
              >
                Dashboard
              </button>
              <button
                onClick={() => setMode("upload")}
                className={mode === "upload" ? "btn-primary" : "btn-secondary"}
              >
                Analyze Recorded Call
              </button>
              <button
                onClick={() => setMode("live")}
                className={mode === "live" ? "btn-primary" : "btn-secondary"}
              >
                Analyze Live Call
              </button>
            </>
          ) : (
            // This placeholder keeps the header aligned
            <div className="header-placeholder"></div>
          )}
        </div>
      </header>

      {/* --- Render logic for all 4 modes --- */}
      {mode === "upload" && <UploadAnalyzer />}
      {mode === "live" && <LiveAnalyzer />}
      {mode === "dashboard" && <Dashboard onViewCall={handleViewCall} />}
      {mode === "detail" && (
        <CallDetailView
          call={selectedCall}
          onBackToDashboard={handleBackToDashboard}
        />
      )}
    </div>
  );
}

export default App;
