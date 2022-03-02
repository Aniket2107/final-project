const express = require("express");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const { ExpressPeerServer } = require("peer");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const app = express();

const LanguageTranslatorV3 = require("ibm-watson/language-translator/v3");
const SpeechToTextV1 = require("ibm-watson/speech-to-text/v1");
const { IamAuthenticator } = require("ibm-watson/auth");

const translator = {
  apikey: "oy9N_E6SY1b9PlaL7sO_fi9OREEBizc3K3kuuZQwhg3N",
  iam_apikey_description:
    "Auto-generated for key crn:v1:bluemix:public:language-translator:au-syd:a/dc4546d42c6740dd9ee781fb40797c6a:06ba533e-41c0-4173-9279-a5c74c18fe59:resource-key:5adbae1b-23ce-403b-9082-9799b0b09e46",
  iam_apikey_name: "Auto-generated service credentials",
  iam_role_crn: "crn:v1:bluemix:public:iam::::serviceRole:Manager",
  iam_serviceid_crn:
    "crn:v1:bluemix:public:iam-identity::a/dc4546d42c6740dd9ee781fb40797c6a::serviceid:ServiceId-74ed764a-3c3f-4fc6-b1ef-6949a91cc0b4",
  url: "https://api.au-syd.language-translator.watson.cloud.ibm.com/instances/06ba533e-41c0-4173-9279-a5c74c18fe59",
};

const speechToText = new SpeechToTextV1({
  authenticator: new IamAuthenticator({
    apikey: "xgeCXTd8oUZxrNRz1Qefbv566iP5xpd1zxO64pqKJw-L",
  }),
  serviceUrl:
    "https://api.au-syd.speech-to-text.watson.cloud.ibm.com/instances/10428524-a66d-4e94-ae05-ef0242234ba4",
});

const languageTranslator = new LanguageTranslatorV3({
  version: "2018-05-01",
  authenticator: new IamAuthenticator({
    apikey: translator.apikey,
  }),
  serviceUrl: translator.url,
});

const { Users } = require("./util");

//Gmail api credientials
const CLIENT_ID = process.env.CLIENT_ID;
const CLEINT_SECRET = process.env.CLEINT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const EMAIL = process.env.EMAIL;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLEINT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

app.use(express.json());
app.set("view engine", "ejs");

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);

const io = require("socket.io")(server);

const peerServer = ExpressPeerServer(server, {
  debug: process.env.NODE_ENV === "development",
});

// Middlewares
app.use("/peerjs", peerServer);

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home", {
    roomId: uuidv4(),
  });
});

//setup multer for post voice-reco api
const multer = require("multer");
const fs = require("fs");
const upload = multer({
  dest: "./public/uploads/",
});

app.post("/api/voice-recognise", upload.single("audio"), async (req, res) => {
  // console.log(req.file);
  const audio = req.file;

  try {
    const params = {
      audio: fs.createReadStream(audio.path),
      contentType: audio.mimetype,
      model: "en-US_NarrowbandModel",
    };
    const { result } = await speechToText.recognize(params);
    res.send(JSON.stringify(result));
  } catch (error) {
    res.send(error);
  }
});

app.post("/api/text-translate", async (req, res) => {
  const { text, target } = req.body;
  try {
    const params = {
      text,
      modelId: target,
    };
    const { result } = await languageTranslator.translate(params);

    let translation = result.translations[0].translation;
    res.send(translation);
  } catch (error) {
    res.send(error);
  }
});

app.post("/api/sendMail", async (req, res) => {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: EMAIL,
        clientId: CLIENT_ID,
        clientSecret: CLEINT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    const FROM = `TEAM VCL <${EMAIL}>`;

    const mailOptions = {
      from: FROM,
      to: req.body.email,
      subject: "Meeting invite link",
      html: `<!doctype html>
      <html>
      
      <head>
        <style type='text/css'>
          href>a {
            text-decoration: none
          }
      
          body {
            margin: 0px;
            padding: 0px;
            font-family: 'Helvetica', 'Arial', sans-serif;
          }
      
          a {
            text-decoration: none;
            color: #4E83BF;
          }
      
          .small {
            font-size: 12px;
          }
        </style>
      </head>
      
      <body> <br><br>
        <center><h3>${req.body.user} invited to a live meeting @ VCL click on the link(s) below to join</h3></center>    
        <table width='100%' style='font-size: 14px; font-weight: 300; color: #4A4A4A;'>
          <tr>
            <td colspan='3' align='center' style='background-color: #F4F4F4; padding: 28px 0 20px 0;'>
              <table align=center cellpadding=0 cellspacing=0>
                <tr>
                  <td><b><a href=${req.body.meetLink} style='color: #FFFFFF; font-size: 20px; background-color: #83C36D; border-radius: 4px; border: 8px solid #83C36D;'>     Join the meeting     </a></b></td>
                </tr>
              </table>
              <p style='margin: 24px 0 8px 0'><span class='small'>Meeting link: <a href=${req.body.meetLink}>${req.body.meetLink}</a></span></p>
            </td>
          </tr>
        </table>
        <center><span style='font-size: 12px; font-weight: 300; color: #4A4A4A;'>© 2021 VCL, Inc. All rights Reserved.</span></center><br><br><br></body>
      </html>
    `,
    };

    const result = await transport.sendMail(mailOptions);
    return res.status(200).json({ result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/:room", (req, res) => {
  res.render("room", {
    roomId: req.params.room,
    port: process.env.NODE_ENV === "production" ? 443 : 3001,
  });
});

let users = new Users();

// console.log(users);

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId, username) => {
    socket.join(roomId);

    socket.to(roomId).emit("user-connected", userId);

    users.removeUser(username);
    users.addUser(userId, username);

    io.to(roomId).emit("updateUsersList", users.getUserList());

    socket.on("send-message", (message, username) => {
      socket.to(roomId).emit("chat-message", {
        message: message,
        userId: username,
      });
    });

    socket.on("shareScreen", (video) => {
      socket.to(roomId).emit("screenShare", video);
    });

    socket.on("disconnect", () => {
      let user = users.removeUser(username);

      if (user) {
        io.to(user.room).emit("updateUsersList", users.getUserList());
      }
      socket.to(roomId).emit("user-disconnected", userId);
    });
  });
});
