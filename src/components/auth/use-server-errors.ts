import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { AuthResult } from "@/app/(auth)/actions";

/** Copy server-side field errors onto react-hook-form fields. */
export function applyServerErrors<T extends FieldValues>(
  result: AuthResult,
  setError: UseFormSetError<T>,
) {
  for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
    if (messages?.[0]) setError(field as Path<T>, { message: messages[0] });
  }
}
