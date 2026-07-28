import mitt, { Emitter } from 'mitt';
import { PepperEvents } from './types';

export const eventBus: Emitter<PepperEvents> = mitt<PepperEvents>();
