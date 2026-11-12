# Launch FamilyCare as an Android App

## Goal
Help you turn the existing Flutter source into an Android app you can install on a phone, starting with a test APK rather than Play Store publication.

## Steps
1. Prepare the Flutter project from the downloaded ZIP and create the Android platform files it does not currently include.
2. Connect the Android app to your Firebase project and add the required Android configuration.
3. Build a release APK and install it on your Android phone for testing.
4. Provide clear setup steps and explain the separate requirements for publishing through Google Play.

## Technical details
The current ZIP contains Flutter app source, Firebase configuration files and Cloud Functions, but no Android platform folder. Flutter and Firebase setup/build commands must be run on a computer with Flutter installed; this workspace cannot run the Android build. Keep Firebase credentials private and do not include private service-account keys in the app.
