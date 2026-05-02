/**
 * Módulo de Estado Centralizado
 * Actúa como "store" para reemplazar variables globales sueltas
 */

class AppState {
  constructor() {
    this.state = {
      currentProcessedData: [],
      currentViewData: [],
      currentYear: new Date().getFullYear(),
      isInitialized: false,
    };
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

export const appState = new AppState();
