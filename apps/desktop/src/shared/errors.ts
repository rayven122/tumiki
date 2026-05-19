import { AUTH_REQUIRED_MESSAGE } from "./constants";

export class AuthRequiredError extends Error {
  constructor() {
    super(AUTH_REQUIRED_MESSAGE);
    this.name = "AuthRequiredError";
  }
}
