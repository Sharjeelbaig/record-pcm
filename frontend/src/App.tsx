import { type SyntheticEvent, useEffect, useRef, useState } from 'react'
import AutoModeRoundedIcon from '@mui/icons-material/AutoModeRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import CodeRoundedIcon from '@mui/icons-material/CodeRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded'
import GitHubIcon from '@mui/icons-material/GitHub'
import GavelRoundedIcon from '@mui/icons-material/GavelRounded'
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded'
import HearingRoundedIcon from '@mui/icons-material/HearingRounded'
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import MicRoundedIcon from '@mui/icons-material/MicRounded'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
import StopRoundedIcon from '@mui/icons-material/StopRounded'
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import {
  Box,
  Button,
  Chip,
  Container,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Slider,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { ThemeProvider, alpha, createTheme } from '@mui/material/styles'
import { listenForSpeech, recordPCM } from 'record-pcm'
import { PlayerState, uint8ToFloat32, usePCMPlayer } from 'play-pcm'
import type { PCMPlayerOptions } from 'play-pcm'
import './App.css'
import chromeLogo from './assets/brands/browsers/chrome.svg'
import edgeLogo from './assets/brands/browsers/edge.svg'
import firefoxLogo from './assets/brands/browsers/firefox.svg'
import safariLogo from './assets/brands/browsers/safari.svg'
import javascriptLogo from './assets/brands/languages/javascript.svg'
import typescriptLogo from './assets/brands/languages/typescript.svg'
import BrandAssetIcon from './components/BrandAssetIcon'
import CodeSnippet from './components/CodeSnippet'
import RecordPcmLogo from './components/RecordPcmLogo'

const SAMPLE_RATE = 16000
const BYTES_PER_SAMPLE = 2
const INSTALL_COMMAND = 'npm install record-pcm'
const PACKAGE_URL = 'https://www.npmjs.com/package/record-pcm'
const PACKAGE_REGISTRY_URL = 'https://registry.npmjs.org/record-pcm/latest'
const GITHUB_URL = 'https://github.com/sharjeelbaig/record-pcm'
const PORTFOLIO_URL = 'https://sharjeel-baig.pages.dev'
const PACKAGE_FALLBACK_VERSION = '1.0.0'
const CURRENT_YEAR = new Date().getFullYear()

type CaptureMode = 'manual' | 'vad' | 'listen'
type ExampleLanguage = 'ts' | 'js'

const DOC_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'installation', label: 'Installation' },
  { id: 'examples', label: 'Code Examples' },
  { id: 'api', label: 'API Reference' },
  { id: 'demo', label: 'Live Demo' },
  { id: 'browsers', label: 'Browser Support' },
] as const

const FEATURES = [
  { label: 'Zero dependencies', icon: BoltRoundedIcon },
  { label: 'TypeScript', icon: DataObjectRoundedIcon },
  { label: 'VAD built-in', icon: GraphicEqRoundedIcon },
  { label: 'MIT license', icon: GavelRoundedIcon },
] as const

// Vendored upstream assets keep the docs stable while preserving source provenance.
const BROWSERS = [
  {
    name: 'Chrome',
    version: '66+',
    logo: chromeLogo,
    source: 'https://registry.npmjs.org/@browser-logos/chrome/-/chrome-2.0.0.tgz',
  },
  {
    name: 'Firefox',
    version: '76+',
    logo: firefoxLogo,
    source: 'https://registry.npmjs.org/@browser-logos/firefox/-/firefox-3.0.10.tgz',
  },
  {
    name: 'Safari',
    version: '14.1+',
    logo: safariLogo,
    source: 'https://registry.npmjs.org/@browser-logos/safari/-/safari-2.1.0.tgz',
  },
  {
    name: 'Edge',
    version: '79+',
    logo: edgeLogo,
    source: 'https://registry.npmjs.org/@browser-logos/edge/-/edge-2.0.7.tgz',
  },
] as const

const LANGUAGE_OPTIONS = {
  js: {
    badge: 'JSX',
    highlightLanguage: 'jsx',
    label: 'JavaScript',
    logo: javascriptLogo,
    source: 'https://raw.githubusercontent.com/voodootikigod/logo.js/master/js.svg',
  },
  ts: {
    badge: 'TSX',
    highlightLanguage: 'tsx',
    label: 'TypeScript',
    logo: typescriptLogo,
    source: 'https://www.typescriptlang.org/branding/typescript-design-assets.zip#ts-logo-128.svg',
  },
} as const

const API_OPTIONS_RECORD = [
  { name: 'onData', type: '(pcmData: Uint8Array) => void', required: true, default: '—', description: 'Called with PCM audio data chunks' },
  { name: 'onError', type: '(error: Error) => void', required: false, default: '() => {}', description: 'Called when an error occurs' },
  { name: 'onStop', type: '() => void', required: false, default: '() => {}', description: 'Called when recording stops' },
  { name: 'sampleRate', type: 'number', required: false, default: '16000', description: 'Sample rate in Hz' },
  { name: 'vadEnabled', type: 'boolean', required: false, default: 'false', description: 'Enable voice activity detection' },
  { name: 'vadThreshold', type: 'number', required: false, default: '0.01', description: 'Silence threshold (0-1)' },
  { name: 'vadSilenceDuration', type: 'number', required: false, default: '1500', description: 'Silence duration (ms) before auto-stop' },
  { name: 'vadMinRecordingTime', type: 'number', required: false, default: '500', description: 'Minimum recording time (ms)' },
] as const

