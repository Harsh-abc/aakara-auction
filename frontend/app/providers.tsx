'use client'

import { Provider } from "react-redux"
import { PersistGate } from "redux-persist/integration/react"
import { store, persistor } from "@/redux/store"
import React from "react"
import { setupAuthInterceptors } from "@/services/authSession"
import SessionWatcher from "./SessionWatcher"

setupAuthInterceptors()

interface ProviderProps {
    children: React.ReactNode;
}

export default function Providers({
    children,
}: ProviderProps) {
    return (
        <Provider store={store}>
            <PersistGate
                loading={null}
                persistor={persistor}
            >
                <SessionWatcher />
                {children}

            </PersistGate>
        </Provider>
    );
}