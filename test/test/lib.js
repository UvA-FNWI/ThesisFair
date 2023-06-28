import { expect } from 'chai'

export const fail = async fn => {
  try {
    await fn()
  } catch (error) {
    expect(error.errors).to.exist
    return error
  }

  expect('code not to reach this', 'Function did not fail while it should').to.be.null
}
