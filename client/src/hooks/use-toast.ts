import { toast as sonnerToast } from "sonner";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  const toast = ({ title, description, variant }: ToastProps) => {
    const msg = title ? (description ? `${title}: ${description}` : title) : description ?? "";
    if (variant === "destructive") {
      sonnerToast.error(msg);
    } else {
      sonnerToast(msg);
    }
  };
  return { toast };
}
