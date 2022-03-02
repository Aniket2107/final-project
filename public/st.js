// write a program that takes audio input and converts it to text using the ibm speech to text api

let stream, recorder, chunks;

const voiceTranslateBtn = document.getElementById("voiceTranslateBtn");

// function getToken() {
//   //use the api key and generate a ibm token for the api

//   console.log("token bhai");

//   let API_KEY = "B1rg_cwAgqSsg2J6caazPDy5BqOC913U-QZlUbv9ODMa";
//   let URL = "https://iam.bluemix.net/identity/token";
//   let data = {
//     grant_type: "urn:ibm:params:oauth:grant-type:apikey",
//     apikey: API_KEY,
//   };

//   return fetch(URL, {
//     method: "POST",
//     headers: {
//       "Access-Control-Allow-Origin": "*",
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(data),
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       return data.access_token;
//     });
// }

async function getResults(audio, ext) {
  const data = new FormData();
  // assume blob
  const blob = audio;
  data.append("file", blob, `recording.${ext}`);

  console.log("getresuls called");

  const response = await fetch(
    "https://api.au-syd.speech-to-text.watson.cloud.ibm.com/instances/10428524-a66d-4e94-ae05-ef0242234ba4/v1/recognize",
    {
      method: "POST",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": `audio/${ext}`,
        Authorization: `Basic ${Buffer(
          "apikey:xgeCXTd8oUZxrNRz1Qefbv566iP5xpd1zxO64pqKJw-L"
        ).toString("base64")}`,
      },
      body: data,
    }
  );

  console.log("watson-stt::getResults - response:", response);

  if (response.status !== 200) {
    const error = await response.text();
    throw new Error(
      `Got bad response "status" (${response.status}) from Watson Speach to Text server, error: "${error}"`
    );
  }

  return await response.json();
}

function handleRecordingData(e) {
  chunks.push(e.data);
}

async function handleRecordingStop() {
  let blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });

  // let token = await getToken();
  // console.log("token", token);
  let results = await getResults(blob, "ogg");
  console.log("lmaoo", results);
}

async function recordAndRecognize() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (ex) {
    console.error("Failed to get permission to use microphone, error:", ex);
    return;
  }

  recorder = new MediaRecorder(stream);
  recorder.addEventListener("stop", handleRecordingStop, false);
  recorder.addEventListener("dataavailable", handleRecordingData, false);

  chunks = [];

  // recorder.start();
  handleRecordingStop();

  //setTimeout(recorder.stop, 5000); // record for 5 seconds //or Until stop is pressed lol
}

voiceTranslateBtn.addEventListener("click", recordAndRecognize);

// recordAndRecognize();
