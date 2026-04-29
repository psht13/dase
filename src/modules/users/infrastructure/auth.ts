import { betterAuth } from "better-auth";
import { defaultUserRole } from "@/modules/users/domain/roles";

export const auth = betterAuth({
  appName: "Dase",
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        defaultValue: defaultUserRole,
        input: false,
        required: true,
        type: "string",
      },
    },
  },
});
