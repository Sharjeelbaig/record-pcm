export interface PCMData {
  /** Base64-encoded PCM data */
  pcmBase64: string;
  /** Raw PCM data as Uint8Array */
  pcm: Uint8Array;
}

export interface RecordPCMOptions {
  /** Called with PCM audio data chunks */
  onData: (data: PCMData) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Called when recording stops (either manually or via VAD) */
  onStop?: () => void;
  /** Sample rate for the audio (default: 16000) */
  sampleRate?: number;
  /** Enable voice activity detection to auto-stop on silence (default: false) */
  vadEnabled?: boolean;
  /** Silence threshold for VAD (0-1, default: 0.01) */
  vadThreshold?: number;
  /** Duration of silence in ms before stopping (default: 1500) */
  vadSilenceDuration?: number;
  /** Minimum recording duration in ms before VAD can stop (default: 500) */
  vadMinRecordingTime?: number;
}

export interface ListenForSpeechOptions {
  /** Called with PCM audio data chunks (only when speech is detected) */
  onData: (data: PCMData) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Called when speech starts (auto-start triggered) */
  onSpeechStart?: () => void;
  /** Called when speech ends (auto-stop triggered) */
  onSpeechEnd?: () => void;
  /** Sample rate for the audio (default: 16000) */
  sampleRate?: number;
  /** Voice threshold for detecting speech (0-1, default: 0.01) */
  vadThreshold?: number;
  /** Duration of silence in ms before stopping (default: 1500) */
  vadSilenceDuration?: number;
  /** Minimum speech duration in ms before auto-stop can trigger (default: 500) */
  vadMinRecordingTime?: number;
  /** Keep listening for new speech after auto-stop (default: true) */
  continuous?: boolean;
}

export type StopRecording = () => void;
export type StopListening = () => void;

/** Convert Uint8Array to base64 string */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Records PCM audio from the user's microphone.
 * Returns a function to stop recording.
 */
