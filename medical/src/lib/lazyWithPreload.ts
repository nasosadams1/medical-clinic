import React from 'react';

type Factory<T extends React.ComponentType<any>> = () => Promise<{ default: T }>;

export type PreloadableLazyComponent<T extends React.ComponentType<any>> = React.LazyExoticComponent<T> & {
  preload: Factory<T>;
};

export const lazyWithPreload = <T extends React.ComponentType<any>>(factory: Factory<T>): PreloadableLazyComponent<T> => {
  let loaded: ReturnType<Factory<T>> | null = null;
  const load = () => {
    if (!loaded) {
      loaded = factory().catch((error) => {
        loaded = null;
        throw error;
      });
    }

    return loaded;
  };

  const Component = React.lazy(load) as PreloadableLazyComponent<T>;
  Component.preload = load;
  return Component;
};
