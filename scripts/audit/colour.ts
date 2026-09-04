/**
 * The colour maths lives in the themes package.
 *
 * Re-exported here so the audits' import path stays put, and so there is one
 * implementation rather than two: the same conversion that decides whether CI
 * passes is the one the theme studio uses to tell someone their colour fails
 * before they ship it. A second copy would eventually disagree, and the
 * disagreement would be invisible until a theme shipped that the audit had
 * approved and the browser had not.
 */
export * from "../../packages/themes/src/colour";
