import { combineReducers } from "@reduxjs/toolkit";
import authReducer from '@/redux/slices/authSlice'
import auctionReducer from '@/redux/slices/auctionSlice'
import userReducer from '@/redux/slices/userSlice'
import lotBidderReducer from '@/redux/slices/lotBidderSlice'
import auctionParticipantReducer from '@/redux/slices/auctionParticipantSlice'


const rootReducer = combineReducers({
    auth: authReducer,
    auction: auctionReducer,
    user: userReducer,
    lotBidder: lotBidderReducer,
    auctionParticipant: auctionParticipantReducer
})


export default rootReducer;