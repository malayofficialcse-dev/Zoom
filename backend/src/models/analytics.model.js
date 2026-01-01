import mongoose, { Schema } from "mongoose";

const analyticsSchema = new Schema(
    {
        user_id: { type: String, required: true },
        meetingCode: { type: String, required: true },
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        duration: { type: Number, required: true }, // in seconds
        participantCount: { type: Number, default: 0 }
    },
    { timestamps: true }
)

const Analytics = mongoose.model("Analytics", analyticsSchema);

export { Analytics };
