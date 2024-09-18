require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const path = require('path');  // Import path module
const { RtcTokenBuilder, RtcRole } = require('agora-token');

// Firebase Admin SDK initialization
const serviceAccount = require(path.join(__dirname, 'service_account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize express app
const app = express();

// Middleware to parse incoming JSON requests
app.use(express.json());

// Agora credentials from environment variables
const APP_ID = process.env.APP_ID;
const APP_CERTIFICATE = process.env.APP_CERTIFICATE;

// Check if APP_ID and APP_CERTIFICATE are set
if (!APP_ID || !APP_CERTIFICATE) {
  console.error('Please set your Agora APP_ID and APP_CERTIFICATE in the .env file');
  process.exit(1);
}

// Function to send FCM message
async function sendFCMMessage(message) {
  try {
    const response = await admin.messaging().send(message);
    console.log('FCM message sent:', response);
  } catch (error) {
    console.error('Error sending FCM message:', error);
    throw error;
  }
}

// API endpoint to handle sending FCM message
app.post('/sendCallNotification', async (req, res) => {
  const message = req.body;

  // Validate that the necessary fields exist in the request body
  if (!message.token) {
    return res.status(400).send({ error: 'Missing required fields in request body' });
  }

  try {
    await sendFCMMessage(message);
    return res.status(200).send({ success: true, message: 'FCM message sent' });
  } catch (error) {
    return res.status(500).send({ error: `Failed to send FCM message ${error}` });
  }
});

// API endpoint to generate Agora token
app.get('/rtcToken', (req, res) => {
  // Channel name and UID from request parameters
  const channelName = req.query.channelName;
  const uid = req.query.uid ? parseInt(req.query.uid, 10) : 0; // default to 0 if not provided
  const role = RtcRole.PUBLISHER; // Set the role as publisher for both participants in a call
  const expireTimeInSeconds = 3600; // Token valid for 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTs = currentTimestamp + expireTimeInSeconds;

  // Log the channel name and UID to the console
  console.log(`Received request for RTC token: channelName=${channelName}, uid=${uid}`);

  // Check if channel name is provided
  if (!channelName) {
    return res.status(400).json({ error: 'Channel name is required' });
  }

  // Generate the RTC token
  const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, role, privilegeExpireTs);

  // Return the token as a JSON response
  return res.json({ rtcToken: token });
});


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});