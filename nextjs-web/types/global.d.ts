/// <reference types="react" />
/// <reference types="react-dom" />

// Global JSX namespace declaration
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
