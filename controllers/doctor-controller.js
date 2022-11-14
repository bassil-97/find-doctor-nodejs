const { validationResult } = require("express-validator");
const bycrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const Doctor = require("../models/doctor");
const Appointment = require("../models/appointment");

//get all doctors

const getDoctors = async (req, res, next) => {
  let doctors;
  try {
    doctors = await Doctor.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      "Fetching doctors failed, please try again later.",
      500
    );
    return next(error);
  }

  res.json({
    doctors: doctors.map((doctor) => doctor.toObject({ getters: true })),
  });
};

//Get doctor by ID

const getDoctorById = async (req, res, next) => {
  const doctorId = req.params.docId;

  let doctor;
  try {
    doctor = await Doctor.findById(doctorId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find doctor.",
      500
    );
    return next(error);
  }

  if (!doctor) {
    const error = new HttpError(
      "Could not find doctor for the provided id.",
      404
    );
    return next(error);
  }

  res.json({ doctor: doctor.toObject({ getters: true }) });
};

// Get doctor appointments

const getDoctorAppointments = async (req, res, next) => {
  let doctorId = req.params.doctorId;

  let existingDoctor;
  try {
    existingDoctor = await Doctor.findOne({ id: doctorId });
  } catch (err) {
    const error = new HttpError(
      "something went wrong, please try again later.",
      500
    );
    return next(error);
  }

  if (!existingDoctor) {
    const error = new HttpError(
      "No doctor with provided id was found in the database.",
      500
    );
    return next(error);
  }

  let doctorAppointments;
  try {
    doctorAppointments = await Appointment.find({ doctor: doctorId });
  } catch (err) {
    const error = new HttpError(
      "something went wrong, please try again later.",
      500
    );
    return next(error);
  }

  res.status(201).json({ appointments: doctorAppointments });
};

//Sign up doctor

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { name, email, password } = req.body;

  let existingDoctor;
  try {
    existingDoctor = await Doctor.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  if (existingDoctor) {
    const error = new HttpError(
      "Doctor exist already, please login instead.",
      422
    );
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bycrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      "Could not create account, please try again.",
      500
    );
    return next(error);
  }

  const createdDoctor = new Doctor({
    name,
    email,
    password: hashedPassword,
  });

  try {
    await createdDoctor.save();
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  //Add JWT token
  let token;
  try {
    token = jwt.sign(
      { userId: createdDoctor.id, email: createdDoctor.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  res.status(201).json({
    doctor: createdDoctor,
    doctorId: createdDoctor.id,
    email: createdDoctor.email,
    token: token,
  });
};

//Login Doctor

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingDoctor;
  try {
    existingDoctor = await Doctor.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Logging in failed, please try again later.",
      500
    );
    return next(error);
  }

  if (!existingDoctor) {
    const error = new HttpError(
      "Invalid credentials, could not log you in.",
      403
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bycrypt.compare(password, existingDoctor.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log you in, please check your credentials and try again.",
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      "Invalid credentials, could not log you in.",
      403
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingDoctor.id, email: existingDoctor.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Logging in failed, please try again.", 500);
    return next(error);
  }

  res.json({
    doctor: existingDoctor,
    doctorId: existingDoctor.id,
    email: existingDoctor.email,
    token: token,
  });
};

const deleteAppointment = async (req, res, next) => {
  const appointmentId = req.params.appId;

  let appointment;
  try {
    appointment = await Appointment.findById(appointmentId).populate("doctor");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete appointment.",
      500
    );
    return next(error);
  }

  if (!appointment) {
    const error = new HttpError("Could not find appointment for this id.", 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await appointment.remove({ session: sess });
    appointment.doctor.appointments.pull(appointment);
    await appointment.doctor.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Something went wrong, could not delete appointment.",
      500
    );
    return next(error);
  }

  res.status(200).json({ message: "Deleted appointment." });
};

const updateDoctor = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { name, email } = req.body;
  const doctorId = req.params.docId;

  let existingDoctor;
  try {
    existingDoctor = await Doctor.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update doctor information.",
      500
    );
    return next(error);
  }

  if (
    existingDoctor?._id.toString() !== doctorId &&
    existingDoctor?.email == email
  ) {
    const error = new HttpError(
      "can't update your information, the email is already used by another doctor.",
      500
    );
    return next(error);
  }

  let doctor;
  try {
    doctor = await Doctor.findById(doctorId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update doctor information.",
      500
    );
    return next(error);
  }

  doctor.name = name;
  doctor.email = email;

  try {
    await doctor.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update doctor information.",
      500
    );
    return next(error);
  }

  res.status(200).json({ doctor: doctor.toObject({ getters: true }) });
};

exports.signup = signup;
exports.login = login;
exports.getDoctors = getDoctors;
exports.getDoctorById = getDoctorById;
exports.getDoctorAppointments = getDoctorAppointments;
exports.deleteAppointment = deleteAppointment;
exports.updateDoctor = updateDoctor;
