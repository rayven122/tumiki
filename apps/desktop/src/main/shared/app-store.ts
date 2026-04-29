import Store from "electron-store";

type AppStoreSchema = {
  managerUrl?: string;
};

let storeInstance: Store<AppStoreSchema> | null = null;

export const getAppStore = (): Store<AppStoreSchema> => {
  if (!storeInstance) {
    storeInstance = new Store<AppStoreSchema>();
  }
  return storeInstance;
};
