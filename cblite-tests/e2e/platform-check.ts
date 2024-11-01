export enum PlatformFlag {
  UseIonic = "useIonic",
  UseCordova = "useCordova",
  UseReactNative = "useReactNative",
}

export class PlatformManager {
  private platformFlag: PlatformFlag;

  constructor(flag: PlatformFlag) {
    this.platformFlag = flag;
  }

  setPlatformFlag(flag: PlatformFlag): void {
    this.platformFlag = flag;
  }

  getPlatformFlag(): PlatformFlag {
    return this.platformFlag;
  }
}
