const express = require("express");
const router = express.Router();

const {
  registerBikeRider,
  bikeRiderLogin,
  forgotBikeRiderPassword,
  resetBikeRiderPassword,
  getBikeRiderProfile,     
  updateBikeRiderProfile,  
} = require("../controllers/bikeRider.controller");


router.post("/register", registerBikeRider);


router.post("/login", bikeRiderLogin);


router.post("/forgot", forgotBikeRiderPassword);


router.post("/reset", resetBikeRiderPassword);

/* --------------------------------------------------
   NEW ROUTES (PROFILE FETCH & UPDATE)
-------------------------------------------------- */


router.get("/:id", getBikeRiderProfile);


router.put("/:id", updateBikeRiderProfile);

module.exports = router;
