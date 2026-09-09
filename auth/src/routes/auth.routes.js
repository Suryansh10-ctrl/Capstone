import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../model/user.model.js";

const router = Router();

// Wrap for Express 5 compatibility
router.get("/google", (req, res, next) => {
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

// Custom callback pattern — passport never calls req.login(), no session needed
router.get("/google/callback", (req, res, next) => {
    passport.authenticate('google', { session: false }, async (err, profile) => {
        if (err || !profile) {
            console.error("Auth error:", err);
            return res.redirect("/");
        }
        try {
            const { id, displayName, emails, photos } = profile;
            let existingUser = await User.findOne({ googleId: id });

            if (!existingUser) {
                existingUser = new User({
                    googleId: id,
                    email: emails[0].value,
                    name: displayName,
                    avatar: photos[0].value
                });
                await existingUser.save();
            }

            const token = jwt.sign(
                { id: existingUser._id },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            res.cookie('token', token, { httpOnly: true });
            res.redirect("/");

        } catch (e) {
            console.error("Error during Google authentication", e);
            res.redirect("/");
        }
    })(req, res, next);
});

export default router;