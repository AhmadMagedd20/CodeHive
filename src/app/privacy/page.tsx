export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="container max-w-2xl py-12 prose-sm">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        This is placeholder privacy content for The Cohort Portal. Replace it with your
        organisation&apos;s actual Privacy Policy before launch. We store the minimum personal data
        needed to operate your account (username, email, university) and security metadata (login
        audit records). Passwords are stored only as argon2 hashes.
      </p>
    </div>
  );
}
