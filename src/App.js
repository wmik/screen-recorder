import React from 'react';

function isObject(o) {
  return o && !Array.isArray(o) && Object(o) === o;
}

function validateMediaTrackConstraints(mediaType) {
  let supportedMediaConstraints = navigator.mediaDevices.getSupportedConstraints();
  let unSupportedMediaConstraints = Object.keys(mediaType).filter(
    constraint => !supportedMediaConstraints[constraint]
  );

  if (unSupportedMediaConstraints.length !== 0) {
    let toText = unSupportedMediaConstraints.join(',');
    console.error(
      `The constraints ${toText} doesn't support on this browser. Please check your ReactMediaRecorder component.`
    );
  }
}

const noop = () => {};

function useMediaRecorder({
  recordScreen,
  onStop = noop,
  onStart = noop,
  mediaRecorderOptions = null,
  blobOptions = { type: 'video/mp4' },
  mediaStreamConstraints = { audio: true, video: true }
} = {}) {
  let mediaChunks = React.useRef([]);
  let mediaStream = React.useRef(null);
  let mediaRecorder = React.useRef(null);
  let [error, setError] = React.useState(null);
  let [status, setStatus] = React.useState('idle');
  let [mediaBlob, setMediaBlob] = React.useState(null);
  let [mediaBlobUrl, setMediaBlobUrl] = React.useState(null);
  let [isAudioMuted, setIsAudioMuted] = React.useState(false);

  async function getMediaStream() {
    setStatus('acquiring_media');

    try {
      let stream;

      if (recordScreen) {
        stream = await window.navigator.mediaDevices.getDisplayMedia(
          mediaStreamConstraints
        );
      } else {
        stream = await window.navigator.mediaDevices.getUserMedia(
          mediaStreamConstraints
        );
      }

      if (recordScreen && mediaStreamConstraints.audio) {
        let audioStream = await window.navigator.mediaDevices.getUserMedia({
          audio: mediaStreamConstraints.audio
        });

        audioStream
          .getAudioTracks()
          .forEach(audioTrack => stream.addTrack(audioTrack));
      }

      mediaStream.current = stream;
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('failed');
    }
  }

  async function startRecording() {
    setError(null);

    if (!mediaStream.current) {
      await getMediaStream();
    }

    if (mediaStream.current) {
      mediaRecorder.current = new MediaRecorder(
        mediaStream.current,
        mediaRecorderOptions
      );
      mediaRecorder.current.addEventListener(
        'dataavailable',
        handleDataAvailable
      );
      mediaRecorder.current.addEventListener('stop', handleStop);
      mediaRecorder.current.addEventListener('error', handleError);
      mediaRecorder.current.start();
      setStatus('recording');
      onStart();
    }
  }

  function handleDataAvailable(e) {
    mediaChunks.current.push(e.data);
  }

  function handleStop() {
    let blob = new Blob(mediaChunks.current, blobOptions);
    let url = URL.createObjectURL(blob);

    setStatus('stopped');
    setMediaBlobUrl(url);
    setMediaBlob(blob);
    onStop(url);
  }

  function handleError() {
    setError('NO_RECORDER');
    setStatus('idle');
  }

  function muteAudio(mute) {
    setIsAudioMuted(mute);

    if (mediaStream.current) {
      mediaStream.current.getAudioTracks().forEach(audioTrack => {
        audioTrack.enabled = !mute;
      });
    }
  }

  function pauseRecording() {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.pause();
    }
  }

  function resumeRecording() {
    if (mediaRecorder.current && mediaRecorder.current.state === 'paused') {
      mediaRecorder.current.resume();
    }
  }

  function stopRecording() {
    if (mediaRecorder.current) {
      setStatus('stopping');
      mediaRecorder.current.stop();
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaRecorder.current.removeEventListener(
        'dataavailable',
        handleDataAvailable
      );
      mediaRecorder.current.removeEventListener('stop', handleStop);
      mediaRecorder.current.removeEventListener('error', handleError);
      mediaRecorder.current = undefined;
      mediaStream.current = undefined;
      mediaChunks.current = [];
    }
  }

  React.useEffect(() => {
    if (!window.MediaRecorder) {
      throw new Error('Unsupported browser');
    }

    if (!window.navigator.mediaDevices.getDisplayMedia) {
      throw new Error("This browser doesn't support screen capturing");
    }

    if (isObject(mediaStreamConstraints.video)) {
      validateMediaTrackConstraints(mediaStreamConstraints.video);
    }

    if (isObject(mediaStreamConstraints.audio)) {
      validateMediaTrackConstraints(mediaStreamConstraints.audio);
    }

    if (mediaRecorderOptions && mediaRecorderOptions.mimeType) {
      if (!MediaRecorder.isTypeSupported(mediaRecorderOptions.mimeType)) {
        console.error(
          `The specified MIME type you supplied for MediaRecorder doesn't support this browser`
        );
      }
    }
  }, [mediaStreamConstraints, mediaRecorderOptions]);

  return {
    error,
    status,
    mediaBlob,
    mediaBlobUrl,
    isAudioMuted,
    stopRecording,
    getMediaStream,
    startRecording,
    pauseRecording,
    resumeRecording,
    muteAudio: () => muteAudio(true),
    unMuteAudio: () => muteAudio(false),
    get liveStream() {
      if (mediaStream.current) {
        return new MediaStream(mediaStream.current);
      }
      return null;
    }
  };
}

function LiveStream({ stream }) {
  let videoPreviewRef = React.useRef();

  React.useEffect(() => {
    if (videoPreviewRef.current && stream) {
      videoPreviewRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return null;
  }

  return (
    <video
      ref={videoPreviewRef}
      width={520}
      height={480}
      autoPlay
      controls
      muted
    />
  );
}

export default function App() {
  let {
    error,
    status,
    liveStream,
    mediaBlobUrl,
    stopRecording,
    getMediaStream,
    startRecording
  } = useMediaRecorder({ recordScreen: true });

  return (
    <article>
      {error ? error : status}
      <section>
        <button
          type="button"
          onClick={getMediaStream}
          disabled={status === 'ready'}
        >
          Share screen
        </button>
        <button
          type="button"
          onClick={startRecording}
          disabled={status === 'recording'}
        >
          Start recording
        </button>
        <button
          type="button"
          onClick={stopRecording}
          disabled={status !== 'recording'}
        >
          Stop recording
        </button>
      </section>
      <LiveStream stream={liveStream} />
      <video src={mediaBlobUrl} width={520} height={480} />
    </article>
  );
}
