import { combineReducers } from "@reduxjs/toolkit";
import authReducer from '@/redux/slices/authSlice'
import auctionReducer from '@/redux/slices/auctionSlice'

const rootReducer = combineReducers({
    auth: authReducer,
    auction: auctionReducer
})


export default rootReducer;