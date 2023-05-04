/* eslint-disable @typescript-eslint/no-non-null-assertion */
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

const endpointServer = `https://${process.env.JUSTPASSME_ORGANIZATION_NAME}.accounts.justpass.me`;

const justPassMeIssuer = new Issuer({
  issuer: `${endpointServer}/openid`,
  authorization_endpoint: `${endpointServer}/openid/authorize/`,
  token_endpoint: `${endpointServer}/openid/token/`,
  jwks_uri: `${endpointServer}/openid/jwks`,
  userinfo_endpoint: `${endpointServer}/openid/userinfo/`,
});

const clientSecret = process.env.JUSTPASSME_API_SECRET!;

const client = new justPassMeIssuer.Client({
  client_id: process.env.JUSTPASSME_ID!,
  client_secret: clientSecret,
  response_types: ["code"],
  id_token_signed_response_alg: "HS256",
});

declare global {
  namespace Express {
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
  let idToken;
  if ( req.headers.authorization &&
     req.headers.authorization.startsWith("Bearer ")) {
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split("Bearer ")[1];
  }

  if (idToken) {
    try {
      const decodedIdToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedIdToken;
    } catch (error) {
      functions.logger.error("Error while verifying Firebase ID token:", error);
    }
  }
  next();
  return;
};

const callbackURL = (req: Request): string => {
  if (process.env.FUNCTIONS_EMULATOR) {
    return `http://${req.get("Host")}/${process.env.GCLOUD_PROJECT}/${process.env.LOCATION}/ext-justpass-me-local-oidc/callback/`;
  } else {
    return `https://${req.get("Host")}/ext-justpass-me-oidc/callback/`;
  }
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
    login_hint: req.user?.uid,
    username: req.user?.email,
    hint_mode: "token",
    prompt,
    AMWALPLATFORM: req.headers["amwal-platform"],
    redirect_uri: callbackURL(req),
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

app.get("/callback", async (req, res, next) => {
  const params = client.callbackParams(req);
  const {nonce, state, prompt} = req.session;
  try {
    const tokenSet = await client.callback(
      callbackURL(req),
      params,
      {nonce, state});
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
  } catch (err) {
    next(err);
  }
});

// This HTTPS endpoint can only be accessed by your Firebase Users.
// Requests need to be authorized by providing an `Authorization` HTTP header
// with value `Bearer <Firebase ID Token>`.
exports.oidc = functions.https.onRequest(app);
