<!-- 
This file provides your users an overview of how to use your extension after they've installed it. All content is optional, but this is the recommended format. Your users will see the contents of this file in the Firebase console after they install the extension.

Include instructions for using the extension and any important functional details. Also include **detailed descriptions** for any additional post-installation setup required by the user.

Reference values for the extension instance using the ${param:PARAMETER_NAME} or ${function:VARIABLE_NAME} syntax.
Learn more in the docs: https://firebase.google.com/docs/extensions/alpha/create-user-docs#reference-in-postinstall

Learn more about writing a POSTINSTALL.md file in the docs:
https://firebase.google.com/docs/extensions/alpha/create-user-docs#writing-postinstall
-->

# Finalizing Installation
## Grant the Authentication Permissions for the extension

The "**Service Account Token Creator** , **Firebase Authentication Admin**" IAM roles need to be granted to the service account **ext-justpass-me@{project-name}.iam.gserviceaccount.com** running the extension

1. Open the [IAM and admin](https://console.cloud.google.com/project/_/iam-admin) page in the Google Cloud Console.
2. Select your project and click "Continue".
3. Click the edit icon corresponding to the service account you wish to update.
4. Click on "Add Another Role".
5. Type "Service Account Token Creator" into the search filter, and select it from the results.
6. Type "Firebase Authentication Admin" into the search filter, and select it from the results.
7. Click "Save" to confirm the role grant.

<!-- We recommend keeping the following section to explain how to monitor extensions with Firebase -->
# Monitoring

As a best practice, you can [monitor the activity](https://firebase.google.com/docs/extensions/manage-installed-extensions#monitor) of your installed extension, including checks on its health, usage, and logs.