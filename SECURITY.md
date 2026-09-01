# Security policy

## Supported versions

While the library is pre-1.0, only the latest published version receives fixes.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Report it through GitHub's private vulnerability reporting on this repository
(Security → Report a vulnerability). Include the affected version, what an
attacker can do, and a reproduction if you have one.

You can expect an acknowledgement within three working days and an assessment
within ten. If a fix is needed we will coordinate a release and credit you in
the advisory unless you prefer otherwise.

## Scope

Components render into the consuming application's DOM. Anything a consumer
passes as `children` or as props is rendered as given — the library does not
sanitise it. Escaping untrusted content is the application's responsibility.

In scope: XSS reachable through documented, ordinary component usage;
dependency vulnerabilities we ship; anything in the CLI that writes outside its
declared targets.

Out of scope: vulnerabilities that require the consumer to pass already-unsafe
input (for example `dangerouslySetInnerHTML`), and issues in the documentation
site's third-party hosting.
