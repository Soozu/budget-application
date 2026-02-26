# Budget App for Guinayangan SHS Students

Hey everyone! This is our budget tracking app that we made for our thesis project. It's specifically for Senior High School students like us at Guinayangan Senior High School to help manage our allowances and expenses during the 2025-2026 school year.

## What This App Does

This app helps students like us to:
- Keep track of our daily and weekly allowances
- See where we spend our money on school stuff
- Learn how to save money better
- Understand our spending habits

## Main Features

- **Made for Students**: We designed this specifically for SHS students like us
- **Works Offline**: You don't need internet to use it after you download it
- **Track Allowance**: Record and see how much allowance you get
- **Monitor Expenses**: Keep track of what you spend on food, supplies, jeepney fare, etc.
- **Savings Goals**: See how much you can save
- **Student Categories**: Categories that make sense for school life
- **Philippine Peso**: Uses our currency (₱)
- **Easy Tutorial**: Shows you how to use it when you first open it

## Expense Categories We Use

- Allowance
- Food & Snacks
- Transportation
- School Supplies
- Projects
- Load/Data
- Entertainment
- Savings
- Other

## Technologies We Used

- React Native 0.81
- Expo SDK 54
- React Navigation
- AsyncStorage (for saving data on your phone)

## How to Run This App

### What You Need

- Node.js (version 14 or newer) - [Download here](https://nodejs.org/)
- npm or yarn (comes with Node.js)
- A phone with the Expo Go app installed

### Adding the App Logo to APK

To include the Budget Tracker logo in your APK:

1. **Install image processing library:**
   ```bash
   npm install sharp
   ```

2. **Generate icon sizes:**
   ```bash
   node generate-icons.js
   ```

3. **Build APK with logo:**
   ```bash
   npx eas build --platform android --profile preview
   ```

The logo will appear as the app icon on Android devices!

### Setting Up Node.js

If you don't have Node.js installed yet:
1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the LTS (Long Term Support) version
3. Run the installer and follow the setup steps
4. After installing, open your terminal or command prompt and type `node --version` to check if it's installed correctly

### Installation

**Step 1: Install the dependencies**
```bash
npm install
```

That's all! The app saves everything on your phone, so you don't need any servers or databases.

### Running the App

**Step 1: Start the app**
```bash
npm run dev
```

or

```bash
npm start
```

**Step 2: Run on your phone**
   - Download the Expo Go app on your phone from App Store or Play Store
   - Scan the QR code that shows up in your terminal or browser
   - Make sure your phone and computer are on the same WiFi network
   - The app works offline after you load it the first time!

### Running on Computer Emulator

**For Android:**
```bash
npm run android
```

**For iOS (only works on Mac):**
```bash
npm run ios
```

## How We Organized Our Code

```
├── App.js                          # Main app file with navigation
├── src/
│   └── screens/
│       ├── OnboardingScreen.js     # Tutorial screens for new users
│       ├── HomeScreen.js           # Main screen with budget overview
│       └── AddTransactionScreen.js # Screen to add allowances and expenses
├── assets/                         # App icons and images
├── package.json
├── app.json
└── babel.config.js
```

## How Our App Works

### When You First Open It
When you open the app for the first time, you'll see a tutorial with 4 slides:
1. **Welcome** - Introduction to budget tracking for SHS students
2. **Track Allowance** - How to record your allowances
3. **Monitor Expenses** - How to log your spending
4. **Save Money** - How to track your savings

You can swipe through the slides or skip the tutorial if you want.

### How to Use It Daily
1. **Add Allowances**: Put in money when you get allowance from your parents
2. **Log Expenses**: Write down what you spend right after you buy something
3. **Check Your Budget**: See how much money you have left, total allowance, what you spent, and savings
4. **Delete Transactions**: Long-press any transaction to delete it if you made a mistake
5. **Choose Categories**: Pick from categories like Food & Snacks, Transportation, School Supplies, etc.

### Works Without Internet
- Everything is saved on your phone using AsyncStorage
- You don't need internet after you first download it
- Works even when you have bad signal at school
- Your data stays even if you close the app

### Your Privacy is Safe
- All your data stays on your phone
- We don't send your information anywhere
- Complete privacy for students like us

## Problems and Solutions

**App won't load on your phone:**
- Make sure your Expo Go app is updated to the latest version
- Check that your phone and computer are on the same WiFi network
- Try clearing the cache: `npx expo start -c`
- Restart the development server

**Your data isn't saving:**
- Make sure you're allowing storage permissions on your phone
- Check if your phone has enough storage space
- Try deleting and reinstalling the app

**QR Code won't scan:**
- Make sure camera permissions are enabled on your phone
- Try typing the URL manually in the Expo Go app
- Use the "Scan QR Code" feature in the Expo Go app

## What We're Studying & Limitations

### What We're Focusing On
- Target: SHS students at Guinayangan Senior High School
- Time: 2025-2026 School Year
- Focus: Tracking expenses, managing budget, monitoring savings
- Testing: We'll test it with some SHS students who have phones

### Some Limitations
- You need a smartphone with the Expo Go app
- Only works for students who have phones
- Data only saves on your phone (no cloud backup)
- Only uses Philippine Peso currency

### How We Solved Problems
- **Bad Internet**: Made it work offline, no internet needed after download
- **Old Phones**: Made it lightweight so it works on older phones too
- **Hard to Use**: Added a tutorial and made the interface student-friendly

## For Our Research

We made this app for our thesis project to help SHS students learn better money management skills. We're studying:
- **Spending Patterns**: How students spend their money
- **Budgeting Techniques**: Teaching practical ways to manage money
- **App Usability**: Making sure it's easy for students to use

## What We Used to Build This

- [React Native](https://reactnative.dev/) - Mobile framework
- [Expo](https://expo.dev/) - Development platform
- [React Navigation](https://reactnavigation.org/) - Navigation library
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) - Local data storage

## Things We Want to Add Later

- Budget goals and reminders
- Reports and charts showing your spending
- Weekly and monthly summaries
- Export your data feature
- Support for other currencies
- Optional cloud backup

## Want to Help?

This is our educational project for Guinayangan Senior High School. If you have suggestions or want to help improve it, that would be awesome!

## License

This project is open source and available for educational purposes.


