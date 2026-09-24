import { combineReducers } from "@reduxjs/toolkit";
import authReducer from '@/redux/slices/authSlice'
import auctionReducer from '@/redux/slices/auctionSlice'
import userReducer from '@/redux/slices/userSlice'


const rootReducer = combineReducers({
    auth: authReducer,
    auction: auctionReducer,
    user: userReducer
})


export default rootReducer;