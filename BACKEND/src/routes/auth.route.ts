import express from 'express'

import { userRegister } from '../controller/auth.controller'

const authRoutes = express.Router()

authRoutes.post('/register', userRegister)

export default authRoutes