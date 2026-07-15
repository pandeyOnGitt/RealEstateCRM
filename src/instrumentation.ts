export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Local dev with DRY_RUN_MODE skips real SMTP; avoid blocking the dev server.
    if (process.env.DRY_RUN_MODE === "true") return;

    const { validateSmtpConfig } = await import("@/lib/config/smtp");
    validateSmtpConfig();
  }
}
