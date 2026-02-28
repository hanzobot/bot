declare module "@discordjs/voice" {
  export enum AudioPlayerStatus {
    Idle = "idle",
    Buffering = "buffering",
    Paused = "paused",
    Playing = "playing",
    AutoPaused = "autopaused",
  }
  export enum VoiceConnectionStatus {
    Connecting = "connecting",
    Destroyed = "destroyed",
    Disconnected = "disconnected",
    Ready = "ready",
    Signalling = "signalling",
  }
  export enum EndBehaviorType {
    Manual = "manual",
    AfterSilence = "afterSilence",
    AfterInactivity = "afterInactivity",
  }

  export interface SpeakingEmitter {
    on(event: "start" | "end", listener: (userId: string) => void): this;
    off(event: "start" | "end", listener: (userId: string) => void): this;
  }

  export interface AudioPlayer {
    state: { status: AudioPlayerStatus };
    play(resource: AudioResource): void;
    stop(force?: boolean): void;
    on(event: string, listener: (err: Error) => void): this;
    off(event: string, listener: (err: Error) => void): this;
  }

  export interface VoiceReceiver {
    speaking: SpeakingEmitter;
    subscribe(
      userId: string,
      options?: { end?: { behavior: EndBehaviorType; duration?: number } },
    ): import("stream").Readable;
  }

  export interface PlayerSubscription {
    unsubscribe(): void;
  }

  export interface VoiceConnection {
    receiver: VoiceReceiver;
    state: { status: VoiceConnectionStatus };
    disconnect(): void;
    destroy(): void;
    subscribe(player: AudioPlayer): PlayerSubscription | undefined;
    on(event: string, listener: (...args: unknown[]) => void): this;
    off(event: string, listener: (...args: unknown[]) => void): this;
  }

  export interface AudioResource {
    ended: boolean;
  }

  export function createAudioPlayer(options?: {
    behaviors?: { noSubscriber?: string };
  }): AudioPlayer;
  export function createAudioResource(
    input: string | import("stream").Readable,
    options?: unknown,
  ): AudioResource;
  export function joinVoiceChannel(options: {
    channelId: string;
    guildId: string;
    adapterCreator: unknown;
    selfDeaf?: boolean;
    selfMute?: boolean;
    [key: string]: unknown;
  }): VoiceConnection;
  export function entersState<T extends AudioPlayer | VoiceConnection>(
    target: T,
    status: string,
    timeoutOrSignal: number | AbortSignal,
  ): Promise<T>;
  export function getVoiceConnection(guildId: string): VoiceConnection | undefined;
}
