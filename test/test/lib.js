import { expect } from "chai";

export const fail = async (fn) => {
  try {
    await fn();
  } catch (error) {
    expect(error.errors).to.exist;
    return;
  }

  expect('code not to reach this', 'Function did not fail while it should').to.be.null;
}