const API_OPTIONS_LISTEN = [
  { name: 'onData', type: '(pcmData: Uint8Array) => void', required: true, default: '—', description: 'Called with PCM data when speech detected' },
  { name: 'onSpeechStart', type: '() => void', required: false, default: '() => {}', description: 'Called when speech begins' },
  { name: 'onSpeechEnd', type: '() => void', required: false, default: '() => {}', description: 'Called when speech ends' },
  { name: 'onError', type: '(error: Error) => void', required: false, default: '() => {}', description: 'Called when an error occurs' },
  { name: 'continuous', type: 'boolean', required: false, default: 'true', description: 'Keep listening after speech ends' },
  { name: 'sampleRate', type: 'number', required: false, default: '16000', description: 'Sample rate in Hz' },
  { name: 'vadThreshold', type: 'number', required: false, default: '0.01', description: 'Speech detection threshold (0-1)' },
  { name: 'vadSilenceDuration', type: 'number', required: false, default: '1500', description: 'Silence duration (ms) before speech ends' },
  { name: 'vadMinRecordingTime', type: 'number', required: false, default: '500', description: 'Minimum speech duration (ms)' },
] as const

const CODE_EXAMPLES = [
  {
    id: 'basic-recording',
    title: 'Basic recording',
    description: 'Start a take from a React handler and keep the returned stop function in a ref.',
    js: `import { useRef, useState } from 'react';
import { recordPCM } from 'record-pcm';

export function BasicRecorder() {
  const stopRef = useRef(null);
  const [chunkCount, setChunkCount] = useState(0);

  const startRecording = () => {
    setChunkCount(0);

    stopRef.current = recordPCM({
      onData: () => setChunkCount((count) => count + 1),
      onError: console.error,
      onStop: () => {
        stopRef.current = null;
      },
    });
  };

  return (
    <button onClick={startRecording}>
      Start recording ({chunkCount} chunks)
    </button>
  );
}`,
    ts: `import { useRef, useState } from 'react';
import { recordPCM } from 'record-pcm';

export function BasicRecorder() {
  const stopRef = useRef<(() => void) | null>(null);
  const [chunkCount, setChunkCount] = useState(0);

  const startRecording = () => {
    setChunkCount(0);

    stopRef.current = recordPCM({
      onData: (_pcmData: Uint8Array) => setChunkCount((count) => count + 1),
      onError: (error: Error) => console.error(error),
      onStop: () => {
        stopRef.current = null;
      },
    });
  };

  return (
    <button onClick={startRecording}>
      Start recording ({chunkCount} chunks)
    </button>
  );
}`,
  },
  {
    id: 'manual-stop',
    title: 'Manual stop flow',
    description: 'Expose start and stop handlers without leaving the component model.',
    js: `import { useRef, useState } from 'react';
import { recordPCM } from 'record-pcm';

export function ManualStopRecorder() {
  const stopRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = () => {
    stopRef.current = recordPCM({
      onData: () => {},
      onError: console.error,
      onStop: () => {
        stopRef.current = null;
        setIsRecording(false);
      },
    });

    setIsRecording(true);
  };

  const stopRecording = () => {
    stopRef.current?.();
  };

  return (
    <>
      <button onClick={startRecording}>Start</button>
      <button disabled={!isRecording} onClick={stopRecording}>Stop</button>
    </>
  );
}`,
    ts: `import { useRef, useState } from 'react';
import { recordPCM } from 'record-pcm';

export function ManualStopRecorder() {
  const stopRef = useRef<(() => void) | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = () => {
    stopRef.current = recordPCM({
      onData: (_pcmData: Uint8Array) => {},
      onError: (error: Error) => console.error(error),
      onStop: () => {
        stopRef.current = null;
        setIsRecording(false);
      },
    });

    setIsRecording(true);
  };

  const stopRecording = () => {
    stopRef.current?.();
  };

  return (
    <>
      <button onClick={startRecording}>Start</button>
      <button disabled={!isRecording} onClick={stopRecording}>Stop</button>
    </>
  );
}`,
  },
  {
    id: 'vad-recording',
    title: 'Auto-stop with VAD',
    description: 'Turn on silence detection and keep the UI state minimal.',
    js: `import { useRef, useState } from 'react';
import { recordPCM } from 'record-pcm';

export function VadRecorder() {
  const stopRef = useRef(null);
  const [status, setStatus] = useState('idle');

  const startAutoStop = () => {
    setStatus('recording');

    stopRef.current = recordPCM({
      vadEnabled: true,
      vadThreshold: 0.01,
      vadSilenceDuration: 1500,
      vadMinRecordingTime: 500,
      onData: () => {},
      onError: console.error,
      onStop: () => {
        stopRef.current = null;
        setStatus('complete');
      },
    });
  };

  return <button onClick={startAutoStop}>Record with auto-stop ({status})</button>;
}`,
    ts: `import { useRef, useState } from 'react';
import { recordPCM } from 'record-pcm';

export function VadRecorder() {
  const stopRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<'idle' | 'recording' | 'complete'>('idle');

  const startAutoStop = () => {
    setStatus('recording');

    stopRef.current = recordPCM({
      vadEnabled: true,
      vadThreshold: 0.01,
      vadSilenceDuration: 1500,
      vadMinRecordingTime: 500,
      onData: (_pcmData: Uint8Array) => {},
      onError: (error: Error) => console.error(error),
      onStop: () => {
        stopRef.current = null;
        setStatus('complete');
      },
    });
  };

  return <button onClick={startAutoStop}>Record with auto-stop ({status})</button>;
}`,
  },
  {
    id: 'listen-mode',
    title: 'Listen mode',
    description: 'Keep listening between phrases and react to speech start and end events.',
    js: `import { useRef, useState } from 'react';
import { listenForSpeech } from 'record-pcm';

export function SpeechListener() {
  const stopRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const startListening = () => {
    stopRef.current = listenForSpeech({
      continuous: true,
      vadThreshold: 0.01,
      vadSilenceDuration: 1500,
      vadMinRecordingTime: 500,
      onData: () => {},
      onSpeechStart: () => setIsSpeaking(true),
      onSpeechEnd: () => setIsSpeaking(false),
      onError: console.error,
    });
  };

  const stopListening = () => {
    stopRef.current?.();
    stopRef.current = null;
    setIsSpeaking(false);
  };

  return (
    <>
      <button onClick={startListening}>Start listening</button>
      <button onClick={stopListening}>Stop listening</button>
      <span>{isSpeaking ? 'Speaking' : 'Waiting'}</span>
    </>
  );
}`,
    ts: `import { useRef, useState } from 'react';
import { listenForSpeech } from 'record-pcm';

export function SpeechListener() {
  const stopRef = useRef<(() => void) | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const startListening = () => {
    stopRef.current = listenForSpeech({
      continuous: true,
      vadThreshold: 0.01,
      vadSilenceDuration: 1500,
      vadMinRecordingTime: 500,
      onData: (_pcmData: Uint8Array) => {},
      onSpeechStart: () => setIsSpeaking(true),
      onSpeechEnd: () => setIsSpeaking(false),
      onError: (error: Error) => console.error(error),
    });
  };

  const stopListening = () => {
    stopRef.current?.();
    stopRef.current = null;
    setIsSpeaking(false);
  };

  return (
    <>
      <button onClick={startListening}>Start listening</button>
      <button onClick={stopListening}>Stop listening</button>
      <span>{isSpeaking ? 'Speaking' : 'Waiting'}</span>
    </>
  );
}`,
  },
] as const

