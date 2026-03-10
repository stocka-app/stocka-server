export type IEmailProviderContract = {
  sendVerificationEmail: (email: string, code: string, username: string) => Promise<any>;
  sendWelcomeEmail: (email: string, username: string) => Promise<any>;
  sendPasswordResetEmail: (email: string, token: string) => Promise<any>;
};

export const emailProviderMock: IEmailProviderContract = {
  sendVerificationEmail: jest.fn(() => Promise.resolve({ success: true })),
  sendWelcomeEmail: jest.fn(() => Promise.resolve({ success: true })),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve({ success: true })),
};
