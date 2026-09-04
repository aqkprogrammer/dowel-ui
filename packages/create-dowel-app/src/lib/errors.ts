/**
 * An error whose message is written for the person running the command.
 *
 * Anything thrown as a CreateError is printed as a clean message with no stack
 * trace; everything else is treated as a bug, where the stack is the useful
 * part.
 */
export class CreateError extends Error {
  readonly hint: string | undefined;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "CreateError";
    this.hint = hint;
  }
}
