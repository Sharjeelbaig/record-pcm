# record-pcm
<!-- logo -->
![record-pcm](./logo.svg)

A simple module to record PCM audio from the browser with optional voice activity detection (VAD).

## Installation

```bash
bun install record-pcm
# or
npm install record-pcm
```

## Usage

### Basic Recording

```javascript
import { recordPCM } from 'record-pcm';

// Start recording
const stopRecording = recordPCM({
  onData: (pcmData) => {
    // pcmData is a Uint8Array containing 16-bit PCM audio data
    console.log('Received PCM data:', pcmData.length, 'bytes');
  },
  onError: (error) => {
    console.error('Error recording PCM:', error);
  },
  onStop: () => {
    console.log('Recording stopped');
  },
});

// Stop recording when needed
document.getElementById('stopBtn').onclick = () => {
  stopRecording();
};
```

### With Voice Activity Detection (Auto-stop on silence)

```javascript
import { recordPCM } from 'record-pcm';

const stopRecording = recordPCM({
  onData: (pcmData) => {
    // Send pcmData to your server or process it
    websocket.send(pcmData);
  },
  onError: (error) => {
    console.error('Error:', error);
  },
  onStop: () => {
    console.log('Recording stopped automatically after silence');
  },
  // Enable voice activity detection
  vadEnabled: true,
  vadThreshold: 0.01,        // Silence threshold (0-1)
  vadSilenceDuration: 1500,  // Stop after 1.5s of silence
  vadMinRecordingTime: 500,  // Minimum recording time before VAD can stop
});
```

### Listen Mode (Auto-start + Auto-stop)

For a hands-free experience where recording automatically starts when the user speaks and stops when they're silent:

```javascript
import { listenForSpeech } from 'record-pcm';

const stopListening = listenForSpeech({
  onData: (pcmData) => {
    // Only called when speech is detected
    websocket.send(pcmData);
  },
  onSpeechStart: () => {
    console.log('User started speaking');
  },
  onSpeechEnd: () => {
    console.log('User stopped speaking');
  },
  onError: (error) => {
    console.error('Error:', error);
  },
  // VAD options
  vadThreshold: 0.01,
  vadSilenceDuration: 1500,
  vadMinRecordingTime: 500,
  continuous: true,  // Keep listening after speech ends
});

// Stop listening entirely
stopListening();
```

### React Example

```jsx
import { useState, useRef } from 'react';
import { recordPCM } from 'record-pcm';

function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const stopRef = useRef(null);

  const startRecording = () => {
    setIsRecording(true);
    
    stopRef.current = recordPCM({
      onData: (pcmData) => {
        // Process PCM data
        console.log('PCM chunk:', pcmData.length, 'bytes');
      },
      onError: (error) => {
        console.error(error);
        setIsRecording(false);
      },
      onStop: () => {
        setIsRecording(false);
      },
      vadEnabled: true,
    });
  };

  const stopRecording = () => {
    if (stopRef.current) {
      stopRef.current();
    }
  };

  return (
    <button onClick={isRecording ? stopRecording : startRecording}>
      {isRecording ? 'Stop Recording' : 'Start Recording'}
    </button>
  );
}
```

## API

### `recordPCM(options): StopRecording`

Starts recording PCM audio from the user's microphone.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onData` | `(pcmData: Uint8Array) => void` | **required** | Called with PCM audio data chunks |
| `onError` | `(error: Error) => void` | `() => {}` | Called when an error occurs |
| `onStop` | `() => void` | `() => {}` | Called when recording stops |
| `sampleRate` | `number` | `16000` | Sample rate for the audio |
| `vadEnabled` | `boolean` | `false` | Enable voice activity detection |
| `vadThreshold` | `number` | `0.01` | Silence threshold (0-1) |
| `vadSilenceDuration` | `number` | `1500` | Silence duration in ms before stopping |
| `vadMinRecordingTime` | `number` | `500` | Minimum recording time before VAD can stop |

#### Returns

`StopRecording` - A function that stops the recording when called.

---

### `listenForSpeech(options): StopListening`

Listens for speech and auto-starts/stops recording based on voice activity. Perfect for hands-free recording where you want the system to automatically detect when the user starts and stops speaking.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onData` | `(pcmData: Uint8Array) => void` | **required** | Called with PCM data only when speech is detected |
| `onError` | `(error: Error) => void` | `() => {}` | Called when an error occurs |
| `onSpeechStart` | `() => void` | `() => {}` | Called when speech is detected (auto-start) |
| `onSpeechEnd` | `() => void` | `() => {}` | Called when speech ends (auto-stop) |
| `sampleRate` | `number` | `16000` | Sample rate for the audio |
| `vadThreshold` | `number` | `0.01` | Voice threshold for detecting speech (0-1) |
| `vadSilenceDuration` | `number` | `1500` | Silence duration in ms before stopping |
| `vadMinRecordingTime` | `number` | `500` | Minimum speech duration before auto-stop |
| `continuous` | `boolean` | `true` | Keep listening for new speech after auto-stop |

#### Returns

`StopListening` - A function that stops listening entirely when called.

## PCM Format

The audio data is provided as:
- **Format**: 16-bit signed integer PCM (little-endian)
- **Channels**: Mono (1 channel)
- **Sample Rate**: Configurable (default: 16000 Hz)
- **Chunk Size**: 4096 samples per chunk (8192 bytes)

## Browser Support

This module uses the Web Audio API and AudioWorklet, which are supported in all modern browsers:
- Chrome 66+
- Firefox 76+
- Safari 14.1+
- Edge 79+

## License

MIT
