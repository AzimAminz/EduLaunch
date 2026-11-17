import { BaseServiceEnv, loadEnv } from '@edulaunch/nest-kit';
import { z } from 'zod';

export const env = loadEnv(
  BaseServiceEnv.extend({
    CATALOGUE_URL: z.url(),
    PROFILE_URL: z.url(),
    /** 'off' skips the local text model: programme names are not compared, field matching alone is used. */
    EMBEDDINGS: z.enum(['on', 'off']).default('on'),
    /** Where downloaded models are kept (the repository's .cache/models, ignored by git). */
    MODELS_DIR: z.string().default('../../.cache/models'),
    /** A Hugging Face model id usable by transformers.js (ONNX); multilingual so Malay names are understood. */
    EMBEDDING_MODEL: z.string().default('Xenova/multilingual-e5-small'),
  }),
);
