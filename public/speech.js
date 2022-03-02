// //constants
const speechButton = document.getElementById("speechButton");
const speechLang = document.getElementById("speechLang");
const speechTarget = document.getElementById("speechTarget");

const speechSubtitles = document.getElementById("speechSubtitles");

let isRecording = false;
let final_transcript = "";
let target_lang = undefined;

let recognition = new webkitSpeechRecognition() || new SpeechRecognition();
recognition.lang = "en-US";
recognition.continuous = true;
recognition.interimResults = true;

speechLang.addEventListener("change", function (e) {
  recognition.lang = e.target.value;
});

speechTarget.addEventListener("change", function (e) {
  target_lang = e.target.value;
});

recognition.onaudiostart = function () {
  speechButton.innerHTML = "Stop";
  console.log("Audio capturing started");
};

recognition.onaudioend = function () {
  speechButton.innerHTML = "Start";
  console.log("Audio capturing ended");
};

recognition.onresult = function (event) {
  let interim_transcript = "";
  for (let i = event.resultIndex; i < event.results.length; ++i) {
    if (event.results[i].isFinal) {
      final_transcript += event.results[i][0].transcript;
    } else {
      //if the previous lenght is greater than 100 characters then remove previous text
      if (interim_transcript.length > 100) {
        interim_transcript = "";
      }
      interim_transcript += event.results[i][0].transcript;
    }
  }

  if (target_lang !== undefined) {
    let source = recognition.lang.split("-")[0];

    fetch("/api/text-translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: final_transcript,
        target: `${source}-${target_lang}`,
      }),
    })
      .then((res) => res.text())
      .then((data) => {
        // console.log(data);
        speechSubtitles.innerHTML = data;
      })
      .catch((err) => {
        console.log(err);
        speechSubtitles.innerHTML = "Something went wrong, Please try again";
      });
  } else {
    speechSubtitles.innerHTML = final_transcript;
  }

  // final_span.innerHTML = final_transcript;
};

speechButton.addEventListener("click", () => {
  if (isRecording) {
    recognition.stop();
    speechButton.innerHTML = "Start";
    isRecording = false;
  }

  isRecording = true;

  recognition.start();
  speechButton.innerHTML = "Stop";
});
