import React from 'react';

export default function App() {
  let [isRecording, setIsRecording] = React.useState(false);
  let videoRef = React.useRef();
  let streamRef = React.useRef();
  let recorderRef = React.useRef();

  function handleStart() {
    setIsRecording(true);
  }

  function handleStop() {
    setIsRecording(false);
  }

  React.useEffect(() => {
    async function startRecording() {
      streamRef.current = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' }
      });
      recorderRef.current = new MediaRecorder(streamRef.current);
      let chunks = [];

      function handleDataAvailable(e) {
        chunks.push(e.data);
      }

      function handleStopRecorder() {
        let [sampleChunk] = chunks;
        let recordingBlob = new Blob(chunks, { type: sampleChunk.type });
        videoRef.current.src = URL.createObjectURL(recordingBlob);
      }

      recorderRef.current.addEventListener(
        'dataavailable',
        handleDataAvailable
      );
      recorderRef.current.addEventListener('stop', handleStopRecorder);
      recorderRef.current.start();
    }

    if (isRecording) {
      startRecording();
    }

    if (!isRecording && recorderRef.current) {
      recorderRef.current.stop();
      streamRef.current.getVideoTracks()[0].stop();
    }
  }, [isRecording]);

  return (
    <article>
      <section>
        <button type="button" onClick={handleStart} disabled={isRecording}>
          Start recording
        </button>
        <button type="button" onClick={handleStop} disabled={!isRecording}>
          Stop recording
        </button>
      </section>
      <video ref={videoRef} />
    </article>
  );
}
