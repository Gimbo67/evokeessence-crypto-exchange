// Verify 2FA token
  app.post("/api/2fa/verify", requireAuthentication, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { token } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      // Get the user's 2FA secret from the database
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user || !user.is2faSecret) {
        return res.status(400).json({ error: "2FA not setup for this user" });
      }

      // Verify the token against the secret
      const verified = speakeasy.totp.verify({
        secret: user.is2faSecret,
        encoding: 'base32',
        token: token
      });

      if (!verified) {
        return res.status(400).json({ error: "Invalid token" });
      }

      // If verified, update the user's 2FA status
      await db.update(users)
        .set({ is2faEnabled: true })
        .where(eq(users.id, userId));

      res.json({ success: true, message: "2FA verified and enabled" });
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      res.status(500).json({ error: "Failed to verify 2FA" });
    }
  });