const PLAYER_OPTIONS: PCMPlayerOptions = {
  autoPlay: false,
  channels: 1,
  fadeInDuration: 0.03,
  fadeOutDuration: 0.08,
  preservePitch: true,
  sampleRate: SAMPLE_RATE,
  volume: 1,
}

const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#005ac1',
      light: '#d9e2ff',
      dark: '#003f88',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#565e71',
      light: '#dae2f9',
      dark: '#3e4759',
      contrastText: '#ffffff',
    },
    success: {
      main: '#1d6b4f',
      light: '#a5f2cf',
      dark: '#0f5136',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ba1a1a',
      light: '#ffdad6',
      dark: '#93000a',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#815600',
      light: '#ffddb5',
      dark: '#5d3f00',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f2ede8',
      paper: '#fdf8f3',
    },
    text: {
      primary: '#1c1b18',
      secondary: '#47464a',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"Roboto Flex", "Roboto", "Segoe UI", sans-serif',
    h1: {
      fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.1,
    },
    h2: {
      fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      letterSpacing: '0.01em',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      letterSpacing: '0.01em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.02em',
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 500,
      letterSpacing: '0.03em',
    },
    overline: {
      fontSize: '0.6875rem',
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f2ede8',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
      defaultProps: {
        elevation: 0,
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          boxShadow: 'none',
          minHeight: 44,
          paddingInline: 20,
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 1px 3px 1px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.3)',
          },
        },
        sizeLarge: {
          minHeight: 52,
          paddingInline: 28,
          fontSize: '1rem',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        rail: {
          opacity: 0.38,
        },
        thumb: {
          boxShadow: 'none',
          '&:hover, &.Mui-focusVisible': {
            boxShadow: '0 0 0 8px rgba(0, 90, 193, 0.16)',
          },
        },
        track: {
          border: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
})

function concatPCMChunks(chunks: Uint8Array[], totalBytes: number) {
  const merged = new Uint8Array(totalBytes)
  let offset = 0

  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }

  return merged
}

function formatUint8ArrayLiteral(bytes: Uint8Array, valuesPerLine = 24) {
  const lines: string[] = []

  for (let index = 0; index < bytes.length; index += valuesPerLine) {
    const lineValues = Array.from(bytes.slice(index, index + valuesPerLine))
    lines.push(`  ${lineValues.join(', ')}`)
  }

  return `new Uint8Array([\n${lines.join(',\n')}\n])`
}

