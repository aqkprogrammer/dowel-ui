/**
 * An error whose message is written for the person running the command.
 *
 * Anything thrown as a CliError is printed as a clean message with no stack
 * trace; everything else is treated as a bug and printed in full, because a
 * stack trace is exactly what is useful then and exactly what is noise when the
 * problem is "you have not run init yet".
 */
export class CliError extends Error {
  readonly hint: string | undefined;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "CliError";
    this.hint = hint;
  }
}
