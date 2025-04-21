import mongoose from 'mongoose';

// Define the schema only if it hasn't been defined yet
const UserLoginSchema = new mongoose.Schema({
  appId: { type: String, required: true, default: "1" },
  firebaseUserId: { type: String, required: true, unique: true },
  mfaEnabled: { type: Boolean, default: false },
  roleIds: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Roles" }],
    required: true,
    default: [],
  },
  firebaseUserInfo: {
    email: { type: String },
    displayName: { type: String },
    lastSyncedAt: { type: Date, default: Date.now }
  },
  localUserInfo: {
    isApproved: { type: Boolean, default: true },
    isEnabled: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    ApprovalDate: { type: Date },
    loginUserName: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    userDefaults: {
      region: { type: mongoose.Schema.Types.ObjectId, ref: "Regions" },
      division: { type: mongoose.Schema.Types.Mixed },
      city: { type: mongoose.Schema.Types.Mixed },
    },
    subscribedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Events" }],
    favoriteOrganizers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Organizers" }],
    notificationPreference: {
      type: String,
      enum: ["Application", "Email", "Text"],
      default: "Application",
    },
  },
  regionalOrganizerInfo: {
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "Organizers" },
    isApproved: { type: Boolean, default: false },
    isEnabled: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    ApprovalDate: { type: Date },
    allowedCities: [{ type: mongoose.Schema.Types.ObjectId, ref: "Cities" }],
    allowedDivisions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Divisions" }],
    allowedRegions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Regions" }],
    organizerCommunicationSettingsAdmin: {
      messagePrimaryMethod: {
        type: String,
        enum: ["app", "text", "email", "social"],
        default: "app",
      },
    },
  },
  localAdminInfo: {
    isApproved: { type: Boolean, default: false },
    isEnabled: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    ApprovalDate: { type: Date },
    adminRegions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Regions" }],
    adminDivisions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Divisions" }],
    adminCities: [{ type: mongoose.Schema.Types.ObjectId, ref: "Cities" }],
  },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.UserLogins || mongoose.model('UserLogins', UserLoginSchema, 'userlogins');