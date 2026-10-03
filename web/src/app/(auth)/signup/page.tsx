import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign up | Bloomly" };

export default function SignupPage() {
  return (
    <div className="w-full max-w-md">
      <AuthForm mode="signup" />
    </div>
  );
}