export function recordPCM(options: RecordPCMOptions): StopRecording {
  const {
    onData,
    onError = () => {},
    onStop = () => {},
    sampleRate = 16000,
    vadEnabled = false,
    vadThreshold = 0.01,
    vadSilenceDuration = 1500,
    vadMinRecordingTime = 500,
  } = options;

  let isRecording = true;
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let workletNode: AudioWorkletNode | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;

  // VAD state
  let silenceStart: number | null = null;
  let recordingStartTime: number = Date.now();

  const cleanup = () => {
    isRecording = false;
    
    if (workletNode) {
      workletNode.disconnect();
      workletNode = null;
    }
    
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }
    
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
  };

  const stopRecording: StopRecording = () => {
    if (!isRecording) return;
    cleanup();
    onStop();
  };

  // Start recording
  (async () => {
    try {
      // Get microphone access
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: { ideal: sampleRate },
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      if (!isRecording) {
        cleanup();
        return;
      }

      // Create audio context
      audioContext = new AudioContext({ sampleRate });

      // Create the PCM processor worklet
      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.bufferSize = 4096;
            this.buffer = new Float32Array(this.bufferSize);
            this.bufferIndex = 0;
          }

          process(inputs) {
            const input = inputs[0];
            if (!input || !input[0]) return true;

            const samples = input[0];
            
            for (let i = 0; i < samples.length; i++) {
              this.buffer[this.bufferIndex++] = samples[i];
              
              if (this.bufferIndex >= this.bufferSize) {
                // Calculate RMS for VAD
                let sum = 0;
                for (let j = 0; j < this.bufferSize; j++) {
                  sum += this.buffer[j] * this.buffer[j];
                }
                const rms = Math.sqrt(sum / this.bufferSize);

                // Convert to 16-bit PCM
                const pcmData = new Int16Array(this.bufferSize);
                for (let j = 0; j < this.bufferSize; j++) {
                  const s = Math.max(-1, Math.min(1, this.buffer[j]));
                  pcmData[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                this.port.postMessage({
                  pcmData: new Uint8Array(pcmData.buffer),
                  rms: rms,
                });

                this.bufferIndex = 0;
              }
            }

            return true;
          }
        }

        registerProcessor('pcm-processor', PCMProcessor);
      `;

      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);

      await audioContext.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      if (!isRecording) {
        cleanup();
        return;
      }

      // Create nodes
      sourceNode = audioContext.createMediaStreamSource(mediaStream);
      workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');

      recordingStartTime = Date.now();

      workletNode.port.onmessage = (event) => {
        if (!isRecording) return;

        const { pcmData, rms } = event.data;
        
        // Guard against empty or malformed data from worklet
        if (!pcmData || pcmData.length === 0) return;
        
        // Send PCM data to callback with both formats
        onData({
          pcmBase64: uint8ToBase64(pcmData),
          pcm: pcmData,
        });

        // Voice activity detection
        if (vadEnabled) {
          const timeSinceStart = Date.now() - recordingStartTime;
          
          if (rms < vadThreshold) {
            // Silence detected
            if (silenceStart === null) {
              silenceStart = Date.now();
            } else if (
              timeSinceStart > vadMinRecordingTime &&
              Date.now() - silenceStart > vadSilenceDuration
            ) {
              // Enough silence, stop recording
              stopRecording();
            }
          } else {
            // Voice detected, reset silence timer
            silenceStart = null;
          }
        }
      };

      // Connect the audio graph
      sourceNode.connect(workletNode);
      workletNode.connect(audioContext.destination);

    } catch (error) {
      cleanup();
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  })();

  return stopRecording;
}

/**
 * Listens for speech and auto-starts/stops recording based on voice activity.
 * Returns a function to stop listening entirely.
 */
export function listenForSpeech(options: ListenForSpeechOptions): StopListening {
  const {
    onData,
    onError = () => {},
    onSpeechStart = () => {},
    onSpeechEnd = () => {},
    sampleRate = 16000,
    vadThreshold = 0.01,
    vadSilenceDuration = 1500,
    vadMinRecordingTime = 500,
    continuous = true,
  } = options;

  let isListening = true;
  let isSpeaking = false;
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let workletNode: AudioWorkletNode | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;

  // VAD state
  let silenceStart: number | null = null;
  let speechStartTime: number | null = null;

  const cleanup = () => {
    isListening = false;
    isSpeaking = false;
    
    if (workletNode) {
      workletNode.disconnect();
      workletNode = null;
    }
    
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }
    
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
  };

  const stopListening: StopListening = () => {
    if (!isListening) return;
    if (isSpeaking) {
      onSpeechEnd();
    }
    cleanup();
  };

  // Start listening
  (async () => {
    try {
      // Get microphone access
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: { ideal: sampleRate },
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      if (!isListening) {
        cleanup();
        return;
      }

      // Create audio context
      audioContext = new AudioContext({ sampleRate });

      // Create the PCM processor worklet
      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.bufferSize = 4096;
            this.buffer = new Float32Array(this.bufferSize);
            this.bufferIndex = 0;
          }

          process(inputs) {
            const input = inputs[0];
            if (!input || !input[0]) return true;

            const samples = input[0];
            
            for (let i = 0; i < samples.length; i++) {
              this.buffer[this.bufferIndex++] = samples[i];
              
              if (this.bufferIndex >= this.bufferSize) {
                // Calculate RMS for VAD
                let sum = 0;
                for (let j = 0; j < this.bufferSize; j++) {
                  sum += this.buffer[j] * this.buffer[j];
                }
                const rms = Math.sqrt(sum / this.bufferSize);

                // Convert to 16-bit PCM
                const pcmData = new Int16Array(this.bufferSize);
                for (let j = 0; j < this.bufferSize; j++) {
                  const s = Math.max(-1, Math.min(1, this.buffer[j]));
                  pcmData[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                this.port.postMessage({
                  pcmData: new Uint8Array(pcmData.buffer),
                  rms: rms,
                });

                this.bufferIndex = 0;
              }
            }

            return true;
          }
        }

        registerProcessor('pcm-processor', PCMProcessor);
      `;

      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);

      await audioContext.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      if (!isListening) {
        cleanup();
        return;
      }

      // Create nodes
      sourceNode = audioContext.createMediaStreamSource(mediaStream);
      workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');

      workletNode.port.onmessage = (event) => {
        if (!isListening) return;

        const { pcmData, rms } = event.data;
        
        // Guard against empty or malformed data from worklet
        if (!pcmData || pcmData.length === 0) return;
        
        const data: PCMData = {
          pcmBase64: uint8ToBase64(pcmData),
          pcm: pcmData,
        };
        
        if (rms >= vadThreshold) {
          // Voice detected
          silenceStart = null;
          
          if (!isSpeaking) {
            // Start speaking - trigger auto-start
            isSpeaking = true;
            speechStartTime = Date.now();
            onSpeechStart();
          }
          
          // Send PCM data only when speaking
          onData(data);
        } else {
          // Silence detected
          if (isSpeaking) {
            // Still send data during brief silence (within speech)
            onData(data);
            
            if (silenceStart === null) {
              silenceStart = Date.now();
            } else {
              const timeSinceSpeechStart = Date.now() - (speechStartTime || 0);
              const silenceDuration = Date.now() - silenceStart;
              
              if (
                timeSinceSpeechStart > vadMinRecordingTime &&
                silenceDuration > vadSilenceDuration
              ) {
                // Enough silence, stop speaking
                isSpeaking = false;
                speechStartTime = null;
                silenceStart = null;
                onSpeechEnd();
                
                // If not continuous, stop listening entirely
                if (!continuous) {
                  cleanup();
                }
              }
            }
          }
        }
      };

      // Connect the audio graph
      sourceNode.connect(workletNode);
      workletNode.connect(audioContext.destination);

    } catch (error) {
      cleanup();
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  })();

  return stopListening;
}

export default recordPCM;
