import { Schema, Document, Types } from 'mongoose';

export interface IMongoProject extends Document {
  name: string;
  user: string;
  systemPrompt?: string;
  defaultPresetId?: string;
  ragFileIds?: string[];
  promptGroupIds: Types.ObjectId[];
  agentIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const projectSchema = new Schema<IMongoProject>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: String,
      required: true,
      index: true,
    },
    systemPrompt: {
      type: String,
      default: null,
    },
    defaultPresetId: {
      type: String,
      ref: 'Preset',
      default: null,
    },
    ragFileIds: {
      type: [String],
      default: [],
    },
    promptGroupIds: {
      type: [Schema.Types.ObjectId],
      ref: 'PromptGroup',
      default: [],
    },
    agentIds: {
      type: [String],
      ref: 'Agent',
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for user-scoped projects
projectSchema.index({ user: 1, name: 1 }, { unique: true });

export default projectSchema;
