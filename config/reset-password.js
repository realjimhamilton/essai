const path = require('path');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const mongoose = require('mongoose');
const { User } = require('@librechat/data-schemas').createModels(mongoose);
require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const connect = require('./connect');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const resetPassword = async () => {
  try {
    await connect();

    // Check for command line arguments
    const emailArg = process.argv[2];
    const passwordArg = process.argv[3];

    let email, newPassword;

    if (emailArg && passwordArg) {
      // Non-interactive mode with command line arguments
      email = emailArg;
      newPassword = passwordArg;
      
      if (newPassword.length < 8) {
        console.error('Password must be at least 8 characters!');
        process.exit(1);
      }
    } else {
      // Interactive mode
      email = await question('Enter user email: ');
      
      let validPassword = false;
      while (!validPassword) {
        newPassword = await question('Enter new password: ');
        if (newPassword.length < 8) {
          console.log('Password must be at least 8 characters! Please try again.');
          continue;
        }

        const confirmPassword = await question('Confirm new password: ');
        if (newPassword !== confirmPassword) {
          console.log('Passwords do not match! Please try again.');
          continue;
        }

        validPassword = true;
      }
    }

    const user = await User.findOne({ email });

    if (!user) {
      console.error('User not found!');
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.updateOne(
      { email },
      {
        password: hashedPassword,
        passwordVersion: Date.now(), // Invalidate old sessions
      },
    );

    console.log('Password successfully reset!');
    process.exit(0);
  } catch (err) {
    console.error('Error resetting password:', err);
    process.exit(1);
  } finally {
    rl.close();
  }
};

resetPassword();
