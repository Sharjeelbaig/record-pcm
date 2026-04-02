import { type SyntheticEvent, useEffect, useRef, useState } from 'react'
import AutoModeRoundedIcon from '@mui/icons-material/AutoModeRounded'
import HearingRoundedIcon from '@mui/icons-material/HearingRounded'
import MicRoundedIcon from '@mui/icons-material/MicRounded'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
import StopRoundedIcon from '@mui/icons-material/StopRounded'
import {
  Box,
  Button,
  Container,
  CssBaseline,
  Divider,
  IconButton,
  Paper,
  Slider,
  Stack,
  Typography,
} from '@mui/material'
import { ThemeProvider, alpha, createTheme } from '@mui/material/styles'
import { listenForSpeech, recordPCM } from 'record-pcm'
import { PlayerState, uint8ToFloat32, usePCMPlayer } from 'play-pcm'
import type { PCMPlayerOptions } from 'play-pcm'
import './App.css'

const SAMPLE_RATE = 16000
const BYTES_PER_SAMPLE = 2

type CaptureMode = 'manual' | 'vad' | 'listen'

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
    },
    secondary: {
      main: '#4c5b71',
      light: '#dce3ee',
      dark: '#334155',
    },
    success: {
      main: '#1d6b4f',
      light: '#d7efe3',
      dark: '#0f5136',
    },
    error: {
      main: '#b3261e',
      light: '#f9dedc',
      dark: '#8c1d18',
    },
    warning: {
      main: '#a15c00',
      light: '#f6dfb7',
      dark: '#7b4400',
    },
    background: {
      default: '#f4efe8',
      paper: '#fcf8f2',
    },
    text: {
      primary: '#1f1b16',
      secondary: '#5c554d',
    },
    divider: '#d9d0c6',
  },
  shape: {
    borderRadius: 28,
  },
  typography: {
    fontFamily: '"Roboto Flex", "Roboto", "Segoe UI", sans-serif',
    h2: {
      fontSize: 'clamp(2.2rem, 5vw, 3.75rem)',
      fontWeight: 700,
      letterSpacing: '-0.04em',
      lineHeight: 1,
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h6: {
      fontWeight: 700,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.65,
    },
    button: {
      fontWeight: 600,
      letterSpacing: 0,
      textTransform: 'none',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f4efe8',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          boxShadow: 'none',
          minHeight: 50,
          paddingInline: 18,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        rail: {
          opacity: 1,
        },
        thumb: {
          boxShadow: 'none',
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
    return 'Manual'
  }

  if (mode === 'vad') {
    return 'Auto-stop'
  }

  if (mode === 'listen') {
    return 'Listen mode'
  }

  return 'Idle'
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
    'Capture 16-bit mono PCM, then review it with explicit transport controls.',
  )
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubValue, setScrubValue] = useState(0)
  const stopRef = useRef<(() => void) | null>(null)

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
    if (isActive || pcmChunks.length === 0 || dataSize === 0) {
      return
    }

    const merged = concatPCMChunks(pcmChunks, dataSize)
    setPreviewSamples(uint8ToFloat32(merged, BYTES_PER_SAMPLE))
    setStatusMessage('Preview ready. Press play when you want to hear the recorded PCM.')
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
        ? 'Recording with voice activity detection. Silence will stop the capture.'
        : 'Recording raw PCM. Stop the capture when you are done.',
    )
    setIsListening(false)
    setIsSpeaking(false)
    setIsRecording(true)

    stopRef.current = recordPCM({
      onData: (pcmData) => {
        setPcmChunks((prev) => [...prev, pcmData])
        setDataSize((prev) => prev + pcmData.length)
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
      'Listening for voice activity. Speech segments will be added to the preview queue.',
    )
    setIsRecording(false)
    setIsSpeaking(false)
    setIsListening(true)

    stopRef.current = listenForSpeech({
      continuous: true,
      onData: (pcmData) => {
        setPcmChunks((prev) => [...prev, pcmData])
        setDataSize((prev) => prev + pcmData.length)
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
        setStatusMessage('Speech detected. Capturing the active phrase now.')
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
    setStatusMessage('Capture stopped. Press play to review the latest audio.')
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

  const captureTitle = isSpeaking
    ? 'Speech detected'
    : isListening
      ? 'Voice trigger armed'
      : isRecording
        ? captureMode === 'vad'
          ? 'Recording with auto-stop'
          : 'Recording in progress'
        : hasPreview
          ? 'Preview ready'
          : `Ready to capture${captureMode ? ` • ${getModeLabel(captureMode)}` : ''}`

  const playerTitle = !hasPreview
    ? 'No preview loaded'
    : isActive
      ? 'Capture still active'
      : playerState === PlayerState.PLAYING
        ? 'Playing recorded PCM'
        : playerState === PlayerState.PAUSED
          ? 'Preview paused'
          : 'Player standing by'

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box className="app-shell">
        <Box className="ambient ambient-top" />
        <Box className="ambient ambient-bottom" />

        <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 3, md: 5 } }}>
          <Stack spacing={3}>
            <Paper className="hero-panel" elevation={0}>
              <Box className="hero-grid">
                <Box>
                  <Typography variant="h2" sx={{ maxWidth: 760, mb: 2 }}>
                    Record a take, then review it with clear playback controls.
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
                    Capture first, then listen back when you are ready. Recording and playback stay
                    separate so you stay in control of each take.
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Box className="workspace-grid">
              <Paper className="surface-panel" elevation={0}>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Capture
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 0.5 }}>
                      Recording controls
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
                      Record with VAD
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

                  <Box>
                    <Typography variant="h6" sx={{ mb: 0.75 }}>
                      {captureTitle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {statusMessage}
                    </Typography>
                  </Box>

                  <Box className="stats-grid">
                    <Paper className="stat-surface" elevation={0}>
                      <Typography variant="body2" color="text.secondary">
                        Captured duration
                      </Typography>
                      <Typography variant="h6">{formatTime(capturedDuration)}</Typography>
                    </Paper>
                    <Paper className="stat-surface" elevation={0}>
                      <Typography variant="body2" color="text.secondary">
                        Preview status
                      </Typography>
                      <Typography variant="h6">
                        {hasPreview ? 'Loaded' : 'Waiting'}
                      </Typography>
                    </Paper>
                  </Box>
                </Stack>
              </Paper>

              <Paper className="surface-panel" elevation={0}>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Playback
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 0.5 }}>
                      Recorded PCM player
                    </Typography>
                  </Box>

                  <Paper className="player-surface" elevation={0}>
                    <Box className="player-header">
                      <Box>
                        <Typography variant="h6">{playerTitle}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {!hasPreview
                            ? 'Record a take to unlock the player.'
                            : isActive
                              ? 'Stop the active capture before previewing the audio.'
                              : playerError
                                ? playerError.message
                                : 'Use the play button and timeline to review the latest take.'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box className="player-transport">
                      <IconButton
                        aria-label={
                          playerState === PlayerState.PLAYING
                            ? 'Pause recorded PCM'
                            : 'Play recorded PCM'
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
                          aria-label="Recorded PCM position"
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
                            Drag the timeline to move through the take.
                          </Typography>
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
                      </Box>
                    </Box>
                  </Paper>

                  <Divider />
                </Stack>
              </Paper>
            </Box>
          </Stack>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App
