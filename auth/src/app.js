import dotenv from "dotenv"
dotenv.config()
import express from "express"
import morgan from "morgan"
import jwt from "jsonwebtoken"
import passport from "passport"
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import cookies from "cookie-parser"
import session from "express-session"

import authRoutes from "./routes/auth.routes.js"

const app = express();

app.use(morgan("dev"));
app.use(cookies());
app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}))


app.get("/_status/healthz", (req,res)=>{
    res.status(200).json({
        status: "ok"
    })
})

app.get('/_status/readyz', (req,res)=>{
    res.status(200).json({
        status: "ok"
    })
})

app.use("/api/auth", authRoutes)

export default app;