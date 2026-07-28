const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },

        role: {
            type: String,
            required: true,
            enum: ['user', 'assistant'],
        },

        content: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    'Conversation',
    conversationSchema
);