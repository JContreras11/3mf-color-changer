import 'notistack';

declare module 'notistack' {
  interface VariantOverrides {
    job: {
      type: string;
    };
  }
}

export {};
