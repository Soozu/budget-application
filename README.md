# Budget App for Guinayangan SHS Students

A mobile budget tracking application built with React Native and Expo, specifically designed for Senior High School students at Guinayangan Senior High School to manage their allowances and expenses during the 2025-2026 academic year.

## Project Overview

This application helps SHS students develop better financial habits by:
- Tracking daily/weekly allowances
- Monitoring spending on school-related expenses
- Building savings habits
- Understanding personal spending patterns

## Features

- 🎓 **Student-Focused**: Designed specifically for SHS students
- 📱 **Offline Support**: Works without internet connection
- 💰 **Allowance Tracking**: Record and track your allowances
- 📊 **Expense Monitoring**: Track spending on food, supplies, transportation, etc.
- 🎯 **Savings Goals**: Monitor your savings progress
- 🏷️ **Student Categories**: School-relevant expense categories
- 💵 **PHP Currency**: Uses Philippine Peso (₱)
- 📚 **Tutorial**: Interactive onboarding for new users

## Student-Specific Categories

- Allowance
- Food & Snacks
- Transportation
- School Supplies
- Projects
- Load/Data
- Entertainment
- Savings
- Other

## Tech Stack

- React Native 0.81
- Expo SDK 54
- React Navigation
- AsyncStorage (Offline Data Storage)

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Smartphone with Expo Go app installed

### Installation

**1. Install dependencies:**
```bash
npm install
```

That's it! The app uses offline storage, so no backend setup is needed.

### Running the Application

**1. Start the development server:**
```bash
npm run dev
```

or

```bash
npm start
```

**2. Run on your device:**
   - Download the **Expo Go** app on your iOS or Android device from App Store/Play Store
   - Scan the QR code shown in the terminal or browser
   - Make sure your phone and computer are on the same WiFi network
   - App works offline after first load!

### Running on Emulator/Simulator

**Android:**
```bash
npm run android
```

**iOS (Mac only):**
```bash
npm run ios
```

## Project Structure

```
├── App.js                          # Main app entry with navigation
├── src/
│   └── screens/
│       ├── OnboardingScreen.js     # Tutorial screens for students
│       ├── HomeScreen.js           # Main dashboard with budget overview
│       └── AddTransactionScreen.js # Add allowances and expenses
├── assets/                         # App icons and images
├── package.json
├── app.json
└── babel.config.js
```

## How It Works

### First Launch - Student Orientation
When students open the app for the first time, they see an interactive tutorial with 4 slides:
1. **Welcome** - Introduction to budget tracking for SHS students
2. **Track Allowance** - How to record allowances
3. **Monitor Expenses** - How to log spending
4. **Save Money** - How to track savings

Students can swipe through the slides or skip the tutorial.

### Daily Use
1. **Track Allowances**: Add income when you receive allowance from parents/guardians
2. **Log Expenses**: Record spending immediately after purchases
3. **View Budget**: See your available money, total allowance, spent amount, and savings
4. **Manage History**: Long-press any transaction to delete it
5. **Categorize**: Use student-relevant categories like Food & Snacks, Transportation, School Supplies, etc.

### Offline Capability
- All data is stored locally on your device using AsyncStorage
- **No internet required** after initial app install
- Works even in areas with poor connectivity
- Data persists even if app is closed

### Data Privacy
- All data stays on your device
- No personal information sent anywhere
- Complete privacy for student users

## Troubleshooting

**App won't load on device:**
- Make sure Expo Go app is updated to latest version
- Verify phone and computer are on same WiFi network
- Try clearing Expo cache: `npx expo start -c`
- Restart the dev server

**Data not saving:**
- Make sure you're allowing storage permissions
- Check if device has enough storage space
- Try reinstalling the app

**QR Code not scanning:**
- Make sure camera permissions are enabled
- Try typing the URL manually in Expo Go
- Use the "Scan QR Code" feature in Expo Go app

## Project Scope & Limitations

### Scope
- Target: SHS students at Guinayangan Senior High School
- Period: 2025-2026 Academic Year
- Focus: Expense tracking, budget management, savings monitoring
- Testing: Sample of SHS students with mobile devices

### Limitations
- Requires smartphone with Expo Go app
- Limited to students with device access
- Local storage only (no cloud sync)
- Philippine Peso currency only

### Addressing Challenges
- **Unreliable Internet**: Offline-first design, no internet needed after install
- **Device Availability**: Lightweight app, works on older devices
- **User Resistance**: Interactive tutorial, student-friendly interface

## For Researchers & Developers

This app was developed as part of a research project to help SHS students develop better financial literacy and budgeting skills. The focus is on:
- **Spending Patterns**: Understanding student expense behavior
- **Budgeting Techniques**: Teaching practical money management
- **App Usability**: Ensuring the tool is accessible and easy to use

## Built With

- [React Native](https://reactnative.dev/) - Mobile framework
- [Expo](https://expo.dev/) - Development platform
- [React Navigation](https://reactnavigation.org/) - Navigation library
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) - Local data storage

## Future Enhancements

- Budget goals and alerts
- Expense reports and visualizations
- Weekly/monthly summaries
- Export data feature
- Multiple currency support
- Cloud backup option (optional)

## Contributing

This is an educational project for Guinayangan Senior High School. Suggestions and improvements are welcome!

## License

This project is open source and available for educational purposes.


