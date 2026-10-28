import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getLoginPageHtml } from "../views/loginPage";
import { isUuid, UUID_PATTERN_SOURCE } from "./uuid";

const SANDBOX_UUID = "2e40748f-cfaa-434f-96f5-b921f5c96c90";

describe("isUuid", () => {
  it("accepts a UUID in either case", () => {
    assert.equal(isUuid(SANDBOX_UUID), true);
    assert.equal(isUuid(SANDBOX_UUID.toUpperCase()), true);
  });

  it("rejects anything else, including a UUID with extra text around it", () => {
    for (const value of ["", "not-a-uuid", "2e40748f-cfaa-434f-96f5-b921f5c96c9", `${SANDBOX_UUID}x`, ` ${SANDBOX_UUID}`]) {
      assert.equal(isUuid(value), false, value);
    }
  });

  it("is the same check the login page runs in the browser", () => {
    assert.ok(getLoginPageHtml("http://localhost:3000").includes(`const uuidRegex = /${UUID_PATTERN_SOURCE}/i;`));
  });
});
