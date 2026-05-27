import "@testing-library/jest-dom/vitest";

// Mock localStorage for tests
// Uses a Proxy so Object.keys(localStorage) returns stored keys (not method names),
// which is required by exportLocalStorageData().
const storageTarget: Record<string, string> = {};

const localStorageHandler: ProxyHandler<Record<string, string>> = {
  get(_target, prop: string | symbol, _receiver) {
    if (prop === "getItem") return (key: string) => storageTarget[key] ?? null;
    if (prop === "setItem")
      return (key: string, value: string) => {
        storageTarget[key] = String(value);
      };
    if (prop === "removeItem")
      return (key: string) => delete storageTarget[key];
    if (prop === "clear")
      return () => {
        Object.keys(storageTarget).forEach((k) => delete storageTarget[k]);
      };
    if (prop === "length") return Object.keys(storageTarget).length;
    if (prop === "key")
      return (index: number) => Object.keys(storageTarget)[index] ?? null;
    if (typeof prop === "string" && prop in storageTarget) {
      return storageTarget[prop];
    }
    return undefined;
  },
  set(_target, prop: string | symbol, value) {
    if (typeof prop === "string") {
      storageTarget[prop] = String(value);
    }
    return true;
  },
  deleteProperty(_target, prop: string | symbol) {
    if (typeof prop === "string") {
      delete storageTarget[prop];
    }
    return true;
  },
  ownKeys() {
    return Reflect.ownKeys(storageTarget);
  },
  has(_target, prop: string | symbol) {
    return typeof prop === "string" && prop in storageTarget;
  },
  getOwnPropertyDescriptor(_target, prop: string | symbol) {
    if (typeof prop === "string" && storageTarget.hasOwnProperty(prop)) {
      return {
        enumerable: true,
        configurable: true,
        value: storageTarget[prop],
      };
    }
    return undefined;
  },
};

const localStorageMock = new Proxy(
  {} as Record<string, string>,
  localStorageHandler,
);

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock window.matchMedia for responsive hooks
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  value: IntersectionObserverMock,
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});