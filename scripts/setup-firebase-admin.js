#!/usr/bin/env node

/**
 * This script helps set up Firebase Admin SDK credentials.
 * It creates a .env.local file with the necessary environment variables.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔥 Firebase Admin SDK Setup Helper 🔥\n');
console.log('This script will help you set up Firebase Admin SDK credentials for local development.\n');
console.log('You need to create a service account in the Firebase Console:');
console.log('1. Go to https://console.firebase.google.com/');
console.log('2. Select your project');
console.log('3. Go to Project Settings > Service accounts');
console.log('4. Click "Generate new private key"');
console.log('5. Save the JSON file\n');

rl.question('Enter the path to your service account JSON file: ', (filePath) => {
  try {
    // Resolve the file path
    const resolvedPath = path.resolve(filePath.trim());
    
    // Check if the file exists
    if (!fs.existsSync(resolvedPath)) {
      console.error(`\n❌ Error: File not found at ${resolvedPath}`);
      rl.close();
      return;
    }
    
    // Read the service account file
    const serviceAccount = fs.readFileSync(resolvedPath, 'utf8');
    
    // Parse the JSON to validate it
    try {
      JSON.parse(serviceAccount);
    } catch (error) {
      console.error('\n❌ Error: Invalid JSON file. Make sure it\'s a valid Firebase service account JSON file.');
      rl.close();
      return;
    }
    
    // Create the .env.local file
    const envPath = path.resolve(process.cwd(), '.env.local');
    
    // Check if .env.local already exists
    if (fs.existsSync(envPath)) {
      rl.question('\n.env.local already exists. Do you want to overwrite it? (y/n): ', (answer) => {
        if (answer.toLowerCase() !== 'y') {
          console.log('\n✅ Operation cancelled. No changes were made.');
          rl.close();
          return;
        }
        
        writeEnvFile(envPath, serviceAccount);
        rl.close();
      });
    } else {
      writeEnvFile(envPath, serviceAccount);
      rl.close();
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    rl.close();
  }
});

function writeEnvFile(envPath, serviceAccount) {
  // Create the .env.local file content
  const envContent = `# Firebase Admin SDK credentials
FIREBASE_SERVICE_ACCOUNT='${serviceAccount.replace(/'/g, "\\'")}'

# Or alternatively, you can use this approach:
# GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account-file.json"
`;
  
  // Write the file
  fs.writeFileSync(envPath, envContent);
  
  console.log(`\n✅ Success! Firebase Admin SDK credentials have been set up in ${envPath}`);
  console.log('\nYou can now run your application with:');
  console.log('npm run dev');
  
  console.log('\n⚠️ Important: Never commit .env.local to version control!');
  console.log('Make sure it\'s included in your .gitignore file.');
} 