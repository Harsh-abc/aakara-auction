import { combineReducers } from "@reduxjs/toolkit";
import authReducer from '@/redux/slices/authSlice'

const rootReducer = combineReducers({
    authSlice: authReducer
})


export default rootReducer;