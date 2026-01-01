import mongoose, { Schema } from "mongoose";


const meetingSchema = new Schema(
    {
        user_id: { type: String, required: true },
        meetingCode: { type: String, required: true },
        title: { type: String, default: "Quick Meeting" },
        description: { type: String },
        startTime: { type: Date, default: Date.now },
        endTime: { type: Date },
        status: { type: String, enum: ['scheduled', 'live', 'completed'], default: 'scheduled' }
    },
    { timestamps: true }
)

const Meeting = mongoose.model("Meeting", meetingSchema);

export { Meeting };