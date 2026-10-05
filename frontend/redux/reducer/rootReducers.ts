import { combineReducers } from "@reduxjs/toolkit";
import authReducer from '@/redux/slices/authSlice'
import auctionReducer from '@/redux/slices/auctionSlice'
import userReducer from '@/redux/slices/userSlice'
import lotBidderReducer from '@/redux/slices/lotBidderSlice'


const rootReducer = combineReducers({
    auth: authReducer,
    auction: auctionReducer,
    user: userReducer,
    lotBidder: lotBidderReducer
})


export default rootReducer;