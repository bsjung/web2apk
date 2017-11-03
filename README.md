# 🌎 ➡️ 📱 / Web2APK

Cordova project and script to build android APK from given url

## Requirements

- Node (^6.10)
- Cordova (^7.1)
- Gradle
- Android SDK & Tools (platforms;android-23 | build-tools;27.0.0)
- JAVA_HOME and ANDROID_HOME environments variables

## Installation

With all requirements installed:

- `git clone https://github.com/ynloultratech/web2apk.git`
- `npm install --from-lockfile`

## Usage

#### Build APK

- `./web2apk build <url>`
- `./web2apk build http://google.com`

##### Options

- **--output | -o:** Copy the final build release on given path
- **--name | -n:** App name, by default the url title

#### Run Directly on ADB device

- ./web2apk run http://google.com


