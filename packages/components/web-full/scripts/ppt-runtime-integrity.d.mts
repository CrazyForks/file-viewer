export interface VerifyPptRuntimeDistributionOptions {
  expectedVersion?: string;
  runtimePrefix?: string;
  forbidBundledJavaScript?: boolean;
}

export function verifyPptRuntimeDistributionRoot(
  distributionRoot: string,
  options?: VerifyPptRuntimeDistributionOptions
): Promise<unknown>;
