const { validationResult } = require("express-validator");
const bycrypt = require("bcryptjs");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const Patient = require("../models/user");
const Doctor = require("../models/doctor");
const Appoinment = require("../models/appointment");

//get all patients

const getPatients = async (req, res, next) => {
  let patients;
  try {
    patients = await Patient.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      "Fetching patients failed, please try again later.",
      500
    );
    return next(error);
  }

  res.json({
    patients: patients.map((patient) => patient.toObject({ getters: true })),
  });
};

//Get patient by ID

const getPatientById = async (req, res, next) => {
  const patientId = req.params.patId;

  let patient;
  try {
    patient = await Patient.findById(patientId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find patient.",
      500
    );
    return next(error);
  }

  if (!patient) {
    const error = new HttpError(
      "Could not find patient for the provided id.",
      404
    );
    return next(error);
  }

  res.json({ patient: patient.toObject({ getters: true }) });
};

//create appointment

const createAppointment = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, date, time, fullName, email, doctorId } = req.body;

  const createdAppointment = new Appoinment({
    title,
    date,
    time,
    fullName,
    email,
    doctor: doctorId,
  });

  let doctor;
  try {
    doctor = await Doctor.findById(doctorId);
  } catch (err) {
    const error = new HttpError(
      "Creating appointment failed, please try again.",
      500
    );
    return next(error);
  }

  if (!doctor) {
    const error = new HttpError("Could not find doctor for provided id.", 404);
    return next(error);
  }

  let existingAppointment;
  try {
    existingAppointment = await Appoinment.findOne({
      time: time,
      date: date,
      doctor: doctorId,
    });
  } catch (err) {
    const error = new HttpError(
      "Craeting appointment failed, please try again later.",
      500
    );
    return next(error);
  }

  if (existingAppointment) {
    const error = new HttpError(
      "Craeting appointment failed, doctor has another appointment at the same time.",
      500
    );
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdAppointment.save({ session: sess });
    doctor.appointments.push(createdAppointment);
    await doctor.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Creating appointment failed, please try again later.",
      500
    );
    return next(error);
  }

  res.status(201).json({ appoinment: createdAppointment, booked: true });
};

//Sign up patient

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { email, name, password } = req.body;

  let existingPatient;
  try {
    existingPatient = await Patient.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  if (existingPatient) {
    const error = new HttpError(
      "Patient exist already, please login instead.",
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

  const createdPatient = new Patient({
    name,
    email,
    password: hashedPassword,
  });

  try {
    await createdPatient.save();
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  //Add JWT token

  res
    .status(201)
    .json({ patientId: createdPatient.id, email: createdPatient.email });
};

exports.getPatients = getPatients;
exports.getPatientById = getPatientById;
exports.createAppointment = createAppointment;
exports.signup = signup;
