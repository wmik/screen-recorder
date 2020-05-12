import React from 'react';

export default function App() {
  let [isRecording, setIsRecording] = React.useState(false);

  function handleStart() {
    setIsRecording(true);
  }

  function handleStop() {
    setIsRecording(false);
  }

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
    </article>
  );
}
