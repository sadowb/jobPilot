/** A refusal thrown on purpose by a service; its message is written for the owner and reaches the renderer unchanged. */
export class UserFacingError extends Error {
  override readonly name = 'UserFacingError';
}
