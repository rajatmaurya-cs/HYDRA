import express from 'express'

import { userRegister, userLogin, userMe } from '../controller/auth.controller'

const authRoutes = express.Router()

authRoutes.post('/register', userRegister)
authRoutes.post('/login', userLogin)
authRoutes.get('/me', userMe)

export default authRoutes