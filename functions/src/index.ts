import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as cors from "cors";
import * as session from "express-session";
import * as express from "express";
import * as jwt from "jsonwebtoken";
import {FirestoreStore} from "@google-cloud/connect-firestore";
import {Firestore} from "@google-cloud/firestore";
import {Request, Response, NextFunction} from "express";
import {Issuer, generators} from "openid-client";

admin.initializeApp();

const app = express();
app.use(
  session({
    store: new FirestoreStore({
      dataset: new Firestore(),
      kind: "express-sessions",
    }),
    secret: "my-secret",
    resave: false,
    saveUninitialized: true,
  })
);

const justPassMeIssuer = new Issuer({
  issuer: "http://127.0.0.1:5080/openid", // "https://accounts.justpass.me";
  authorization_endpoint: "https://thebank.verify.1pass.tech/openid/authorize/",
  token_endpoint: "https://thebank.verify.1pass.tech/openid/token/",
  jwks_uri: "https://thebank.verify.1pass.tech/openid/jwks",
  userinfo_endpoint: "https://thebank.verify.1pass.tech/openid/userinfo/",
});

const clientSecret = "a297e53858cdb72e913e1eb7be58cded7ba0a57ce1f2cdbf79a454ba";

const callbackURL = "https://us-central1-flutterdemo-f5263.cloudfunctions.net/oidc/callback/";
// "http://localhost:5001/flutterdemo-f5263/us-central1/oidc/callback/";
const client = new justPassMeIssuer.Client({
  client_id: "532492",
  client_secret: clientSecret,
  response_types: ["code"],
  redirect_uris: [callbackURL],
  id_token_signed_response_alg: "HS256",
  // token_endpoint_auth_method (default "client_secret_basic")
});

declare global {
  namespace Express {
    // Inject additional properties on express.Request
    interface Request {
      user?: admin.auth.DecodedIdToken;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    nonce: string;
    state: string;
    prompt: "create" | "login";
  }
}

// Express middleware that validates Firebase ID Tokens passed in
// the Authorization HTTP header. The Firebase ID token needs to be passed
// as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
const authenticateFirebase = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  functions.logger.log("Check if request is authorized with Firebase ID token");
  let idToken;
  if ( req.headers.authorization &&
     req.headers.authorization.startsWith("Bearer ")) {
    functions.logger.log("Found \"Authorization\" header");
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split("Bearer ")[1];
  }

  if (idToken) {
    try {
      const decodedIdToken = await admin.auth().verifyIdToken(idToken);
      functions.logger.log("ID Token correctly decoded");
      req.user = decodedIdToken;
    } catch (error) {
      functions.logger.error("Error while verifying Firebase ID token:", error);
    }
  }
  next();
  return;
};

app.use(cors());
app.use(authenticateFirebase);
app.get("/authenticate", (req, res) => {
  const nonce = generators.nonce();
  const state = generators.state();
  const prompt = req.user ? "create": "login";
  req.session.nonce = nonce;
  req.session.state = state;
  req.session.prompt = prompt;
  const params = {
    scope: "openid token email profile",
    response_mode: "code",
    // TODO: remove once usernameless flow works
    login_hint: req.user?.uid?? "HN9uoDYjZtYaB4tCQDsek0sUGPK2",
    username: req.user?.email,
    hint_mode: "token",
    prompt,
    AMWALPLATFORM: req.headers["amwal-platform"],
    nonce,
    state,
  };
  const signature = jwt.sign(params, clientSecret);
  const authUrl = client.authorizationUrl({
    ...params,
    signature,
  });
  functions.logger.log(authUrl);
  res.redirect(authUrl);
});

app.get("/callback", async (req, res) => {
  const params = client.callbackParams(req);
  const {nonce, state, prompt} = req.session;
  const tokenSet = await client.callback(callbackURL, params, {nonce, state});
  functions.logger.log("received and validated tokens:", tokenSet);
  functions.logger.log("validated ID Token claims:", tokenSet.claims());
  if (prompt == "create") {
    res.json({
      "status": "OK",
      "message": "Registered & Activated successfully, Try it on next login",
      "claims": tokenSet.claims(),
    });
    return;
  } else if (prompt == "login" && tokenSet.access_token) {
    const userinfo = await client.userinfo(tokenSet.access_token);
    if (userinfo.preferred_username) {
      const customToken = await admin.auth()
        .createCustomToken(userinfo.preferred_username);
      res.json({
        "status": "OK",
        "message": "Logged in successfully",
        "token": customToken,
      });
      return;
    }
  }
});

// This HTTPS endpoint can only be accessed by your Firebase Users.
// Requests need to be authorized by providing an `Authorization` HTTP header
// with value `Bearer <Firebase ID Token>`.
exports.oidc = functions.https.onRequest(app);