function formatPCMChunkArrayLiteral(chunks: Uint8Array[]) {
  if (chunks.length === 0) {
    return '[]'
  }

  const formattedChunks = chunks.map((chunk) =>
    formatUint8ArrayLiteral(chunk)
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n'),
  )

  return `[\n${formattedChunks.join(',\n')}\n]`
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00'
  }

  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function getModeLabel(mode: CaptureMode | null) {
  if (mode === 'manual') {
    return 'Manual recording'
  }

  if (mode === 'vad') {
    return 'Auto-stop recording'
  }

  if (mode === 'listen') {
    return 'Listen mode'
  }

  return 'Not selected'
}

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [captureMode, setCaptureMode] = useState<CaptureMode | null>(null)
  const [pcmChunks, setPcmChunks] = useState<Uint8Array[]>([])
  const [dataSize, setDataSize] = useState(0)
  const [previewSamples, setPreviewSamples] = useState<Float32Array | null>(null)
  const [statusMessage, setStatusMessage] = useState(
    'Capture audio in the browser, then play back the latest take when you are ready.',
  )
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubValue, setScrubValue] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [activeSection, setActiveSection] =
    useState<(typeof DOC_SECTIONS)[number]['id']>('overview')
  const [copiedInstall, setCopiedInstall] = useState(false)
  const [copiedPCMChunks, setCopiedPCMChunks] = useState(false)
  const [exampleLanguage, setExampleLanguage] = useState<ExampleLanguage>('ts')
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null)
  const [isDesktopHeaderScrolled, setIsDesktopHeaderScrolled] = useState(false)
  const [packageVersion, setPackageVersion] = useState(PACKAGE_FALLBACK_VERSION)
  const stopRef = useRef<(() => void) | null>(null)
  const copyTimeoutRef = useRef<number | null>(null)
  const pcmCopyTimeoutRef = useRef<number | null>(null)
  const snippetCopyTimeoutRef = useRef<number | null>(null)
  const isDesktop = useMediaQuery(appTheme.breakpoints.up('lg'))

  const {
    currentTime,
    duration,
    error: playerError,
    isReady,
    pause,
    play,
    progress,
    seekPercent,
    state: playerState,
    stop,
  } = usePCMPlayer(previewSamples, PLAYER_OPTIONS)

  const isActive = isRecording || isListening
  const hasPreview = Boolean(previewSamples && dataSize > 0)
  const capturedDuration = dataSize / BYTES_PER_SAMPLE / SAMPLE_RATE
  const playerDuration = hasPreview ? duration || capturedDuration : 0
  const timelineValue = hasPreview ? (isScrubbing ? scrubValue : progress * 100) : 0
  const playbackDisabled = !hasPreview || !isReady || isActive || Boolean(playerError)

  useEffect(() => {
    if (isDesktop) {
      setMobileNavOpen(false)
    }
  }, [isDesktop])

  useEffect(() => {
    if (!isDesktop) {
      setIsDesktopHeaderScrolled(false)
      return
    }

    const handleScroll = () => {
      setIsDesktopHeaderScrolled(window.scrollY > 0)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [isDesktop])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]

        if (visible?.target.id) {
          setActiveSection(visible.target.id as (typeof DOC_SECTIONS)[number]['id'])
        }
      },
      {
        rootMargin: '-15% 0px -60% 0px',
        threshold: [0.2, 0.35, 0.55],
      },
    )

    for (const section of DOC_SECTIONS) {
      const element = document.getElementById(section.id)

      if (element) {
        observer.observe(element)
      }
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const loadPackageVersion = async () => {
      try {
        const response = await fetch(PACKAGE_REGISTRY_URL, {
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { version?: unknown }

        if (typeof data.version === 'string' && data.version.trim()) {
          setPackageVersion(data.version.trim())
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
      }
    }

    void loadPackageVersion()

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (isActive || pcmChunks.length === 0 || dataSize === 0) {
      return
    }

    const merged = concatPCMChunks(pcmChunks, dataSize)
    setPreviewSamples(uint8ToFloat32(merged, BYTES_PER_SAMPLE))
    setStatusMessage('Preview ready. Press play when you want to hear the latest take.')
  }, [dataSize, isActive, pcmChunks])

  useEffect(() => {
    if (!hasPreview) {
      setIsScrubbing(false)
      setScrubValue(0)
    }
  }, [hasPreview])

  useEffect(() => {
    return () => {
      stopRef.current?.()

      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
      }

      if (pcmCopyTimeoutRef.current) {
        window.clearTimeout(pcmCopyTimeoutRef.current)
      }

      if (snippetCopyTimeoutRef.current) {
        window.clearTimeout(snippetCopyTimeoutRef.current)
      }
    }
  }, [])

  const resetForNewCapture = (mode: CaptureMode, message: string) => {
    stop()
    setPreviewSamples(null)
    setPcmChunks([])
    setDataSize(0)
    setIsScrubbing(false)
    setScrubValue(0)
    setCaptureMode(mode)
    setStatusMessage(message)
  }

  const startRecording = (vadEnabled: boolean) => {
    resetForNewCapture(
      vadEnabled ? 'vad' : 'manual',
      vadEnabled
        ? 'Recording with auto-stop. The take will end after a short pause.'
        : 'Recording in progress. Stop when the take is complete.',
    )
    setIsListening(false)
    setIsSpeaking(false)
    setIsRecording(true)

    stopRef.current = recordPCM({
      onData: (data) => {
        setPcmChunks((prev) => [...prev, data.pcm])
        setDataSize((prev) => prev + data.pcm.length)
      },
      onError: (error) => {
        setStatusMessage(`Capture error: ${error.message}`)
        setIsRecording(false)
        stopRef.current = null
      },
      onStop: () => {
        setStatusMessage('Capture complete. Press play to review the take.')
        setIsRecording(false)
        stopRef.current = null
      },
      sampleRate: SAMPLE_RATE,
      vadEnabled,
      vadMinRecordingTime: 500,
      vadSilenceDuration: 1500,
      vadThreshold: 0.01,
    })
  }

  const startListening = () => {
    resetForNewCapture(
      'listen',
      'Listening for speech. Each detected phrase is added to the latest take.',
    )
    setIsRecording(false)
    setIsSpeaking(false)
    setIsListening(true)

    stopRef.current = listenForSpeech({
      continuous: true,
      onData: (data) => {
        setPcmChunks((prev) => [...prev, data.pcm])
        setDataSize((prev) => prev + data.pcm.length)
      },
      onError: (error) => {
        setStatusMessage(`Capture error: ${error.message}`)
        setIsListening(false)
        setIsSpeaking(false)
        stopRef.current = null
      },
      onSpeechEnd: () => {
        setStatusMessage('Speech ended. Waiting for the next phrase.')
        setIsSpeaking(false)
      },
      onSpeechStart: () => {
        setStatusMessage('Speech detected. Recording the current phrase.')
        setIsSpeaking(true)
      },
      sampleRate: SAMPLE_RATE,
      vadMinRecordingTime: 500,
      vadSilenceDuration: 1500,
      vadThreshold: 0.01,
    })
  }

  const stopCapture = () => {
    const stopCurrent = stopRef.current
    stopRef.current = null
    stopCurrent?.()
    setIsRecording(false)
    setIsListening(false)
    setIsSpeaking(false)
    setStatusMessage('Capture stopped. Press play to review the latest take.')
  }

  const handleTransportToggle = () => {
    if (playbackDisabled) {
      return
    }

    if (playerState === PlayerState.PLAYING) {
      pause()
      return
    }

    void play().catch((error: Error) => {
      setStatusMessage(`Playback error: ${error.message}`)
    })
  }

  const handleSeekChange = (_event: Event, value: number | number[]) => {
    setIsScrubbing(true)
    setScrubValue(Array.isArray(value) ? value[0] : value)
  }

  const handleSeekCommit = (_event: Event | SyntheticEvent, value: number | number[]) => {
    const nextValue = Array.isArray(value) ? value[0] : value
    setScrubValue(nextValue)
    seekPercent(nextValue)
    setIsScrubbing(false)
  }

  const handleCopyInstall = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND)
      setCopiedInstall(true)

      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
      }

      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedInstall(false)
      }, 1800)
    } catch {
      setCopiedInstall(false)
    }
  }

  const handleNavClick = (id: (typeof DOC_SECTIONS)[number]['id']) => () => {
    setActiveSection(id)
    setMobileNavOpen(false)
  }

  const handleCopySnippet = async (snippetId: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedSnippetId(snippetId)

      if (snippetCopyTimeoutRef.current) {
        window.clearTimeout(snippetCopyTimeoutRef.current)
      }

      snippetCopyTimeoutRef.current = window.setTimeout(() => {
        setCopiedSnippetId(null)
      }, 1800)
    } catch {
      setCopiedSnippetId(null)
    }
  }

  const handleCopyPCMChunks = async () => {
    if (pcmChunks.length === 0 || isActive) {
      return
    }

    try {
      await navigator.clipboard.writeText(formatPCMChunkArrayLiteral(pcmChunks))
      setCopiedPCMChunks(true)

      if (pcmCopyTimeoutRef.current) {
        window.clearTimeout(pcmCopyTimeoutRef.current)
      }

      pcmCopyTimeoutRef.current = window.setTimeout(() => {
        setCopiedPCMChunks(false)
      }, 1800)
    } catch {
      setCopiedPCMChunks(false)
    }
  }

  const captureTitle = isSpeaking
    ? 'Speech detected'
    : isListening
      ? 'Waiting for speech'
      : isRecording
        ? captureMode === 'vad'
          ? 'Recording with auto-stop'
          : 'Recording in progress'
        : hasPreview
          ? 'Preview ready'
          : 'Ready to record'

  const playerTitle = !hasPreview
    ? 'No take yet'
    : isActive
      ? 'Finish recording to preview'
      : playerState === PlayerState.PLAYING
        ? 'Playing latest take'
        : playerState === PlayerState.PAUSED
          ? 'Playback paused'
          : 'Ready to preview'

  const sidebarContent = (
    <Stack spacing={2.5}>
      <Box className="sidebar-brand">
        <RecordPcmLogo size={40} variant="lockup" />
        <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
          <Chip
            label={`v${packageVersion}`}
            size="small"
            sx={{
              bgcolor: alpha(appTheme.palette.primary.main, 0.1),
              color: 'primary.main',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
          <Chip
            label="MIT"
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ px: 1.5 }}>
          Documentation
        </Typography>
        <List disablePadding sx={{ display: 'grid', gap: 0.25, mt: 0.5 }}>
          {DOC_SECTIONS.map((section) => (
            <ListItemButton
              key={section.id}
              component="a"
              href={`#${section.id}`}
              onClick={handleNavClick(section.id)}
              selected={activeSection === section.id}
              sx={{
                borderRadius: 2,
                px: 1.5,
                py: 0.75,
                minHeight: 40,
                '&.Mui-selected': {
                  bgcolor: alpha(appTheme.palette.primary.main, 0.1),
                  color: 'primary.main',
                },
                '&.Mui-selected:hover': {
                  bgcolor: alpha(appTheme.palette.primary.main, 0.14),
                },
              }}
            >
              <ListItemText
                primary={section.label}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: activeSection === section.id ? 600 : 500,
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Divider />

      <Stack spacing={1.5}>
        <Typography variant="overline" color="text.secondary" sx={{ px: 0.5 }}>
          Resources
        </Typography>
        <Stack spacing={0.5}>
          <Link
            href={GITHUB_URL}
            rel="noreferrer"
            target="_blank"
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.875rem' }}
          >
            <GitHubIcon sx={{ fontSize: 18 }} />
            GitHub Repository
          </Link>
          <Link
            href={PACKAGE_URL}
            rel="noreferrer"
            target="_blank"
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.875rem' }}
          >
            <CodeRoundedIcon sx={{ fontSize: 18 }} />
            npm Package
          </Link>
        </Stack>
      </Stack>
    </Stack>
  )

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box className="app-shell">
        <Box className="ambient ambient-top" />
        <Box className="ambient ambient-bottom" />

        <Drawer
          anchor="left"
          onClose={() => setMobileNavOpen(false)}
          open={mobileNavOpen}
          PaperProps={{
            sx: {
              width: 288,
              p: 2,
              bgcolor: 'background.paper',
            },
          }}
        >
          {sidebarContent}
        </Drawer>

        <Paper
          className={`site-header${isDesktopHeaderScrolled ? ' site-header--desktop-scrolled' : ''}`}
          elevation={0}
        >
          <Container maxWidth="xl">
            <Paper className="site-header-frame" elevation={0}>
              <Stack
                alignItems="center"
                className="site-header-row"
                direction="row"
                justifyContent="space-between"
                spacing={2}
                sx={{ minHeight: 'var(--header-height)' }}
              >
                <Stack alignItems="center" className="site-header-brand" direction="row" spacing={1.25}>
                  {!isDesktop ? (
                    <IconButton aria-label="Open docs menu" onClick={() => setMobileNavOpen(true)}>
                      <MenuRoundedIcon />
                    </IconButton>
                  ) : null}
                  <RecordPcmLogo size={36} variant="icon" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap variant="subtitle2">
                      record-pcm
                    </Typography>
                    <Typography noWrap variant="body2" color="text.secondary">
                      Browser PCM recording demo
                    </Typography>
                  </Box>
                </Stack>

                <Typography
                  className="site-header-section"
                  color="text.secondary"
                  sx={{ display: { xs: 'none', md: 'block' } }}
                  variant="body2"
                >
                  {DOC_SECTIONS.find((section) => section.id === activeSection)?.label ?? 'Overview'}
                </Typography>
              </Stack>
            </Paper>
          </Container>
        </Paper>

        <Container maxWidth="xl" sx={{ position: 'relative', py: { xs: 2, md: 4 } }}>
          <Box className="docs-layout">
            <Paper className="docs-sidebar" elevation={0}>
              {sidebarContent}
            </Paper>

            <Box className="docs-content">
              <Stack spacing={3}>
                {/* Hero Section */}
                <Paper className="hero-panel" component="section" elevation={0} id="overview">
                  <Box className="hero-grid">
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Chip
                        icon={<VerifiedRoundedIcon sx={{ fontSize: 16 }} />}
                        label={`v${packageVersion}`}
                        size="small"
                        sx={{
                          bgcolor: alpha(appTheme.palette.primary.main, 0.12),
                          color: 'primary.main',
                          fontWeight: 600,
                          '& .MuiChip-icon': { color: 'inherit' },
                        }}
                      />
                      <Chip
                        label="MIT License"
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: alpha(appTheme.palette.text.primary, 0.2) }}
                      />
                    </Stack>
                    <Typography variant="h1" component="h1" sx={{ maxWidth: 720, mb: 2 }}>
                      Capture high-quality PCM audio directly in the browser
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640, fontSize: '1.125rem' }}>
                      A lightweight library for recording 16-bit PCM audio with built-in voice activity detection, 
                      automatic silence detection, and hands-free speech capture.
                    </Typography>
                    
                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 3 }}>
                      {FEATURES.map((feature) => {
                        const FeatureIcon = feature.icon

                        return (
                          <Chip
                            key={feature.label}
                            icon={<FeatureIcon sx={{ fontSize: 16 }} />}
                            label={feature.label}
                            size="small"
                            sx={{
                              bgcolor: 'background.paper',
                              border: '1px solid',
                              borderColor: 'divider',
                              fontWeight: 500,
                              maxWidth: '100%',
                              '& .MuiChip-label': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              },
                              '& .MuiChip-icon': {
                                color: 'primary.main',
                              },
                            }}
                          />
                        )
                      })}
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 4 }}>
                      <Button
                        component="a"
                        href="#quick-start"
                        size="large"
                        startIcon={<PlayArrowRoundedIcon />}
                        variant="contained"
                      >
                        Get Started
                      </Button>
                      <Button
                        component="a"
                        endIcon={<LaunchRoundedIcon />}
                        href={GITHUB_URL}
                        rel="noreferrer"
                        size="large"
                        startIcon={<GitHubIcon />}
                        target="_blank"
                        sx={{
                          bgcolor: alpha(appTheme.palette.text.primary, 0.08),
                          color: 'text.primary',
                          '&:hover': {
                            bgcolor: alpha(appTheme.palette.text.primary, 0.12),
                          },
                        }}
                      >
                        View on GitHub
                      </Button>
                    </Stack>
                  </Box>
                </Paper>

                {/* Quick Start Section */}
                <Paper className="surface-panel" component="section" elevation={0} id="quick-start">
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="overline" color="primary.main">
                        Quick Start
                      </Typography>
                      <Typography variant="h2" component="h2" sx={{ mt: 0.5 }}>
                        Up and running in 3 steps
                      </Typography>
                    </Box>

                    <Box className="quick-start-grid">
                      <Paper className="quick-start-card" elevation={0}>
                        <Typography variant="h3" component="span" color="primary.main" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>1</Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>Install the package</Typography>
                        <Box className="code-surface" sx={{ mt: 1.5 }}>
                          <code className="code-inline">npm install record-pcm</code>
                        </Box>
                      </Paper>

                      <Paper className="quick-start-card" elevation={0}>
                        <Typography variant="h3" component="span" color="primary.main" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>2</Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>Import the function</Typography>
                        <Box className="code-surface" sx={{ mt: 1.5 }}>
                          <code className="code-inline">import {'{ recordPCM }'} from 'record-pcm'</code>
                        </Box>
                      </Paper>

                      <Paper className="quick-start-card" elevation={0}>
                        <Typography variant="h3" component="span" color="primary.main" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>3</Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>Start recording</Typography>
                        <Box className="code-surface" sx={{ mt: 1.5 }}>
                          <code className="code-inline">const stop = recordPCM({'{ onData: (pcm) => ... }'})</code>
                        </Box>
                      </Paper>
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                      That's it! The <code>onData</code> callback receives <code>Uint8Array</code> chunks of 16-bit PCM audio at 16kHz.
                    </Typography>
                  </Stack>
                </Paper>

                {/* Installation Section */}
                <Paper
                  className="surface-panel"
                  component="section"
                  elevation={0}
                  id="installation"
                >
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        Installation
                      </Typography>
                      <Typography variant="h2" component="h2" sx={{ mt: 0.5 }}>
                        Install the package
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                      Add <code>record-pcm</code> to your project using your preferred package manager.
                    </Typography>

                    <Paper className="command-surface" elevation={0}>
                      <Stack
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        spacing={1.25}
                      >
                        <Stack direction="row" spacing={1.25} sx={{ minWidth: 0 }}>
                          <TerminalRoundedIcon sx={{ color: 'primary.main', mt: '2px' }} />
                          <Typography
                            className="command-text"
                            component="code"
                            sx={{ display: 'block', minWidth: 0 }}
                          >
                            {INSTALL_COMMAND}
                          </Typography>
                        </Stack>
                        <Button
                          onClick={handleCopyInstall}
                          startIcon={
                            copiedInstall ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />
                          }
                          variant="contained"
                        >
                          {copiedInstall ? 'Copied' : 'Copy'}
                        </Button>
                      </Stack>
                    </Paper>
                  </Stack>
                </Paper>

                <Paper className="surface-panel" component="section" elevation={0} id="examples">
                  <Stack spacing={2.5}>
                    <Stack
                      alignItems={{ xs: 'stretch', md: 'center' }}
                      direction={{ xs: 'column', md: 'row' }}
                      justifyContent="space-between"
                      spacing={2}
                    >
                      <Box>
                        <Typography variant="overline" color="text.secondary">
                          Code Examples
                        </Typography>
                        <Typography variant="h2" component="h2" sx={{ mt: 0.5 }}>
                          Ready-to-use snippets
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 480 }}>
                          Copy these examples to integrate recording, VAD, and speech detection in your app.
                        </Typography>
                      </Box>

                      <Stack className="language-switch" direction="row" spacing={1}>
                        {(['ts', 'js'] as const).map((languageKey) => {
                          const languageOption = LANGUAGE_OPTIONS[languageKey]
                          const isActive = exampleLanguage === languageKey

                          return (
                            <Button
                              key={languageKey}
                              onClick={() => setExampleLanguage(languageKey)}
                              startIcon={
                                <BrandAssetIcon
                                  alt={`${languageOption.label} logo`}
                                  size={18}
                                  src={languageOption.logo}
                                />
                              }
                              title={`Source: ${languageOption.source}`}
                              variant={isActive ? 'contained' : 'text'}
                            >
                              {languageOption.label}
                            </Button>
                          )
                        })}
                      </Stack>
                    </Stack>

                    <Box className="examples-grid">
                      {CODE_EXAMPLES.map((snippet) => {
                        const snippetCode = snippet[exampleLanguage]
                        const isCopied = copiedSnippetId === snippet.id
                        const languageOption = LANGUAGE_OPTIONS[exampleLanguage]

                        return (
                          <Paper key={snippet.id} className="example-card" elevation={0}>
                            <Stack spacing={1.5}>
                              <Box>
                                <Typography variant="h6">{snippet.title}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  {snippet.description}
                                </Typography>
                              </Box>

                              <CodeSnippet
                                code={snippetCode}
                                copied={isCopied}
                                iconAlt={`${languageOption.label} logo`}
                                iconSrc={languageOption.logo}
                                label={languageOption.label}
                                language={languageOption.highlightLanguage}
                                onCopy={() => handleCopySnippet(snippet.id, snippetCode)}
                              />
                            </Stack>
                          </Paper>
                        )
                      })}
                    </Box>
                  </Stack>
                </Paper>

                {/* API Reference Section */}
                <Paper className="surface-panel" component="section" elevation={0} id="api">
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        API Reference
                      </Typography>
                      <Typography variant="h2" component="h2" sx={{ mt: 0.5 }}>
                        Complete API documentation
                      </Typography>
                    </Box>

                    {/* recordPCM API */}
                    <Box>
                      <Typography variant="h5" component="h3" sx={{ mb: 1 }}>
                        <code>recordPCM(options)</code>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Starts recording PCM audio from the microphone. Returns a <code>stop()</code> function.
                      </Typography>
                      <Box className="api-table-wrapper">
                        <table className="api-table">
                          <thead>
                            <tr>
                              <th>Option</th>
                              <th>Type</th>
                              <th>Default</th>
                              <th>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {API_OPTIONS_RECORD.map((opt) => (
                              <tr key={opt.name}>
                                <td><code>{opt.name}</code>{opt.required && <span className="required">*</span>}</td>
                                <td><code className="type">{opt.type}</code></td>
                                <td><code className="default">{opt.default}</code></td>
                                <td>{opt.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Box>
                    </Box>

                    <Divider />

                    {/* listenForSpeech API */}
                    <Box>
                      <Typography variant="h5" component="h3" sx={{ mb: 1 }}>
                        <code>listenForSpeech(options)</code>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Listens for speech and auto-starts/stops recording. Returns a <code>stop()</code> function.
                      </Typography>
                      <Box className="api-table-wrapper">
                        <table className="api-table">
                          <thead>
                            <tr>
                              <th>Option</th>
                              <th>Type</th>
                              <th>Default</th>
                              <th>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {API_OPTIONS_LISTEN.map((opt) => (
                              <tr key={opt.name}>
                                <td><code>{opt.name}</code>{opt.required && <span className="required">*</span>}</td>
                                <td><code className="type">{opt.type}</code></td>
                                <td><code className="default">{opt.default}</code></td>
                                <td>{opt.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Box>
                    </Box>

                    <Box sx={{ p: 2, bgcolor: alpha(appTheme.palette.primary.main, 0.06), borderRadius: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>PCM Format:</strong> 16-bit signed integer, mono, little-endian. Default sample rate is 16,000 Hz. 
                        Each chunk contains 4,096 samples (8,192 bytes).
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                {/* Live Demo Section */}
                <Box component="section" id="demo">
                  <Stack spacing={1.5} sx={{ mb: 2 }}>
                    <Typography variant="overline" color="primary.main">
                      Live Demo
                    </Typography>
                    <Typography variant="h2" component="h2">Try the recorder</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 540 }}>
                      Test all recording modes in real-time. Start a take, stop it, and preview the result.
                    </Typography>
                  </Stack>

                  <Box className="workspace-grid">
                    <Paper className="surface-panel" elevation={0}>
                      <Stack spacing={3}>
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Typography variant="h5" component="h3">Recording controls</Typography>
                            {isActive && (
                              <Chip
                                label={isRecording ? (captureMode === 'vad' ? 'VAD' : 'REC') : isSpeaking ? 'SPEECH' : 'LISTENING'}
                                size="small"
                                sx={{
                                  bgcolor: isRecording || isSpeaking ? 'error.main' : 'warning.main',
                                  color: 'white',
                                  fontWeight: 700,
                                  fontSize: '0.6875rem',
                                  animation: 'pulse 1.5s ease-in-out infinite',
                                  '@keyframes pulse': {
                                    '0%, 100%': { opacity: 1 },
                                    '50%': { opacity: 0.7 },
                                  },
                                }}
                              />
                            )}
                          </Stack>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              mt: 0.75,
                              color: isActive ? (isSpeaking ? 'error.main' : 'warning.dark') : 'text.secondary',
                              fontWeight: isActive ? 500 : 400,
                            }}
                          >
                            {captureTitle}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {statusMessage}
                          </Typography>
                        </Box>

                        <Box className="action-grid">
                          <Button
                            className="mode-button"
                            color="primary"
                            disabled={isActive}
                            onClick={() => startRecording(false)}
                            startIcon={<MicRoundedIcon />}
                            variant="contained"
                          >
                            Start recording
                          </Button>
                          <Button
                            className="mode-button"
                            disabled={isActive}
                            onClick={() => startRecording(true)}
                            startIcon={<AutoModeRoundedIcon />}
                            sx={{
                              bgcolor: alpha(appTheme.palette.primary.main, 0.1),
                              color: 'primary.main',
                              '&:hover': {
                                bgcolor: alpha(appTheme.palette.primary.main, 0.16),
                              },
                            }}
                          >
                            Record with auto-stop
                          </Button>
                          <Button
                            className="mode-button"
                            disabled={isActive}
                            onClick={startListening}
                            startIcon={<HearingRoundedIcon />}
                            sx={{
                              bgcolor: alpha(appTheme.palette.success.main, 0.12),
                              color: 'success.dark',
                              '&:hover': {
                                bgcolor: alpha(appTheme.palette.success.main, 0.18),
                              },
                            }}
                          >
                            Listen mode
                          </Button>
                          <Button
                            className="mode-button"
                            color="error"
                            disabled={!isActive}
                            onClick={stopCapture}
                            startIcon={<StopRoundedIcon />}
                            variant="contained"
                          >
                            Stop capture
                          </Button>
                        </Box>

                        <Box className="stats-grid">
                          <Paper className="stat-surface" elevation={0}>
                            <Typography variant="body2" color="text.secondary">
                              Captured time
                            </Typography>
                            <Typography variant="h6">{formatTime(capturedDuration)}</Typography>
                          </Paper>
                          <Paper className="stat-surface" elevation={0}>
                            <Typography variant="body2" color="text.secondary">
                              Current mode
                            </Typography>
                            <Typography variant="h6">{getModeLabel(captureMode)}</Typography>
                          </Paper>
                        </Box>
                      </Stack>
                    </Paper>

                    <Paper className="surface-panel" elevation={0}>
                      <Stack spacing={3}>
                        <Box>
                          <Typography variant="h6">Playback preview</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                            {playerTitle}
                          </Typography>
                        </Box>

                        <Paper className="player-surface" elevation={0}>
                          <Box className="player-header">
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {!hasPreview
                                  ? 'Record a take to unlock playback.'
                                  : isActive
                                    ? 'Finish the current take before previewing it.'
                                    : playerError
                                      ? playerError.message
                                      : 'Press play to hear the latest take and drag the timeline to seek.'}
                              </Typography>
                            </Box>
                          </Box>

                          <Box className="player-transport">
                            <IconButton
                              aria-label={
                                playerState === PlayerState.PLAYING
                                  ? 'Pause latest take'
                                  : 'Play latest take'
                              }
                              className="transport-button"
                              disabled={playbackDisabled}
                              onClick={handleTransportToggle}
                            >
                              {playerState === PlayerState.PLAYING ? (
                                <PauseRoundedIcon sx={{ fontSize: 38 }} />
                              ) : (
                                <PlayArrowRoundedIcon sx={{ fontSize: 42 }} />
                              )}
                            </IconButton>

                            <Box sx={{ flex: 1 }}>
                              <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                sx={{ mb: 1 }}
                              >
                                <Typography variant="body2" color="text.secondary">
                                  {formatTime(hasPreview ? currentTime : 0)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {formatTime(playerDuration)}
                                </Typography>
                              </Stack>

                              <Slider
                                aria-label="Take position"
                                disabled={!hasPreview || isActive}
                                max={100}
                                min={0}
                                onChange={handleSeekChange}
                                onChangeCommitted={handleSeekCommit}
                                step={0.1}
                                value={timelineValue}
                              />

                              <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                sx={{ mt: 1.5 }}
                              >
                                <Typography variant="body2" color="text.secondary">
                                  Latest take
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <Button
                                    disabled={!hasPreview || isActive}
                                    onClick={handleCopyPCMChunks}
                                    size="small"
                                    startIcon={
                                      copiedPCMChunks ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />
                                    }
                                    sx={{ color: 'text.secondary' }}
                                  >
                                    {copiedPCMChunks ? 'Copied chunks' : 'Copy PCM chunks'}
                                  </Button>
                                  <Button
                                    disabled={!hasPreview || isActive}
                                    onClick={stop}
                                    size="small"
                                    startIcon={<ReplayRoundedIcon />}
                                    sx={{ color: 'text.secondary' }}
                                  >
                                    Reset position
                                  </Button>
                                </Stack>
                              </Stack>
                            </Box>
                          </Box>
                        </Paper>
                      </Stack>
                    </Paper>
                  </Box>
                </Box>

                {/* Browser Support Section */}
                <Paper className="surface-panel" component="section" elevation={0} id="browsers">
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        Browser Support
                      </Typography>
                      <Typography variant="h2" component="h2" sx={{ mt: 0.5 }}>
                        Works everywhere
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Uses the Web Audio API and AudioWorklet, supported in all modern browsers.
                      </Typography>
                    </Box>

                    <Box className="browser-grid">
                      {BROWSERS.map((browser) => (
                        <Paper
                          key={browser.name}
                          className="browser-card"
                          elevation={0}
                          title={`Source: ${browser.source}`}
                        >
                          <Box className="browser-card__icon">
                            <BrandAssetIcon alt={`${browser.name} logo`} size={40} src={browser.logo} />
                          </Box>
                          <Typography variant="h6" sx={{ mt: 1.5 }}>
                            {browser.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {browser.version}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>

                    <Box sx={{ p: 2, bgcolor: alpha(appTheme.palette.secondary.main, 0.08), borderRadius: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Note:</strong> Recording requires HTTPS in production. Localhost works without HTTPS during development.
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Stack>
            </Box>
          </Box>
        </Container>

        {/* Footer */}
        <Box component="footer" className="site-footer">
          <Container maxWidth="xl">
            <Stack
              className="footer-inner"
              direction={{ xs: 'column', md: 'row' }}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
              spacing={2}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <RecordPcmLogo size={28} variant="icon" />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    record-pcm
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    v{packageVersion} · MIT License · © {CURRENT_YEAR}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={3} sx={{ flexWrap: 'wrap', minWidth: 0 }}>
                <Link
                  href={GITHUB_URL}
                  rel="noreferrer"
                  target="_blank"
                  underline="hover"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.875rem' }}
                >
                  <GitHubIcon sx={{ fontSize: 18 }} />
                  GitHub
                </Link>
                <Link
                  href={PORTFOLIO_URL}
                  rel="noreferrer"
                  target="_blank"
                  underline="hover"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.875rem' }}
                >
                  <LaunchRoundedIcon sx={{ fontSize: 18 }} />
                  View developer portfolio
                </Link>
              </Stack>
            </Stack>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App
