const express = require("express");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");

const userController = require("../controllers/user-controller");

const router = express.Router();

router.get("/", userController.getPatients);
router.get("/:patId", userController.getPatientById);

router.post(
  "/signup",
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 5 }),
  ],
  userController.signup
);

//router.use(checkAuth);

router.post("/create-appointment", userController.createAppointment);

module.exports = router;
