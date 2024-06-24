import { registerAs } from '@nestjs/config';
import * as process from 'process';
import { ENV_HOST_KEY } from '../common/const/env-keys.const';

export default registerAs('test', () => ({
  host: process.env[ENV_HOST_KEY] ?? 'localhost',
  port: 3000,
}));
