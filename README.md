# Justpass.me Passkey Firebase Extension 🚀

## Before you begin 📝
- Make sure you have added [Firebase to your project](https://firebase.google.com/docs/guides). If not, follow the steps in the link to get started.👍

- Upgrade your project to the **Blaze** (pay as you go) plan if you haven't already. This is required for using Firebase extensions.💸

- [Install or update to the latest version of the Firebase CLI.](https://firebase.google.com/docs/cli#install_the_firebase_cli) This will let you install and manage Firebase extensions from the command line.👩‍💻

- Find out either your Firebase project ID or previously configured project alias. You will need this to install the extension.

    - [Project ID](https://firebase.google.com/docs/projects/learn-more#project-id) — You can run this command from anywhere on your computer to see a list of your Firebase projects and their IDs.🔎
        ```shell
        firebase projects:list
        ```
    - [Project alias](https://firebase.google.com/docs/cli#project_aliases) — You can run this command from your local app directory to see which alias you have set for your project.🔖
        ```shell
        firebase projects:list
        ```    
- Go to **justpass.me** Dashboard and copy these keys. You will need them to configure the extension.🔑
    - JUSTPASSME_ORGANIZATION_NAME
    - JUSTPASSME_ID
    - JUSTPASSME_API_SECRET

## Install extension 🛠️
To install the extension, run this command and replace `projectId-or-alias` with your project ID or alias.
```shell
firebase ext:install publisher-id/extension-id --project=projectId-or-alias
```

## Deploy 🚢
To deploy the extension, run this command.
```shell
firebase deploy --only extensions
```

## Example Usage 📱
Install the corresponding development SDK (iOS/Android/React Native/ Flutter) from https://www.justpass.me.

Here is an example code for registration and login for react native.

```Typescript
import {register, authenticate} from 'justpass-me-react-native'

const firebaseProjectName = "my-firebase-project" // the firebase project where the extension is installed
const cloudLocation = "us-central1" // location where the extension is installed
const extensionInstanceName = "ext-justpass-me"
const baseURL = `https://${cloudLocation}-${firebaseProjectName}.cloudfunctions.net/${extensionInstanceName}-oidc`

// registration
const registrationURL = `${baseURL}/register/`
const extraHeaders = {
    Authorization: `Bearer ${await auth().currentUser.getIdToken()}`
}
await register(registrationURL, extraHeaders)

// login
const authenticationURL = `${baseURL}/authenticate/`
const result = await authenticate(authenticationURL)
if (result.token) {
    await auth().signInWithCustomToken(result.token)
}
```