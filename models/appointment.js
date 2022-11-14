const mongoose = require("mongoose");
//const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const appointmentSchema = new Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  doctor: { type: mongoose.Types.ObjectId, required: true, ref: "Doctor" },
});

//appointmentSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Appoinment", appointmentSchema);
