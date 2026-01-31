class BootstrapStatus {
  private _countryRolloutReady = false;
  private _resolvers: Array<() => void> = [];

  get isCountryRolloutReady(): boolean {
    return this._countryRolloutReady;
  }

  markCountryRolloutReady(): void {
    this._countryRolloutReady = true;
    this._resolvers.forEach(resolve => resolve());
    this._resolvers = [];
  }

  async waitForCountryRollout(timeoutMs: number = 10000): Promise<boolean> {
    if (this._countryRolloutReady) return true;

    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, timeoutMs);

      this._resolvers.push(() => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }
}

export const bootstrapStatus = new BootstrapStatus();
