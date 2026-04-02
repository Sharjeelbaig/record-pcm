import { useState, useRef } from 'react'
import { recordPCM, listenForSpeech } from 'record-pcm'
import './App.css'

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [pcmChunks, setPcmChunks] = useState<Uint8Array[]>([])
  const [dataSize, setDataSize] = useState(0)
  const [status, setStatus] = useState('')
  const stopRef = useRef<(() => void) | null>(null)

  const startRecording = (vadEnabled: boolean) => {
    setPcmChunks([])
    setDataSize(0)
    setStatus(`Starting recording${vadEnabled ? ' with VAD enabled...' : '...'}`)
    setIsRecording(true)

    stopRef.current = recordPCM({
      onData: (pcmData) => {
        setPcmChunks((prev) => [...prev, pcmData])
        setDataSize((prev) => prev + pcmData.length)
        setStatus(`Receiving data... (${pcmData.length} bytes/chunk)`)
      },
      onError: (error) => {
        setStatus(`❌ Error: ${error.message}`)
        setIsRecording(false)
      },
      onStop: () => {
        setStatus('✅ Recording stopped')
        setIsRecording(false)
      },
      vadEnabled: vadEnabled,
      vadThreshold: 0.01,
      vadSilenceDuration: 1500,
      vadMinRecordingTime: 500,
    })
  }

  const startListening = () => {
    setPcmChunks([])
    setDataSize(0)
    setStatus('🎧 Listening for speech... (speak to start recording)')
    setIsListening(true)

    stopRef.current = listenForSpeech({
      onData: (pcmData) => {
        setPcmChunks((prev) => [...prev, pcmData])
        setDataSize((prev) => prev + pcmData.length)
      },
      onError: (error) => {
        setStatus(`❌ Error: ${error.message}`)
        setIsListening(false)
        setIsSpeaking(false)
      },
      onSpeechStart: () => {
        setStatus('🎤 Speech detected! Recording...')
        setIsSpeaking(true)
      },
      onSpeechEnd: () => {
        setStatus('🎧 Speech ended. Listening for more...')
        setIsSpeaking(false)
      },
      vadThreshold: 0.01,
      vadSilenceDuration: 1500,
      vadMinRecordingTime: 500,
      continuous: true,
    })
  }

  const stopRecording = () => {
    if (stopRef.current) {
      stopRef.current()
    }
    setIsRecording(false)
    setIsListening(false)
    setIsSpeaking(false)
  }

  const isActive = isRecording || isListening

  return (
    <div className="container">
      <h1>🎙️ record-pcm Test</h1>

      <div className="card">
        <h2>Recording Controls</h2>
        <div className="button-group">
          <button
            onClick={() => startRecording(false)}
            disabled={isActive}
            className="btn btn-primary"
          >
            Start Recording
          </button>
          <button
            onClick={() => startRecording(true)}
            disabled={isActive}
            className="btn btn-success"
          >
            Start with VAD (Auto-stop)
          </button>
          <button
            onClick={startListening}
            disabled={isActive}
            className="btn btn-purple"
          >
            🎧 Listen Mode (Auto-start + Auto-stop)
          </button>
          <button
            onClick={stopRecording}
            disabled={!isActive}
            className="btn btn-danger"
          >
            Stop
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Status</h2>
        <div className={`status ${isRecording ? 'recording' : ''} ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
          {status || 'Ready to record'}
        </div>
      </div>

      <div className="card">
        <h2>Statistics</h2>
        <div className="stats">
          <div className="stat-item">
            <span>Chunks Received:</span>
            <strong>{pcmChunks.length}</strong>
          </div>
          <div className="stat-item">
            <span>Total Data:</span>
            <strong>{dataSize} bytes ({(dataSize / 1024).toFixed(2)} KB)</strong>
          </div>
          <div className="stat-item">
            <span>Mode:</span>
            <strong>
              {isListening ? (isSpeaking ? '🔴 Speaking' : '🎧 Listening') : 
               isRecording ? '🔴 Recording' : '⚫ Stopped'}
            </strong>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>How to Test</h2>
        <ul>
          <li>
            <strong>Start Recording</strong> - Manual start/stop, records everything.
          </li>
          <li>
            <strong>Start with VAD</strong> - Manual start, auto-stops after 1.5s of silence.
          </li>
          <li>
            <strong>🎧 Listen Mode</strong> - Auto-starts when you speak, auto-stops on silence, then listens again for more speech (continuous mode).
          </li>
        </ul>
      </div>
    </div>
  )
}

export default App
