const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = require("../config/prisma");
const { loginSchema } = require("../validators/auth.validator");

const login = async (req, res) => {
  try {
    // ----------------------------------------------------------
    // 1. Validate request body
    // ----------------------------------------------------------

    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { email, password } = validationResult.data;

    // ----------------------------------------------------------
    // 2. Find user
    // ----------------------------------------------------------

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ----------------------------------------------------------
    // 3. Compare password with stored bcrypt hash
    // ----------------------------------------------------------

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ----------------------------------------------------------
    // 4. Make sure JWT secret exists
    // ----------------------------------------------------------

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
    }

    // ----------------------------------------------------------
    // 5. Create JWT
    // ----------------------------------------------------------

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    // ----------------------------------------------------------
    // 6. Return authenticated user + token
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  login,
};