const express = require("express");
const { check } = require("express-validator");

const doctorController = require("../controllers/doctor-controller");

const router = express.Router();

router.get("/", doctorController.getDoctors);

router.get("/:docId", doctorController.getDoctorById);

router.get("/patients-list/:doctorId", doctorController.getDoctorAppointments);

router.get("/delete-appointment/:appId", doctorController.deleteAppointment);

router.post(
  "/signup",
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 5 }),
  ],
  doctorController.signup
);

router.patch(
  "/:docId",
  [check("name").not().isEmpty(), check("email").not().isEmpty()],
  doctorController.updateDoctor
);

router.post("/login", doctorController.login);

module.exports = router;
