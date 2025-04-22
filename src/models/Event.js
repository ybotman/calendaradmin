import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  // App identifier - required from frontend
  appId: { type: String, required: true },

  title: { type: String, required: true },
  standardsTitle: { type: String, required: false },
  shortTitle: { type: String, required: false },
  description: { type: String, required: false },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  categoryFirst: { type: String, required: false },
  categorySecond: { type: String, required: false },
  categoryThird: { type: String, required: false },
  categoryFirstId: { type: mongoose.Schema.Types.ObjectId, required: false },
  categorySecondId: { type: mongoose.Schema.Types.ObjectId, required: false },
  categoryThirdId: { type: mongoose.Schema.Types.ObjectId, required: false },
  regionName: { type: String, required: false }, // Added this field which is used in the index
  regionNameRetire: { type: String, required: false },
  ownerOrganizerID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organizers",
    required: true,
  },
  grantedOrganizerID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organizers",
    required: false,
  },
  alternateOrganizerID: { // Added this which is used in the index
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organizers",
    required: false,
  },
  grantedOrganizerName: { type: String, required: false },
  alternateOrganizerName: { type: String, required: false },
  locationName: { type: String, required: false },
  same : {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organizers",
    required: false,
  },
  ownerOrganizerName: { type: String, required: true },
  masteredRegionName: { type: String, required: false },
  masteredDivisionName: { type: String, required: false },
  masteredCityName: { type: String, required: false },
  eventImage: { type: String, required: false },
  bannerImage: { type: String, required: false },
  featuredImage: { type: String, required: false },
  seriesImages: [{ type: String, required: false }],
  venueID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Venue",
    required: false,
  },
  locationID: { // Added this field which appears in the request
    type: mongoose.Schema.Types.ObjectId,
    ref: "Venue",
    required: false,
  },
  venueGeolocation: {
    type: { type: String, default: "Point", enum: ["Point"] },
    coordinates: { type: [Number] },
  },
  recurrenceRule: { type: String, required: false },
  isDiscovered: { type: Boolean, required: true, default:false },
  isOwnerManaged: { type: Boolean, required: true, default: true },
  isActive: { type: Boolean, required: true, default: true },
  isFeatured: { type: Boolean, required: false, default: false },
  isCanceled: { type: Boolean, required: false, default: false },
  isRepeating: { type: Boolean, required: false, default: false },
  discoveredLastDate: { type: Date, required: false },
  discoveredFirstDate: { type: Date, required: false },
  discoveredComments: { type: String, required: false },
  cost: { type: String, required: false },
  expiresAt: { type: Date, required: true },
});

// Indexes for performance
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ masteredRegionName: 1 }); 
eventSchema.index({ masteredDivisionName: 1 });
eventSchema.index({ masteredCityName: 1 });
eventSchema.index({ ownerOrganizerID: 1 });
eventSchema.index({ grantedOrganizerID: 1 });
eventSchema.index({ alternateOrganizerID: 1 });

// Geospatial index for location-based queries
eventSchema.index({ venueGeolocation: '2dsphere' });

const Event = mongoose.model("Events", eventSchema);

export default Event;