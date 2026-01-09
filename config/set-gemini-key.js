const path = require('path');
const mongoose = require('mongoose');
const { User } = require('@librechat/data-schemas').createModels(mongoose);
require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const { updateUserKey } = require('~/models');
const connect = require('./connect');

const setGeminiKey = async () => {
  try {
    await connect();

    // Get email and API key from command line arguments
    const email = process.argv[2];
    const apiKey = process.argv[3];

    if (!email || !apiKey) {
      console.error('Usage: node config/set-gemini-key.js <email> <api-key>');
      console.error('Example: node config/set-gemini-key.js user@example.com AIzaSy...');
      process.exit(1);
    }

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      console.error(`User not found with email: ${email}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.email} (ID: ${user._id})`);

    // Set the Gemini API key (endpoint name is "google")
    await updateUserKey({
      userId: user._id.toString(),
      name: 'google',
      value: apiKey,
      expiresAt: null, // No expiration
    });

    console.log('✅ Gemini API key successfully set!');
    process.exit(0);
  } catch (err) {
    console.error('Error setting Gemini API key:', err);
    process.exit(1);
  }
};

setGeminiKey();
