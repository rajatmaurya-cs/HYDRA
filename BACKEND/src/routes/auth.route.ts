import express from 'express'

import { userRegister, userLogin, userMe, userLogout, userRefreshToken } from '../controller/auth.controller'

const authRoutes = express.Router()

authRoutes.post('/register', userRegister)
authRoutes.post('/login', userLogin)
authRoutes.post('/refresh', userRefreshToken)
authRoutes.get('/me', userMe)
authRoutes.post('/logout', userLogout)

export default authRoutes