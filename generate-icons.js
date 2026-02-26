const fs = require('fs');
const path = require('path');

// This script will help you generate the required icon sizes
// You'll need to install sharp: npm install sharp

console.log('Icon Generation Script for Budget Tracker App');
console.log('=============================================');
console.log('');
console.log('To generate the proper icon sizes for your APK, you need to:');
console.log('');
console.log('1. Install sharp (image processing library):');
console.log('   npm install sharp');
console.log('');
console.log('2. Run this script:');
console.log('   node generate-icons.js');
console.log('');
console.log('This will create all the required icon sizes in the android/app/src/main/res/ folders');
console.log('');

// Check if sharp is installed
try {
  require('sharp');
  console.log('✓ Sharp is installed. Generating icons...');
  
  const sharp = require('sharp');
  const inputPath = './public/Budget Tracker Logo Design.png';
  
  // Android icon sizes
  const androidSizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
  };
  
  // Generate icons for each density
  async function generateIcons() {
    for (const [folder, size] of Object.entries(androidSizes)) {
      const outputDir = `./android/app/src/main/res/${folder}`;
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      try {
        await sharp(inputPath)
          .resize(size, size)
          .png()
          .toFile(`${outputDir}/ic_launcher.png`);
        
        // Also generate round icon
        await sharp(inputPath)
          .resize(size, size)
          .png()
          .toFile(`${outputDir}/ic_launcher_round.png`);
        
        console.log(`✓ Generated ${size}x${size} icons for ${folder}`);
      } catch (error) {
        console.error(`✗ Error generating icon for ${folder}:`, error.message);
      }
    }
    
    console.log('');
    console.log('Icon generation complete!');
    console.log('Now you can build your APK with: npx eas build --platform android --profile preview');
  }
  
  // Run the async function
  generateIcons().catch(console.error);
  
} catch (error) {
  console.log('✗ Sharp is not installed.');
  console.log('Please run: npm install sharp');
  console.log('Then run this script again.');
}
