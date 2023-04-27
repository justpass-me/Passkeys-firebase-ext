# Justpass.me Passkey Firebase Extension

## Install extension
```
firebase ext:install .
firebase deploy --only extensions
```

## Example Usage
Install the corresponding development SDK (iOS/Android/React Native/ Flutter) from https://www.justpass.me.

Here is an example code for registration and login for react native
```javascript
// registration
const idToken = await auth().currentUser.getIdToken();
await justPassMeClient.register({
    Authorization: `Bearer ${idToken}`,
});

// login
const result = await justPassMeClient.authenticate();
if (result.token) {
    await auth().signInWithCustomToken(result.token);
}
```