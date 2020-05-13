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

function useMediaRecorder({
  blobPropertyBag,
  audio = true,
  video = false,
  screen = false,
  onStop = () => null,
  mediaRecorderOptions = null
}) {
  let mediaRecorder = React.useRef(null);
  let mediaChunks = React.useRef([]);
  let mediaStream = React.useRef(null);
  let [status, setStatus] = React.useState('idle');
  let [isAudioMuted, setIsAudioMuted] = React.useState(false);
  let [mediaBlobUrl, setMediaBlobUrl] = React.useState(null);
  let [error, setError] = React.useState(null);

  async function getMediaStream() {
    setStatus('acquiring_media');

    let requiredMedia = { audio, video };

    try {
      let stream;

      if (screen) {
        stream = await window.navigator.mediaDevices.getDisplayMedia({
          video: video || true
        });

        if (audio) {
          let audioStream = await window.navigator.mediaDevices.getUserMedia({
            audio
          });

          audioStream
            .getAudioTracks()
            .forEach(audioTrack => stream.addTrack(audioTrack));
        }
      } else {
        stream = await window.navigator.mediaDevices.getDisplayMedia(
          requiredMedia
        );
      }

      mediaStream.current = stream;
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  async function startRecording() {
    setError(null);

    if (!mediaStream.current) {
      await getMediaStream();
    }

    if (mediaStream.current) {
      mediaRecorder.current = new MediaRecorder(mediaStream.current);
      mediaRecorder.current.addEventListener(
        'dataavailable',
        handleDataAvailable
      );
      mediaRecorder.current.addEventListener('stop', handleStop);
      mediaRecorder.current.addEventListener('error', handleError);
      mediaRecorder.current.start();
      setStatus('recording');
    }
  }

  function handleDataAvailable(e) {
    mediaChunks.current.push(e.data);
  }

  function handleStop() {
    let blobProperty = blobPropertyBag;

    if (!isObject(blobProperty) && video) {
      blobProperty = { type: 'video/mp4' };
    }

    if (!isObject(blobProperty) && audio) {
      blobProperty = { type: 'audio/wav' };
    }

    let blob = new Blob(mediaChunks.current, blobProperty);
    let url = URL.createObjectURL(blob);

    setStatus('stopped');
    setMediaBlobUrl(url);
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
      mediaStream.current
        .getVideoTracks()
        .forEach(videoTrack => videoTrack.stop());
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

    if (screen && !window.navigator.mediaDevices.getDisplayMedia) {
      throw new Error("This browser doesn't support screen capturing");
    }

    if (isObject(audio)) {
      validateMediaTrackConstraints(audio);
    }

    if (isObject(video)) {
      validateMediaTrackConstraints(video);
    }

    if (mediaRecorderOptions && mediaRecorderOptions.mimeType) {
      if (!MediaRecorder.isTypeSupported(mediaRecorderOptions.mimeType)) {
        console.error(
          `The specified MIME type you supplied for MediaRecorder doesn't support this browser`
        );
      }
    }
  }, [audio, screen, video, mediaRecorderOptions]);

  return {
    error,
    status,
    isAudioMuted,
    mediaBlobUrl,
    stopRecording,
    getMediaStream,
    startRecording,
    pauseRecording,
    resumeRecording,
    muteAudio: () => muteAudio(true),
    unMuteAudio: () => muteAudio(false),
    get previewStream() {
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
    <video ref={videoPreviewRef} width={520} height={480} autoPlay controls />
  );
}

export default function App() {
  let {
    error,
    status,
    mediaBlobUrl,
    stopRecording,
    previewStream,
    getMediaStream,
    startRecording
  } = useMediaRecorder({ screen: true });

  return (
    <article>
      {error ? error : status}
      <section>
        <button
          type="button"
          onClick={getMediaStream}
          disabled={status === 'ready'}
        >
          Select screen
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
      <LiveStream stream={previewStream} />
      <video src={mediaBlobUrl} width={520} height={480} />
    </article>
  );
}
