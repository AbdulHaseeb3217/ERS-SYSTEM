const mongoose = require("mongoose");
const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    senderType: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },

    senderName: {
      type: String,
      trim: true,
      default: "",
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    isReadByAdmin: {
      type: Boolean,
      default: false,
    },

    isReadByUser: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const supportChatSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    userType: {
      type: String,
      enum: ["patient", "ambulance_driver", "bike_rider", "pharmacy"],
      required: true,
      index: true,
    },

    userName: {
      type: String,
      trim: true,
      default: "",
    },

    userPhone: {
      type: String,
      trim: true,
      default: "",
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },

    messages: [messageSchema],

    lastMessage: {
      type: String,
      trim: true,
      default: "",
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },

    unreadForAdmin: {
      type: Number,
      default: 0,
    },

    unreadForUser: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

supportChatSchema.index({ userType: 1, userId: 1, createdAt: -1 });
supportChatSchema.index({ status: 1, lastMessageAt: -1 });

supportChatSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;

    delete ret._id;
    delete ret.__v;

    if (Array.isArray(ret.messages)) {
      ret.messages = ret.messages.map((msg) => {
        msg.id = msg._id;
        delete msg._id;
        return msg;
      });
    }

    return ret;
  },
});

module.exports = mongoose.model("SupportChat", supportChatSchema);