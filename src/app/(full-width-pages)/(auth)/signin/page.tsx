import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "High Range Star",
  description: "Document Management Simplify App",
};

export default function SignIn() {
  return <SignInForm />;
}
