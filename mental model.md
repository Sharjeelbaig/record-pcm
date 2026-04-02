A simple module that developers can install using `bun install record-pcm` and in there frontend, they can import the module and onClick of a button, they can pass:

```javascript
... // other code including imports of `record-pcm` by `import { recordPCM } from 'record-pcm'`
() => {
    recordPCM({
        onData: (pcmData) => {
        // pcmData is a Uint8Array containing the PCM audio data
        console.log(pcmData);
        },
        onError: (error) => {
        console.error('Error recording PCM:', error);
        },
    });
    }
```

they can also stop the recording by calling a function returned by `recordPCM`:

```javascript
const stopRecording = recordPCM({
    onData: (pcmData) => {
    // pcmData is a Uint8Array containing the PCM audio data
    console.log(pcmData);
    },
    onError: (error) => {
    console.error('Error recording PCM:', error);
    },
});
```

they can dynamically use a call like feature where the recording starts as a person speaks and stops when they stop speaking without manually clicking a button to stop the recording. This can be achieved by using the Web Audio API to analyze the audio input and determine when the user has stopped speaking based on silence detection. The `recordPCM` function can be enhanced to include this functionality, allowing for a more seamless recording experience.
