import { combineReducers, configureStore } from "@reduxjs/toolkit";

import { persistReducer, persistStore } from 'redux-persist'
import storage from 'redux-persist/lib/storage'

import rootReducer from "./reducer/rootReducers";

const persistConfig = {
    key: 'root',
    storage,
    version: 2,
    // only the login session survives a reload; auction/user data is always refetched,
    // so a stale saved copy can't be missing fields the current slices expect
    whitelist: ['auth'],
    // drop auction/user data saved by older versions so it isn't rehydrated
    migrate: (state: any) =>
        Promise.resolve(state ? { _persist: state._persist, auth: state.auth } : state),
}

const persistedReducer = persistReducer(
    persistConfig,
    rootReducer
)


export const store = configureStore({
    reducer: persistedReducer,

    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
})


export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;