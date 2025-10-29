import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Video, MonitorPlay, ArrowLeft, X } from 'lucide-react';
import {
  getDesktopSources,
  startRecording,
  startWebcamRecording,
  stopRecording,
  stopWebcamRecording,
  saveRecordingFile,
  importRecording,
  startCombinedRecording,
  stopCombinedRecording,
  saveCombinedRecordingFiles,
  compositePiPRecording
} from '../utils/ipc';
import { DesktopSource, RecordingState, PiPConfig, PiPPosition, PiPSize, PIP_SIZE_MAP } from '../../types/recording';
import { Z_INDEX } from '../styles/zIndex';
import { MediaRecorderService } from '../services/MediaRecorderService';
import { CombinedRecordingService } from '../services/CombinedRecordingService';
import { WebcamService, WebcamDevice } from '../services/WebcamService';
import { WaveformExtractor } from '../services/WaveformExtractor';
import { useMediaStore } from '../store/mediaStore';
import RecordingTypeCard from './RecordingTypeCard';
import RecordingProgress from './RecordingProgress';
import { AudioVolumeMeter } from './AudioVolumeMeter';

interface UnifiedRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RecordingType = 'screen' | 'webcam' | 'pip' | null;
type ModalStep = 'select-type' | 'configure-screen' | 'configure-webcam' | 'configure-pip' | 'recording';

