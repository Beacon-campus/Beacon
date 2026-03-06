import ChangePasswordModal from "./ChangePasswordModal";
import UpdateEmailModal from "./UpdateEmailModal";
import { useAuth } from "../context/AuthContext";

export default function OnboardingModal() {
  const { user } = useAuth();

  if (!user) return null;

  // 1. PRIORITY: Secure the account first
  // We check the FLAG, not the email string.
  if (user.ispasswordreset === false) {
    return <ChangePasswordModal />;
  }

  // 2. SECONDARY: Verify Identity
  // If password is done, but email is not verified, show email update
  if (user.isemailverified === false) {
    return <UpdateEmailModal />;
  }

  return null;
}