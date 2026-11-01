import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../src/auth.js";

const authMiddleware = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. Please login first.",
            });
        }

        req.user = session.user;

        next();
    } catch (error) {
        console.error("Authentication Error:", error);

        return res.status(401).json({
            success: false,
            message: "Authentication failed.",
        });
    }
};

export default authMiddleware;