const UnifiedRecordingModal: React.FC<UnifiedRecordingModalProps> = ({ isOpen, onClose }) => {
  // Step management
  const [currentStep, setCurrentStep] = useState<ModalStep>('select-type');
  const [selectedType, setSelectedType] = useState<RecordingType>(null);

  // Screen recording state
  const [desktopSources, setDesktopSources] = useState<DesktopSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [loadingSources, setLoadingSources] = useState(false);

  // Webcam state
  const [webcamDevices, setWebcamDevices] = useState<WebcamDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [loadingWebcam, setLoadingWebcam] = useState(false);

  // Audio device state
  const [audioDevices, setAudioDevices] = useState<WebcamDevice[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | null>(null);

  // PiP state
  const [pipPosition, setPipPosition] = useState<PiPPosition>('bottom-right');
  const [pipSize, setPipSize] = useState<PiPSize>('medium');

  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const webcamServiceRef = useRef<WebcamService>(new WebcamService());
  const mediaRecorderRef = useRef<MediaRecorderService | null>(null);
  const combinedRecorderRef = useRef<CombinedRecordingService>(new CombinedRecordingService());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const addMediaFile = useMediaStore((state) => state.addMediaFile);

  // Cleanup on modal close
  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen]);

  const cleanup = () => {
    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Stop webcam stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Stop screen stream
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    webcamServiceRef.current.stopStream();

    // Reset state
    setCurrentStep('select-type');
    setSelectedType(null);
    setRecordingState('idle');
    setElapsedTime(0);
    setSelectedSource(null);
    setSelectedDeviceId(null);
    setPipPosition('bottom-right');
    setPipSize('medium');
    setError(null);
    setSuccessMessage(null);
    setDesktopSources([]);
    setWebcamDevices([]);
  };

  // Step 1: Type Selection Handlers
  const handleSelectType = (type: RecordingType) => {
    setSelectedType(type);
    setError(null);

    if (type === 'screen') {
      setCurrentStep('configure-screen');
      fetchDesktopSources();
    } else if (type === 'webcam') {
      setCurrentStep('configure-webcam');
      initializeWebcam();
    } else if (type === 'pip') {
      setCurrentStep('configure-pip');
      initializePiP();
    }
  };

  const handleBack = () => {
    // Cleanup any active streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setCurrentStep('select-type');
    setSelectedType(null);
    setSelectedSource(null);
    setSelectedDeviceId(null);
    setError(null);
  };

  // Step 2a: Screen Source Selection
  const fetchDesktopSources = async () => {
    try {
      setLoadingSources(true);
      setError(null);
      console.log('UnifiedRecordingModal: Fetching desktop sources...');

      const sources = await getDesktopSources();
      console.log(`UnifiedRecordingModal: Received ${sources.length} sources`);

      setDesktopSources(sources);
    } catch (err) {
      console.error('UnifiedRecordingModal: Error fetching sources:', err);
      setError(err instanceof Error ? err.message : 'Failed to get desktop sources');
    } finally {
      setLoadingSources(false);
    }
  };

  const handleSelectSource = (sourceId: string) => {
    console.log('UnifiedRecordingModal: Selected source:', sourceId);
    setSelectedSource(sourceId);
  };

  const handleStartScreenRecording = async () => {
    if (!selectedSource) return;

    try {
      console.log('UnifiedRecordingModal: Starting screen recording...');
      setCurrentStep('recording');
      setRecordingState('recording');
      setElapsedTime(0);

      // Initialize MediaRecorder
      if (!mediaRecorderRef.current) {
        mediaRecorderRef.current = new MediaRecorderService();
      }

      // Start recording in main process
      await startRecording(selectedSource);

      // Start browser-based recording
      await mediaRecorderRef.current.startRecording(selectedSource);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      console.log('UnifiedRecordingModal: Screen recording started successfully');
    } catch (err) {
      console.error('UnifiedRecordingModal: Error starting screen recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setCurrentStep('configure-screen');
      setRecordingState('idle');
    }
  };

  // Step 2b: Webcam Configuration
  const initializeWebcam = async () => {
    try {
      setLoadingWebcam(true);
      setError(null);
      console.log('UnifiedRecordingModal: Initializing webcam...');

      // Get available devices
      const availableDevices = await webcamServiceRef.current.getAvailableDevices();
      console.log(`UnifiedRecordingModal: Found ${availableDevices.length} camera(s)`);

      if (availableDevices.length === 0) {
        setError('No camera found. Please connect a camera and try again.');
        setLoadingWebcam(false);
        return;
      }

      setWebcamDevices(availableDevices);

      // Get available audio input devices (microphones)
      // Handle audio separately so microphone errors don't block camera access
      try {
        const availableAudioDevices = await webcamServiceRef.current.getAudioInputDevices();
        console.log(`UnifiedRecordingModal: Found ${availableAudioDevices.length} microphone(s)`);
        setAudioDevices(availableAudioDevices);

        // Select default audio device
        if (availableAudioDevices.length > 0) {
          setSelectedAudioDeviceId(availableAudioDevices[0].deviceId);
        }
      } catch (audioErr) {
        console.error('UnifiedRecordingModal: Error loading audio devices:', audioErr);
        // Show warning but don't block camera access
        const audioError = audioErr instanceof Error ? audioErr.message : 'Failed to access microphone';
        setError(`Warning: ${audioError}. You can still record video without audio.`);
        setAudioDevices([]); // Empty array, no microphones available
      }

      // Select first device by default
      const defaultDevice = availableDevices[0].deviceId;
      setSelectedDeviceId(defaultDevice);

      // Start preview with default devices (will use video only if no audio device selected)
      await startWebcamPreview(defaultDevice);

      setLoadingWebcam(false);
    } catch (err) {
      console.error('UnifiedRecordingModal: Error initializing webcam:', err);
      setError(err instanceof Error ? err.message : 'Failed to access camera');
      setLoadingWebcam(false);
    }
  };

  const startWebcamPreview = async (videoDeviceId: string, audioDeviceIdOverride?: string) => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Use override if provided, otherwise use state (fixes race condition)
      const audioDeviceId = audioDeviceIdOverride ?? selectedAudioDeviceId;

      // Get new stream for selected devices (video + audio)
      const stream = await webcamServiceRef.current.getWebcamStream(videoDeviceId, audioDeviceId || undefined);
      streamRef.current = stream;

      // DEBUG: Check audio tracks
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      console.log('UnifiedRecordingModal: Stream audio tracks:', audioTracks.length);
      console.log('UnifiedRecordingModal: Stream video tracks:', videoTracks.length);
      audioTracks.forEach((track, index) => {
        console.log(`  Audio track ${index}: ${track.label}, enabled: ${track.enabled}, muted: ${track.muted}, readyState: ${track.readyState}`);
      });
      videoTracks.forEach((track, index) => {
        console.log(`  Video track ${index}: ${track.label}, enabled: ${track.enabled}, muted: ${track.muted}, readyState: ${track.readyState}`);
      });

      // Attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log('UnifiedRecordingModal: Webcam preview started');
      }
    } catch (err) {
      console.error('UnifiedRecordingModal: Error starting webcam preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to start camera preview');
    }
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startWebcamPreview(deviceId);
  };

  const handleAudioDeviceChange = async (audioDeviceId: string) => {
    setSelectedAudioDeviceId(audioDeviceId);

    // Restart preview with new audio device (pass directly to avoid race condition)
    if (selectedDeviceId) {
      // Check if we're in PiP mode or webcam-only mode
      if (currentStep === 'configure-pip') {
        // PiP mode - restart the PiP preview with new audio device
        try {
          // Stop existing stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }

          // Get new stream with selected audio device
          const stream = await webcamServiceRef.current.getWebcamStream(selectedDeviceId, audioDeviceId);
          streamRef.current = stream;

          // Attach to PiP video element
          if (pipVideoRef.current) {
            pipVideoRef.current.srcObject = stream;
            await pipVideoRef.current.play();
            console.log('UnifiedRecordingModal: PiP webcam preview restarted with new audio device');
          }
        } catch (err) {
          console.error('UnifiedRecordingModal: Error restarting PiP preview:', err);
          setError(err instanceof Error ? err.message : 'Failed to change audio device');
        }
      } else {
        // Webcam-only mode - use existing logic
        startWebcamPreview(selectedDeviceId, audioDeviceId);
      }
    }
  };

  const handleStartWebcamRecording = async () => {
    if (!streamRef.current) {
      setError('No camera stream available');
      return;
    }

    try {
      console.log('UnifiedRecordingModal: Starting webcam recording...');

      // Initialize tracking in main process BEFORE starting MediaRecorder
      await startWebcamRecording();
      console.log('UnifiedRecordingModal: Webcam recording initialized in main process');

      setCurrentStep('recording');
      setRecordingState('recording');
      setElapsedTime(0);

      // Test codec support and select best MIME type (research-backed fallback chain)
      console.log('UnifiedRecordingModal: Testing codec support...');
      const mimeTypeCandidates = [
        'video/webm;codecs=vp9,opus',  // Best quality, modern
        'video/webm;codecs=vp8,opus',  // Good quality, widely supported
        'video/webm',                   // Browser chooses codecs (most compatible)
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypeCandidates) {
        const isSupported = MediaRecorder.isTypeSupported(mimeType);
        console.log(`  ${mimeType}: ${isSupported ? '✓ SUPPORTED' : '✗ not supported'}`);
        if (isSupported && !selectedMimeType) {
          selectedMimeType = mimeType;
        }
      }

      if (!selectedMimeType) {
        console.warn('⚠️ WARNING: No preferred MIME types supported, using browser default');
        selectedMimeType = 'video/webm';
      }

      console.log(`UnifiedRecordingModal: Using MIME type: ${selectedMimeType}`);

      // Validate audio tracks before creating MediaRecorder
      const audioTracks = streamRef.current.getAudioTracks();
      const videoTracks = streamRef.current.getVideoTracks();

      console.log(`UnifiedRecordingModal: Pre-recording validation - ${audioTracks.length} audio tracks, ${videoTracks.length} video tracks`);

      if (audioTracks.length === 0) {
        console.warn('⚠️ WARNING: No audio tracks in stream before recording');
        // Don't block recording, but warn user
        if (selectedAudioDeviceId) {
          setError('Warning: No audio detected. Recording will be video only.');
        }
      } else {
        // Ensure audio tracks are enabled
        audioTracks.forEach((track, index) => {
          if (!track.enabled) {
            console.log(`Enabling disabled audio track ${index}`);
            track.enabled = true;
          }
          console.log(`Audio track ${index}: ${track.label}, enabled: ${track.enabled}, muted: ${track.muted}, readyState: ${track.readyState}`);
        });
      }

      // Create MediaRecorder with selected MIME type
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: selectedMimeType,
      });

      // DEBUG: Verify MediaRecorder has audio tracks
      const recorderStream = mediaRecorder.stream;
      const recorderAudioTracks = recorderStream.getAudioTracks();
      const recorderVideoTracks = recorderStream.getVideoTracks();
      console.log('UnifiedRecordingModal: MediaRecorder audio tracks:', recorderAudioTracks.length);
      console.log('UnifiedRecordingModal: MediaRecorder video tracks:', recorderVideoTracks.length);
      if (recorderAudioTracks.length === 0) {
        console.warn('⚠️ WARNING: MediaRecorder has NO AUDIO TRACKS! Recording will be silent.');
      } else {
        console.log(`✓ MediaRecorder has ${recorderAudioTracks.length} audio track(s) - recording should have sound`);
      }

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
          console.log(`UnifiedRecordingModal: Received chunk (${event.data.size} bytes)`);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('UnifiedRecordingModal: Recording stopped, processing...');
        setRecordingState('processing');

        try {
          // Create blob from chunks
          const blob = new Blob(chunks, { type: 'video/webm' });
          console.log(`UnifiedRecordingModal: Created blob (${blob.size} bytes)`);

          // Convert blob to Uint8Array for IPC
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // Save file via IPC
          const filePath = await saveRecordingFile(uint8Array);
          console.log(`UnifiedRecordingModal: Recording saved to ${filePath}`);

          // Clear recording state in main process
          await stopWebcamRecording();
          console.log('UnifiedRecordingModal: Webcam recording state cleared in main process');

          // Import recording to media library
          console.log('UnifiedRecordingModal: Importing webcam recording to media library...');
          const mediaFile = await importRecording(filePath, 'webcam');
          console.log('UnifiedRecordingModal: Webcam recording imported:', mediaFile);

          // Extract waveform data (non-blocking - won't fail import if extraction fails)
          try {
            console.log('UnifiedRecordingModal: Extracting waveform...');
            const waveformExtractor = new WaveformExtractor();
            // Extract 10000 samples for detailed waveform (like professional DAWs)
            const waveformData = await waveformExtractor.extract(mediaFile.path, { sampleCount: 10000 });
            waveformExtractor.destroy();
            mediaFile.waveformData = waveformData;
            console.log(`UnifiedRecordingModal: Waveform extracted: ${waveformData.length} samples`);
          } catch (waveformError) {
            console.warn('UnifiedRecordingModal: Waveform extraction failed (non-critical):', waveformError);
            // Continue with import even if waveform fails
          }

          // Add to media store
          addMediaFile(mediaFile);

          // Show success message
          setSuccessMessage('Recording added to library');
          setRecordingState('idle');

          // Auto-close modal after 2 seconds
          setTimeout(() => {
            onClose();
          }, 2000);
        } catch (err) {
          console.error('UnifiedRecordingModal: Error processing recording:', err);
          setError(err instanceof Error ? err.message : 'Failed to process recording');
          setRecordingState('idle');
          handleBack();
        }
      };

      // Store reference for stopping
      if (!mediaRecorderRef.current) {
        mediaRecorderRef.current = new MediaRecorderService();
      }
      (mediaRecorderRef.current as any).webcamRecorder = mediaRecorder;

      // Start recording
      mediaRecorder.start(1000);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      console.log('UnifiedRecordingModal: Webcam recording started successfully');
    } catch (err) {
      console.error('UnifiedRecordingModal: Error starting webcam recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setCurrentStep('configure-webcam');
      setRecordingState('idle');
    }
  };

  // Step 2c: PiP Configuration
  const initializePiP = async () => {
    try {
      setLoadingSources(true);
      setLoadingWebcam(true);
      setError(null);
      console.log('UnifiedRecordingModal: Initializing PiP mode...');

      // Get desktop sources
      const sources = await getDesktopSources();
      console.log(`UnifiedRecordingModal: Received ${sources.length} sources`);
      setDesktopSources(sources);
      setLoadingSources(false);

      // Get available webcam devices
      const availableDevices = await webcamServiceRef.current.getAvailableDevices();
      console.log(`UnifiedRecordingModal: Found ${availableDevices.length} camera(s)`);

      if (availableDevices.length === 0) {
        setError('No camera found. Please connect a camera and try again.');
        setLoadingWebcam(false);
        return;
      }

      setWebcamDevices(availableDevices);

      // Select first video device by default
      const defaultDevice = availableDevices[0].deviceId;
      setSelectedDeviceId(defaultDevice);

      // Get available audio input devices (microphones)
      // Handle audio separately so microphone errors don't block camera access
      let defaultAudioDevice: string | undefined = undefined;
      try {
        const availableAudioDevices = await webcamServiceRef.current.getAudioInputDevices();
        console.log(`UnifiedRecordingModal: Found ${availableAudioDevices.length} microphone(s) for PiP`);
        setAudioDevices(availableAudioDevices);

        // Select default audio device
        if (availableAudioDevices.length > 0) {
          defaultAudioDevice = availableAudioDevices[0].deviceId;
          setSelectedAudioDeviceId(defaultAudioDevice);
        }
      } catch (audioErr) {
        console.error('UnifiedRecordingModal: Error loading audio devices for PiP:', audioErr);
        // Show warning but don't block camera access
        const audioError = audioErr instanceof Error ? audioErr.message : 'Failed to access microphone';
        setError(`Warning: ${audioError}. You can still record video without audio.`);
        setAudioDevices([]); // Empty array, no microphones available
      }

      // Start webcam preview with audio
      const stream = await webcamServiceRef.current.getWebcamStream(defaultDevice, defaultAudioDevice);
      streamRef.current = stream;

      // Attach to PiP video element
      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = stream;
        await pipVideoRef.current.play();
        console.log('UnifiedRecordingModal: PiP webcam preview started');
      }

      setLoadingWebcam(false);
    } catch (err) {
      console.error('UnifiedRecordingModal: Error initializing PiP:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize PiP mode');
      setLoadingSources(false);
      setLoadingWebcam(false);
    }
  };

  const handleStartPiPRecording = async () => {
    if (!selectedSource || !streamRef.current) {
      setError('Please select a screen source and ensure webcam is ready');
      return;
    }

    try {
      console.log('UnifiedRecordingModal: Starting PiP recording...');
      setCurrentStep('recording');
      setRecordingState('recording');
      setElapsedTime(0);

      const pipConfig: PiPConfig = {
        position: pipPosition,
        size: pipSize,
      };

      // Start combined recording in main process
      await startCombinedRecording(selectedSource, pipConfig);

      // Get screen stream using getUserMedia with chromeMediaSourceId
      const screenStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore - chromeMediaSourceId is Electron-specific
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource,
          },
        },
      } as any);
      screenStreamRef.current = screenStream;

      // Start combined recording with both streams
      await combinedRecorderRef.current.startRecording(screenStream, streamRef.current, pipConfig);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      console.log('UnifiedRecordingModal: PiP recording started successfully');
    } catch (err) {
      console.error('UnifiedRecordingModal: Error starting PiP recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start PiP recording');
      setCurrentStep('configure-pip');
      setRecordingState('idle');
    }
  };

  // Step 3: Stop Recording
  const handleStopRecording = async () => {
    try {
      console.log('UnifiedRecordingModal: Stopping recording...');
      setRecordingState('processing');

      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      if (selectedType === 'screen') {
        // Stop screen recording
        if (!mediaRecorderRef.current) {
          throw new Error('No media recorder available');
        }

        const blob = await mediaRecorderRef.current.stopRecording();
        console.log(`UnifiedRecordingModal: Got recording blob (${blob.size} bytes)`);

        // Convert blob to Uint8Array for IPC
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Save file via IPC
        const filePath = await saveRecordingFile(uint8Array);
        console.log(`UnifiedRecordingModal: Recording saved to ${filePath}`);

        // Stop recording in main process
        await stopRecording();

        // Import recording to media library
        console.log('UnifiedRecordingModal: Importing screen recording to media library...');
        const mediaFile = await importRecording(filePath, 'screen');
        console.log('UnifiedRecordingModal: Screen recording imported:', mediaFile);

        // Extract waveform data (non-blocking - won't fail import if extraction fails)
        try {
          console.log('UnifiedRecordingModal: Extracting waveform...');
          const waveformExtractor = new WaveformExtractor();
          // Extract 10000 samples for detailed waveform (like professional DAWs)
          const waveformData = await waveformExtractor.extract(mediaFile.path, { sampleCount: 10000 });
          waveformExtractor.destroy();
          mediaFile.waveformData = waveformData;
          console.log(`UnifiedRecordingModal: Waveform extracted: ${waveformData.length} samples`);
        } catch (waveformError) {
          console.warn('UnifiedRecordingModal: Waveform extraction failed (non-critical):', waveformError);
          // Continue with import even if waveform fails
        }

        // Add to media store
        addMediaFile(mediaFile);

        // Show success message
        setSuccessMessage('Recording added to library');
        setRecordingState('idle');

        // Auto-close modal after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else if (selectedType === 'webcam') {
        // Stop webcam recording
        const recorder = (mediaRecorderRef.current as any)?.webcamRecorder;
        if (recorder && recorder.state !== 'inactive') {
          recorder.stop();
        }
      } else if (selectedType === 'pip') {
        // Stop combined PiP recording
        console.log('UnifiedRecordingModal: Stopping PiP recording...');

        // Stop the combined recorder
        const recordingData = await combinedRecorderRef.current.stopRecording();
        console.log(`UnifiedRecordingModal: Got combined recording - Screen: ${recordingData.screenBlob.size} bytes (${recordingData.screenFormat}), Webcam: ${recordingData.webcamBlob.size} bytes (${recordingData.webcamFormat})`);

        // Convert blobs to Uint8Arrays for IPC
        const screenArrayBuffer = await recordingData.screenBlob.arrayBuffer();
        const screenUint8Array = new Uint8Array(screenArrayBuffer);

        const webcamArrayBuffer = await recordingData.webcamBlob.arrayBuffer();
        const webcamUint8Array = new Uint8Array(webcamArrayBuffer);

        // Save both temp files via IPC with format information
        const { screenPath, webcamPath } = await saveCombinedRecordingFiles(
          screenUint8Array,
          webcamUint8Array,
          recordingData.screenFormat,
          recordingData.webcamFormat
        );
        console.log(`UnifiedRecordingModal: Screen temp saved to ${screenPath}`);
        console.log(`UnifiedRecordingModal: Webcam temp saved to ${webcamPath}`);

        // Stop recording in main process (this returns pipConfig)
        await stopCombinedRecording();

        // Show compositing message
        setSuccessMessage(null); // Clear any existing success message

        // Composite the two recordings into a single file
        console.log('UnifiedRecordingModal: Compositing PiP recording...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const compositedFilename = `recording_${timestamp}.mp4`;
        const compositedPath = screenPath.replace(/[^/]+$/, compositedFilename); // Same directory as temp files

        const pipConfigForComposite = {
          position: pipPosition,
          size: pipSize,
        };

        await compositePiPRecording(
          screenPath,
          webcamPath,
          pipConfigForComposite,
          compositedPath
        );
        console.log(`UnifiedRecordingModal: PiP composited to ${compositedPath}`);

        // Import the composited recording as a single file
        console.log('UnifiedRecordingModal: Importing composited PiP recording to media library...');
        const compositedMedia = await importRecording(compositedPath, 'pip');
        console.log('UnifiedRecordingModal: Composited PiP recording imported:', compositedMedia);

        // Extract waveform data (non-blocking - won't fail import if extraction fails)
        try {
          console.log('UnifiedRecordingModal: Extracting waveform...');
          const waveformExtractor = new WaveformExtractor();
          // Extract 10000 samples for detailed waveform (like professional DAWs)
          const waveformData = await waveformExtractor.extract(compositedMedia.path, { sampleCount: 10000 });
          waveformExtractor.destroy();
          compositedMedia.waveformData = waveformData;
          console.log(`UnifiedRecordingModal: Waveform extracted: ${waveformData.length} samples`);
        } catch (waveformError) {
          console.warn('UnifiedRecordingModal: Waveform extraction failed (non-critical):', waveformError);
          // Continue with import even if waveform fails
        }

        // Add composited file to media store
        addMediaFile(compositedMedia);

        // Show success message
        setSuccessMessage('PiP recording added to library');
        setRecordingState('idle');

        // Auto-close modal after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error('UnifiedRecordingModal: Error stopping recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      setRecordingState('idle');
      handleBack();
    }
  };

  if (!isOpen) return null;

  const getStatusMessage = () => {
    if (selectedType === 'screen') return 'Recording screen...';
    if (selectedType === 'webcam') return 'Recording webcam...';
    if (selectedType === 'pip') return 'Recording screen and webcam...';
    return 'Recording...';
  };

  // Helper function to get PiP position style
  const getPiPPositionStyle = (position: PiPPosition): React.CSSProperties => {
    const padding = 20; // pixels from edge
    switch (position) {
      case 'bottom-right':
        return { bottom: `${padding}px`, right: `${padding}px` };
      case 'bottom-left':
        return { bottom: `${padding}px`, left: `${padding}px` };
      case 'top-right':
        return { top: `${padding}px`, right: `${padding}px` };
      case 'top-left':
        return { top: `${padding}px`, left: `${padding}px` };
    }
  };

  // Helper function to get PiP size percentage
  const getPiPSizePercent = (size: PiPSize): number => {
    return PIP_SIZE_MAP[size] * 100;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_INDEX.MODAL_BACKDROP,
        backdropFilter: 'blur(4px)',
      }}
      onClick={recordingState !== 'recording' ? onClose : undefined}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          width: '90%',
          maxWidth: currentStep === 'select-type' ? '1000px' : '900px',
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          isolation: 'isolate',
          zIndex: Z_INDEX.MODAL,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {currentStep !== 'select-type' && currentStep !== 'recording' && (
              <button
                onClick={handleBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h2
              style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 600,
                color: '#f1f5f9',
              }}
            >
              {currentStep === 'select-type' && 'What do you want to record?'}
              {currentStep === 'configure-screen' && 'Choose What to Record'}
              {currentStep === 'configure-webcam' && 'Record Webcam'}
              {currentStep === 'configure-pip' && 'Screen + Webcam (PiP)'}
              {currentStep === 'recording' && 'Recording'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={recordingState === 'recording'}
            style={{
              background: 'none',
              border: 'none',
              color: recordingState === 'recording' ? '#475569' : '#94a3b8',
              fontSize: '1.5rem',
              cursor: recordingState === 'recording' ? 'not-allowed' : 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (recordingState !== 'recording') {
                e.currentTarget.style.color = '#f1f5f9';
              }
            }}
            onMouseLeave={(e) => {
              if (recordingState !== 'recording') {
                e.currentTarget.style.color = '#94a3b8';
              }
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {/* Step 1: Type Selection */}
          {currentStep === 'select-type' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '24px',
                maxWidth: '900px',
                margin: '0 auto',
              }}
            >
              <RecordingTypeCard
                icon={Monitor}
                title="Screen Only"
                description="Record your screen or a specific window"
                onClick={() => handleSelectType('screen')}
              />
              <RecordingTypeCard
                icon={Video}
                title="Webcam Only"
                description="Record video from your camera"
                onClick={() => handleSelectType('webcam')}
              />
              <RecordingTypeCard
                icon={MonitorPlay}
                title="Screen + Webcam"
                description="Record screen with picture-in-picture webcam"
                onClick={() => handleSelectType('pip')}
                disabled={false}
              />
            </div>
          )}

          {/* Step 2a: Screen Source Selection */}
          {currentStep === 'configure-screen' && (
            <>
              {error && (
                <div
                  style={{
                    backgroundColor: '#7f1d1d',
                    color: '#fca5a5',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                  }}
                >
                  <strong>Error:</strong> {error}
                  {error.includes('permission') && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #991b1b' }}>
                      <strong>How to fix:</strong>
                      <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
                        <li>Open System Preferences</li>
                        <li>Go to Security & Privacy → Privacy → Screen Recording</li>
                        <li>Enable screen recording for ClipForge</li>
                        <li>Restart the app</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {loadingSources && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px 0',
                    color: '#94a3b8',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      border: '4px solid #334155',
                      borderTopColor: '#667eea',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '16px',
                    }}
                  />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading available sources...</p>
                  <style>
                    {`
                      @keyframes spin {
                        to { transform: rotate(360deg); }
                      }
                    `}
                  </style>
                </div>
              )}

              {!loadingSources && !error && desktopSources.length > 0 && (
                <div>
                  {/* Screens Section */}
                  {desktopSources.some((s) => s.display_id) && (
                    <div style={{ marginBottom: '32px' }}>
                      <h3
                        style={{
                          margin: '0 0 16px 0',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: '#cbd5e1',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Screens
                      </h3>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                          gap: '16px',
                        }}
                      >
                        {desktopSources
                          .filter((source) => source.display_id)
                          .map((source) => (
                            <SourceCard
                              key={source.id}
                              source={source}
                              isSelected={selectedSource === source.id}
                              onSelect={() => handleSelectSource(source.id)}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Windows Section */}
                  {desktopSources.some((s) => !s.display_id) && (
                    <div>
                      <h3
                        style={{
                          margin: '0 0 16px 0',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: '#cbd5e1',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Windows
                      </h3>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                          gap: '16px',
                        }}
                      >
                        {desktopSources
                          .filter((source) => !source.display_id)
                          .map((source) => (
                            <SourceCard
                              key={source.id}
                              source={source}
                              isSelected={selectedSource === source.id}
                              onSelect={() => handleSelectSource(source.id)}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Step 2b: Webcam Configuration */}
          {currentStep === 'configure-webcam' && (
            <>
              {error && (
                <div
                  style={{
                    backgroundColor: '#7f1d1d',
                    color: '#fca5a5',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    width: '100%',
                  }}
                >
                  <strong>Error:</strong> {error}
                  {error.includes('permission') && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #991b1b' }}>
                      <strong>How to fix:</strong>
                      <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
                        <li>Click "Allow" when prompted for camera access</li>
                        <li>If you previously denied access, go to System Preferences</li>
                        <li>Navigate to Security & Privacy → Privacy → Camera</li>
                        <li>Enable camera access for ClipForge</li>
                      </ol>
                      <button
                        onClick={initializeWebcam}
                        style={{
                          marginTop: '12px',
                          padding: '8px 16px',
                          backgroundColor: '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              )}

              {loadingWebcam && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px 0',
                    color: '#94a3b8',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      border: '4px solid #334155',
                      borderTopColor: '#667eea',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '16px',
                    }}
                  />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Accessing camera...</p>
                  <style>
                    {`
                      @keyframes spin {
                        to { transform: rotate(360deg); }
                      }
                    `}
                  </style>
                </div>
              )}

              {!loadingWebcam && !error && (
                <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto' }}>
                  {/* Video Preview */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16/9',
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: '24px',
                    }}
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>

                  {/* Camera Selection */}
                  {webcamDevices.length > 1 && (
                    <div style={{ marginBottom: '16px' }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#cbd5e1',
                        }}
                      >
                        Select Camera:
                      </label>
                      <select
                        value={selectedDeviceId || ''}
                        onChange={(e) => handleDeviceChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          backgroundColor: '#0f172a',
                          color: '#f1f5f9',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                        }}
                      >
                        {webcamDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Microphone Selection */}
                  {audioDevices.length > 1 && (
                    <div style={{ marginBottom: '16px' }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#cbd5e1',
                        }}
                      >
                        Select Microphone:
                      </label>
                      <select
                        value={selectedAudioDeviceId || ''}
                        onChange={(e) => handleAudioDeviceChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          backgroundColor: '#0f172a',
                          color: '#f1f5f9',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                        }}
                      >
                        {audioDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Audio Volume Meter */}
                  <AudioVolumeMeter
                    stream={streamRef.current}
                    key={`audio-meter-${selectedAudioDeviceId || 'default'}`}
                  />
                </div>
              )}
            </>
          )}

          {/* Step 2c: PiP Configuration */}
          {currentStep === 'configure-pip' && (
            <>
              {error && (
                <div
                  style={{
                    backgroundColor: '#7f1d1d',
                    color: '#fca5a5',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                  }}
                >
                  <strong>Error:</strong> {error}
                </div>
              )}

              {(loadingSources || loadingWebcam) && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px 0',
                    color: '#94a3b8',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      border: '4px solid #334155',
                      borderTopColor: '#667eea',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '16px',
                    }}
                  />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    {loadingSources ? 'Loading screen sources...' : 'Accessing camera...'}
                  </p>
                  <style>
                    {`
                      @keyframes spin {
                        to { transform: rotate(360deg); }
                      }
                    `}
                  </style>
                </div>
              )}

              {!loadingSources && !loadingWebcam && !error && desktopSources.length > 0 && (
                <div style={{ width: '100%' }}>
                  {/* Screen Source Selection - Top Section */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3
                      style={{
                        margin: '0 0 12px 0',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: '#cbd5e1',
                      }}
                    >
                      Select Screen Source
                    </h3>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '12px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                      }}
                    >
                      {desktopSources.map((source) => (
                        <div
                          key={source.id}
                          onClick={() => handleSelectSource(source.id)}
                          style={{
                            backgroundColor: selectedSource === source.id ? '#334155' : '#0f172a',
                            border: `2px solid ${selectedSource === source.id ? '#a855f7' : '#1e293b'}`,
                            borderRadius: '6px',
                            padding: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div
                            style={{
                              width: '100%',
                              aspectRatio: '16/9',
                              backgroundColor: '#0f172a',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              marginBottom: '8px',
                            }}
                          >
                            <img
                              src={source.thumbnail}
                              alt={source.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: '#f1f5f9',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={source.name}
                          >
                            {source.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PiP Preview Section */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3
                      style={{
                        margin: '0 0 12px 0',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: '#cbd5e1',
                      }}
                    >
                      Webcam Preview (Picture-in-Picture)
                    </h3>
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '640px',
                        aspectRatio: '16/9',
                        backgroundColor: '#0f172a',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        margin: '0 auto',
                      }}
                    >
                      {/* Screen placeholder */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#475569',
                          fontSize: '0.875rem',
                        }}
                      >
                        Screen Recording Preview
                      </div>

                      {/* Webcam overlay in configured position */}
                      <div
                        style={{
                          position: 'absolute',
                          ...getPiPPositionStyle(pipPosition),
                          width: `${getPiPSizePercent(pipSize)}%`,
                          aspectRatio: '16/9',
                          backgroundColor: '#1e293b',
                          border: '2px solid #a855f7',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                        }}
                      >
                        <video
                          ref={pipVideoRef}
                          autoPlay
                          playsInline
                          muted
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* PiP Position Controls */}
                  <div style={{ marginBottom: '16px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: '#cbd5e1',
                      }}
                    >
                      Position:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {(['bottom-right', 'bottom-left', 'top-right', 'top-left'] as PiPPosition[]).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setPipPosition(pos)}
                          style={{
                            padding: '10px',
                            backgroundColor: pipPosition === pos ? '#a855f7' : '#334155',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            transition: 'background-color 0.2s',
                            textTransform: 'capitalize',
                          }}
                        >
                          {pos.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PiP Size Controls */}
                  <div style={{ marginBottom: '16px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: '#cbd5e1',
                      }}
                    >
                      Size:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {(['small', 'medium', 'large'] as PiPSize[]).map((size) => (
                        <button
                          key={size}
                          onClick={() => setPipSize(size)}
                          style={{
                            padding: '10px',
                            backgroundColor: pipSize === size ? '#a855f7' : '#334155',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            transition: 'background-color 0.2s',
                            textTransform: 'capitalize',
                          }}
                        >
                          {size} ({getPiPSizePercent(size)}%)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Camera Selection (if multiple) */}
                  {webcamDevices.length > 1 && (
                    <div style={{ marginBottom: '16px' }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#cbd5e1',
                        }}
                      >
                        Select Camera:
                      </label>
                      <select
                        value={selectedDeviceId || ''}
                        onChange={(e) => handleDeviceChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          backgroundColor: '#0f172a',
                          color: '#f1f5f9',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                        }}
                      >
                        {webcamDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Microphone Selection */}
                  {audioDevices.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#cbd5e1',
                        }}
                      >
                        Select Microphone:
                      </label>
                      <select
                        value={selectedAudioDeviceId || ''}
                        onChange={(e) => handleAudioDeviceChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          backgroundColor: '#0f172a',
                          color: '#f1f5f9',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                        }}
                      >
                        {audioDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Step 3: Recording */}
          {currentStep === 'recording' && (
            <>
              {recordingState === 'recording' && (
                <>
                  <RecordingProgress elapsedTime={elapsedTime} statusMessage={getStatusMessage()} />
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={handleStopRecording}
                      style={{
                        padding: '12px 32px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 600,
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
                    >
                      Stop Recording
                    </button>
                  </div>
                </>
              )}

              {recordingState === 'processing' && !successMessage && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px 0',
                    color: '#94a3b8',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      border: '4px solid #334155',
                      borderTopColor: '#667eea',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '16px',
                    }}
                  />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    {selectedType === 'pip' ? 'Compositing PiP recording...' : 'Processing recording...'}
                  </p>
                  <style>
                    {`
                      @keyframes spin {
                        to { transform: rotate(360deg); }
                      }
                    `}
                  </style>
                </div>
              )}

              {successMessage && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px 0',
                  }}
                >
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      backgroundColor: '#10b981',
                      borderRadius: '50%',
                      marginBottom: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem',
                      boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
                    }}
                  >
                    ✓
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '1.125rem',
                      color: '#f1f5f9',
                      fontWeight: 600,
                    }}
                  >
                    {successMessage}
                  </p>
                  <p
                    style={{
                      margin: '8px 0 0 0',
                      fontSize: '0.875rem',
                      color: '#94a3b8',
                    }}
                  >
                    Closing in 2 seconds...
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {currentStep === 'configure-screen' && !loadingSources && !error && desktopSources.length > 0 && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ flex: 1 }}>
              {!selectedSource && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: '#64748b',
                    fontStyle: 'italic',
                  }}
                >
                  Select a source above to begin
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleBack}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#334155',
                  color: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#475569')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
              >
                Back
              </button>
              <button
                onClick={handleStartScreenRecording}
                disabled={!selectedSource}
                style={{
                  padding: '10px 24px',
                  backgroundColor: selectedSource ? '#a855f7' : '#334155',
                  color: selectedSource ? '#ffffff' : '#64748b',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedSource ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  transition: 'background-color 0.2s, transform 0.1s',
                  opacity: selectedSource ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (selectedSource) {
                    e.currentTarget.style.backgroundColor = '#9333ea';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = selectedSource ? '#a855f7' : '#334155';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Start Recording
              </button>
            </div>
          </div>
        )}

        {currentStep === 'configure-webcam' && !loadingWebcam && !error && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: '#64748b',
                  fontStyle: 'italic',
                }}
              >
                {webcamDevices.length > 1
                  ? `${webcamDevices.length} cameras available`
                  : 'Camera ready to record'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleBack}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#334155',
                  color: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#475569')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
              >
                Back
              </button>
              <button
                onClick={handleStartWebcamRecording}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  transition: 'background-color 0.2s, transform 0.1s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                  }}
                />
                Start Recording
              </button>
            </div>
          </div>
        )}

        {currentStep === 'configure-pip' && !loadingSources && !loadingWebcam && !error && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: '#64748b',
                  fontStyle: 'italic',
                }}
              >
                {!selectedSource
                  ? 'Select a screen source above to begin'
                  : `Ready to record with ${pipSize} webcam in ${pipPosition.replace('-', ' ')}`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleBack}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#334155',
                  color: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#475569')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
              >
                Back
              </button>
              <button
                onClick={handleStartPiPRecording}
                disabled={!selectedSource}
                style={{
                  padding: '10px 24px',
                  backgroundColor: selectedSource ? '#a855f7' : '#334155',
                  color: selectedSource ? '#ffffff' : '#64748b',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedSource ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  transition: 'background-color 0.2s, transform 0.1s',
                  opacity: selectedSource ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (selectedSource) {
                    e.currentTarget.style.backgroundColor = '#9333ea';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = selectedSource ? '#a855f7' : '#334155';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                  }}
                />
                Start Recording
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Source Card Component (reused from RecordingModal)
interface SourceCardProps {
  source: DesktopSource;
  isSelected: boolean;
  onSelect: () => void;
}

const SourceCard: React.FC<SourceCardProps> = ({ source, isSelected, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isSelected ? '#334155' : '#0f172a',
        border: `2px solid ${isSelected ? '#a855f7' : isHovered ? '#475569' : '#1e293b'}`,
        borderRadius: '8px',
        padding: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 8px 16px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: '#0f172a',
          borderRadius: '6px',
          overflow: 'hidden',
          marginBottom: '12px',
        }}
      >
        <img
          src={source.thumbnail}
          alt={source.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {source.appIcon && (
          <img
            src={source.appIcon}
            alt=""
            style={{
              width: '20px',
              height: '20px',
              flexShrink: 0,
            }}
          />
        )}
        <p
          style={{
            margin: 0,
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#f1f5f9',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={source.name}
        >
          {source.name}
        </p>
      </div>

      {isSelected && (
        <div
          style={{
            marginTop: '8px',
            padding: '6px 12px',
            backgroundColor: '#a855f7',
            color: '#ffffff',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          Selected
        </div>
      )}
    </div>
  );
};

export default UnifiedRecordingModal;
